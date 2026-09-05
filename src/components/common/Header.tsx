import React from 'react';
import { useRide } from '../../context/RideContext';
import { SEED_DRIVERS } from '../../data/appData';
import { AppLogo } from './AppLogo';
import { 
  LogOut,
  User
} from 'lucide-react';

export const Header: React.FC = () => {
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

          {/* Passenger Button - automatically hidden when captains are on driver PIN sign-in page or driver dashboard */}
          {activeRole === 'admin' && (
            <button
              id="header-passenger-btn"
              type="button"
              onClick={() => { setActiveRole('user'); triggerSound('beep'); }}
              className="px-3.5 py-1.5 rounded-xl transition-all duration-75 cursor-pointer flex items-center gap-2 bg-[#FAF8F5] hover:bg-neutral-100 border border-neutral-200 text-neutral-800 text-xs font-bold shadow-2xs active:scale-95"
              title="Return to Passenger App"
            >
              <User className="w-3.5 h-3.5 text-[#E07A00]" />
              <span>Passenger View</span>
            </button>
          )}

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
                onClick={() => { logoutUser(); triggerSound('beep'); }}
                title="Sign out passenger"
                className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer border border-transparent hover:border-neutral-200"
              >
                <LogOut className="w-4 h-4" />
              </button>
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
                onClick={() => { logoutDriver(); triggerSound('beep'); }}
                title="Sign out captain"
                className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer border border-transparent hover:border-neutral-200"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
