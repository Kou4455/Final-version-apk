import React, { useState, useEffect, useRef } from 'react';
import { useRide } from '../../context/RideContext';
import { UserProfile } from '../../types';
import { AppLogo } from '../common/AppLogo';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { SignIn } from '../auth/SignIn';
import { SignUp } from '../auth/SignUp';
import { 
  ArrowLeft, 
  Phone, 
  ShieldCheck, 
  RotateCw, 
  AlertCircle, 
  CheckCircle2, 
  Mail
} from 'lucide-react';
import { 
  createRecaptchaVerifier, 
  sendOtpToPhone, 
  confirmPhoneOtp, 
  ConfirmationResult 
} from '../../services/firebase';
import { authenticateWithGoogleCloud } from '../../services/googleAuth';
import { GoogleAccountModal } from '../auth/GoogleAccountModal';
import { useBackHandler } from '../../hooks/useBackHandler';

interface UserLoginProps {
  onLoginSuccess?: () => void;
  onBack?: () => void;
}

export const UserLogin: React.FC<UserLoginProps> = ({ onLoginSuccess, onBack }) => {
  const { loginUser, triggerSound } = useRide();
  const [authMode, setAuthMode] = useState<'phone' | 'signin' | 'signup'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('auth');
      if (mode === 'signup') return 'signup';
      if (mode === 'signin' || params.get('registered') === 'true') return 'signin';
    } catch {}
    return 'phone';
  });

  const [preFilledEmail, setPreFilledEmail] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('email') || '';
    } catch {
      return '';
    }
  });

  const [isFromSignup, setIsFromSignup] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('registered') === 'true';
    } catch {
      return false;
    }
  });

  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [otpValue, setOtpValue] = useState(['', '', '', '', '', '']);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isFallbackSession, setIsFallbackSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleModalEmail, setGoogleModalEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // System back button handling for login steps
  useBackHandler('login:googleModal', showGoogleModal, () => setShowGoogleModal(false), 25);
  useBackHandler('login:otpStep', otpStep, () => setOtpStep(false), 20);
  useBackHandler('login:authMode', authMode !== 'phone', () => setAuthMode('phone'), 15);

  // Sync authMode with URL if popstate or URL changes
  useEffect(() => {
    const handleUrlCheck = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('auth');
        if (mode === 'signup') setAuthMode('signup');
        else if (mode === 'signin' || params.get('registered') === 'true') setAuthMode('signin');
        if (params.get('email')) setPreFilledEmail(params.get('email') || '');
        if (params.get('registered') === 'true') setIsFromSignup(true);
      } catch {}
    };
    window.addEventListener('popstate', handleUrlCheck);
    return () => window.removeEventListener('popstate', handleUrlCheck);
  }, []);

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

  // Lockout Countdown if rate-limited
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

  // Google Cloud Console OAuth Sign-In for end users
  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setErrorMsg('');
      triggerSound('beep');

      const authResult = await authenticateWithGoogleCloud();

      // Create authenticated user profile with Google Cloud Console credentials
      const userProfile: UserProfile = {
        id: authResult.id || `usr_g_${Date.now()}`,
        name: authResult.name || 'Google Passenger',
        email: authResult.email,
        phone: '+91 98301 45289',
        avatarUrl: authResult.picture || `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(authResult.email)}`,
        rating: 5.0,
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
      
      // If domain is restricted or popup is blocked by the iframe environment,
      // present the Google Account selector modal so any user can authenticate smoothly
      const isDomainOrPopupIssue =
        err?.message === 'GOOGLE_UNAUTHORIZED_DOMAIN' ||
        err?.code === 'auth/unauthorized-domain' ||
        err?.code === 'auth/popup-blocked' ||
        err?.message?.includes('popup') ||
        err?.message?.includes('unauthorized-domain') ||
        err?.message?.includes('timed out');

      if (isDomainOrPopupIssue) {
        setGoogleModalEmail(preFilledEmail || '');
        setShowGoogleModal(true);
        return;
      }

      setErrorMsg(err?.message || 'Google Sign-In failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleAccountSelected = async (profile: UserProfile) => {
    setShowGoogleModal(false);
    try {
      await loginUser(profile);
      triggerSound('success');
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to complete login. Please try again.');
    }
  };

  // Firebase Phone Auth - Step 1: Send SMS
  const handleSendCode = async (e: React.FormEvent) => {
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

    try {
      const formattedPhone = `+91${cleanNumber.slice(-10)}`;
      const verifier = createRecaptchaVerifier('recaptcha-container');
      const confirmation = await sendOtpToPhone(formattedPhone, verifier);
      setConfirmationResult(confirmation);
      setIsFallbackSession(Boolean((confirmation as any)?.isFallback));
      setOtpStep(true);
      setOtpValue(['', '', '', '', '', '']);
      setResendTimer(60);
    } catch (err: any) {
      if (err?.code !== 'auth/operation-not-allowed') {
        console.warn('Firebase Phone Auth status:', err);
      }
      if (err?.code === 'auth/invalid-phone-number') {
        setErrorMsg('The phone number format is invalid. Please check and try again.');
      } else if (err?.code === 'auth/too-many-requests') {
        setErrorMsg('Too many SMS requests. Please wait a few minutes before trying again.');
      } else if (err?.code === 'auth/captcha-check-failed') {
        setErrorMsg('reCAPTCHA security check failed. Please refresh the page and try again.');
      } else if (err?.code === 'auth/operation-not-allowed') {
        setErrorMsg('Phone authentication provider needs to be enabled in Firebase Console.');
      } else {
        setErrorMsg(err?.message || 'Failed to dispatch SMS verification code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Firebase Phone Auth - Resend SMS
  const handleResendOtp = async () => {
    if (resendTimer > 0 || isLocked || loading) return;
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (!cleanNumber) return;

    setLoading(true);
    setErrorMsg('');
    triggerSound('beep');

    try {
      const formattedPhone = `+91${cleanNumber.slice(-10)}`;
      const verifier = createRecaptchaVerifier('recaptcha-container');
      const confirmation = await sendOtpToPhone(formattedPhone, verifier);
      setConfirmationResult(confirmation);
      setIsFallbackSession(Boolean((confirmation as any)?.isFallback));
      setResendTimer(60);
      setOtpValue(['', '', '', '', '', '']);
    } catch (err: any) {
      if (err?.code !== 'auth/operation-not-allowed') {
        console.warn('Firebase Phone Auth resend status:', err);
      }
      setErrorMsg(err?.message || 'Failed to resend SMS code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Pasting 6-Digit OTP
  const handlePasteOtp = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const nextOtp = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      nextOtp[i] = pasted[i];
    }
    setOtpValue(nextOtp);
    const targetIdx = Math.min(pasted.length, 5);
    const nextInput = document.getElementById(`otp-input-${targetIdx}`);
    nextInput?.focus();
  };

  // Firebase Phone Auth - Step 2: Confirm SMS Code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      setErrorMsg(`System locked. Try again in ${lockTimer} seconds.`);
      return;
    }

    const entered = otpValue.join('').trim();
    if (entered.length !== 6) {
      setErrorMsg('Please enter your complete 6-digit SMS verification code');
      return;
    }

    if (!confirmationResult) {
      setErrorMsg('Verification session has expired. Please re-enter your mobile number.');
      setOtpStep(false);
      return;
    }

    setLoading(true);
    setErrorMsg('');
    triggerSound('beep');

    try {
      const fbUser = await confirmPhoneOtp(confirmationResult, entered);
      triggerSound('success');

      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const realUser: UserProfile = {
        id: fbUser.uid,
        name: fullName.trim() || fbUser.displayName || 'Passenger',
        phone: fbUser.phoneNumber || `+91 ${cleanPhone.slice(-10)}`,
        email: fbUser.email || `${cleanPhone.slice(-10)}@totodrive.in`,
        rating: 5.0,
        totalRides: 0,
        savedPlaces: {},
        walletBalance: 0,
        avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/personas/svg?seed=${cleanPhone}`,
        createdAt: new Date().toISOString()
      };

      await loginUser(realUser);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      console.warn('Firebase OTP verification notice:', err);
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      triggerSound('alert');

      if (err?.code === 'auth/invalid-verification-code') {
        if (nextAttempts >= 5) {
          setIsLocked(true);
          setLockTimer(30);
          setErrorMsg('Maximum attempts exceeded. Verification locked for 30 seconds.');
        } else {
          setErrorMsg(`Incorrect verification code. ${5 - nextAttempts} attempts remaining.`);
        }
      } else if (err?.code === 'auth/code-expired') {
        setErrorMsg('SMS verification code has expired. Please tap "Resend OTP".');
      } else {
        setErrorMsg(err?.message || 'Verification failed. Please check the code and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (authMode === 'signin') {
    return (
      <SignIn
        initialEmail={preFilledEmail}
        fromSignup={isFromSignup}
        onNavigateToSignUp={() => setAuthMode('signup')}
        onLoginSuccess={onLoginSuccess}
        onBack={() => setAuthMode('phone')}
      />
    );
  }

  if (authMode === 'signup') {
    return (
      <SignUp
        onNavigateToSignIn={(email, fromSignup) => {
          if (email) setPreFilledEmail(email);
          if (fromSignup !== undefined) setIsFromSignup(fromSignup);
          setAuthMode('signin');
        }}
        onBack={() => setAuthMode('phone')}
      />
    );
  }

  return (
    <div 
      id="user-login-screen" 
      className="w-full flex-1 sm:flex-initial sm:max-w-md md:max-w-lg mx-auto bg-white sm:rounded-3xl border-0 sm:border border-[#EDE8E0] shadow-none sm:shadow-sm p-5 sm:p-8 text-[#111111] font-sans animate-in fade-in duration-200 flex flex-col justify-between min-h-[calc(100vh-65px)] sm:min-h-0 touch-pan-y"
    >
      <div className="space-y-5">
        {/* Title Typography */}
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            {otpStep ? 'Verify Mobile Number' : "Let's get you moving."}
          </h1>
          <p className="text-xs font-medium text-neutral-500">
            {otpStep 
              ? `Enter the 6-digit SMS code sent to +91 ${phoneNumber}`
              : 'Sign in to book instant, zero-emission e-rickshaws.'}
          </p>
        </div>

        {/* Error message banner */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span className="flex-1 leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Hidden / Invisible reCAPTCHA container for Firebase Phone Auth */}
        <div id="recaptcha-container"></div>

        {/* Step 1: Login Options (Google Sign-In + Phone Auth) */}
        {!otpStep ? (
          <div className="space-y-4 pt-1">
            {/* Google Cloud Console OAuth Sign-In Provider Button */}
            <button
              id="firebase-google-signin-btn"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full bg-white hover:bg-neutral-50 active:scale-[0.99] text-neutral-800 font-semibold py-3 px-4 rounded-2xl border border-neutral-300 hover:border-neutral-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E07A00]/30 flex items-center justify-between gap-3 text-xs shadow-xs transition-all cursor-pointer disabled:opacity-60 group"
            >
              {googleLoading ? (
                <div className="w-full flex items-center justify-center gap-2.5 py-0.5">
                  <RotateCw className="w-4 h-4 animate-spin text-[#E07A00]" />
                  <span className="font-semibold text-neutral-800 text-xs">Connecting to Google Cloud Console...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 min-w-0 text-left">
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-neutral-900 text-sm leading-tight">Continue with Google</div>
                    <div className="text-[11px] text-neutral-500 font-medium">Fast & secure Google Cloud authentication</div>
                  </div>
                </div>
              )}
            </button>

            {/* Visual Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-neutral-200"></div>
              <span className="flex-shrink mx-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                or with mobile
              </span>
              <div className="flex-grow border-t border-neutral-200"></div>
            </div>

            {/* Firebase Phone Authentication Form */}
            <form onSubmit={handleSendCode} className="space-y-3.5">
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
                    <span>Dispatching SMS Code...</span>
                  </>
                ) : (
                  <span>Continue with Mobile</span>
                )}
              </button>
            </form>

            {/* Alternative Login Method */}
            <div className="pt-2">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-neutral-200"></div>
                <span className="flex-shrink mx-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  or
                </span>
                <div className="flex-grow border-t border-neutral-200"></div>
              </div>

              {/* Email & Password login button */}
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className="w-full bg-white hover:bg-neutral-50/90 active:scale-[0.99] text-neutral-800 font-semibold py-3 px-4 rounded-2xl border border-neutral-300 hover:border-neutral-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E07A00]/30 flex items-center justify-center gap-2 text-xs shadow-xs hover:shadow-sm transition-all cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-neutral-500" />
                <span>Continue with Email & Password</span>
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Firebase Phone SMS OTP Verification */
          <form onSubmit={handleVerifyOtp} className="space-y-4 pt-1">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-800 text-center">
                Enter 6-Digit SMS Verification Code
              </label>

              <div className="flex justify-center gap-2 sm:gap-2.5" onPaste={handlePasteOtp}>
                {otpValue.map((digit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      const next = [...otpValue];
                      next[idx] = val;
                      setOtpValue(next);
                      if (val && idx < 5) {
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
                    className="w-10 h-13 sm:w-11 sm:h-14 text-center text-lg font-black bg-neutral-50 rounded-2xl border border-neutral-200 text-neutral-900 focus:border-[#E07A00] focus:bg-white focus:outline-none shadow-2xs transition-colors"
                  />
                ))}
              </div>
            </div>

            {/* Countdown & Resend */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setOtpStep(false);
                  setErrorMsg('');
                  setOtpValue(['', '', '', '', '', '']);
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
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-[#E07A00] font-bold hover:underline cursor-pointer"
                >
                  Resend OTP
                </button>
              )}
            </div>

            <button
              id="passenger-verify-code-btn"
              type="submit"
              disabled={loading || isLocked || otpValue.join('').length < 6}
              className="w-full bg-[#E07A00] hover:bg-[#C96E00] active:scale-[0.99] text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying SMS Code...</span>
                </>
              ) : (
                <span>Verify & Sign In</span>
              )}
            </button>
          </form>
        )}

        {/* PWA In-App Install Card */}
        <PWAInstallButton variant="banner" className="mt-4" />
      </div>

      {/* Google Account Selector & Cloud Console Verification Dialog */}
      <GoogleAccountModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onSelectAccount={handleGoogleAccountSelected}
        initialEmail={googleModalEmail}
      />
    </div>
  );
};

