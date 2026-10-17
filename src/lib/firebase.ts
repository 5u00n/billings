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

const STORAGE_KEY = 'billings_firebase_config';

export function getActiveFirebaseConfig(): FirebaseConfig | null {
  // 1. Check runtime localStorage override
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch {}

  // 2. Check Vite environment variables
  const envConfig: FirebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };

  if (envConfig.apiKey && envConfig.projectId) {
    return envConfig;
  }

  return null;
}

export function saveCustomFirebaseConfig(config: FirebaseConfig): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.location.reload();
    return true;
  } catch (err) {
    console.error('Failed to save Firebase configuration:', err);
    return false;
  }
}

export function clearCustomFirebaseConfig() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  } catch {}
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const config = getActiveFirebaseConfig();
if (config) {
  try {
    app = getApps().length === 0 ? initializeApp(config as any) : getApp();
    auth = getAuth(app);
  } catch (err) {
    console.error('Firebase initialization error:', err);
  }
}

export { app, auth, googleProvider };
export const isFirebaseConfigured = Boolean(auth);
