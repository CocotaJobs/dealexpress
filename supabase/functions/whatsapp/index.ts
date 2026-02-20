import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
    base64?: string;
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
      JSON.stringify({ error: 'Serviço temporariamente indisponível' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!EVOLUTION_API_KEY) {
    console.error('EVOLUTION_API_KEY is not configured');
    return new Response(
      JSON.stringify({ error: 'Serviço temporariamente indisponível' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase credentials not configured');
    return new Response(
      JSON.stringify({ error: 'Serviço temporariamente indisponível' }),
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
        return handleStatus(instanceName, userId, EVOLUTION_API_URL, EVOLUTION_API_KEY, supabaseAdmin);
      
      case 'disconnect':
        return handleDisconnect(instanceName, userId, EVOLUTION_API_URL, EVOLUTION_API_KEY, supabaseAdmin);
      
      case 'send-message':
        return handleSendMessage(body as SendMessageRequest, instanceName, EVOLUTION_API_URL, EVOLUTION_API_KEY);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Ação inválida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    // Log detailed error server-side only
    console.error('Error processing request:', error);
    // Return generic error to client
    return new Response(
      JSON.stringify({ error: 'Erro ao processar solicitação' }),
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

  // Step 1: Check if instance already exists and its state
  const statusResponse = await fetch(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
    method: 'GET',
    headers: {
      'apikey': evolutionKey,
      'Content-Type': 'application/json',
    },
  });

  if (statusResponse.ok) {
    const statusData = await statusResponse.json();
    const currentState = statusData.instance?.state;
    console.log(`Existing instance found. State: ${currentState}`);

    // If already connected ("open"), return success immediately
    if (currentState === 'open') {
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

    // Instance exists but is NOT connected (e.g. "connecting", "close", etc.)
    // → Delete it so we can create a fresh one with a guaranteed QR code
    console.log(`Instance state is "${currentState}" — deleting and recreating to get a fresh QR code`);

    // Attempt logout first (best-effort, ignore errors)
    await fetch(`${evolutionUrl}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: { 'apikey': evolutionKey, 'Content-Type': 'application/json' },
    }).catch(() => console.log('Logout attempt failed (non-critical)'));

    // Delete the stale instance
    const deleteResponse = await fetch(`${evolutionUrl}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: { 'apikey': evolutionKey, 'Content-Type': 'application/json' },
    });
    console.log(`Delete response: ${deleteResponse.status}`);

    // Wait 1 second before recreating to ensure Evolution API processes the deletion
    await new Promise(resolve => setTimeout(resolve, 1000));
  } else {
    console.log('No existing instance found — will create a new one');
  }

  // Step 2: Create a fresh instance (always reaches here when not "open")
  const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp`;
  
  console.log(`Creating new instance: ${instanceName} with webhook: ${webhookUrl}`);

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
    console.error('Evolution API create error:', createResponse.status, errorText);
    return new Response(
      JSON.stringify({ error: 'Falha ao criar instância do WhatsApp' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const createData = await createResponse.json();
  console.log('Instance created full response:', JSON.stringify(createData));

  // Extract QR code if already provided (sometimes comes directly in create response)
  const immediateQrcode =
    createData.qrcode?.base64 ||
    createData.qrcode?.qrcode?.base64 ||
    createData.base64 ||
    null;
  console.log(`Immediate QR code present: ${!!immediateQrcode}`);

  // Update profile with session ID and clear any stale QR code
  await supabaseAdmin
    .from('profiles')
    .update({
      whatsapp_session_id: instanceName,
      whatsapp_connected: false,
      whatsapp_qr_code: immediateQrcode || null,
    })
    .eq('id', userId);

  // The QR code will arrive via QRCODE_UPDATED webhook and be saved to profiles.whatsapp_qr_code
  // The frontend will poll the status endpoint which reads the QR from the DB
  console.log('Instance created. QR code will arrive via webhook QRCODE_UPDATED.');

  return new Response(
    JSON.stringify({
      success: true,
      connected: false,
      qrcode: immediateQrcode,
      waiting: !immediateQrcode,
      instanceName,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleStatus(
  instanceName: string,
  userId: string,
  evolutionUrl: string,
  evolutionKey: string,
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any
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
    return new Response(
      JSON.stringify({ connected: false, state: 'not_found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const data = await response.json();
  console.log('Status response:', data);

  const isConnected = data.instance?.state === 'open';

  // Fetch QR code from DB (stored by QRCODE_UPDATED webhook)
  const { data: profileData } = await supabaseAdmin
    .from('profiles')
    .select('whatsapp_qr_code')
    .eq('id', userId)
    .single();

  const qrcode = profileData?.whatsapp_qr_code || null;

  // Update DB when connected
  if (isConnected) {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        whatsapp_connected: true,
        whatsapp_session_id: instanceName,
        whatsapp_qr_code: null, // Clear QR when connected
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating profile on status check:', error);
    } else {
      console.log('Profile updated to connected via status check');
    }
  }

  return new Response(
    JSON.stringify({
      connected: isConnected,
      state: data.instance?.state || 'unknown',
      qrcode: isConnected ? null : qrcode,
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

  if (event === 'QRCODE_UPDATED' || event === 'qrcode.updated') {
    const qrBase64 = data?.qrcode?.base64 || data?.base64 || null;
    console.log(`QR code received via webhook, size: ${qrBase64?.length ?? 0}`);

    if (qrBase64) {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ whatsapp_qr_code: qrBase64 })
        .eq('id', userId);

      if (error) {
        console.error('Error saving QR code:', error);
      } else {
        console.log('QR code saved to profile');
      }
    }
  }

  if (event === 'connection.update' || event === 'CONNECTION_UPDATE') {
    const state = data?.state;
    const isConnected = state === 'open';

    console.log(`Connection update: state=${state}, connected=${isConnected}`);

    const updateData: Record<string, unknown> = {
      whatsapp_connected: isConnected,
      whatsapp_session_id: isConnected ? instance : null,
    };

    // Clear QR code when connected or disconnected
    if (isConnected) {
      updateData.whatsapp_qr_code = null;
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
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
  
  // Brazilian phone numbers:
  // - With country code: 12-13 digits (55 + 2-digit DDD + 8-9 digit number)
  // - Without country code: 10-11 digits (2-digit DDD + 8-9 digit number)
  // Only consider it already has the country code if:
  // 1. Starts with 55, AND
  // 2. Has 12 or more digits (indicating 55 is the country code, not the DDD)
  const hasCountryCode = formattedPhone.startsWith('55') && formattedPhone.length >= 12;

  if (!hasCountryCode) {
    formattedPhone = '55' + formattedPhone;
  }
  
  console.log(`Phone formatted: ${phone} -> ${formattedPhone}`);

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
        JSON.stringify({ error: 'Falha ao enviar mídia' }),
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
        JSON.stringify({ error: 'Falha ao enviar mensagem' }),
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
