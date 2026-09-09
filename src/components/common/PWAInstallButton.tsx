import React, { useState } from 'react';
import { Download, Share, PlusSquare, X, CheckCircle2, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'compact';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
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
        setTimeout(() => setInstalledSuccess(false), 4000);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  // If not installable and not iOS (e.g. unsupported browser or already handled), return null
  if (!isInstallable && !isIOS && !installedSuccess) {
    return null;
  }

  return (
    <>
      {installedSuccess && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl animate-fade-in shadow-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>App Installed!</span>
        </div>
      )}

      {!installedSuccess && variant === 'header' && (
        <button
          id="pwa-header-install-btn"
          type="button"
          onClick={handleInstallClick}
          disabled={installing}
          title={isIOS ? 'Install Toto Drive on iOS' : 'Install Toto Drive App'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold text-xs bg-amber-400 hover:bg-amber-300 text-neutral-900 border border-amber-500/30 shadow-xs hover:shadow-sm active:scale-95 transition-all duration-150 cursor-pointer ${className}`}
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
          <span className="hidden sm:inline">Install App</span>
          <span className="sm:hidden">Install</span>
        </button>
      )}

      {!installedSuccess && variant === 'banner' && (
        <div
          id="pwa-install-banner"
          className={`w-full bg-linear-to-r from-amber-500 via-yellow-400 to-amber-500 p-3 rounded-2xl text-neutral-900 shadow-md flex items-center justify-between gap-3 border border-amber-300 ${className}`}
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
            <div className="min-w-0">
              <h4 className="text-xs font-black tracking-tight text-neutral-900 truncate">
                Install Toto Drive
              </h4>
              <p className="text-[11px] font-medium text-neutral-800 line-clamp-1">
                Fast booking, live radar & instant dispatch on your home screen
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            disabled={installing}
            className="shrink-0 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-amber-300 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-transform flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
        </div>
      )}

      {/* iOS Safari Installation Guide Modal */}
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
                <h3 className="font-extrabold text-base text-neutral-900">Install Toto Drive</h3>
                <p className="text-xs font-medium text-neutral-500">iPhone / iPad Safari</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-neutral-700 bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
                  <Share className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-neutral-900">Step 1: </span>
                  Tap the <strong className="text-neutral-900">Share</strong> icon in the bottom Safari toolbar.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-neutral-900">Step 2: </span>
                  Scroll down the share sheet and tap <strong className="text-neutral-900">"Add to Home Screen"</strong>.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-neutral-900">Step 3: </span>
                  Tap <strong className="text-neutral-900">"Add"</strong> in the top right corner to launch Toto Drive like a native app.
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
