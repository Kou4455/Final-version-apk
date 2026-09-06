import React, { useState, useEffect } from 'react';
import { useRide } from '../../context/RideContext';
import { Home, Car, User } from 'lucide-react';

export const BottomNavigation: React.FC = () => {
  const { activeRole, user, driver, triggerSound } = useRide();
  const [activeTab, setActiveTab] = useState('Home');

  useEffect(() => {
    const handleNavigateHome = () => setActiveTab('Home');
    window.addEventListener('navigateHomeTab', handleNavigateHome);
    return () => window.removeEventListener('navigateHomeTab', handleNavigateHome);
  }, []);

  // Show bottom navigation for both passenger and driver apps when logged in
  if (activeRole === 'admin') return null;
  if (activeRole === 'user' && !user) return null;
  if (activeRole === 'driver' && !driver) return null;

  const navItems = [
    { icon: Home, label: 'Home' },
    { icon: Car, label: 'My Ride' },
    { icon: User, label: 'Profile' },
  ];

  return (
    <nav className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EDE8E0] px-3 sm:px-6 py-2.5 select-none mt-auto shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {navItems.map((item, index) => {
          const isActive = activeTab === item.label;
          return (
            <button
              key={index}
              onClick={() => {
                setActiveTab(item.label);
                if (item.label === 'Profile') {
                  window.dispatchEvent(new CustomEvent('openProfileSettings'));
                } else if (item.label === 'My Ride') {
                  window.dispatchEvent(new CustomEvent('openRideHistory'));
                } else if (item.label === 'Home') {
                  window.dispatchEvent(new CustomEvent('closeAllModals'));
                }
                triggerSound('click');
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-2 sm:py-2 rounded-xl transition-all duration-150 cursor-pointer shadow-xs active:scale-[0.96] border ${
                isActive
                  ? 'bg-[#181818] hover:bg-black text-white border-neutral-800 hover:border-neutral-700'
                  : 'bg-[#FAF8F5] hover:bg-neutral-100 text-neutral-800 border-neutral-200'
              }`}
            >
              <item.icon className={`w-4 h-4 sm:w-4 h-4 ${isActive ? 'text-[#E07A00]' : 'text-neutral-500'}`} />
              <span className="text-xs font-bold">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
