export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  BACKEND_URL?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. Handle API requests
    if (url.pathname.startsWith('/api/')) {
      if (env.BACKEND_URL) {
        // Forward /api requests to configured backend server
        const backendOrigin = env.BACKEND_URL.replace(/\/+$/, '');
        const targetUrl = new URL(url.pathname + url.search, backendOrigin);

        const newHeaders = new Headers(request.headers);
        newHeaders.set('X-Forwarded-Host', url.host);
        newHeaders.set('X-Forwarded-Proto', url.protocol.replace(':', ''));

        try {
          return await fetch(targetUrl.toString(), {
            method: request.method,
            headers: newHeaders,
            body: request.body,
            redirect: 'follow',
          });
        } catch (err: any) {
          return new Response(
            JSON.stringify({
              error: 'Failed to connect to backend service',
              details: err.message,
            }),
            {
              status: 502,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }

      // If no backend URL configured, return health check if requested
      if (url.pathname === '/api/health') {
        return new Response(
          JSON.stringify({
            status: 'ok',
            worker: 'active',
            timestamp: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: 'Backend API service is not configured.',
          message:
            'Please configure BACKEND_URL in your Cloudflare Workers environment settings to route /api requests.',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. All other requests (HTML, JS, CSS, fonts, assets) served via Static Assets with SPA fallback
    return env.ASSETS.fetch(request);
  },
};
