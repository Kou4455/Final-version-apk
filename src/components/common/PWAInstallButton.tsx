import React, { useState } from 'react';
import { Download, Share, PlusSquare, X, CheckCircle2, Smartphone, ShieldCheck, Zap } from 'lucide-react';
import { usePWAInstall, PWARole } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  role?: PWARole;
  variant?: 'header' | 'banner' | 'card' | 'compact';
  className?: string;
  onInstalled?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  role = 'user',
  variant = 'header',
  className = '',
  onInstalled
}) => {
  const { isInstallable, isInstalled, isIOS, install, config } = usePWAInstall(role);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  // If already running as an installed PWA standalone app, suppress prompt
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setInstalling(true);
      const success = await install();
      setInstalling(false);
      if (success) {
        setInstalledSuccess(true);
        if (onInstalled) onInstalled();
        setTimeout(() => setInstalledSuccess(false), 4000);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // In browsers without native prompt, guide the user to Chrome menu / Add to Home Screen
      setShowIOSGuide(true);
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'driver':
        return {
          shortTitle: 'Captain App',
          fullTitle: 'Install Toto Captain App',
          subtitle: 'Instant ride alerts, offline navigation & earnings tracker on your home screen',
          buttonText: 'Install App',
          badgeText: 'Driver Partner PWA',
          colorScheme: 'from-emerald-500 via-teal-500 to-emerald-600',
          btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          headerBg: 'bg-emerald-500 hover:bg-emerald-400 text-neutral-900 border-emerald-600/30'
        };
      case 'admin':
        return {
          shortTitle: 'Admin App',
          fullTitle: 'Install Admin Control Center',
          subtitle: 'Fleet dispatch, KYC approvals & dynamic pricing right from your desktop or phone',
          buttonText: 'Install Admin App',
          badgeText: 'Operations PWA',
          colorScheme: 'from-amber-600 via-orange-600 to-amber-700',
          btnBg: 'bg-neutral-900 hover:bg-neutral-800 text-amber-300',
          headerBg: 'bg-amber-600 hover:bg-amber-500 text-white border-amber-700/40'
        };
      default:
        return {
          shortTitle: 'Install App',
          fullTitle: 'Install Toto Drive Customer App',
          subtitle: 'Fast booking, live radar & instant dispatch right on your home screen',
          buttonText: 'Install App',
          badgeText: 'Instant Booking',
          colorScheme: 'from-amber-500 via-yellow-400 to-amber-500',
          btnBg: 'bg-neutral-900 hover:bg-neutral-800 text-amber-300',
          headerBg: 'bg-amber-400 hover:bg-amber-300 text-neutral-900 border-amber-500/30'
        };
    }
  };

  const roleMeta = getRoleLabel();

  return (
    <>
      {installedSuccess && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl animate-fade-in shadow-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>{roleMeta.shortTitle} Installed!</span>
        </div>
      )}

      {!installedSuccess && variant === 'header' && (
        <button
          id={`pwa-header-install-btn-${role}`}
          type="button"
          onClick={handleInstallClick}
          disabled={installing}
          title={`Install ${config.name}`}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold text-xs shadow-xs hover:shadow-sm active:scale-95 transition-all duration-150 cursor-pointer border ${roleMeta.headerBg} ${className}`}
        >
          <img
            src="/app-logo.jpeg"
            alt="Toto Drive"
            className="w-4 h-4 rounded-md object-cover shadow-2xs"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/pwa-192x192.png';
            }}
          />
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="hidden sm:inline">{roleMeta.shortTitle}</span>
          <span className="sm:hidden">Install</span>
        </button>
      )}

      {!installedSuccess && variant === 'compact' && (
        <button
          id={`pwa-compact-install-btn-${role}`}
          type="button"
          onClick={handleInstallClick}
          disabled={installing}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-neutral-900 text-amber-300 hover:bg-neutral-800 border border-neutral-800 shadow-xs active:scale-95 transition-all cursor-pointer ${className}`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>{roleMeta.buttonText}</span>
        </button>
      )}

      {!installedSuccess && variant === 'banner' && (
        <div
          id={`pwa-install-banner-${role}`}
          className={`w-full bg-gradient-to-r ${roleMeta.colorScheme} p-3 sm:p-3.5 rounded-2xl text-white shadow-md flex items-center justify-between gap-3 border border-white/20 ${className}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/app-logo.jpeg"
              alt="Toto Drive"
              className="w-10 h-10 rounded-xl object-cover shadow-sm ring-2 ring-white/60 shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/pwa-192x192.png';
              }}
            />
            <div className="min-w-0 text-left">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs sm:text-sm font-black tracking-tight text-white truncate">
                  {roleMeta.fullTitle}
                </h4>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-bold text-white tracking-wide uppercase">
                  {roleMeta.badgeText}
                </span>
              </div>
              <p className="text-[11px] font-medium text-white/90 line-clamp-1">
                {roleMeta.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            disabled={installing}
            className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-transform flex items-center gap-1.5 cursor-pointer ${roleMeta.btnBg}`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
        </div>
      )}

      {!installedSuccess && variant === 'card' && (
        <div
          id={`pwa-install-card-${role}`}
          className={`w-full p-4 rounded-2xl bg-white border border-neutral-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${className}`}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              {role === 'driver' ? (
                <Zap className="w-5 h-5 text-emerald-600" />
              ) : role === 'admin' ? (
                <ShieldCheck className="w-5 h-5 text-amber-600" />
              ) : (
                <Smartphone className="w-5 h-5 text-amber-600" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-black text-neutral-900">
                  {roleMeta.fullTitle}
                </h4>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-700">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 font-medium">
                {roleMeta.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            disabled={installing}
            className={`self-stretch sm:self-auto px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-transform flex items-center justify-center gap-1.5 cursor-pointer ${roleMeta.btnBg}`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{roleMeta.buttonText}</span>
          </button>
        </div>
      )}

      {/* Safari / Browser Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-neutral-200 text-neutral-900 relative animate-scale-up">
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
              aria-label="Close installation guide"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <img
                src="/app-logo.jpeg"
                alt="Toto Drive"
                className="w-12 h-12 rounded-2xl object-cover shadow-md ring-2 ring-amber-400"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/pwa-192x192.png';
                }}
              />
              <div>
                <h3 className="font-extrabold text-base text-neutral-900">{roleMeta.fullTitle}</h3>
                <p className="text-xs font-medium text-neutral-500">
                  {isIOS ? 'iPhone / iPad Safari' : 'Chrome / Edge Browser'}
                </p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-neutral-700 bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
                  <Share className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-neutral-900">Step 1: </span>
                  {isIOS ? (
                    <>Tap the <strong className="text-neutral-900">Share</strong> icon in the bottom Safari toolbar.</>
                  ) : (
                    <>Click the <strong className="text-neutral-900">Install</strong> icon in the browser address bar or open the 3-dot menu.</>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-neutral-900">Step 2: </span>
                  Select <strong className="text-neutral-900">"Add to Home Screen"</strong> or <strong className="text-neutral-900">"Install Toto Drive"</strong>.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-neutral-900">Step 3: </span>
                  Confirm to launch the app directly in fullscreen standalone mode.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold shadow-md transition cursor-pointer"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
