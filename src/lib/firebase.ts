import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';

export interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

export function getActiveFirebaseConfig(): FirebaseConfig | null {
  const runtimeEnv = typeof window !== 'undefined' ? (window as any).__ENV__ || {} : {};

  const envConfig: FirebaseConfig = {
    apiKey: runtimeEnv.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: runtimeEnv.VITE_FIREBASE_AUTH_DOMAIN || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: runtimeEnv.VITE_FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: runtimeEnv.VITE_FIREBASE_STORAGE_BUCKET || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: runtimeEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: runtimeEnv.VITE_FIREBASE_APP_ID || import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: runtimeEnv.VITE_FIREBASE_MEASUREMENT_ID || import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };

  if (envConfig.apiKey && envConfig.projectId) {
    return envConfig;
  }

  return null;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function initFirebase(cfg: FirebaseConfig): boolean {
  if (!cfg.apiKey || !cfg.projectId) return false;
  try {
    app = getApps().length === 0 ? initializeApp(cfg as any) : getApp();
    auth = getAuth(app);
    return true;
  } catch (err) {
    console.error('Firebase initialization error:', err);
    return false;
  }
}

export function getFirebaseAuth(): Auth | null {
  return auth;
}

export async function ensureFirebaseInitialized(): Promise<boolean> {
  if (auth) return true;
  const cfg = getActiveFirebaseConfig();
  if (cfg && initFirebase(cfg)) return true;

  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const serverConfig = await res.json();
      const mapped: FirebaseConfig = {
        apiKey: serverConfig.VITE_FIREBASE_API_KEY,
        authDomain: serverConfig.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: serverConfig.VITE_FIREBASE_PROJECT_ID,
        storageBucket: serverConfig.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: serverConfig.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: serverConfig.VITE_FIREBASE_APP_ID,
        measurementId: serverConfig.VITE_FIREBASE_MEASUREMENT_ID,
      };
      if (mapped.apiKey && mapped.projectId) {
        if (typeof window !== 'undefined') {
          (window as any).__ENV__ = { ...((window as any).__ENV__ || {}), ...serverConfig };
        }
        return initFirebase(mapped);
      }
    }
  } catch {}
  return false;
}

// Initial synchronous attempt from compile-time or runtime env
const initialConfig = getActiveFirebaseConfig();
if (initialConfig) {
  initFirebase(initialConfig);
}

export { app, auth, googleProvider };
export const isFirebaseConfigured = Boolean(auth);
