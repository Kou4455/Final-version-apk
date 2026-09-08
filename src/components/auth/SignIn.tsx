import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient.js';
import { useRide } from '../../context/RideContext';
import { UserProfile } from '../../types';
import { signInWithGoogle } from '../../services/firebase';
import { 
  AlertCircle, 
  CheckCircle2, 
  RotateCw, 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  ArrowLeft 
} from 'lucide-react';

export interface SignInProps {
  initialEmail?: string;
  fromSignup?: boolean;
  onNavigateToSignUp?: () => void;
  onLoginSuccess?: () => void;
  onBack?: () => void;
}

export const SignIn: React.FC<SignInProps> = ({ 
  initialEmail, 
  fromSignup, 
  onNavigateToSignUp, 
  onLoginSuccess, 
  onBack 
}) => {
  const { loginUser, triggerSound } = useRide();

  // Read initial email from prop, or URL query parameters
  const [email, setEmail] = useState<string>(() => {
    if (initialEmail) return initialEmail;
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('email') || '';
    } catch {
      return '';
    }
  });

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setErrorMsg('');
      triggerSound('beep');

      const fbUser = await signInWithGoogle();
      const cleanPhone = (fbUser.phoneNumber || '').replace(/\D/g, '');

      const userProfile: UserProfile = {
        id: fbUser.uid,
        name: fbUser.displayName || 'Passenger',
        email: fbUser.email || '',
        phone: fbUser.phoneNumber || (cleanPhone ? `+91 ${cleanPhone.slice(-10)}` : ''),
        avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/personas/svg?seed=${fbUser.uid}`,
        rating: 4.95,
        totalRides: 0,
        savedPlaces: {},
        walletBalance: 250,
        createdAt: new Date().toISOString()
      };

      await loginUser(userProfile);
      triggerSound('success');
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (err?.code !== 'auth/operation-not-allowed') {
        console.warn('Google Sign-In notice:', err);
      }
      if (err?.code === 'auth/popup-blocked') {
        setErrorMsg('Sign-in popup was blocked by your browser. Please allow popups and try again.');
        return;
      }
      setErrorMsg(err?.message || 'Google Sign-In failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Show success message if user just registered (via prop or URL query parameter)
  const [successMessage, setSuccessMessage] = useState<string | null>(() => {
    if (fromSignup) {
      return 'Your account has been created. Please check your email and verify your address before logging in.';
    }
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('registered') === 'true') {
        return 'Your account has been created. Please check your email and verify your address before logging in.';
      }
    } catch {}
    return null;
  });

  // Sync if initialEmail or fromSignup prop changes dynamically
  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    if (fromSignup) {
      setSuccessMessage('Your account has been created. Please check your email and verify your address before logging in.');
    }
  }, [fromSignup]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Please enter your email address.');
      triggerSound('alert');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      triggerSound('alert');
      return;
    }

    setLoading(true);
    triggerSound('beep');

    try {
      // 1. Supabase email/password sign-in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (error) {
        throw error;
      }

      // 2. Successful sign-in
      if (data?.user) {
        const u = data.user;
        const targetEmail = u.email || cleanEmail;
        const targetName = u.user_metadata?.full_name || u.user_metadata?.name || targetEmail.split('@')[0];
        const targetAvatar = u.user_metadata?.avatar_url || u.user_metadata?.picture || `https://api.dicebear.com/7.x/personas/svg?seed=${targetEmail}`;
        const targetPhone = u.phone || u.user_metadata?.phone || '+91 98301 45289';

        const profile: UserProfile = {
          id: 'usr_' + (u.id || targetEmail.replace(/[^a-zA-Z0-9]/g, '_')),
          name: typeof targetName === 'string' ? targetName : 'Passenger',
          phone: typeof targetPhone === 'string' ? targetPhone : '+91 98301 45289',
          email: targetEmail,
          rating: 4.95,
          totalRides: 0,
          walletBalance: 250,
          avatarUrl: targetAvatar,
          createdAt: new Date().toISOString()
        };

        await loginUser(profile);
        triggerSound('success');

        // Clean query params on successful login
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete('auth');
        currentUrl.searchParams.delete('email');
        currentUrl.searchParams.delete('registered');
        window.history.replaceState({}, '', currentUrl.toString());

        if (onLoginSuccess) {
          onLoginSuccess();
        }
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      const message = err?.message || 'Failed to sign in. Please check your email and password.';
      if (message.toLowerCase().includes('email not confirmed')) {
        setErrorMsg('Your email address is not yet verified. Please check your inbox and confirm your email before signing in.');
      } else if (message.toLowerCase().includes('invalid login credentials')) {
        setErrorMsg('Invalid email or password. Please try again.');
      } else {
        setErrorMsg(message);
      }
      triggerSound('alert');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToSignUp = () => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('auth', 'signup');
    currentUrl.searchParams.delete('registered');
    window.history.pushState({}, '', currentUrl.toString());

    if (onNavigateToSignUp) {
      onNavigateToSignUp();
    }
  };

  return (
    <div 
      id="signin-screen" 
      className="w-full flex-1 sm:flex-initial sm:max-w-md md:max-w-lg mx-auto bg-white sm:rounded-3xl border-0 sm:border border-[#EDE8E0] shadow-none sm:shadow-sm p-5 sm:p-8 text-[#111111] font-sans animate-in fade-in duration-200 flex flex-col justify-between min-h-[calc(100vh-65px)] sm:min-h-0 touch-pan-y"
    >
      <div className="space-y-5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        )}

        {/* Title Typography */}
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            Sign In
          </h1>
          <p className="text-xs font-medium text-neutral-500">
            Enter your email and password to access your account.
          </p>
        </div>

        {/* Success message banner from registration */}
        {successMessage && (
          <div 
            id="signup-success-alert"
            className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-medium flex items-start gap-2.5 shadow-2xs animate-in fade-in duration-300"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {/* Error message banner */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Firebase Google Sign-In Provider Button */}
        <button
          id="signin-google-btn"
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full bg-white hover:bg-neutral-50 active:scale-[0.99] text-neutral-800 font-semibold py-3 px-4 rounded-2xl border border-neutral-300 hover:border-neutral-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E07A00]/30 flex items-center justify-center gap-3 text-xs shadow-xs transition-all cursor-pointer disabled:opacity-60"
        >
          {googleLoading ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin text-neutral-600" />
              <span>Connecting to Google...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.29 21.43 7.37 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.29 2.57 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span className="font-semibold text-neutral-800 text-xs">Continue with Google</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-neutral-200"></div>
          <span className="flex-shrink mx-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            or sign in with email
          </span>
          <div className="flex-grow border-t border-neutral-200"></div>
        </div>

        {/* Sign In Form */}
        <form onSubmit={handleSignIn} className="space-y-3.5 pt-1">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-800">
              Email Address
            </label>
            <div className="relative flex items-center bg-neutral-50 rounded-2xl border border-neutral-200 focus-within:border-[#E07A00] focus-within:bg-white transition-colors px-3 py-2.5">
              <Mail className="w-4 h-4 text-neutral-400 shrink-0 mr-2" />
              <input
                id="signin-email-input"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="name@example.com"
                required
                autoComplete="email"
                className="w-full bg-transparent text-xs font-medium text-neutral-900 placeholder-neutral-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-800">
              Password
            </label>
            <div className="relative flex items-center bg-neutral-50 rounded-2xl border border-neutral-200 focus-within:border-[#E07A00] focus-within:bg-white transition-colors px-3 py-2.5">
              <Lock className="w-4 h-4 text-neutral-400 shrink-0 mr-2" />
              <input
                id="signin-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Your password"
                required
                autoComplete="current-password"
                className="w-full bg-transparent text-xs font-medium text-neutral-900 placeholder-neutral-400 focus:outline-none pr-7"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-neutral-400 hover:text-neutral-600 transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            id="signin-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full bg-[#E07A00] hover:bg-[#C96E00] active:scale-[0.99] text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Switch to Sign Up */}
        <div className="pt-2 text-center">
          <p className="text-xs text-neutral-500">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={handleGoToSignUp}
              className="font-bold text-[#E07A00] hover:underline cursor-pointer"
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
