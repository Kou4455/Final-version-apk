import React, { useState, useEffect } from 'react';
import { AppLogo } from './AppLogo';
import { 
  Wifi, 
  WifiOff, 
  MapPin, 
  ShieldCheck, 
  Server, 
  AlertCircle, 
  ArrowRight,
  RotateCw,
  Sparkles
} from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  isAuthenticated: boolean;
  hasLocationPermission: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  isAuthenticated,
  hasLocationPermission
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [networkWarning, setNetworkWarning] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'ok' | 'degraded'>('checking');
  const [locationStatus, setLocationStatus] = useState<'checking' | 'granted' | 'prompt' | 'denied'>('checking');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 1. Verify connection & backend health
    const checkServer = async () => {
      try {
        const t0 = Date.now();
        const res = await fetch('/api/health');
        const elapsed = Date.now() - t0;
        if (elapsed > 2000) setNetworkWarning(true);
        if (res.ok) setServerStatus('ok');
        else setServerStatus('degraded');
      } catch {
        setServerStatus('degraded');
      }
    };
    checkServer();

    // 2. Check location permission
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName })
        .then((status) => {
          setLocationStatus(status.state as any);
        })
        .catch(() => {
          setLocationStatus(hasLocationPermission ? 'granted' : 'prompt');
        });
    } else {
      setLocationStatus(hasLocationPermission ? 'granted' : 'prompt');
    }

    // Step progression animation
    const timer1 = setTimeout(() => setStepIndex(1), 400); // internet & server
    const timer2 = setTimeout(() => setStepIndex(2), 900); // auth & session
    const timer3 = setTimeout(() => setStepIndex(3), 1400); // ready
    const timer4 = setTimeout(() => onComplete(), 2000); // fade out

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [hasLocationPermission, onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-[#FAF8F5] flex flex-col items-center justify-between p-6 select-none animate-in fade-in duration-300">
      <div className="w-full flex justify-end">
        <button
          onClick={onComplete}
          className="text-xs font-semibold text-neutral-400 hover:text-neutral-700 px-3 py-1.5 rounded-full hover:bg-neutral-100 transition-colors"
        >
          Skip &rarr;
        </button>
      </div>

      {/* Center Brand presentation */}
      <div className="flex flex-col items-center text-center space-y-4 max-w-sm">
        <div className="animate-bounce" style={{ animationDuration: '2.5s' }}>
          <AppLogo size="xl" />
        </div>

        <div className="space-y-1">
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight flex items-center justify-center gap-1.5">
            Toto<span className="text-[#E07A00]">Drive</span>
          </h1>
          <p className="text-sm font-semibold text-neutral-600">
            Kolkata's First Smart E-Rickshaw Network
          </p>
        </div>

        {/* Progress Bar & Status Pill */}
        <div className="w-64 pt-4 space-y-3">
          <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#E07A00] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(100, (stepIndex + 1) * 25)}%` }}
            />
          </div>

          <div className="flex items-center justify-center gap-2 text-xs font-medium text-neutral-600">
            {stepIndex === 0 && (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin text-[#E07A00]" />
                <span>Checking connectivity & system status...</span>
              </>
            )}
            {stepIndex === 1 && (
              <>
                <Server className="w-3.5 h-3.5 text-emerald-600" />
                <span>Synchronizing live Toto dispatch matrix...</span>
              </>
            )}
            {stepIndex === 2 && (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Restoring encrypted session credentials...</span>
              </>
            )}
            {stepIndex >= 3 && (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Opening {isAuthenticated ? 'Home' : 'Login'}...</span>
              </>
            )}
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
            isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? 'Internet Active' : 'Offline Mode'}
          </span>

          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
            locationStatus === 'denied' 
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
          }`}>
            <MapPin className="w-3 h-3 text-[#E07A00]" />
            {locationStatus === 'granted' ? 'GPS Ready' : locationStatus === 'denied' ? 'GPS Blocked' : 'GPS Standby'}
          </span>
        </div>

        {networkWarning && (
          <p className="text-[11px] text-amber-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
            Slow network detected. Offline-safe cached routes enabled.
          </p>
        )}
      </div>

      {/* Footer Info */}
      <div className="text-center text-[11px] text-neutral-400 space-y-1">
        <p>100% Zero-Emission Electric Toto Fleet</p>
        <p className="font-mono text-[10px]">v2.6.0 • Production Ready</p>
      </div>
    </div>
  );
};
