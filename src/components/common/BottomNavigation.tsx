import React from 'react';
import { useRide } from '../../context/RideContext';
import { Home, Send, Palmtree, User } from 'lucide-react';

export const BottomNavigation: React.FC = () => {
  const { activeRole, user, triggerSound } = useRide();

  // Only show bottom navigation for the passenger app when logged in
  if (activeRole !== 'user' || !user) {
    return null;
  }

  const navItems = [
    { icon: Home, label: 'Ride', active: true },
    { icon: Send, label: 'All Services', active: false },
    { icon: Palmtree, label: 'Travel', active: false },
    { icon: User, label: 'Profile', active: false },
  ];

  return (
    <nav className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EDE8E0] px-3 sm:px-6 py-2.5 select-none mt-auto">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {navItems.map((item, index) => (
          <button
            key={index}
            onClick={() => {
              if (item.label === 'Profile') {
                window.dispatchEvent(new CustomEvent('openProfileSettings'));
                triggerSound('click');
              } else if (!item.active) {
                triggerSound('click');
              }
            }}
            className={`flex flex-col items-center justify-center w-full gap-1 py-1 ${
              item.active ? 'text-[#111111]' : 'text-neutral-400 hover:text-neutral-700'
            } transition-colors cursor-pointer`}
          >
            <item.icon className="w-6 h-6" strokeWidth={item.active ? 2.5 : 2} />
            <span className={`text-[10px] ${item.active ? 'font-bold' : 'font-medium'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
};
