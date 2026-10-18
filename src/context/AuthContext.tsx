import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  auth,
  googleProvider,
  isFirebaseConfigured,
  ensureFirebaseInitialized,
  getFirebaseAuth,
} from '../lib/firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isConfigured: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(isFirebaseConfigured);
  const [error, setError] = useState<string | null>(null);

  const verifyUserAuthorization = async (fbUser: FirebaseUser): Promise<boolean> => {
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch('/api/auth/verify', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.status === 403) {
        return false;
      }
      return res.ok;
    } catch (e) {
      console.warn('Auth verification network error, permitting if local dev:', e);
      return true;
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let isMounted = true;

    const setupAuth = async () => {
      let currentAuth = getFirebaseAuth();
      if (!currentAuth) {
        const ok = await ensureFirebaseInitialized();
        if (ok && isMounted) {
          setIsConfigured(true);
          currentAuth = getFirebaseAuth();
        }
      } else if (isMounted) {
        setIsConfigured(true);
      }

      if (currentAuth && isMounted) {
        unsubscribe = onAuthStateChanged(currentAuth, async (fbUser) => {
          if (!isMounted) return;
          if (fbUser) {
            const isAuthorized = await verifyUserAuthorization(fbUser);
            if (!isMounted) return;

            if (!isAuthorized) {
              if (currentAuth) signOut(currentAuth);
              setError('Access restricted. Your account is not authorized to access this console.');
              setUser(null);
              setFirebaseUser(null);
            } else {
              setFirebaseUser(fbUser);
              setUser({
                uid: fbUser.uid,
                email: fbUser.email,
                displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Administrator',
                photoURL: fbUser.photoURL,
              });
              setError(null);
            }
          } else {
            setFirebaseUser(null);
            setUser(null);
          }
          setLoading(false);
        });
      } else if (isMounted) {
        setUser(null);
        setFirebaseUser(null);
        setLoading(false);
      }
    };

    setupAuth();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    const currentAuth = getFirebaseAuth();
    if (!currentAuth) throw new Error('Firebase Authentication is not configured yet.');
    setError(null);
    try {
      const result = await signInWithPopup(currentAuth, googleProvider);
      const isAuthorized = await verifyUserAuthorization(result.user);
      if (!isAuthorized) {
        await signOut(currentAuth);
        throw new Error('Access restricted. Your account is not authorized for this suite.');
      }
    } catch (err: any) {
      console.error('Google sign in error:', err);
      let msg = err.message || 'Failed to sign in with Google.';
      if (err.code === 'auth/popup-closed-by-user') {
        msg = 'Sign in was cancelled.';
      } else if (err.code === 'auth/unauthorized-domain') {
        msg = 'This domain is not authorized in Firebase Console > Authentication > Settings > Authorized Domains.';
      }
      setError(msg);
      throw err;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    const currentAuth = getFirebaseAuth();
    if (!currentAuth) throw new Error('Firebase Authentication is not configured yet.');
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(currentAuth, email, pass);
      const isAuthorized = await verifyUserAuthorization(result.user);
      if (!isAuthorized) {
        await signOut(currentAuth);
        throw new Error('Access restricted. Your account is not authorized.');
      }
    } catch (err: any) {
      console.error('Email sign in error:', err);
      let msg = err.message || 'Failed to sign in.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password.';
      }
      setError(msg);
      throw err;
    }
  };

  const signUpWithEmail = async () => {
    throw new Error('Public user self-registration is disabled for this secure suite.');
  };

  const sendPasswordReset = async (email: string) => {
    const currentAuth = getFirebaseAuth();
    if (!currentAuth) throw new Error('Firebase Authentication is not configured yet.');
    setError(null);
    try {
      await sendPasswordResetEmail(currentAuth, email);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to send password reset email.');
      throw err;
    }
  };

  const signOutUser = async () => {
    const currentAuth = getFirebaseAuth();
    if (currentAuth && firebaseUser) {
      await signOut(currentAuth);
    }
    setUser(null);
    setFirebaseUser(null);
  };

  const getIdToken = async (): Promise<string | null> => {
    if (firebaseUser) {
      return await firebaseUser.getIdToken();
    }
    return null;
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        isConfigured,
        error,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        sendPasswordReset,
        signOutUser,
        getIdToken,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
