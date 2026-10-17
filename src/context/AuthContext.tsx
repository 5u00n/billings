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
import { auth, googleProvider, isFirebaseConfigured } from '../lib/firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isDemoUser?: boolean;
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
  signInAsDemoUser: () => void;
  signOutUser: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  clearError: () => void;
}

const DEMO_USER_STORAGE_KEY = 'billings_demo_user_session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check allowed emails list strictly from environment configuration
  const allowedEmailsStr = import.meta.env.VITE_ALLOWED_EMAILS || '';
  const allowedEmails = allowedEmailsStr
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);

  const validateAllowedUser = (email: string | null): boolean => {
    if (allowedEmails.length === 0) return true; // No restriction configured
    if (!email) return false;
    return allowedEmails.includes(email.toLowerCase());
  };

  useEffect(() => {
    // 1. Check if Firebase is active
    if (auth && isFirebaseConfigured) {
      const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
        if (fbUser) {
          if (!validateAllowedUser(fbUser.email)) {
            if (auth) signOut(auth);
            setError(`Access restricted. Email ${fbUser.email} is not in the allowed administrator list.`);
            setUser(null);
            setFirebaseUser(null);
          } else {
            setFirebaseUser(fbUser);
            setUser({
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Administrator',
              photoURL: fbUser.photoURL,
              isDemoUser: false,
            });
            setError(null);
          }
        } else {
          setFirebaseUser(null);
          // Check if local demo session was active
          checkDemoSession();
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Firebase not configured yet, check for demo session
      checkDemoSession();
      setLoading(false);
    }
  }, []);

  const checkDemoSession = () => {
    try {
      const demoSession = localStorage.getItem(DEMO_USER_STORAGE_KEY);
      if (demoSession === 'true') {
        setUser({
          uid: 'demo-local-admin',
          email: 'local-owner@suren.finance',
          displayName: 'Local Workspace Owner',
          photoURL: null,
          isDemoUser: true,
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  const signInWithGoogle = async () => {
    if (!auth) throw new Error('Firebase Authentication is not configured yet.');
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (!validateAllowedUser(result.user.email)) {
        await signOut(auth);
        throw new Error(`Access restricted. Email ${result.user.email} is not authorized for this suite.`);
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
    if (!auth) throw new Error('Firebase Authentication is not configured yet.');
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      if (!validateAllowedUser(result.user.email)) {
        await signOut(auth);
        throw new Error(`Access restricted. Email ${result.user.email} is not authorized.`);
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

  const signUpWithEmail = async (email: string, pass: string) => {
    if (!auth) throw new Error('Firebase Authentication is not configured yet.');
    setError(null);
    try {
      if (!validateAllowedUser(email)) {
        throw new Error(`Registration restricted. Email ${email} is not authorized.`);
      }
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      console.error('Sign up error:', err);
      let msg = err.message || 'Failed to create account.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      }
      setError(msg);
      throw err;
    }
  };

  const sendPasswordReset = async (email: string) => {
    if (!auth) throw new Error('Firebase Authentication is not configured yet.');
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to send password reset email.');
      throw err;
    }
  };

  const signInAsDemoUser = () => {
    localStorage.setItem(DEMO_USER_STORAGE_KEY, 'true');
    setUser({
      uid: 'demo-local-admin',
      email: 'local-owner@suren.finance',
      displayName: 'Local Workspace Owner',
      photoURL: null,
      isDemoUser: true,
    });
    setError(null);
  };

  const signOutUser = async () => {
    localStorage.removeItem(DEMO_USER_STORAGE_KEY);
    if (auth && firebaseUser) {
      await signOut(auth);
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
        isConfigured: isFirebaseConfigured,
        error,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        sendPasswordReset,
        signInAsDemoUser,
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
