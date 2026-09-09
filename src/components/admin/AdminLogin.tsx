import React, { useState, useEffect } from 'react';
import { useRide } from '../../context/RideContext';
import { AppLogo } from '../common/AppLogo';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  RotateCw, 
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ShieldAlert
} from 'lucide-react';
import { fetchAdminStatus } from '../../services/adminAuthService';

interface AdminLoginProps {
  onLoginSuccess?: () => void;
  onBack?: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBack }) => {
  const { 
    loginAdmin, 
    setupInitialAdminAccount,
    adminExistsState,
    refreshAdminStatus,
    triggerSound, 
    setActiveRole 
  } = useRide();

  // Status check: whether admin exists or initial setup is required
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [adminExists, setAdminExists] = useState(true);

  // Form states initialized blank with inside placeholder text
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UX states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showRecoveryInfo, setShowRecoveryInfo] = useState(false);

  // Check admin status on mount
  useEffect(() => {
    let isMounted = true;
    async function check() {
      try {
        setCheckingStatus(true);
        const res = await fetchAdminStatus();
        if (isMounted) {
          setAdminExists(res.admin_exists);
        }
      } catch (err) {
        console.warn('Admin status check warning:', err);
      } finally {
        if (isMounted) setCheckingStatus(false);
      }
    }
    check();
    return () => {
      isMounted = false;
    };
  }, [adminExistsState]);

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) {
      setErrorMessage('Please enter Admin Username.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Please enter Admin Password.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);
    triggerSound('beep');

    try {
      const res = await loginAdmin(userId, password);
      if (res.success) {
        triggerSound('success');
        if (onLoginSuccess) onLoginSuccess();
      } else {
        // Generic security error message
        setErrorMessage(res.message || 'Invalid username or password.');
      }
    } catch (err: any) {
      console.warn('Admin login error:', err);
      setErrorMessage(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  // Handle First-Time Admin Setup Submit
  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = userId.trim();

    if (!cleanUser) {
      setErrorMessage('Admin Username is required.');
      return;
    }
    if (cleanUser.length < 3 || cleanUser.length > 32) {
      setErrorMessage('Admin Username must be between 3 and 32 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUser)) {
      setErrorMessage('Username can only contain letters, numbers, hyphens, dots, and underscores.');
      return;
    }

    if (!password) {
      setErrorMessage('Admin Password is required.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasNumbersOrSymbols = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
    if (!hasLetters || !hasNumbersOrSymbols) {
      setErrorMessage('Password must contain both letters and numbers or symbols.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Confirm Password must match Admin Password.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);
    triggerSound('beep');

    try {
      const res = await setupInitialAdminAccount(cleanUser, password, confirmPassword);
      if (res.success) {
        setSuccessMessage('Administrator account created successfully! Signing you in...');
        triggerSound('success');
        setAdminExists(true);
        await refreshAdminStatus();
        
        // Automatically sign in with newly created master credentials
        setTimeout(async () => {
          const loginRes = await loginAdmin(cleanUser, password);
          if (loginRes.success && onLoginSuccess) {
            onLoginSuccess();
          }
        }, 1200);
      } else {
        setErrorMessage(res.message || 'Failed to initialize administrator account.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Admin account creation failed.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div 
        id="admin-login-screen-loading" 
        className="w-full max-w-md mx-auto bg-white rounded-3xl border border-neutral-200 shadow-sm p-8 text-[#111111] font-sans flex flex-col items-center justify-center min-h-[360px]"
      >
        <RotateCw className="w-8 h-8 text-[#C8622A] animate-spin mb-3" />
        <p className="text-xs text-neutral-600 font-bold uppercase tracking-wider">Verifying Admin Security Gateway...</p>
      </div>
    );
  }

  return (
    <div 
      id="admin-login-screen" 
      className="w-full max-w-md mx-auto bg-white rounded-3xl border border-neutral-200 shadow-sm p-6 sm:p-8 text-[#111111] font-sans animate-in fade-in duration-300"
    >
      {/* Top Header with Back Navigation */}
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-neutral-100">
        <button
          id="admin-return-passenger-btn"
          type="button"
          onClick={() => {
            triggerSound('beep');
            if (onBack) {
              onBack();
            } else {
              setActiveRole('user');
            }
          }}
          className="w-10 h-10 rounded-2xl bg-[#FAF8F5] hover:bg-neutral-100 active:scale-95 flex items-center justify-center text-neutral-700 transition-all cursor-pointer border border-neutral-200"
          title="Return to Passenger App"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-amber-900 text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-[#C8622A]" />
          <span>{adminExists ? 'Restricted Admin Portal' : 'Admin First-Time Setup'}</span>
        </div>
      </div>

      {/* Brand & Heading */}
      <div className="flex flex-col items-center text-center space-y-2 mb-6">
        <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-neutral-200/80 shadow-2xs mb-1">
          <AppLogo size="md" />
        </div>
        
        {adminExists ? (
          <>
            <h1 className="text-2xl font-black text-[#111111] tracking-tight">
              ADMIN CONTROL CENTER
            </h1>
            <p className="text-xs text-neutral-600 font-medium max-w-xs">
              Private administrator access. Only authorized personnel may proceed.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black text-[#111111] tracking-tight">
              ADMIN INITIAL SETUP
            </h1>
            <p className="text-xs text-neutral-600 font-medium max-w-xs">
              Configure the single administrator account for Toto Drive. After creation, registration is permanently closed.
            </p>
          </>
        )}
      </div>

      {/* Success Notice */}
      {successMessage && (
        <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-800 font-semibold animate-in fade-in duration-150 text-left">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">{successMessage}</div>
        </div>
      )}

      {/* Error Notice */}
      {errorMessage && (
        <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 font-semibold animate-in fade-in duration-150 text-left">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
        </div>
      )}

      {/* Security Rule Badge for Initial Setup */}
      {!adminExists && (
        <div className="mb-5 p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 leading-relaxed text-left flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong>Single Admin Account Rule:</strong> Only ONE admin account can ever exist. Once created, registration will be permanently disabled across the application.
          </div>
        </div>
      )}

      {/* 1. FIRST-TIME ADMIN SETUP FORM */}
      {!adminExists ? (
        <form onSubmit={handleSetupSubmit} className="space-y-4">
          {/* Admin Username */}
          <div className="space-y-1.5 text-left">
            <label htmlFor="admin-setup-username" className="text-xs font-bold text-neutral-700 block">
              Admin Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="admin-setup-username"
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g. Admin"
                required
                className="w-full pl-10 pr-4 py-3 bg-[#FAF8F5] border border-neutral-200 rounded-2xl text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#C8622A]/20 focus:border-[#C8622A] transition-all"
              />
            </div>
          </div>

          {/* Admin Password */}
          <div className="space-y-1.5 text-left">
            <label htmlFor="admin-setup-password" className="text-xs font-bold text-neutral-700 block">
              Admin Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="admin-setup-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create master password (min 6 chars)"
                required
                className="w-full pl-10 pr-10 py-3 bg-[#FAF8F5] border border-neutral-200 rounded-2xl text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#C8622A]/20 focus:border-[#C8622A] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-neutral-500 font-medium pl-1">
              Minimum 6 characters, must include letters and numbers or symbols.
            </p>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5 text-left">
            <label htmlFor="admin-setup-confirm-password" className="text-xs font-bold text-neutral-700 block">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                id="admin-setup-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter master password"
                required
                className="w-full pl-10 pr-10 py-3 bg-[#FAF8F5] border border-neutral-200 rounded-2xl text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#C8622A]/20 focus:border-[#C8622A] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="admin-setup-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full bg-[#181818] hover:bg-neutral-900 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-xs transition-all cursor-pointer disabled:opacity-75 mt-2"
          >
            {loading ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin text-amber-400" />
                <span>Creating Super Administrator Account...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>CREATE ADMINISTRATOR ACCOUNT</span>
              </>
            )}
          </button>
        </form>
      ) : (
        /* 2. STANDARD ADMIN LOGIN FORM */
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          {/* Username field */}
          <div className="space-y-1.5 text-left">
            <label htmlFor="admin-login-userid" className="text-xs font-bold text-neutral-700 block">
              Admin Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="admin-login-userid"
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g. Admin"
                required
                className="w-full pl-10 pr-4 py-3 bg-[#FAF8F5] border border-neutral-200 rounded-2xl text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#C8622A]/20 focus:border-[#C8622A] transition-all"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5 text-left">
            <label htmlFor="admin-login-password" className="text-xs font-bold text-neutral-700 block">
              Admin Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="admin-login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Admin password"
                required
                className="w-full pl-10 pr-10 py-3 bg-[#FAF8F5] border border-neutral-200 rounded-2xl text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#C8622A]/20 focus:border-[#C8622A] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <button
            id="admin-login-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full bg-[#181818] hover:bg-neutral-900 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-xs transition-all cursor-pointer disabled:opacity-75 mt-2"
          >
            {loading ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Verifying Administrative Authorization...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>LOGIN TO ADMIN PANEL</span>
              </>
            )}
          </button>

          {/* Account Recovery Info Link */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setShowRecoveryInfo(!showRecoveryInfo)}
              className="text-[11px] text-neutral-500 hover:text-neutral-800 font-semibold underline underline-offset-2 cursor-pointer transition-colors"
            >
              Forgot Password / Account Recovery?
            </button>
          </div>

          {showRecoveryInfo && (
            <div className="p-3 bg-[#FAF8F5] border border-neutral-200 rounded-2xl text-[11px] text-neutral-600 text-left animate-in fade-in duration-150">
              <p className="font-bold text-neutral-800 mb-1">Administrative Recovery Protocol:</p>
              <p>For security, the master administrator account cannot be recovered through public email or phone channels. Recovery must be performed directly on the secure backend server console.</p>
            </div>
          )}
        </form>
      )}

      {/* Bottom Footer Notice */}
      <div className="mt-6 pt-4 border-t border-neutral-100 text-center">
        <p className="text-[10px] text-neutral-600 font-medium">
          Toto Drive Admin Portal • Internal ID: <span className="font-mono text-neutral-700">ADMIN_001</span>
        </p>
      </div>
    </div>
  );
};
