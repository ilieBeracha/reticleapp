const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const handler = async (req: Request): Promise<Response> => {
  const { to, organizationId } = await req.json()
  const link = `clerkscopeui://accept-invitation?token=${organizationId}`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'Scope Stats <u@updates.scope-stats.com>',
      to: to,
      subject: 'Organization Invitation',
      html: `<strong>You are invited to join ${organizationId}</strong><br><a href="${link}">Accept Invitation</a>`,
    }),
  });

  const data = await res.json();

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

Deno.serve(handler);