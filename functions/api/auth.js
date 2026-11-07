/**
 * Cloudflare Pages Function — GitHub OAuth proxy for Decap CMS
 * Handles /api/auth and /api/auth/callback
 * Set env vars in Cloudflare Pages dashboard:
 *   GITHUB_CLIENT_ID
 *   GITHUB_CLIENT_SECRET
 */

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/auth') {
    // Step 1: redirect to GitHub OAuth
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: `${url.origin}/api/auth/callback`,
      scope: 'repo,user',
    });
    return Response.redirect(`https://github.com/login/oauth/authorize?${params}`, 302);
  }

  if (path === '/api/auth/callback') {
    // Step 2: exchange code for token
    const code = url.searchParams.get('code');
    if (!code) return new Response('Missing code', { status: 400 });

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${url.origin}/api/auth/callback`,
      }),
    });

    const data = await tokenRes.json();
    const token = data.access_token;

    if (!token) {
      return new Response('OAuth failed: ' + JSON.stringify(data), { status: 500 });
    }

    // Post message back to Decap CMS opener window
    const html = `<!DOCTYPE html>
<html>
<head><title>Authenticating...</title></head>
<body>
<script>
(function() {
  function receiveMessage(e) {
    console.log("receiveMessage %o", e);
    window.opener.postMessage(
      'authorization:github:success:${JSON.stringify({ token, provider: 'github' }).replace(/'/g, "\\'")}',
      e.origin
    );
  }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>
<p>Authenticating with GitHub... this window will close.</p>
</body>
</html>`;

    return new Response(html.replace(
      `'${JSON.stringify({ token, provider: 'github' }).replace(/'/g, "\\'")}'`,
      JSON.stringify(JSON.stringify({ token, provider: 'github' }))
    ), {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  return new Response('Not found', { status: 404 });
}
