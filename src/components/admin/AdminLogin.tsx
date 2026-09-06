import React, { useState } from 'react';
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
  AlertCircle 
} from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess?: () => void;
  onBack?: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBack }) => {
  const { 
    loginAdmin, 
    triggerSound, 
    setActiveRole 
  } = useRide();

  // Form state prefilled with requested defaults "Admin" / "Admin"
  const [userId, setUserId] = useState('Admin');
  const [password, setPassword] = useState('Admin');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) {
      setErrorMessage('Please enter Admin Username / ID.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Please enter Admin Security Password.');
      return;
    }

    setErrorMessage('');
    setLoading(true);
    triggerSound('beep');

    try {
      const res = await loginAdmin(userId, password);
      if (res.success) {
        if (onLoginSuccess) onLoginSuccess();
      } else {
        setErrorMessage(res.message);
      }
    } catch (err) {
      console.error('Admin login error:', err);
      setErrorMessage('Login failed. Please verify credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

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
          <span>Restricted Admin Portal</span>
        </div>
      </div>

      {/* Brand & Heading */}
      <div className="flex flex-col items-center text-center space-y-2 mb-6">
        <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-neutral-200/80 shadow-2xs mb-1">
          <AppLogo size="md" />
        </div>
        <h1 className="text-2xl font-black text-[#111111] tracking-tight">
          Admin Control Center
        </h1>
        <p className="text-xs text-neutral-600 font-medium max-w-xs">
          Sign in to manage toto captain KYC approvals, live dispatch, pricing algorithms, and ride monitoring.
        </p>
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 font-semibold animate-in fade-in duration-150 text-left">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
        </div>
      )}

      {/* Admin Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="Admin"
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
              placeholder="Admin"
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
          className="w-full bg-[#181818] hover:bg-neutral-900 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-xs transition-all cursor-pointer disabled:opacity-75"
        >
          {loading ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Verifying Administrative Authorization...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Sign In to Admin Dashboard</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
