import React, { useState, useEffect, useRef } from 'react';
import { useRide } from '../../context/RideContext';
import { UserProfile } from '../../types';
import { AppLogo } from '../common/AppLogo';
import { 
  ArrowLeft, 
  Phone, 
  ShieldCheck, 
  RotateCw, 
  Sparkles, 
  AlertCircle,
  KeyRound,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface UserLoginProps {
  onLoginSuccess?: () => void;
  onBack?: () => void;
}

export const UserLogin: React.FC<UserLoginProps> = ({ onLoginSuccess, onBack }) => {
  const { loginUser, loginWithGoogle, triggerSound } = useRide();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('1234');
  const [otpValue, setOtpValue] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

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

  const handleGoogleSignIn = async () => {
    if (googleLoading) return;
    setErrorMsg('');
    setGoogleLoading(true);
    triggerSound('beep');
    try {
      await loginWithGoogle();
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: unknown) {
      const isCancellation = (err as any)?.isCancellation || 
        String(err).includes('cancelled') || 
        String(err).includes('closed') ||
        String(err).includes('Pending promise was never set');

      if (isCancellation) {
        setErrorMsg('Google sign-in was cancelled. You can try again or use your mobile number.');
      } else {
        setErrorMsg('Sign-in encounterd a connection issue. Please use mobile number verification.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      setErrorMsg(`Too many attempts. Please wait ${lockTimer}s before retrying.`);
      return;
    }

    const cleanNumber = phoneNumber.replace(/\D/g, '');
    // Indian mobile number validation (10 digits starting with 6, 7, 8, or 9)
    const indianPhoneRegex = /^[6-9]\d{9}$/;
    if (!indianPhoneRegex.test(cleanNumber)) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number (e.g. 9830123456)');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    triggerSound('beep');

    // Generate real 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(code);
    setResendTimer(30);

    setTimeout(() => {
      setLoading(false);
      setOtpStep(true);
      setOtpValue(['', '', '', '']);
    }, 400);
  };

  const handleResendOtp = () => {
    if (resendTimer > 0 || isLocked) return;
    triggerSound('beep');
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(code);
    setResendTimer(30);
    setErrorMsg('');
  };

  const handleAutoFill = () => {
    triggerSound('beep');
    setOtpValue(generatedOtp.split(''));
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      setErrorMsg(`System locked. Try again in ${lockTimer} seconds.`);
      return;
    }

    const entered = otpValue.join('');
    if (entered.length !== 4) {
      setErrorMsg('Please enter your complete 4-digit verification code');
      return;
    }

    // Check code matches generated OTP or universal testing PIN '1234'
    if (entered !== generatedOtp && entered !== '1234') {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      triggerSound('alert');
      if (nextAttempts >= 5) {
        setIsLocked(true);
        setLockTimer(30);
        setErrorMsg('Maximum attempts exceeded. Account locked for 30 seconds for security.');
      } else {
        setErrorMsg(`Incorrect OTP. ${5 - nextAttempts} attempts remaining.`);
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
        avatarUrl: `https://api.dicebear.com/7.x/personas/svg?seed=${cleanPhone}`,
        createdAt: new Date().toISOString()
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

  return (
    <div 
      id="user-login-screen" 
      className="w-full flex-1 sm:flex-initial sm:max-w-md md:max-w-lg mx-auto bg-white sm:rounded-3xl border-0 sm:border border-[#EDE8E0] shadow-none sm:shadow-sm p-5 sm:p-8 text-[#111111] font-sans animate-in fade-in duration-200 flex flex-col justify-between min-h-[calc(100vh-65px)] sm:min-h-0 touch-pan-y"
    >
      <div className="space-y-5">
        {/* Top Header & App Icon removed */}

        {/* Title Typography */}
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            {otpStep ? 'Verify Mobile Number' : "Let's get you moving."}
          </h1>
          <p className="text-xs font-medium text-neutral-500">
            {otpStep 
              ? `We sent a 4-digit code to +91 ${phoneNumber}`
              : 'Sign in to book instant, zero-emission e-rickshaws.'}
          </p>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Step 1: Mobile & Google Entry */}
        {!otpStep ? (
          <div className="space-y-4 pt-1">
            {/* Google Sign-In */}
            <button
              id="google-signin-btn"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full bg-white hover:bg-neutral-50 active:scale-[0.99] border border-neutral-200 text-neutral-800 font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2.5 text-xs shadow-2xs transition-all cursor-pointer disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{googleLoading ? 'Connecting Google Account...' : 'Continue with Google'}</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-neutral-200" />
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Or Continue with Mobile
              </span>
              <div className="flex-1 h-px bg-neutral-200" />
            </div>

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
                    <span>Sending OTP...</span>
                  </>
                ) : (
                  <span>Continue with Mobile</span>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Step 2: OTP Verification */
          <form onSubmit={handleVerifyOtp} className="space-y-4 pt-1">
            {/* Auto-read helper notification */}
            <div className="bg-[#FFF9E6] border border-[#FFE082] rounded-2xl p-3 flex items-center justify-between text-xs text-[#8C5200]">
              <div className="flex items-center gap-2 font-mono">
                <KeyRound className="w-4 h-4 text-[#E07A00]" />
                <span>OTP Code: <strong>{generatedOtp}</strong></span>
              </div>
              <button
                type="button"
                onClick={handleAutoFill}
                className="px-2.5 py-1 rounded-lg bg-[#FFD500] hover:bg-[#E6C000] text-black font-bold text-[11px] transition-colors"
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

            {/* Countdown & Resend */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setOtpStep(false);
                  setErrorMsg('');
                }}
                className="text-neutral-500 hover:text-neutral-800 font-semibold"
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
                  className="text-[#E07A00] font-bold hover:underline"
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
      </div>
    </div>
  );
};
