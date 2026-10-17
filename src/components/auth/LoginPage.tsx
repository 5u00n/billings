import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getActiveFirebaseConfig,
  saveCustomFirebaseConfig,
  clearCustomFirebaseConfig,
  FirebaseConfig,
} from '../../lib/firebase';
import {
  Lock,
  Mail,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Settings,
  ArrowRight,
  Server,
  X,
  ChevronDown,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';

export const LoginPage: React.FC = () => {
  const {
    isConfigured,
    error,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    signInAsDemoUser,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isEmailExpanded, setIsEmailExpanded] = useState(false);

  // Config modal state
  const currentConfig = getActiveFirebaseConfig() || {};
  const [configForm, setConfigForm] = useState<FirebaseConfig>({
    apiKey: currentConfig.apiKey || '',
    authDomain: currentConfig.authDomain || '',
    projectId: currentConfig.projectId || '',
    storageBucket: currentConfig.storageBucket || '',
    messagingSenderId: currentConfig.messagingSenderId || '',
    appId: currentConfig.appId || '',
  });

  const [allowedEmailsInput, setAllowedEmailsInput] = useState(() => {
    try {
      return localStorage.getItem('billings_allowed_emails') || 'surenhembram97@gmail.com, me.ben007@gmail.com';
    } catch {
      return 'surenhembram97@gmail.com, me.ben007@gmail.com';
    }
  });

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch {
      // Error handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setResetSent(false);

    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else if (mode === 'signup') {
        await signUpWithEmail(email, password);
      } else if (mode === 'reset') {
        await sendPasswordReset(email);
        setResetSent(true);
      }
    } catch {
      // Error handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configForm.apiKey || !configForm.projectId) {
      alert('API Key and Project ID are required.');
      return;
    }
    try {
      localStorage.setItem('billings_allowed_emails', allowedEmailsInput);
    } catch {}
    saveCustomFirebaseConfig(configForm);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/30 px-6 py-3.5 flex items-center justify-between text-xs backdrop-blur-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600/90 flex items-center justify-center font-bold text-white text-sm shadow-xs">
            H
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200 tracking-tight">Suren Billings</span>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <span className="text-slate-400 text-xs hidden sm:inline">Workspace Portal</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-500 hidden sm:inline font-mono">Chakulia, IN</span>
          <button
            onClick={() => setShowConfigModal(true)}
            title="Firebase Deployment Settings"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Center Auth Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-sm space-y-4">
          {/* Card Title Header */}
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-white">
              {mode === 'signin' && 'Sign in to workspace'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'reset' && 'Reset account password'}
            </h1>
            <p className="text-xs text-slate-400">
              {mode === 'signin' && 'Access invoices, accounts, and tax audit records.'}
              {mode === 'signup' && 'Register your authorized administrator account.'}
              {mode === 'reset' && 'Enter your email to receive password reset instructions.'}
            </p>
          </div>

          {/* Configuration Missing Notice */}
          {!isConfigured && (
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-900/60 text-amber-200 text-xs flex items-start gap-2.5 shadow-xs">
              <Server className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1 text-[11px]">
                <div className="font-semibold text-amber-300">Firebase Keys Pending</div>
                <div className="text-amber-200/80 leading-relaxed">
                  Enter your credentials in deployment settings or launch in offline mode.
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    onClick={() => setShowConfigModal(true)}
                    className="font-medium text-amber-300 underline underline-offset-2 hover:text-white cursor-pointer"
                  >
                    Configure
                  </button>
                  <span className="text-amber-700">•</span>
                  <button
                    onClick={signInAsDemoUser}
                    className="font-medium text-amber-300 underline underline-offset-2 hover:text-white cursor-pointer"
                  >
                    Offline Mode
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Form Container */}
          <Card className="bg-slate-900/80 border-slate-800 shadow-xl rounded-2xl overflow-hidden backdrop-blur-md">
            <CardContent className="p-5 sm:p-6 space-y-4">
              {/* Error Alert */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed text-[11px]">{error}</div>
                  <button onClick={clearError} className="text-rose-400 hover:text-rose-200 cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Password Reset Success Alert */}
              {resetSent && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-900/60 text-emerald-300 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-[11px]">Password reset email sent! Check your inbox.</span>
                </div>
              )}

              {mode === 'signin' ? (
                <div className="space-y-3">
                  {/* Primary 1-Click Google Sign In */}
                  <Button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading || !isConfigured}
                    variant="outline"
                    className="w-full h-11 bg-slate-950 hover:bg-slate-800/90 text-slate-200 hover:text-white border-slate-700/80 font-medium text-xs flex items-center justify-center gap-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
                  </Button>

                  {/* Expandable Email/Password Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsEmailExpanded(!isEmailExpanded)}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-950/50 hover:bg-slate-900/70 text-xs font-medium text-slate-400 hover:text-slate-200 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors" />
                      <span>{isEmailExpanded ? 'Hide email options' : 'Sign in with email & password'}</span>
                    </span>
                    <ChevronDown
                      className={cn(
                        'w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform duration-200',
                        isEmailExpanded && 'rotate-180'
                      )}
                    />
                  </button>

                  {/* Expandable Form Body */}
                  <div
                    className={cn(
                      'transition-all duration-300 ease-in-out overflow-hidden',
                      isEmailExpanded ? 'max-h-[500px] opacity-100 pt-1' : 'max-h-0 opacity-0 pointer-events-none'
                    )}
                  >
                    <form onSubmit={handleEmailSubmit} className="space-y-3 pt-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">Email address</label>
                        <div className="relative">
                          <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                          <Input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@example.com"
                            className="pl-8.5 bg-slate-950 border-slate-800 text-xs text-slate-100 placeholder:text-slate-600 focus:border-blue-500 h-9 rounded-xl"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-medium text-slate-400">Password</label>
                          <button
                            type="button"
                            onClick={() => {
                              clearError();
                              setMode('reset');
                            }}
                            className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <div className="relative">
                          <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                          <Input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="pl-8.5 bg-slate-950 border-slate-800 text-xs text-slate-100 placeholder:text-slate-600 focus:border-blue-500 h-9 rounded-xl"
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={loading || !isConfigured}
                        className="w-full h-9 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-xl shadow-xs transition-colors cursor-pointer mt-1"
                      >
                        {loading ? 'Verifying...' : 'Sign In'}
                      </Button>

                      <div className="text-center pt-1.5 text-xs text-slate-400">
                        Don't have an account?{' '}
                        <button
                          type="button"
                          onClick={() => {
                            clearError();
                            setMode('signup');
                          }}
                          className="font-medium text-blue-400 hover:text-blue-300 cursor-pointer"
                        >
                          Sign up
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : (
                /* Sign Up or Reset Password Mode */
                <form onSubmit={handleEmailSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Email address</label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                      <Input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="pl-8.5 bg-slate-950 border-slate-800 text-xs text-slate-100 placeholder:text-slate-600 focus:border-blue-500 h-9 rounded-xl"
                      />
                    </div>
                  </div>

                  {mode === 'signup' && (
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">Create password</label>
                      <div className="relative">
                        <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                        <Input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Minimum 6 characters"
                          className="pl-8.5 bg-slate-950 border-slate-800 text-xs text-slate-100 placeholder:text-slate-600 focus:border-blue-500 h-9 rounded-xl"
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading || (!isConfigured && mode !== 'reset')}
                    className="w-full h-9 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    {loading
                      ? 'Processing...'
                      : mode === 'signup'
                      ? 'Create Account'
                      : 'Send Reset Link'}
                  </Button>

                  <div className="text-center pt-2 text-xs text-slate-400 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        clearError();
                        setMode('signin');
                      }}
                      className="font-medium text-blue-400 hover:text-blue-300 cursor-pointer"
                    >
                      ← Back to sign in
                    </button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Offline / Local Demo Access */}
          <div className="text-center pt-1">
            <button
              onClick={signInAsDemoUser}
              className="text-xs text-slate-500 hover:text-slate-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Offline / Local Workspace Access</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </main>

      {/* Clean Minimal Footer */}
      <footer className="border-t border-slate-800/60 bg-slate-900/20 px-6 py-3 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-1.5">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>Udyam Registered Micro-Enterprise (UDYAM-JH-06-0090498)</span>
        </div>
        <div>Suren Hembram • Chakulia, Jharkhand</div>
      </footer>

      {/* Deployment & Firebase Credentials Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm text-white">Firebase Deployment Settings</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              When hosting this suite anywhere (Vercel, Render, Railway, VPS, Cloud Run), enter your Firebase Web App credentials below. They are securely saved for your deployment.
            </p>

            <form onSubmit={handleSaveConfig} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">API Key *</label>
                  <Input
                    required
                    value={configForm.apiKey}
                    onChange={(e) => setConfigForm({ ...configForm, apiKey: e.target.value })}
                    placeholder="AIzaSy..."
                    className="bg-slate-950 border-slate-800 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Project ID *</label>
                  <Input
                    required
                    value={configForm.projectId}
                    onChange={(e) => setConfigForm({ ...configForm, projectId: e.target.value })}
                    placeholder="my-billing-suite"
                    className="bg-slate-950 border-slate-800 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Auth Domain</label>
                  <Input
                    value={configForm.authDomain}
                    onChange={(e) => setConfigForm({ ...configForm, authDomain: e.target.value })}
                    placeholder="my-billing-suite.firebaseapp.com"
                    className="bg-slate-950 border-slate-800 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">App ID</label>
                  <Input
                    value={configForm.appId}
                    onChange={(e) => setConfigForm({ ...configForm, appId: e.target.value })}
                    placeholder="1:123456789:web:abcdef"
                    className="bg-slate-950 border-slate-800 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Storage Bucket</label>
                  <Input
                    value={configForm.storageBucket}
                    onChange={(e) => setConfigForm({ ...configForm, storageBucket: e.target.value })}
                    placeholder="my-billing-suite.firebasestorage.app"
                    className="bg-slate-950 border-slate-800 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Messaging Sender ID</label>
                  <Input
                    value={configForm.messagingSenderId}
                    onChange={(e) => setConfigForm({ ...configForm, messagingSenderId: e.target.value })}
                    placeholder="123456789"
                    className="bg-slate-950 border-slate-800 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold text-xs">
                  Allowed Administrator Emails (comma-separated)
                </label>
                <Input
                  value={allowedEmailsInput}
                  onChange={(e) => setAllowedEmailsInput(e.target.value)}
                  placeholder="surenhembram97@gmail.com, me.ben007@gmail.com"
                  className="bg-slate-950 border-slate-800 text-xs font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Leave empty to allow all registered users, or enter specific emails allowed to access your suite.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={clearCustomFirebaseConfig}
                  className="text-xs text-rose-400 hover:text-rose-300 underline"
                >
                  Reset to Environment Variables
                </button>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowConfigModal(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-white border-slate-700 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
                  >
                    Save & Activate
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
