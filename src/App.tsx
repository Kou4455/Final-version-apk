import React, { useState } from 'react';
import { RideProvider, useRide } from './context/RideContext';
import { Header } from './components/common/Header';
import { BottomNavigation } from './components/common/BottomNavigation';
import { FirestoreQuotaBanner } from './components/common/FirestoreQuotaBanner';
import { SplashScreen } from './components/common/SplashScreen';
import { UserLogin } from './components/user/UserLogin';
import { UserDashboard } from './components/user/UserDashboard';
import { DriverLogin } from './components/driver/DriverLogin';
import { DriverDashboard } from './components/driver/DriverDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLogin } from './components/admin/AdminLogin';

const MainAppContent: React.FC = () => {
  const { activeRole, user, driver, userGpsPoint, setActiveRole, logoutUser, isAdminAuthenticated } = useRide();
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return (
      <SplashScreen
        onComplete={() => setShowSplash(false)}
        isAuthenticated={!!user}
        hasLocationPermission={!!userGpsPoint}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#111111] flex flex-col font-sans selection:bg-[#FDE8DC] selection:text-[#C8622A]">
      {/* Top Application Header */}
      <Header />
      <FirestoreQuotaBanner />

      {/* Main Screen Content Body */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-0 sm:p-4 md:p-6 flex flex-col justify-start overflow-y-auto">
        {/* Role 1: User / Passenger App View ("Where to next?") */}
        {activeRole === 'user' && (
          <div className="w-full flex-1 flex flex-col animate-in fade-in duration-300">
            {user ? (
              <div className="p-3 sm:p-0">
                <UserDashboard />
              </div>
            ) : (
              <div className="w-full flex-1 flex flex-col items-center justify-center p-0 sm:py-6">
                <UserLogin />
              </div>
            )}
          </div>
        )}

        {/* Role 2: Toto Captain / Driver Partner View ("Your workday") */}
        {activeRole === 'driver' && (
          <div className="w-full animate-in fade-in duration-300">
            {driver ? (
              <DriverDashboard />
            ) : (
              <div className="py-6 flex flex-col items-center">
                <DriverLogin
                  onBack={() => {
                    logoutUser();
                    setActiveRole('user');
                  }}
                  onLoginSuccess={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Role 3: Admin Console & Driver Approval System */}
        {activeRole === 'admin' && (
          <div className="w-full animate-in fade-in duration-300">
            {isAdminAuthenticated ? (
              <AdminDashboard />
            ) : (
              <div className="py-6 flex flex-col items-center">
                <AdminLogin 
                  onLoginSuccess={() => setActiveRole('admin')}
                  onBack={() => setActiveRole('user')}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Sub-footer */}
      <footer className="border-t border-[#EDE8E0] bg-white text-gray-500 px-6 py-4 text-xs select-none mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[11px]">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-gray-700">Rapido Toto Live Network</span>
            <span>•</span>
            <span>Zero Emission Electric Fleet</span>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-3 gap-y-1 text-gray-600 text-center sm:text-right">
            <span>
              Owned by <strong className="text-gray-900 font-semibold">Subrata Naskar</strong>
            </span>
            <span className="hidden sm:inline text-gray-300">•</span>
            <span>
              Co-Founder & Design, Built by <strong className="text-gray-900 font-semibold">Koushik Haldar</strong>
            </span>
            <span className="hidden sm:inline text-gray-300">•</span>
            <button
              type="button"
              onClick={() => setActiveRole('admin')}
              className="text-[10px] text-gray-400 hover:text-gray-700 underline transition-colors cursor-pointer"
            >
              Admin Console
            </button>
          </div>
        </div>
      </footer>
      <BottomNavigation />
    </div>
  );
};

export default function App() {
  return (
    <RideProvider>
      <MainAppContent />
    </RideProvider>
  );
}
