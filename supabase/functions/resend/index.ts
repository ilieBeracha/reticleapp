import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const handler = async (req: Request): Promise<Response> => {
  try {
    const { 
      email, 
      organizationId, 
      organizationName, 
      role = 'member',
      invitedBy 
    } = await req.json();

    // Validate required fields
    if (!email || !organizationId || !organizationName || !invitedBy) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, organizationId, organizationName, invitedBy' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Generate unique invitation token
    const token = crypto.randomUUID();

    // Create invitation record in database
    const { data: invitation, error: dbError } = await supabase
      .from('organization_invitations')
      .insert({
        email,
        organization_id: organizationId,
        role,
        invited_by: invitedBy,
        token,
        status: 'pending',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to create invitation', details: dbError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create invitation link with token
    const link = `clerkscopeui://accept-invitation?token=${token}`;

    // Send email via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Scope Stats <u@updates.scope-stats.com>',
        to: email,
        subject: `You're invited to join ${organizationName}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited! 🎉</h1>
            </div>
            
            <div style="background: #ffffff; padding: 40px 30px; border-radius: 8px; margin-top: -20px;">
              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                You've been invited to join <strong>${organizationName}</strong> as a <strong>${role}</strong>.
              </p>
              
              <div style="background: #f7f7f7; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Organization</p>
                <p style="margin: 0; color: #333; font-size: 18px; font-weight: 600;">${organizationName}</p>
              </div>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${link}" 
                   style="display: inline-block; background: #667eea; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Accept Invitation
                </a>
              </div>
              
              <div style="background: #fff9e6; border-left: 4px solid #fbbf24; padding: 16px; margin: 30px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  ⏰ This invitation expires in 7 days
                </p>
              </div>
              
              <p style="font-size: 13px; color: #999; margin-top: 30px;">
                If the button doesn't work, copy and paste this link:<br/>
                <code style="background: #f0f0f0; padding: 8px; display: inline-block; margin-top: 8px; word-break: break-all;">${link}</code>
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>Scope Stats - Training Management System</p>
            </div>
          </div>
        `,
      }),
    });

    const emailData = await emailRes.json();

    if (!emailRes.ok) {
      console.error('Email error:', emailData);
      // Delete the invitation if email fails
      await supabase
        .from('organization_invitations')
        .delete()
        .eq('id', invitation.id);
      
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: emailData }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitation,
        emailId: emailData.id 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Handler error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

Deno.serve(handler);