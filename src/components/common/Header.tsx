import React, { useState } from 'react';
import { useRide } from '../../context/RideContext';
import { SEED_DRIVERS } from '../../data/appData';
import { AppLogo } from './AppLogo';
import { 
  LogOut,
  User,
  AlertTriangle
} from 'lucide-react';

export const Header: React.FC = () => {
  const [showPassengerLogoutConfirm, setShowPassengerLogoutConfirm] = useState(false);
  const [showDriverLogoutConfirm, setShowDriverLogoutConfirm] = useState(false);

  const { 
    activeRole, 
    setActiveRole, 
    user, 
    driver, 
    loginDriver,
    logoutUser, 
    logoutDriver, 
    triggerSound 
  } = useRide();

  const handleCaptainClick = (e?: React.MouseEvent) => {
    e?.preventDefault();
    triggerSound('beep');
    // Switch to driver portal / login page immediately
    setActiveRole('driver');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EDE8E0] px-3 sm:px-6 py-2.5 select-none">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Brand Logo & Title */}
        <div 
          onClick={() => { setActiveRole('user'); triggerSound('beep'); }}
          className="flex items-center gap-2.5 cursor-pointer group"
          title="Toto Drive Passenger Home"
        >
          <AppLogo size="sm" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-base tracking-tight text-[#111111]">
                Toto<span className="text-[#E07A00]">Drive</span>
              </span>
              <span className="text-[10px] font-bold text-[#8C5200] bg-[#FFF3C4] px-2 py-0.5 rounded-full hidden sm:inline-block">
                Kolkata
              </span>
            </div>
          </div>
        </div>

        {/* Middle & Right: Actions & Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Captain Button on right side top corner - automatically hidden when passenger is logged in and viewing their dashboard */}
          {activeRole === 'user' && !user && (
            <button
              id="header-captain-btn"
              type="button"
              onClick={handleCaptainClick}
              className="px-3.5 py-1.5 sm:py-2 rounded-xl transition-all duration-150 cursor-pointer flex items-center bg-[#181818] hover:bg-black active:scale-[0.96] text-white text-xs font-bold shadow-xs border border-neutral-800 hover:border-neutral-700 select-none"
              title={driver ? `Switch to ${driver.name}'s Dashboard` : "Switch to Captain / Driver Login Portal"}
            >
              <div className="flex flex-col text-left leading-tight">
                <span className="font-extrabold text-xs text-white tracking-tight">
                  {driver ? (driver.name.split(' ')[0] || 'Captain') : 'Captain Portal'}
                </span>
                <span className="text-[10px] text-neutral-400 font-medium hidden sm:inline-block">
                  {driver ? 'Driver Dashboard' : 'Driver Sign In'}
                </span>
              </div>
            </button>
          )}

          {/* Passenger Button - removed from admin pages as requested */}

          {/* User Profile Info & Signout when passenger is logged in */}
          {activeRole === 'user' && user && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-[#FAF8F5] px-2.5 py-1 sm:py-1.5 rounded-xl border border-neutral-200 text-xs shadow-2xs">
                <div className="w-6 h-6 rounded-full bg-[#E07A00] text-white flex items-center justify-center font-bold text-[11px] uppercase shadow-2xs shrink-0">
                  {user.name ? user.name.charAt(0) : 'P'}
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className="font-bold text-[#111111] text-xs max-w-[110px] truncate">
                    {user.name || 'Passenger'}
                  </span>
                  <span className="text-[10px] text-neutral-500 font-medium hidden sm:inline-block">
                    {user.phone ? `+91 ${user.phone.slice(-5)}` : 'Rider'}
                  </span>
                </div>
              </div>

              <button
                id="header-passenger-signout-btn"
                onClick={() => { setShowPassengerLogoutConfirm(true); triggerSound('beep'); }}
                title="Sign out passenger"
                className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer border border-transparent hover:border-neutral-200"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {showPassengerLogoutConfirm && (
                <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center">
                        <LogOut className="w-7 h-7 text-red-600 ml-1" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl sm:text-lg font-black text-neutral-900 tracking-tight">Log Out of TotoDrive?</h3>
                        <p className="text-sm font-medium text-neutral-500 px-2 sm:px-0">You will need to verify your phone number to log back in.</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
                        <button
                          onClick={() => { setShowPassengerLogoutConfirm(false); triggerSound('beep'); }}
                          className="w-full sm:flex-1 py-3.5 sm:py-3 px-4 rounded-2xl bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-neutral-700 font-bold text-sm transition-all cursor-pointer order-2 sm:order-1"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => { setShowPassengerLogoutConfirm(false); logoutUser(); triggerSound('beep'); }}
                          className="w-full sm:flex-1 py-3.5 sm:py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-sm transition-all cursor-pointer shadow-sm shadow-red-200 order-1 sm:order-2"
                        >
                          Yes, Log Out
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Driver Profile Info & Signout when driver is logged in and viewing dashboard */}
          {activeRole === 'driver' && driver && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-[#FAF8F5] px-2.5 py-1 sm:py-1.5 rounded-xl border border-neutral-200 text-xs shadow-2xs">
                {driver.driverPhoto || driver.avatarUrl ? (
                  <img
                    src={driver.driverPhoto || driver.avatarUrl}
                    alt={driver.name}
                    className="w-6 h-6 rounded-full object-cover shadow-2xs shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#181818] text-white flex items-center justify-center font-bold text-[11px] uppercase shadow-2xs shrink-0">
                    {driver.name ? driver.name.charAt(0) : 'D'}
                  </div>
                )}
                <div className="flex flex-col text-left leading-tight">
                  <span className="font-bold text-[#111111] text-xs max-w-[110px] truncate">
                    {driver.name ? driver.name.split(' ')[0] : 'Captain'}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold hidden sm:inline-block">
                    {driver.isOnline ? '● Online' : '○ Offline'}
                  </span>
                </div>
              </div>

              <button
                id="header-driver-signout-btn"
                onClick={() => {
                  triggerSound('beep');
                  setShowDriverLogoutConfirm(true);
                }}
                title="Sign out captain"
                className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer border border-transparent hover:border-neutral-200"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Driver Logout Confirmation Modal */}
              {showDriverLogoutConfirm && (
                <div 
                  id="driver-logout-modal-backdrop"
                  className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
                  onClick={() => setShowDriverLogoutConfirm(false)}
                >
                  <div 
                    id="driver-logout-modal"
                    className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-neutral-200 shadow-2xl text-left animate-in zoom-in-95 duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-start gap-3 pb-3 border-b border-neutral-100">
                      <div className="p-2.5 bg-red-50 text-red-600 rounded-2xl border border-red-200/80 shrink-0">
                        <LogOut className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5 flex-1">
                        <h3 className="text-base font-extrabold text-neutral-900 leading-tight">
                          Log Out of Captain Partner?
                        </h3>
                        <p className="text-xs text-neutral-500 font-medium">
                          Captain Session Reconfirmation
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          triggerSound('beep');
                          setShowDriverLogoutConfirm(false);
                        }}
                        className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                        title="Cancel and close"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-amber-950 font-medium">
                        <AlertTriangle className="w-4 h-4 text-[#C8622A] shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                          Are you sure you want to end your captain session? You will be set offline and cannot receive incoming passenger ride dispatch requests until you sign back in with your 4-digit PIN.
                        </div>
                      </div>

                      {driver && (
                        <div className="p-2.5 bg-[#FAF8F5] border border-neutral-200/80 rounded-xl flex items-center gap-2.5 text-xs">
                          {driver.driverPhoto || driver.avatarUrl ? (
                            <img
                              src={driver.driverPhoto || driver.avatarUrl}
                              alt={driver.name}
                              className="w-8 h-8 rounded-full object-cover shadow-2xs shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#181818] text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {driver.name ? driver.name.charAt(0) : 'D'}
                            </div>
                          )}
                          <div className="flex flex-col text-left leading-tight truncate">
                            <span className="font-bold text-neutral-900 truncate">{driver.name}</span>
                            <span className="text-[11px] text-neutral-500 truncate">{driver.phone} • {driver.vehicleModel || 'Toto'}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
                      <button
                        id="driver-logout-cancel-btn"
                        type="button"
                        onClick={() => {
                          triggerSound('beep');
                          setShowDriverLogoutConfirm(false);
                        }}
                        className="flex-1 py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-neutral-800 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                      >
                        Stay Online
                      </button>

                      <button
                        id="driver-logout-confirm-btn"
                        type="button"
                        onClick={() => {
                          triggerSound('beep');
                          setShowDriverLogoutConfirm(false);
                          logoutDriver();
                        }}
                        className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer text-center"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Yes, Log Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
