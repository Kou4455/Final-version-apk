import React, { useState } from 'react';
import { useRide } from '../../context/RideContext';
import { SEED_DRIVERS } from '../../data/appData';
import { AppLogo } from './AppLogo';
import { 
  LogOut,
  User,
  AlertTriangle,
  Zap
} from 'lucide-react';

export const Header: React.FC = () => {
  const [showPassengerLogoutConfirm, setShowPassengerLogoutConfirm] = useState(false);
  const [showDriverLogoutConfirm, setShowDriverLogoutConfirm] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const { 
    activeRole, 
    setActiveRole, 
    user, 
    driver, 
    loginDriver,
    logoutUser, 
    logoutDriver, 
    triggerSound,
    activeNavTab,
    setActiveNavTab
  } = useRide();

  // Track page scrolling system for fixed header feedback & progress
  React.useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setIsScrolled(scrollY > 12);

      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = Math.min(100, Math.max(0, (scrollY / totalHeight) * 100));
        setScrollProgress(progress);
      } else {
        setScrollProgress(0);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Automatically logout driver or captains whenever returning to the users login page
  React.useEffect(() => {
    if (activeRole === 'user' && !user && driver) {
      logoutDriver();
    }
  }, [activeRole, user, driver, logoutDriver]);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header 
      id="app-fixed-header"
      className={`fixed top-0 left-0 right-0 w-full z-50 transition-all duration-200 select-none pt-[env(safe-area-inset-top,0px)] ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md border-b border-[#E2DDD3] shadow-[0_4px_20px_rgba(0,0,0,0.06)] py-1.5 sm:py-2' 
          : 'bg-white/90 backdrop-blur-md border-b border-[#EDE8E0]/80 py-2 sm:py-2.5'
      }`}
    >
      {/* Dynamic Scroll Progress Bar along header bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-neutral-100/40 pointer-events-none overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-[#C8622A] via-[#E07A00] to-[#FFB703] transition-all duration-75 ease-out rounded-r-full"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Internal header content container */}
      <div className="max-w-6xl mx-auto px-2.5 sm:px-6 flex items-center justify-between gap-1.5 sm:gap-2.5">
        {/* Left: Brand Logo & Title with scroll-to-top feature */}
        <div 
          onClick={() => { 
            setActiveNavTab('home'); 
            triggerSound('beep');
            handleScrollToTop();
          }}
          className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group shrink-0"
          title="Toto Drive Home (Click to navigate home & scroll to top)"
        >
          <AppLogo size="sm" />
          <div>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="font-black text-sm sm:text-base tracking-tight text-[#111111]">
                Toto<span className="text-[#E07A00]">Drive</span>
              </span>
              <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full hidden xs:inline-block ${
                activeRole === 'driver' 
                  ? 'text-[#C8622A] bg-[#FFF2E8] border border-[#FF6B2C]/30' 
                  : 'text-[#8C5200] bg-[#FFF3C4]'
              }`}>
                {activeRole === 'driver' ? 'Captain' : 'Kolkata'}
              </span>
            </div>
          </div>
        </div>

        {/* Scroll workflow helper: Scroll to top shortcut pill when scrolled */}
        {isScrolled && (
          <button
            type="button"
            onClick={() => {
              triggerSound('click');
              handleScrollToTop();
            }}
            className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold text-neutral-600 hover:text-neutral-950 bg-neutral-100 hover:bg-neutral-200/80 px-2.5 py-1 rounded-full transition-all cursor-pointer border border-neutral-200/70 shrink-0 active:scale-95"
            title="Scroll page to top"
          >
            <span>Top</span>
            <span className="text-[10px]">↑</span>
          </button>
        )}

        {/* Middle & Right: Actions & Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Captain button on right side top corner - visible only when passenger is not logged in */}
          {activeRole === 'user' && !user && (
            <button
              id="header-captain-btn"
              type="button"
              onClick={() => {
                triggerSound('beep');
                setActiveRole('driver');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-3.5 py-1.5 sm:py-2 rounded-xl transition-all duration-150 cursor-pointer flex items-center gap-1.5 bg-[#181818] hover:bg-black active:scale-[0.96] text-white text-xs font-bold shadow-xs border border-neutral-800 hover:border-neutral-700 select-none shrink-0"
              title="Switch to Captain / Driver Portal"
            >
              <Zap className="w-3.5 h-3.5 text-[#FFB703] fill-[#FFB703]" />
              <div className="flex flex-col text-left leading-tight">
                <span className="font-extrabold text-xs text-white tracking-tight">
                  Captain
                </span>
                <span className="text-[9px] text-neutral-400 font-medium hidden sm:inline-block">
                  Driver Portal
                </span>
              </div>
            </button>
          )}

          {/* User Profile Info & Signout when passenger is logged in */}
          {activeRole === 'user' && user && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveNavTab('profile');
                  triggerSound('click');
                }}
                className={`flex items-center gap-2 px-2.5 py-1 sm:py-1.5 rounded-xl border transition-all text-xs shadow-2xs cursor-pointer ${
                  activeNavTab === 'profile'
                    ? 'bg-[#FFF2E8] border-[#FF6B2C]/40 text-[#C8622A]'
                    : 'bg-[#FAF8F5] hover:bg-[#F2ECE1] border-neutral-200 text-neutral-800'
                }`}
                title="View Profile & Settings"
              >
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
              </button>

              <button
                id="header-passenger-signout-btn"
                onClick={() => { setShowPassengerLogoutConfirm(true); triggerSound('beep'); }}
                title="Sign out passenger"
                className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer border border-transparent hover:border-neutral-200"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {showPassengerLogoutConfirm && (
                <div 
                  id="passenger-logout-modal-backdrop"
                  className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 pb-6 sm:pb-4 select-none animate-in fade-in duration-200"
                  onClick={() => setShowPassengerLogoutConfirm(false)}
                >
                  <div 
                    id="passenger-logout-modal"
                    className="bg-white w-full max-w-sm sm:max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-neutral-200/90 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 mb-2 sm:mb-0 text-center space-y-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Mobile Bottom Sheet Pull Indicator */}
                    <div className="w-10 h-1 rounded-full bg-neutral-200 mx-auto -mt-1 mb-2 sm:hidden" />

                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="w-13 h-13 sm:w-14 sm:h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-100 shadow-2xs">
                        <LogOut className="w-6 h-6 sm:w-7 sm:h-7 text-red-600 ml-0.5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight">
                          Log Out of TotoDrive?
                        </h3>
                        <p className="text-xs sm:text-sm font-medium text-neutral-500 max-w-xs mx-auto px-1 leading-relaxed">
                          You will need to verify your phone number to log back in.
                        </p>
                      </div>
                      <div className="flex gap-2.5 sm:gap-3 w-full pt-1.5">
                        <button
                          type="button"
                          onClick={() => { setShowPassengerLogoutConfirm(false); triggerSound('beep'); }}
                          className="flex-1 py-3 sm:py-3.5 px-4 rounded-2xl bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-neutral-700 font-bold text-xs sm:text-sm transition-all cursor-pointer text-center"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowPassengerLogoutConfirm(false); logoutUser(); triggerSound('beep'); }}
                          className="flex-1 py-3 sm:py-3.5 px-4 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-xs shadow-red-200 text-center flex items-center justify-center gap-1.5"
                        >
                          <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                          <span>Log Out</span>
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
              <button
                type="button"
                id="header-driver-profile-pill"
                onClick={() => {
                  setActiveNavTab('profile');
                  triggerSound('beep');
                }}
                className={`flex items-center gap-2 px-2.5 py-1 sm:py-1.5 rounded-xl border text-xs shadow-2xs transition-all cursor-pointer ${
                  activeNavTab === 'profile'
                    ? 'bg-[#181818] text-white border-neutral-800'
                    : 'bg-[#FAF8F5] hover:bg-[#F2ECE1] border-neutral-200 text-[#111111]'
                }`}
                title="View Captain Profile & Vehicle Setup"
              >
                {driver.driverPhoto || driver.avatarUrl ? (
                  <img
                    src={driver.driverPhoto || driver.avatarUrl}
                    alt={driver.name}
                    className="w-6 h-6 rounded-full object-cover shadow-2xs shrink-0"
                  />
                ) : (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] uppercase shadow-2xs shrink-0 ${
                    activeNavTab === 'profile' ? 'bg-white text-neutral-900' : 'bg-[#181818] text-white'
                  }`}>
                    {driver.name ? driver.name.charAt(0) : 'D'}
                  </div>
                )}
                <div className="flex flex-col text-left leading-tight">
                  <span className="font-bold text-xs max-w-[110px] truncate">
                    {driver.name ? driver.name.split(' ')[0] : 'Captain'}
                  </span>
                  <span className={`text-[10px] font-semibold hidden sm:inline-block ${
                    activeNavTab === 'profile' ? 'text-emerald-300' : 'text-emerald-600'
                  }`}>
                    {driver.isOnline ? '● Online' : '○ Offline'}
                  </span>
                </div>
              </button>

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
                  className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 pb-6 sm:pb-4 animate-in fade-in duration-200"
                  onClick={() => setShowDriverLogoutConfirm(false)}
                >
                  <div 
                    id="driver-logout-modal"
                    className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full p-5 sm:p-6 space-y-4 border border-neutral-200 shadow-2xl text-left animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150 mb-2 sm:mb-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Mobile Bottom Sheet Pull Indicator */}
                    <div className="w-10 h-1 rounded-full bg-neutral-200 mx-auto -mt-1 mb-2 sm:hidden" />
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
