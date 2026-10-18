import { getFirebaseAuth } from './firebase';

export async function getAuthToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  if (auth && auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken();
    } catch (e) {
      console.warn('Failed to retrieve Firebase ID token:', e);
    }
  }
  return null;
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

    // Intercept internal /api calls excluding public config and health
    const isProtectedApi =
      urlStr.startsWith('/api/') &&
      !urlStr.startsWith('/api/config') &&
      !urlStr.startsWith('/api/health');

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

    return originalFetch(input, init);
  };
}
