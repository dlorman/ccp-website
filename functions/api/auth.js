/**
 * Cloudflare Pages Function — GitHub OAuth proxy for Decap CMS
 */
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/auth') {
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: `${url.origin}/api/auth/callback`,
      scope: 'repo,user',
    });
    return Response.redirect(`https://github.com/login/oauth/authorize?${params}`, 302);
  }

  if (path === '/api/auth/callback') {
    const code = url.searchParams.get('code');
    if (!code) return new Response('Missing code', { status: 400 });

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${url.origin}/api/auth/callback`,
      }),
    });

    const data = await tokenRes.json();
    const token = data.access_token;
    if (!token) return new Response('OAuth failed: ' + JSON.stringify(data), { status: 500 });

    const content = JSON.stringify({ token, provider: 'github' });
    const message = `authorization:github:success:${content}`;

    const html = `<!DOCTYPE html><html><head><title>Authenticating...</title></head><body><script>
(function() {
  var message = ${JSON.stringify(message)};
  function receiveMessage(e) { window.opener.postMessage(message, e.origin); }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script><p>Authenticating... this window will close automatically.</p></body></html>`;

    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  }

  return new Response('Not found', { status: 404 });
}
