import { getFirebaseAuth } from './firebase';
import { offlineCache } from './offlineCache';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;
let pendingTokenPromise: Promise<string | null> | null = null;

// Firebase tokens are valid for 60 minutes; refresh after 45 minutes
const TOKEN_TTL_MS = 45 * 60 * 1000;

export async function getAuthToken(forceRefresh = false): Promise<string | null> {
  const now = Date.now();

  // Return cached token if valid and not force-refreshing
  if (!forceRefresh && cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  // Deduplicate concurrent token requests into a single promise
  if (pendingTokenPromise) {
    return pendingTokenPromise;
  }

  pendingTokenPromise = (async () => {
    const auth = getFirebaseAuth();
    if (auth && auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken(forceRefresh);
        if (token) {
          cachedToken = token;
          tokenExpiresAt = Date.now() + TOKEN_TTL_MS;
          return token;
        }
      } catch (e) {
        console.warn('Failed to retrieve Firebase ID token:', e);
      }
    }
    return null;
  })().finally(() => {
    pendingTokenPromise = null;
  });

  return pendingTokenPromise;
}

export function clearAuthTokenCache() {
  cachedToken = null;
  tokenExpiresAt = 0;
}

/**
 * Creates a synthetic Response object from cached JSON data.
 */
function createSyntheticResponse(data: unknown, isOffline = false, timestamp = Date.now()): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    statusText: 'OK',
    headers: new Headers({
      'Content-Type': 'application/json',
      'X-Cache': isOffline ? 'HIT-OFFLINE' : 'HIT',
      'X-Cache-Timestamp': String(timestamp),
    }),
  });
}

export function setupAuthFetchInterceptor() {
  if (typeof window === 'undefined') return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    let urlStr = '';
    if (typeof input === 'string') {
      urlStr = input;
    } else if (input instanceof URL) {
      urlStr = input.toString();
    } else if (input && typeof (input as Request).url === 'string') {
      urlStr = (input as Request).url;
    }

    const method = (init.method || 'GET').toUpperCase();

    // Determine if this is an internal API call
    const isApiCall = urlStr.startsWith('/api/');
    const isProtectedApi =
      isApiCall &&
      !urlStr.startsWith('/api/config') &&
      !urlStr.startsWith('/api/health');

    // 1. OFFLINE FAST PATH FOR GET REQUESTS
    if (isApiCall && method === 'GET') {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

      if (isOffline) {
        const cached = offlineCache.get(urlStr);
        if (cached) {
          return createSyntheticResponse(cached.data, true, cached.timestamp);
        }
        return new Response(
          JSON.stringify({
            error: 'You are currently offline and this data has not been cached yet.',
            offline: true,
          }),
          {
            status: 503,
            statusText: 'Offline Unavailable',
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // 2. INJECT FIREBASE AUTH TOKEN
    if (isProtectedApi) {
      const token = await getAuthToken();
      if (token) {
        const headers = new Headers(init.headers || {});
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        init = { ...init, headers };
      }
    }

    // 3. EXECUTE NETWORK FETCH WITH SWR CACHING & OFFLINE FALLBACK
    try {
      let res = await originalFetch(input, init);

      // Handle 401 Unauthorized by refreshing token and retrying once
      if (res.status === 401 && isProtectedApi) {
        clearAuthTokenCache();
        const freshToken = await getAuthToken(true);
        if (freshToken) {
          const retryHeaders = new Headers(init.headers || {});
          retryHeaders.set('Authorization', `Bearer ${freshToken}`);
          res = await originalFetch(input, { ...init, headers: retryHeaders });
        }
      }

      // If GET /api/* succeeded, update cache in background
      if (isApiCall && method === 'GET' && res.status >= 200 && res.status < 300) {
        try {
          const cloned = res.clone();
          cloned
            .json()
            .then((data) => {
              offlineCache.set(urlStr, data);
            })
            .catch(() => {});
        } catch {}
      }

      // If Mutation (/api/* POST/PUT/DELETE) succeeded, invalidate dependent cache
      if (isApiCall && method !== 'GET' && res.status >= 200 && res.status < 300) {
        offlineCache.invalidateOnMutation(urlStr);
      }

      return res;
    } catch (networkError) {
      // 4. NETWORK FAILURE FALLBACK
      // If network is down or request failed, attempt to serve from offline cache
      if (isApiCall && method === 'GET') {
        const cached = offlineCache.get(urlStr);
        if (cached) {
          console.info(`[Offline Fallback] Serving cached data for ${urlStr}`);
          return createSyntheticResponse(cached.data, true, cached.timestamp);
        }
      }

      throw networkError;
    }
  };
}
