import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@4.0.0';

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
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

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

    // Get organization name
    const { data: organization, error: orgNameError } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    const organizationName = organization?.name || 'Sua Organização';

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

    // Generate invite link - use origin header or PUBLIC_APP_URL env variable
    const baseUrl = req.headers.get('origin') || Deno.env.get('PUBLIC_APP_URL') || 'https://proposalflow.app';
    const inviteLink = `${baseUrl}/register?token=${token}&email=${encodeURIComponent(email)}`;

    console.log('Invitation created successfully:', { email, role, inviteLink });

    // Send email via Resend if API key is configured
    let emailSent = false;
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        
        const roleName = role === 'admin' ? 'Administrador' : 'Vendedor';
        
        const { error: emailError } = await resend.emails.send({
          from: 'Convites <onboarding@resend.dev>',
          to: [email],
          subject: `Você foi convidado para ${organizationName}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
                <tr>
                  <td align="center">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                      <!-- Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px 24px; text-align: center;">
                          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">🎉 Você foi convidado!</h1>
                        </td>
                      </tr>
                      <!-- Content -->
                      <tr>
                        <td style="padding: 32px 24px;">
                          <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 16px 0;">
                            Olá,
                          </p>
                          <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
                            Você foi convidado para fazer parte da equipe da <strong>${organizationName}</strong> como <strong>${roleName}</strong>.
                          </p>
                          <!-- CTA Button -->
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td align="center" style="padding: 8px 0 24px 0;">
                                <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 8px;">
                                  Criar Minha Conta
                                </a>
                              </td>
                            </tr>
                          </table>
                          <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 0 0 16px 0;">
                            Ou copie e cole o link abaixo no seu navegador:
                          </p>
                          <p style="color: #3b82f6; font-size: 12px; line-height: 18px; margin: 0 0 24px 0; word-break: break-all;">
                            ${inviteLink}
                          </p>
                          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                          <p style="color: #9ca3af; font-size: 12px; line-height: 18px; margin: 0; text-align: center;">
                            ⏰ Este convite expira em 7 dias.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `,
        });

        if (emailError) {
          console.error('Error sending email:', emailError);
        } else {
          emailSent = true;
          console.log('Email sent successfully to:', email);
        }
      } catch (emailErr) {
        console.error('Failed to send email:', emailErr);
      }
    } else {
      console.log('RESEND_API_KEY not configured, skipping email');
    }

    return new Response(
      JSON.stringify({
        success: true,
        email,
        role,
        inviteLink,
        expiresAt: expiresAt.toISOString(),
        emailSent,
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
