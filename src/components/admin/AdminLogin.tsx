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
  KeyRound, 
  Sparkles, 
  RotateCw,
  AlertCircle,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess?: () => void;
  onBack?: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBack }) => {
  const { loginAdmin, triggerSound, setActiveRole, updateAdminPassword } = useRide();

  // Form state prefilled with requested defaults
  const [userId, setUserId] = useState('admin');
  const [password, setPassword] = useState('admin.admin');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Password update drawer state for future updates
  const [showPasswordUpdater, setShowPasswordUpdater] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [updateMsg, setUpdateMsg] = useState<{ success: boolean; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) {
      setErrorMessage('Please enter Admin User ID');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Please enter Admin Password');
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

  const handleApplyDefaults = () => {
    setUserId('admin');
    setPassword('admin.admin');
    setErrorMessage('');
    triggerSound('beep');
  };

  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPass.trim() || newPass.trim().length < 3) {
      setUpdateMsg({ success: false, text: 'Password must be at least 3 characters long.' });
      return;
    }
    if (newPass !== confirmPass) {
      setUpdateMsg({ success: false, text: 'New passwords do not match.' });
      return;
    }

    const res = updateAdminPassword(newPass);
    if (res.success) {
      setPassword(newPass);
      setUpdateMsg({ success: true, text: 'Admin password updated! You can now sign in with your new password.' });
      setTimeout(() => {
        setShowPasswordUpdater(false);
        setUpdateMsg(null);
      }, 2000);
    } else {
      setUpdateMsg({ success: false, text: res.message });
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
          Sign in to manage driver KYC approvals, dispatch fleet, configure pricing, and audit real-time rides.
        </p>
      </div>

      {/* Default Credentials Helper Card */}
      <div className="mb-5 p-3.5 bg-[#FAF8F5] rounded-2xl border border-neutral-200 text-xs flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="font-bold text-neutral-800 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-[#C8622A]" />
            <span>Default Credentials</span>
          </div>
          <div className="text-[11px] text-neutral-600 font-mono">
            User ID: <strong className="text-neutral-900">admin</strong> | Pass: <strong className="text-neutral-900">admin.admin</strong>
          </div>
        </div>
        <button
          type="button"
          onClick={handleApplyDefaults}
          className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-800 font-bold text-[11px] cursor-pointer active:scale-95 shadow-2xs shrink-0 transition-colors"
        >
          Auto-fill
        </button>
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 font-semibold animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
        </div>
      )}

      {/* Admin Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* User ID field */}
        <div className="space-y-1.5 text-left">
          <label className="text-xs font-bold text-neutral-700 block">
            Admin User ID / Username
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
              placeholder="admin"
              required
              className="w-full pl-10 pr-4 py-3 bg-[#FAF8F5] border border-neutral-200 rounded-2xl text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#C8622A]/20 focus:border-[#C8622A] transition-all"
            />
          </div>
        </div>

        {/* Password field */}
        <div className="space-y-1.5 text-left">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-neutral-700 block">
              Security Password
            </label>
            <button
              type="button"
              onClick={() => setShowPasswordUpdater(!showPasswordUpdater)}
              className="text-[11px] font-bold text-[#C8622A] hover:underline cursor-pointer"
            >
              {showPasswordUpdater ? 'Close Update' : 'Update password?'}
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="admin-login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="admin.admin"
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
          className="w-full bg-[#181818] hover:bg-neutral-900 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-xs transition-all cursor-pointer disabled:opacity-75 pt-3"
        >
          {loading ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Verifying Admin Authorization...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Sign In to Admin Dashboard</span>
            </>
          )}
        </button>
      </form>

      {/* Password Updater Drawer / Card */}
      {showPasswordUpdater && (
        <div className="mt-5 p-4 bg-[#FAF8F5] border border-neutral-200 rounded-2xl animate-in slide-in-from-top-2 duration-200 text-left">
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900 mb-2">
            <KeyRound className="w-3.5 h-3.5 text-[#C8622A]" />
            <span>Update Admin Password for Future Use</span>
          </div>
          <p className="text-[11px] text-neutral-600 mb-3">
            Change your admin password below. Your new password will be stored securely in local storage.
          </p>

          <form onSubmit={handleSaveNewPassword} className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Enter new admin password"
                required
                className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-medium text-neutral-900 focus:outline-none focus:border-[#C8622A]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Repeat new admin password"
                required
                className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-medium text-neutral-900 focus:outline-none focus:border-[#C8622A]"
              />
            </div>

            {updateMsg && (
              <div className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${updateMsg.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {updateMsg.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                <span>{updateMsg.text}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[#C8622A] hover:bg-[#B25523] text-white text-xs font-bold py-2 rounded-xl cursor-pointer active:scale-95 transition-all shadow-2xs"
            >
              Save New Admin Password
            </button>
          </form>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500 font-medium">
        <button
          type="button"
          onClick={() => {
            triggerSound('beep');
            setActiveRole('user');
          }}
          className="hover:text-neutral-900 hover:underline cursor-pointer"
        >
          ← Return to Passenger App
        </button>

        <button
          type="button"
          onClick={() => {
            triggerSound('beep');
            setActiveRole('driver');
          }}
          className="hover:text-neutral-900 hover:underline cursor-pointer"
        >
          Captain Portal →
        </button>
      </div>
    </div>
  );
};
