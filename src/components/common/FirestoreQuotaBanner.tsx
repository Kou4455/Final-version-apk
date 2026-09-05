import React, { useState } from 'react';
import { useRide } from '../../context/RideContext';
import { AlertTriangle, ExternalLink, X, Database } from 'lucide-react';

export const FirestoreQuotaBanner: React.FC = () => {
  const { isFirestoreQuotaExceeded } = useRide();
  const [dismissed, setDismissed] = useState(false);

  if (!isFirestoreQuotaExceeded || dismissed) {
    return null;
  }

  const upgradeUrl = 'https://console.firebase.google.com/project/summer-circlet-nxjsq/firestore/databases/ai-studio-rapidototorideha-c610e9d6-f7ad-4fab-9a1d-9ba12d7d03d3/data?openUpgradeDialog=true';
  const pricingUrl = 'https://firebase.google.com/pricing#cloud-firestore';

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-3 sm:px-6 py-2.5 text-xs select-none">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700 shrink-0 mt-0.5 sm:mt-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold flex items-center gap-1.5 flex-wrap">
              <span>Firestore Free Daily Read Quota Reached</span>
              <span className="bg-amber-200/80 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                Offline / Local State Active
              </span>
            </div>
            <p className="text-amber-800/90 text-[11px] mt-0.5 leading-relaxed">
              Cloud Firestore daily read units limit reached. Quota resets tomorrow. The app continues working seamlessly in local offline mode with demo captains, bookings, and navigation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <a
            href={upgradeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Upgrade in Firebase</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href={pricingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-900 underline font-medium"
          >
            Pricing & Limits
          </a>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-amber-600 hover:text-amber-900 rounded-md hover:bg-amber-100 transition-colors"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
