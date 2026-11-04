import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Mail,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Server,
  X,
  ChevronDown,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { BackgroundBeams } from '@/components/aceternity/background-beams';
import { cn } from '@/lib/utils';

export const LoginPage: React.FC = () => {
  const {
    isConfigured,
    error,
    signInWithGoogle,
    signInWithEmail,
    sendPasswordReset,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'reset'>('signin');
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
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-blue-600 selection:text-white overflow-hidden">
      {/* Background Beams by Aceternity UI */}
      <BackgroundBeams className="z-0" />

      {/* Top Header - Neutral & Non-Leaking */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/40 px-6 py-3.5 flex items-center justify-between text-xs backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs">
            <Lock className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200 tracking-tight">Financial Operations Console</span>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <span className="text-slate-400 text-xs hidden sm:inline">Secure Access Portal</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-[10px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Encrypted (TLS 1.3)
          </span>
        </div>
      </header>

      {/* Center Auth Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-sm space-y-4">
          {/* Card Title Header */}
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-white">
              {mode === 'signin' && 'Authorized Access Only'}
              {mode === 'reset' && 'Reset Account Password'}
            </h1>
            <p className="text-xs text-slate-400">
              {mode === 'signin' && 'Authenticate with your authorized administrator credentials.'}
              {mode === 'reset' && 'Enter your email to receive password reset instructions.'}
            </p>
          </div>

          {/* Configuration Status Notice */}
          {!isConfigured && (
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-900/60 text-amber-200 text-xs flex items-start gap-2.5 shadow-xs">
              <Server className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1 text-[11px]">
                <div className="font-semibold text-amber-300">Authentication Service Connecting</div>
                <div className="text-amber-200/80 leading-relaxed">
                  Initializing secure authentication connection...
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearError}
                    className="h-5 w-5 p-0 text-rose-400 hover:text-rose-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}

              {/* Password Reset Success Alert */}
              {resetSent && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-900/60 text-emerald-300 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-[11px]">Password reset email sent! Check your inbox.</span>
                </div>
              )}

              {/* Primary Single Sign-On Button */}
              <Button
                onClick={handleGoogleSignIn}
                disabled={loading || !isConfigured}
                variant="outline"
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs border border-slate-200 shadow-xs transition-all active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                <span>Continue with Google</span>
              </Button>

              {/* Collapsible Secondary Email Section */}
              <div className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsEmailExpanded(!isEmailExpanded)}
                  className="w-full flex items-center justify-between py-1.5 h-auto text-[11px] font-medium text-slate-400 hover:text-slate-200 transition-colors px-1 hover:bg-transparent"
                >
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email & Password Credentials</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      'w-3.5 h-3.5 transition-transform duration-200',
                      isEmailExpanded && 'rotate-180'
                    )}
                  />
                </Button>

                {isEmailExpanded && (
                  <form onSubmit={handleEmailSubmit} className="space-y-3 pt-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <Input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="admin@organization.com"
                          className="pl-9 bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-blue-500 text-xs h-9"
                        />
                      </div>
                    </div>

                    {mode === 'signin' && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Password
                          </label>
                          <Button
                            type="button"
                            variant="link"
                            onClick={() => {
                              setMode('reset');
                              clearError();
                            }}
                            className="text-[10px] text-blue-400 hover:text-blue-300 p-0 h-auto"
                          >
                            Forgot?
                          </Button>
                        </div>
                        <div className="relative">
                          <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <Input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="pl-9 bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-blue-500 text-xs h-9"
                          />
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={loading || !isConfigured}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 rounded-xl shadow-xs transition-all"
                    >
                      {loading
                        ? 'Verifying...'
                        : mode === 'signin'
                        ? 'Sign In to Workspace'
                        : 'Send Reset Link'}
                    </Button>

                    {mode === 'reset' && (
                      <div className="text-center pt-1">
                        <Button
                          type="button"
                          variant="link"
                          onClick={() => {
                            setMode('signin');
                            clearError();
                          }}
                          className="text-[11px] text-slate-400 hover:text-slate-200 p-0 h-auto"
                        >
                          ← Return to Sign In
                        </Button>
                      </div>
                    )}
                  </form>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Security Assurance Footer Notice */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Strict single-tenant workspace isolation active</span>
          </div>
        </div>
      </main>

      {/* Bottom Footer Notice */}
      <footer className="relative z-10 border-t border-slate-900 bg-slate-950/60 px-6 py-3 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-600">
        <div>Proprietary Financial Platform</div>
        <div>All operations logged & monitored</div>
      </footer>
    </div>
  );
};

