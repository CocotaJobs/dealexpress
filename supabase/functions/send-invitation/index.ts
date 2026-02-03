import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create client with user's token to verify authentication
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is admin using the has_role function
    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });

    if (roleError) {
      console.error('Error checking role:', roleError);
      throw new Error('Error checking permissions');
    }

    if (!isAdmin) {
      throw new Error('Only admins can send invitations');
    }

    // Get user's organization
    const { data: orgData, error: orgError } = await supabaseAdmin.rpc('get_user_organization_id');
    
    // Fallback: get organization from profile
    let organizationId = orgData;
    if (!organizationId) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      
      if (profileError || !profile?.organization_id) {
        throw new Error('Could not determine organization');
      }
      organizationId = profile.organization_id;
    }

    // Parse request body
    const { email, role } = await req.json();

    if (!email || !role) {
      throw new Error('Email and role are required');
    }

    // Validate role
    if (role !== 'admin' && role !== 'vendor') {
      throw new Error('Invalid role. Must be admin or vendor');
    }

    // Check if there's already a pending invitation for this email
    const { data: existingInvite, error: existingError } = await supabaseAdmin
      .from('invitations')
      .select('id')
      .eq('email', email)
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingError) {
      console.error('Error checking existing invitation:', existingError);
    }

    if (existingInvite) {
      throw new Error('Já existe um convite pendente para este email');
    }

    // Check if user already exists in the organization
    const { data: existingUser, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (userError) {
      console.error('Error checking existing user:', userError);
    }

    if (existingUser) {
      throw new Error('Este email já está cadastrado na organização');
    }

    // Generate unique token
    const token = crypto.randomUUID();

    // Calculate expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const { data: invitation, error: insertError } = await supabaseAdmin
      .from('invitations')
      .insert({
        email,
        role,
        token,
        organization_id: organizationId,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating invitation:', insertError);
      throw new Error('Failed to create invitation');
    }

    // Generate invite link
    const baseUrl = req.headers.get('origin') || 'https://id-preview--65f936fc-82f4-4d6f-bcc0-56fd08b7e7e8.lovable.app';
    const inviteLink = `${baseUrl}/register?token=${token}&email=${encodeURIComponent(email)}`;

    console.log('Invitation created successfully:', { email, role, inviteLink });

    return new Response(
      JSON.stringify({
        success: true,
        email,
        role,
        inviteLink,
        expiresAt: expiresAt.toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    console.error('Error in send-invitation:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
