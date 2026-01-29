import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateInstanceRequest {
  action: 'create';
}

interface StatusRequest {
  action: 'status';
}

interface DisconnectRequest {
  action: 'disconnect';
}

interface WebhookRequest {
  action: 'webhook';
  event: string;
  instance: string;
  data: {
    state?: string;
    qrcode?: {
      base64?: string;
    };
  };
}

interface SendMessageRequest {
  action: 'send-message';
  phone: string;
  message: string;
  mediaUrl?: string;
  mediaType?: 'document' | 'image';
  fileName?: string;
}

type RequestBody = CreateInstanceRequest | StatusRequest | DisconnectRequest | WebhookRequest | SendMessageRequest;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
  const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!EVOLUTION_API_URL) {
    console.error('EVOLUTION_API_URL is not configured');
    return new Response(
      JSON.stringify({ error: 'Evolution API URL not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!EVOLUTION_API_KEY) {
    console.error('EVOLUTION_API_KEY is not configured');
    return new Response(
      JSON.stringify({ error: 'Evolution API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase credentials not configured');
    return new Response(
      JSON.stringify({ error: 'Supabase credentials not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // deno-lint-ignore no-explicit-any
  const supabaseAdmin: any = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body: RequestBody = await req.json();
    const { action } = body;

    // Webhook doesn't require authentication
    if (action === 'webhook') {
      return handleWebhook(body as WebhookRequest, supabaseAdmin);
    }

    // All other actions require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Auth error:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub as string;
    const instanceName = `user_${userId.replace(/-/g, '')}`;

    console.log(`Action: ${action}, User: ${userId}, Instance: ${instanceName}`);

    switch (action) {
      case 'create':
        return handleCreate(instanceName, userId, EVOLUTION_API_URL, EVOLUTION_API_KEY, SUPABASE_URL, supabaseAdmin);
      
      case 'status':
        return handleStatus(instanceName, EVOLUTION_API_URL, EVOLUTION_API_KEY);
      
      case 'disconnect':
        return handleDisconnect(instanceName, userId, EVOLUTION_API_URL, EVOLUTION_API_KEY, supabaseAdmin);
      
      case 'send-message':
        return handleSendMessage(body as SendMessageRequest, instanceName, EVOLUTION_API_URL, EVOLUTION_API_KEY);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleCreate(
  instanceName: string,
  userId: string,
  evolutionUrl: string,
  evolutionKey: string,
  supabaseUrl: string,
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any
) {
  console.log(`Creating instance: ${instanceName}`);

  // First, check if instance already exists
  const statusResponse = await fetch(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
    method: 'GET',
    headers: {
      'apikey': evolutionKey,
      'Content-Type': 'application/json',
    },
  });

  if (statusResponse.ok) {
    const statusData = await statusResponse.json();
    console.log('Existing instance status:', statusData);
    
    // If already connected, return success
    if (statusData.instance?.state === 'open') {
      // Update database
      await supabaseAdmin
        .from('profiles')
        .update({
          whatsapp_connected: true,
          whatsapp_session_id: instanceName,
        })
        .eq('id', userId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          connected: true,
          message: 'Already connected' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If instance exists but not connected, get new QR code
    const qrResponse = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': evolutionKey,
        'Content-Type': 'application/json',
      },
    });

    if (qrResponse.ok) {
      const qrData = await qrResponse.json();
      console.log('QR code generated for existing instance');
      
      return new Response(
        JSON.stringify({
          success: true,
          connected: false,
          qrcode: qrData.base64 || qrData.qrcode?.base64,
          instanceName,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // Create new instance
  const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp`;
  
  const createResponse = await fetch(`${evolutionUrl}/instance/create`, {
    method: 'POST',
    headers: {
      'apikey': evolutionKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instanceName,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
      webhook: {
        url: webhookUrl,
        webhook_by_events: false,
        webhook_base64: true,
        events: [
          'CONNECTION_UPDATE',
          'QRCODE_UPDATED',
        ],
      },
    }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    console.error('Evolution API error:', createResponse.status, errorText);
    return new Response(
      JSON.stringify({ error: 'Failed to create WhatsApp instance', details: errorText }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const createData = await createResponse.json();
  console.log('Instance created:', createData);

  // Update profile with session ID
  await supabaseAdmin
    .from('profiles')
    .update({
      whatsapp_session_id: instanceName,
      whatsapp_connected: false,
    })
    .eq('id', userId);

  return new Response(
    JSON.stringify({
      success: true,
      connected: false,
      qrcode: createData.qrcode?.base64,
      instanceName,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleStatus(
  instanceName: string,
  evolutionUrl: string,
  evolutionKey: string
) {
  console.log(`Checking status for: ${instanceName}`);

  const response = await fetch(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
    method: 'GET',
    headers: {
      'apikey': evolutionKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    // Instance might not exist
    return new Response(
      JSON.stringify({ connected: false, state: 'not_found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const data = await response.json();
  console.log('Status response:', data);

  const isConnected = data.instance?.state === 'open';

  return new Response(
    JSON.stringify({
      connected: isConnected,
      state: data.instance?.state || 'unknown',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleDisconnect(
  instanceName: string,
  userId: string,
  evolutionUrl: string,
  evolutionKey: string,
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any
) {
  console.log(`Disconnecting instance: ${instanceName}`);

  // Logout from WhatsApp
  await fetch(`${evolutionUrl}/instance/logout/${instanceName}`, {
    method: 'DELETE',
    headers: {
      'apikey': evolutionKey,
      'Content-Type': 'application/json',
    },
  });

  // Delete instance
  const response = await fetch(`${evolutionUrl}/instance/delete/${instanceName}`, {
    method: 'DELETE',
    headers: {
      'apikey': evolutionKey,
      'Content-Type': 'application/json',
    },
  });

  console.log('Delete response status:', response.status);

  // Update database
  await supabaseAdmin
    .from('profiles')
    .update({
      whatsapp_connected: false,
      whatsapp_session_id: null,
    })
    .eq('id', userId);

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleWebhook(
  body: WebhookRequest,
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any
) {
  console.log('Webhook received:', JSON.stringify(body));

  const { event, instance, data } = body;

  // Extract user_id from instance name (user_xxxxx)
  const userIdMatch = instance?.match(/^user_(.+)$/);
  if (!userIdMatch) {
    console.log('Invalid instance name format:', instance);
    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Reconstruct UUID from the instance name
  const userIdWithoutDashes = userIdMatch[1];
  const userId = `${userIdWithoutDashes.slice(0, 8)}-${userIdWithoutDashes.slice(8, 12)}-${userIdWithoutDashes.slice(12, 16)}-${userIdWithoutDashes.slice(16, 20)}-${userIdWithoutDashes.slice(20)}`;

  console.log(`Webhook for user: ${userId}, event: ${event}`);

  if (event === 'connection.update' || event === 'CONNECTION_UPDATE') {
    const state = data?.state;
    const isConnected = state === 'open';

    console.log(`Connection update: state=${state}, connected=${isConnected}`);

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        whatsapp_connected: isConnected,
        whatsapp_session_id: isConnected ? instance : null,
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating profile:', error);
    } else {
      console.log('Profile updated successfully');
    }
  }

  return new Response(
    JSON.stringify({ received: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleSendMessage(
  body: SendMessageRequest,
  instanceName: string,
  evolutionUrl: string,
  evolutionKey: string
) {
  const { phone, message, mediaUrl, mediaType, fileName } = body;

  console.log(`Sending message to ${phone} via instance ${instanceName}`);

  // Format phone number (remove non-digits and add country code if needed)
  let formattedPhone = phone.replace(/\D/g, '');
  if (!formattedPhone.startsWith('55')) {
    formattedPhone = '55' + formattedPhone;
  }

  if (mediaUrl && mediaType) {
    // Send media message
    const endpoint = mediaType === 'document' 
      ? `${evolutionUrl}/message/sendMedia/${instanceName}`
      : `${evolutionUrl}/message/sendMedia/${instanceName}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': evolutionKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: formattedPhone,
        mediatype: mediaType,
        media: mediaUrl,
        caption: message,
        fileName: fileName || 'document.pdf',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error sending media:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to send media', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } else {
    // Send text message
    const response = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'apikey': evolutionKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error sending message:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to send message', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
