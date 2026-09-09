import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Clock, 
  Bookmark, 
  History, 
  ShieldCheck, 
  LifeBuoy, 
  LogOut, 
  ChevronRight, 
  Star, 
  Phone, 
  Tag, 
  CheckCircle2,
  Sparkles,
  Settings,
  Zap,
  ArrowLeft,
  Plus,
  Edit2,
  X,
  Check
} from 'lucide-react';
import { UserProfile } from '../../types';
import { useRide } from '../../context/RideContext';
import { useBackHandler } from '../../hooks/useBackHandler';
import { motion } from 'motion/react';

interface ProfileSettingsPageProps {
  user: UserProfile | null;
  walletBalance: number;
  completedRidesCount: number;
  onOpenWallet: () => void;
  onOpenSchedule: () => void;
  onOpenSavedPlaces: () => void;
  onOpenHistory: () => void;
  onOpenSafety: () => void;
  onOpenSupport: () => void;
  onOpenCoupons: () => void;
  onLogout: () => void;
  onNavigateHome: () => void;
}

export const ProfileSettingsPage: React.FC<ProfileSettingsPageProps> = ({
  user,
  walletBalance,
  completedRidesCount,
  onOpenWallet,
  onOpenSchedule,
  onOpenSavedPlaces,
  onOpenHistory,
  onOpenSafety,
  onOpenSupport,
  onOpenCoupons,
  onLogout,
  onNavigateHome,
}) => {
  const { setActiveRole, triggerSound, updateUserProfile } = useRide();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // System back button dismisses open dialogs in Profile page
  useBackHandler('modal:editProfile', showEditModal, () => setShowEditModal(false), 25);
  useBackHandler('modal:logoutConfirm', showLogoutConfirm, () => setShowLogoutConfirm(false), 25);
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [isSaving, setIsSaving] = useState(false);
  const [editSuccessNotice, setEditSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditPhone(user.phone || '');
      setEditEmail(user.email || '');
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editPhone.trim()) return;
    setIsSaving(true);
    triggerSound('beep');
    try {
      await updateUserProfile({
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim()
      });
      setIsSaving(false);
      setShowEditModal(false);
      setEditSuccessNotice('Profile updated and synchronized with Supabase!');
      setTimeout(() => setEditSuccessNotice(null), 3000);
    } catch {
      setIsSaving(false);
    }
  };

  const menuItems = [
    {
      id: 'captain_portal',
      title: 'Drive with Toto (Captain Partner)',
      subtitle: 'Switch to Toto driver mode & accept rides',
      badge: 'Partner',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: Zap,
      iconColor: 'text-[#E07A00]',
      iconBg: 'bg-amber-50',
      action: () => {
        triggerSound('beep');
        setActiveRole('driver');
      }
    },
    {
      id: 'wallet',
      title: 'Toto Drive Wallet',
      subtitle: `Available balance: ₹${walletBalance}`,
      badge: `₹${walletBalance}`,
      badgeColor: 'bg-orange-50 text-[#C8622A] border-orange-200',
      icon: Wallet,
      iconColor: 'text-[#FF6B2C]',
      iconBg: 'bg-orange-100',
      action: onOpenWallet
    },
    {
      id: 'schedule',
      title: 'Schedule Ride',
      subtitle: 'Plan upcoming metro & office trips',
      icon: Clock,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      action: onOpenSchedule
    },
    {
      id: 'saved_places',
      title: 'Saved Places',
      subtitle: 'Home, Work, Station & favorite hubs',
      icon: Bookmark,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
      action: onOpenSavedPlaces
    },
    {
      id: 'history',
      title: 'My Rides',
      subtitle: `${completedRidesCount} past journeys & receipts`,
      badge: `${completedRidesCount} trips`,
      badgeColor: 'bg-neutral-100 text-neutral-700 border-neutral-200',
      icon: History,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-100',
      action: onOpenHistory
    },
    {
      id: 'coupons',
      title: 'Offers & Coupons',
      subtitle: 'Discounts, cashbacks & festival promo codes',
      icon: Tag,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      action: onOpenCoupons
    },
    {
      id: 'safety',
      title: 'Safety Center',
      subtitle: 'SOS trigger, emergency contacts & live sharing',
      icon: ShieldCheck,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-100',
      action: onOpenSafety
    },
    {
      id: 'support',
      title: 'Help & Support',
      subtitle: '24/7 ride assistance & support tickets',
      icon: LifeBuoy,
      iconColor: 'text-rose-600',
      iconBg: 'bg-rose-100',
      action: onOpenSupport
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-3xl mx-auto px-3 sm:px-6 py-3 sm:py-6 space-y-4 sm:space-y-5"
    >
      {/* Top Page Header Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-[#EDE8E0] shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Settings className="w-5 h-5 text-[#FFA726]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-[#111111] tracking-tight truncate">
              Account & Profile
            </h1>
            <p className="text-xs text-neutral-500 font-medium truncate">
              Preferences, safety controls & wallet
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-[#181818] hover:bg-black active:scale-95 text-white text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Book Ride</span>
          <span className="xs:hidden">Home</span>
        </button>
      </div>

      {/* User Profile Hero Card */}
      <div className="bg-[#181818] text-white rounded-3xl p-5 sm:p-6 relative overflow-hidden shadow-xs border border-neutral-800">
        {/* Subtle Background Glow */}
        <div className="absolute -right-10 -top-10 w-44 h-44 bg-[#FF7A1A]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10 flex-wrap sm:flex-nowrap">
          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-[#FFA726] to-[#E05300] text-white font-black text-2xl flex items-center justify-center shadow-lg ring-4 ring-white/10 shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'P'}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-extrabold text-lg sm:text-xl text-white tracking-tight truncate">
                  {user?.name || 'Verified Passenger'}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified Rider
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerSound('beep');
                  setShowEditModal(true);
                }}
                className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-white/20"
              >
                <Edit2 className="w-3 h-3 text-[#FFA726]" />
                <span>Edit Profile</span>
              </button>
            </div>

            <div className="flex flex-col gap-0.5 mt-1">
              <p className="text-xs sm:text-sm text-neutral-300 flex items-center gap-1.5 font-medium">
                <Phone className="w-3.5 h-3.5 text-neutral-400" />
                <span>{user?.phone || '+91 98311 02458'}</span>
              </p>
              {user?.email && (
                <p className="text-xs text-neutral-300 flex items-center gap-1.5 font-medium truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 mt-2.5 text-xs font-semibold text-neutral-300 flex-wrap">
              <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>4.9 Rating</span>
              </span>
              <span className="text-white/40">•</span>
              <span className="text-white/90">
                {completedRidesCount} {completedRidesCount === 1 ? 'ride' : 'rides'} completed
              </span>
            </div>
          </div>
        </div>
      </div>

      {editSuccessNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-3 rounded-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{editSuccessNotice}</span>
        </div>
      )}

      {/* Quick Wallet Card */}
      <div className="bg-gradient-to-r from-[#FFFDF9] via-white to-[#FFF8F0] rounded-3xl p-4 sm:p-5 border border-[#EDE8E0] shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-orange-100 text-[#FF6B2C] flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-neutral-500 font-medium">Toto Wallet Balance</p>
            <p className="text-lg sm:text-2xl font-black text-[#111111] tracking-tight">
              ₹{walletBalance}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenWallet}
          className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-[#E07A00] hover:bg-[#C8622A] text-white text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Cash</span>
        </button>
      </div>

      {/* Settings Menu Options List */}
      <div className="bg-white rounded-3xl border border-[#EDE8E0] divide-y divide-[#F2EDE5] overflow-hidden shadow-xs">
        {menuItems.map((item) => {
          const IconComp = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                triggerSound('click');
                item.action();
              }}
              className="w-full px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between gap-3 text-left hover:bg-[#FAF8F5] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                  <IconComp className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs sm:text-sm font-bold text-[#111111] group-hover:text-[#E07A00] transition-colors truncate">
                      {item.title}
                    </p>
                    {item.badge && (
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-neutral-500 truncate mt-0.5 font-medium">
                    {item.subtitle}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-[#111111] group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Log Out Action */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => {
            triggerSound('alert');
            setShowLogoutConfirm(true);
          }}
          className="w-full py-3.5 px-4 bg-[#FFF5F5] hover:bg-[#FFEBEB] text-[#D93838] border border-[#FFD5D5] rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer active:scale-98"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out of Toto Account</span>
        </button>
      </div>

      {/* Confirmation Modal for Logout */}
      {showLogoutConfirm && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div 
            className="bg-white w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 border border-neutral-200 animate-in zoom-in-95 duration-150 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-13 h-13 sm:w-14 sm:h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center border border-red-100 shadow-2xs">
                <LogOut className="w-6 h-6 sm:w-7 sm:h-7 ml-0.5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight">Log Out of TotoDrive?</h3>
                <p className="text-xs sm:text-sm font-medium text-neutral-500 max-w-xs mx-auto px-1 leading-relaxed">
                  You can log back in at any time with your phone number or email account.
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 sm:gap-3 pt-1.5">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 sm:py-3.5 px-4 rounded-2xl bg-neutral-100 hover:bg-neutral-200 font-bold text-xs sm:text-sm text-neutral-700 transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="flex-1 py-3 sm:py-3.5 px-4 rounded-2xl bg-red-600 hover:bg-red-700 font-bold text-xs sm:text-sm text-white transition-colors cursor-pointer shadow-xs shadow-red-200 text-center flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowEditModal(false)}
        >
          <div 
            className="bg-white w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 border border-neutral-200 animate-in zoom-in-95 duration-150 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#E07A00]" />
                <h3 className="text-base font-extrabold text-[#111111] tracking-tight">Edit Rider Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Your Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-neutral-200 rounded-2xl font-bold text-[#111111] mt-1 focus:outline-none focus:border-[#C8622A]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Phone Number</label>
                <input
                  type="text"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-neutral-200 rounded-2xl font-bold text-[#111111] mt-1 focus:outline-none focus:border-[#C8622A]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="rider@example.com"
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-neutral-200 rounded-2xl font-bold text-[#111111] mt-1 focus:outline-none focus:border-[#C8622A]"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-2xl bg-neutral-100 hover:bg-neutral-200 font-bold text-neutral-700 text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 px-4 rounded-2xl bg-[#E07A00] hover:bg-[#C8622A] font-bold text-white text-xs shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="text-center pt-2 pb-6 space-y-1 select-none">
        <p className="text-[11px] text-neutral-400 font-medium">
          TotoDrive Electric Fleet • Smart Shared Mobility
        </p>
        <p className="text-[10px] text-neutral-400">
          Zero emission Kolkata urban transportation
        </p>
      </div>
    </motion.div>
  );
};
