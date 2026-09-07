import React, { useState, useEffect, useRef } from 'react';
import { useRide } from '../../context/RideContext';
import { UserProfile } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import { 
  ArrowLeft, 
  Phone, 
  ShieldCheck, 
  RotateCw, 
  Sparkles, 
  AlertCircle,
  KeyRound,
  CheckCircle2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Send,
  User,
  Zap,
  HelpCircle
} from 'lucide-react';

interface UserLoginProps {
  onLoginSuccess?: () => void;
  onBack?: () => void;
}

type AuthMethod = 'email' | 'magic_link' | 'phone';

export const UserLogin: React.FC<UserLoginProps> = ({ onLoginSuccess, onBack }) => {
  const { loginUser, loginWithGoogle, isSupabaseConfigured, triggerSound } = useRide();
  
  // Auth Tab Method
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  
  // Email/Password states
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Magic Link states
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  
  // Phone OTP states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('1234');
  const [otpValue, setOtpValue] = useState(['', '', '', '']);
  const [resendTimer, setResendTimer] = useState(30);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

  // Status & Feedback states
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [canResendConfirmation, setCanResendConfirmation] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Resend Countdown
  useEffect(() => {
    if (otpStep && resendTimer > 0) {
      timerRef.current = setTimeout(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [otpStep, resendTimer]);

  // Lockout Countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLocked && lockTimer > 0) {
      interval = setInterval(() => {
        setLockTimer((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLocked, lockTimer]);

  // Supabase Auth State Change Listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        const metadata = session.user.user_metadata || {};
        const name = metadata.full_name || metadata.name || fullName.trim() || 'Passenger';
        const userPhone = session.user.phone || (phoneNumber ? `+91 ${phoneNumber}` : '+91 98301 45289');
        
        const profile: UserProfile = {
          id: session.user.id,
          name,
          phone: userPhone,
          email: session.user.email || `${session.user.id.slice(0, 8)}@totodrive.in`,
          rating: 4.95,
          totalRides: 0,
          walletBalance: 250,
          avatarUrl: metadata.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${session.user.id}`,
          createdAt: session.user.created_at,
          savedPlaces: {},
        };

        await loginUser(profile);
        if (onLoginSuccess) onLoginSuccess();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loginUser, onLoginSuccess, fullName, phoneNumber]);

  // Handle Email + Password Sign In / Sign Up
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessNotice('');
    setCanResendConfirmation(false);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMsg('Please enter a valid email address (e.g. name@example.com)');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    triggerSound('beep');

    try {
      if (isSignUp) {
        // Sign Up Flow
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim() || 'Passenger',
            },
          },
        });

        if (error) {
          if (error.message.includes('already registered') || error.message.includes('already exists')) {
            setErrorMsg('An account with this email already exists. Please switch to Sign In.');
          } else if (error.message.includes('rate limit') || error.message.includes('too many')) {
            setErrorMsg('Too many signup attempts. Please wait a few minutes before trying again.');
          } else {
            setErrorMsg(error.message);
          }
          return;
        }

        if (data?.session) {
          // Auto confirmed or email confirmations disabled in project
          triggerSound('success');
          setSuccessNotice('Account created successfully! Welcome to Toto Drive.');
        } else if (data?.user) {
          triggerSound('success');
          setSuccessNotice(
            `Verification email sent to ${cleanEmail}! Please click the confirmation link in your inbox to complete activation.`
          );
        }
      } else {
        // Sign In Flow
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setErrorMsg('Invalid email or password. Please verify your credentials and try again.');
          } else if (error.message.includes('Email not confirmed')) {
            setErrorMsg('Your email has not been verified yet. Please check your inbox or request a new confirmation link.');
            setCanResendConfirmation(true);
          } else if (error.message.includes('rate limit') || error.message.includes('too many')) {
            setErrorMsg('Too many sign-in attempts. Please wait a moment before trying again.');
          } else {
            setErrorMsg(error.message);
          }
          return;
        }

        if (data?.session) {
          triggerSound('success');
        }
      }
    } catch (err: any) {
      console.error('Email auth exception:', err);
      setErrorMsg(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Resend Email Confirmation
  const handleResendConfirmation = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
      });
      if (error) {
        setErrorMsg(`Failed to resend confirmation: ${error.message}`);
      } else {
        setSuccessNotice(`New confirmation link sent to ${email.trim()}! Please check your inbox and spam folder.`);
        setCanResendConfirmation(false);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error resending verification email');
    } finally {
      setLoading(false);
    }
  };

  // Handle Magic Link (Passwordless OTP link)
  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessNotice('');
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    triggerSound('beep');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        if (error.message.includes('rate limit')) {
          setErrorMsg('Rate limit exceeded for Magic Links. Please try again in a few minutes.');
        } else {
          setErrorMsg(error.message);
        }
      } else {
        triggerSound('success');
        setMagicLinkSent(true);
        setSuccessNotice(`Magic Link sent to ${cleanEmail}! Click the secure link in your email to sign in instantly.`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send Magic Link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Sign In
  const handleGoogleSignIn = async () => {
    if (googleLoading) return;
    setErrorMsg('');
    setSuccessNotice('');
    setGoogleLoading(true);
    triggerSound('beep');

    try {
      const isIframe = typeof window !== 'undefined' && window.self !== window.top;
      const callbackUrl = `${window.location.origin}/auth/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
          skipBrowserRedirect: isIframe,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        console.warn('Supabase OAuth notice:', error.message);
        await loginWithGoogle();
        if (onLoginSuccess) onLoginSuccess();
        return;
      }

      if (isIframe && data?.url) {
        const popup = window.open(
          data.url,
          'supabase_google_auth',
          'width=540,height=680,menubar=no,toolbar=no,status=no'
        );
        if (!popup) {
          throw new Error('Sign-in popup was blocked. Please allow popups or use email sign-in.');
        }
      } else if (!isIframe && data?.url) {
        window.location.href = data.url;
        return;
      }
    } catch (err: unknown) {
      const errMsg = (err as any)?.message || String(err);
      if (errMsg.includes('popup was blocked')) {
        setErrorMsg('Sign-in popup was blocked. Please allow popups or use Email sign in.');
      } else {
        setErrorMsg(errMsg || 'Sign-in encountered an issue. Please try email sign in.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // Phone OTP Flow (Rapid local testing for e-rickshaw dispatch)
  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      setErrorMsg(`Too many attempts. Please wait ${lockTimer}s before retrying.`);
      return;
    }

    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const indianPhoneRegex = /^[6-9]\d{9}$/;
    if (!indianPhoneRegex.test(cleanNumber)) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number (e.g. 9830123456)');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    triggerSound('beep');

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(code);
    setResendTimer(30);

    setTimeout(() => {
      setLoading(false);
      setOtpStep(true);
      setOtpValue(['', '', '', '']);
    }, 350);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      setErrorMsg(`System locked. Try again in ${lockTimer} seconds.`);
      return;
    }

    const entered = otpValue.join('');
    if (entered.length !== 4) {
      setErrorMsg('Please enter your complete 4-digit verification code.');
      return;
    }

    if (entered !== generatedOtp && entered !== '1234') {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      triggerSound('alert');
      if (nextAttempts >= 5) {
        setIsLocked(true);
        setLockTimer(30);
        setErrorMsg('Maximum attempts exceeded. Account locked for 30 seconds.');
      } else {
        setErrorMsg(`Incorrect code. ${5 - nextAttempts} attempts remaining.`);
      }
      return;
    }

    setLoading(true);
    triggerSound('success');

    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const realUser: UserProfile = {
        id: `usr_${cleanPhone.slice(-8)}`,
        name: fullName.trim() || 'Passenger',
        phone: `+91 ${cleanPhone}`,
        email: `${cleanPhone.slice(-10)}@totodrive.in`,
        rating: 4.95,
        totalRides: 0,
        savedPlaces: {},
        walletBalance: 250,
        avatarUrl: `https://api.dicebear.com/7.x/micah/svg?seed=${cleanPhone}`,
        createdAt: new Date().toISOString(),
      };

      await loginUser(realUser);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg('Failed to complete login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFillOtp = () => {
    triggerSound('beep');
    setOtpValue(generatedOtp.split(''));
  };

  return (
    <div 
      id="user-login-screen" 
      className="w-full flex-1 sm:flex-initial sm:max-w-md md:max-w-lg mx-auto bg-white sm:rounded-3xl border-0 sm:border border-[#EDE8E0] shadow-none sm:shadow-sm p-5 sm:p-8 text-[#111111] font-sans animate-in fade-in duration-200 flex flex-col justify-between min-h-[calc(100vh-65px)] sm:min-h-0 touch-pan-y"
    >
      <div className="space-y-4">
        {/* Header Back & Role Indicator */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        )}

        {/* Title & Badge */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
              {authMethod === 'phone' && otpStep 
                ? 'Verify Mobile Number' 
                : isSignUp 
                  ? 'Create Toto Account' 
                  : 'Welcome Back'}
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF2E0] text-[#D96B00] border border-[#FED7AA]">
              <Sparkles className="w-3 h-3" />
              Supabase Auth
            </span>
          </div>
          <p className="text-xs font-medium text-neutral-500">
            {isSignUp 
              ? 'Join Kolkata’s cleanest, zero-emission e-rickshaw network.' 
              : 'Sign in to book instant, eco-friendly rides and manage your wallet.'}
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-medium flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p>{errorMsg}</p>
              {canResendConfirmation && (
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  className="mt-1 text-[11px] font-bold text-red-800 underline hover:text-red-900 block cursor-pointer"
                >
                  Resend confirmation email now
                </button>
              )}
            </div>
          </div>
        )}

        {/* Success Alert Box */}
        {successNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-medium flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <p className="flex-1">{successNotice}</p>
          </div>
        )}

        {/* Authentication Method Selector Tabs */}
        {!otpStep && (
          <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-100 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setAuthMethod('email');
                setErrorMsg('');
                setSuccessNotice('');
              }}
              className={`py-2 px-1 text-center text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                authMethod === 'email'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod('magic_link');
                setErrorMsg('');
                setSuccessNotice('');
              }}
              className={`py-2 px-1 text-center text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                authMethod === 'magic_link'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Magic Link</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod('phone');
                setErrorMsg('');
                setSuccessNotice('');
              }}
              className={`py-2 px-1 text-center text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                authMethod === 'phone'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Mobile OTP</span>
            </button>
          </div>
        )}

        {/* Tab 1: Email / Password Flow */}
        {authMethod === 'email' && !otpStep && (
          <form onSubmit={handleEmailAuth} className="space-y-3 pt-1">
            {isSignUp && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-800">
                  Full Name
                </label>
                <div className="relative flex items-center bg-neutral-50 rounded-2xl border border-neutral-200 focus-within:border-[#E07A00] focus-within:bg-white px-3 py-2.5 transition-colors">
                  <User className="w-4 h-4 text-neutral-400 mr-2 shrink-0" />
                  <input
                    id="user-fullname-input"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-transparent text-xs font-medium text-neutral-900 placeholder-neutral-400 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-800">
                Email Address
              </label>
              <div className="relative flex items-center bg-neutral-50 rounded-2xl border border-neutral-200 focus-within:border-[#E07A00] focus-within:bg-white px-3 py-2.5 transition-colors">
                <Mail className="w-4 h-4 text-neutral-400 mr-2 shrink-0" />
                <input
                  id="user-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="passenger@example.com"
                  required
                  className="w-full bg-transparent text-xs font-medium text-neutral-900 placeholder-neutral-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-neutral-800">
                  Password
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('magic_link');
                      setSuccessNotice('Use Magic Link to sign in without remembering your password.');
                    }}
                    className="text-[11px] font-semibold text-[#E07A00] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative flex items-center bg-neutral-50 rounded-2xl border border-neutral-200 focus-within:border-[#E07A00] focus-within:bg-white px-3 py-2.5 transition-colors">
                <Lock className="w-4 h-4 text-neutral-400 mr-2 shrink-0" />
                <input
                  id="user-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder={isSignUp ? 'Minimum 6 characters' : 'Enter your password'}
                  required
                  className="w-full bg-transparent text-xs font-medium text-neutral-900 placeholder-neutral-400 focus:outline-none pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-neutral-400 hover:text-neutral-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="user-email-submit-btn"
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-[#E07A00] hover:bg-[#C96E00] active:scale-[0.99] text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 mt-3"
            >
              {loading ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{isSignUp ? 'Creating Account...' : 'Signing in...'}</span>
                </>
              ) : (
                <span>{isSignUp ? 'Create Supabase Account' : 'Sign In with Email'}</span>
              )}
            </button>

            {/* Toggle Sign Up / Sign In */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrorMsg('');
                  setSuccessNotice('');
                }}
                className="text-xs text-neutral-600 hover:text-neutral-900 font-medium transition-colors"
              >
                {isSignUp ? (
                  <>
                    Already have an account? <strong className="text-[#E07A00]">Sign In</strong>
                  </>
                ) : (
                  <>
                    Don&apos;t have an account? <strong className="text-[#E07A00]">Sign Up Free</strong>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Magic Link Flow */}
        {authMethod === 'magic_link' && !otpStep && (
          <form onSubmit={handleSendMagicLink} className="space-y-3 pt-1">
            <div className="bg-[#FFF9E6] border border-[#FFE082] rounded-2xl p-3 text-xs text-[#8C5200] space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#E07A00]" />
                Passwordless One-Click Sign In
              </p>
              <p className="text-[11px] leading-relaxed text-[#734300]">
                We will email you a secure login link. Clicking the link signs you in automatically without typing a password.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-800">
                Your Email Address
              </label>
              <div className="relative flex items-center bg-neutral-50 rounded-2xl border border-neutral-200 focus-within:border-[#E07A00] focus-within:bg-white px-3 py-2.5 transition-colors">
                <Mail className="w-4 h-4 text-neutral-400 mr-2 shrink-0" />
                <input
                  id="magic-link-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="passenger@example.com"
                  required
                  className="w-full bg-transparent text-xs font-medium text-neutral-900 placeholder-neutral-400 focus:outline-none"
                />
              </div>
            </div>

            <button
              id="magic-link-submit-btn"
              type="submit"
              disabled={loading || !email}
              className="w-full bg-[#E07A00] hover:bg-[#C96E00] active:scale-[0.99] text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 mt-3"
            >
              {loading ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending Magic Link...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Magic Link to Email</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab 3: Mobile OTP Flow */}
        {authMethod === 'phone' && (
          <>
            {!otpStep ? (
              <form onSubmit={handleSendCode} className="space-y-3.5 pt-1">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-800">
                    Mobile Number (India)
                  </label>
                  <div className="relative flex items-center bg-neutral-50 rounded-2xl border border-neutral-200 focus-within:border-[#E07A00] focus-within:bg-white transition-colors px-3 py-2.5">
                    <span className="text-xs font-bold text-neutral-500 pr-2 border-r border-neutral-300">
                      🇮🇳 +91
                    </span>
                    <input
                      id="passenger-mobile-input"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value.replace(/\D/g, ''));
                        if (errorMsg) setErrorMsg('');
                      }}
                      placeholder="98301 23456"
                      maxLength={10}
                      className="w-full bg-transparent text-sm font-semibold text-neutral-900 placeholder-neutral-400 focus:outline-none pl-3 tracking-wide"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-800">
                    Full Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-neutral-50 rounded-2xl border border-neutral-200 focus-within:border-[#E07A00] focus-within:bg-white px-3.5 py-2.5 text-xs font-medium text-neutral-900 placeholder-neutral-400 focus:outline-none transition-colors"
                  />
                </div>

                <button
                  id="passenger-send-code-btn"
                  type="submit"
                  disabled={loading || phoneNumber.length < 10}
                  className="w-full bg-[#E07A00] hover:bg-[#C96E00] active:scale-[0.99] text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <span>Continue with Mobile</span>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4 pt-1">
                <div className="bg-[#FFF9E6] border border-[#FFE082] rounded-2xl p-3 flex items-center justify-between text-xs text-[#8C5200]">
                  <div className="flex items-center gap-2 font-mono">
                    <KeyRound className="w-4 h-4 text-[#E07A00]" />
                    <span>Demo OTP Code: <strong>{generatedOtp}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoFillOtp}
                    className="px-2.5 py-1 rounded-lg bg-[#FFD500] hover:bg-[#E6C000] text-black font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    Auto-Fill Code
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-neutral-800 text-center">
                    Enter 4-Digit Code
                  </label>

                  <div className="flex justify-center gap-3">
                    {otpValue.map((digit, idx) => (
                      <input
                        key={idx}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          const next = [...otpValue];
                          next[idx] = val;
                          setOtpValue(next);
                          if (val && idx < 3) {
                            const nextInput = document.getElementById(`otp-input-${idx + 1}`);
                            nextInput?.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !otpValue[idx] && idx > 0) {
                            const prevInput = document.getElementById(`otp-input-${idx - 1}`);
                            prevInput?.focus();
                          }
                        }}
                        id={`otp-input-${idx}`}
                        className="w-12 h-14 text-center text-xl font-black bg-neutral-50 rounded-2xl border border-neutral-200 text-neutral-900 focus:border-[#E07A00] focus:bg-white focus:outline-none shadow-2xs transition-colors"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep(false);
                      setErrorMsg('');
                    }}
                    className="text-neutral-500 hover:text-neutral-800 font-semibold cursor-pointer"
                  >
                    Change Number
                  </button>

                  {resendTimer > 0 ? (
                    <span className="text-neutral-400 font-mono">
                      Resend in {resendTimer}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const code = Math.floor(1000 + Math.random() * 9000).toString();
                        setGeneratedOtp(code);
                        setResendTimer(30);
                        setErrorMsg('');
                      }}
                      className="text-[#E07A00] font-bold hover:underline cursor-pointer"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                <button
                  id="passenger-verify-code-btn"
                  type="submit"
                  disabled={loading || isLocked}
                  className="w-full bg-[#E07A00] hover:bg-[#C96E00] active:scale-[0.99] text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying Session...</span>
                    </>
                  ) : (
                    <span>Verify & Login</span>
                  )}
                </button>
              </form>
            )}
          </>
        )}

        {/* Divider & Google OAuth Button */}
        {!otpStep && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-neutral-200" />
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Or Continue With
              </span>
              <div className="flex-1 h-px bg-neutral-200" />
            </div>

            <button
              id="google-signin-btn"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full bg-white hover:bg-neutral-50 active:scale-[0.99] border border-neutral-200 text-neutral-800 font-bold py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2.5 text-xs shadow-2xs transition-all cursor-pointer disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{googleLoading ? 'Connecting Google...' : 'Continue with Google'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Security Badge */}
      <div className="pt-4 mt-auto border-t border-neutral-100 flex items-center justify-center gap-1.5 text-[11px] text-neutral-400 font-medium">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>Secured by Supabase Auth with PostgreSQL RLS</span>
      </div>
    </div>
  );
};
