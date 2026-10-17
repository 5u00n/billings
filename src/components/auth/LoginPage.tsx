import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Lock,
  Mail,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
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
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [isEmailExpanded, setIsEmailExpanded] = useState(false);

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
          <span className="text-[11px] text-slate-500 font-mono">Chakulia, IN</span>
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
                <div className="font-semibold text-amber-300">Authentication Service Offline</div>
                <div className="text-amber-200/80 leading-relaxed">
                  Authentication service is not configured with environment credentials.
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
                        <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                        <Input
                          type="password"
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="pl-8.5 bg-slate-950 border-slate-800 text-xs text-slate-100 placeholder:text-slate-600 focus:border-blue-500 h-9 rounded-xl"
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading || !isConfigured}
                    className="w-full h-10 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    {loading
                      ? 'Processing...'
                      : mode === 'signup'
                      ? 'Register Account'
                      : 'Send Reset Link'}
                  </Button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        clearError();
                        setMode('signin');
                      }}
                      className="font-medium text-blue-400 hover:text-blue-300 cursor-pointer text-xs"
                    >
                      ← Back to sign in
                    </button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
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
    </div>
  );
};
