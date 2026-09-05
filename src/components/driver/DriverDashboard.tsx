import React, { useState, useEffect, useRef } from 'react';
import { useRide } from '../../context/RideContext';
import { InteractiveMap } from '../map/InteractiveMap';
import { POPULAR_LOCATIONS } from '../../data/appData';
import { useMobileGps } from '../../hooks/useMobileGps';
import { DriverSettingsModal } from './DriverSettingsModal';
import { TripLedgerModal } from './TripLedgerModal';
import { TripRecord, RideRequestDoc } from '../../types';
import { 
  db, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  doc, 
  sanitizeForFirestore 
} from '../../lib/firebase';
import { 
  RotateCw, 
  Check, 
  Phone, 
  Navigation, 
  IndianRupee, 
  QrCode,
  X,
  ShieldCheck, 
  Zap, 
  Radio, 
  LocateFixed, 
  Power,
  Bell,
  ArrowRight,
  Sparkles,
  Layers,
  History,
  MessageSquare,
  User
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ChatModal } from '../modals/ChatModal';

export const DriverDashboard: React.FC = () => {
  const { 
    driver, 
    setDriverOnlineStatus, 
    activeRide, 
    pendingDriverRequest, 
    userGpsPoint,
    driverGpsPoint,
    updateDriverGpsPoint,
    driverAcceptRide, 
    driverDeclineRide, 
    driverArriveAtPickup, 
    driverStartRideWithOtp, 
    driverCompleteRide, 
    createRideBooking,
    dispatchRideRequest,
    setActiveRole,
    triggerSound 
  } = useRide();

  // Modals & UI states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [isDriverChatOpen, setIsDriverChatOpen] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [justAccepted, setJustAccepted] = useState(false);
  const [showCashSettledModal, setShowCashSettledModal] = useState(false);
  const [showUpiQrModal, setShowUpiQrModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSimulatingTrip, setIsSimulatingTrip] = useState(false);

  // 1. Ride Request Notification Banner State
  const [incomingRequest, setIncomingRequest] = useState<RideRequestDoc | null>(null);
  const [showRequestBanner, setShowRequestBanner] = useState(false);
  const [bannerCountdown, setBannerCountdown] = useState(12);
  const bannerTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 2. Earnings Summary derived from Firestore 'trips' collection
  const [completedTrips, setCompletedTrips] = useState<TripRecord[]>([]);
  const [firestoreTotalEarnings, setFirestoreTotalEarnings] = useState<number>(0);
  const [firestoreTodayEarnings, setFirestoreTodayEarnings] = useState<number>(0);

  const isOnline = driver?.isOnline ?? true;

  // Real-Time Mobile GPS Tracking for Driver / Toto Partner
  const {
    gpsState,
    hasRealGpsFix,
    refreshCurrentLocation
  } = useMobileGps({
    autoStart: true,
    enableHighAccuracy: true,
    onLocationUpdate: (point) => {
      updateDriverGpsPoint(point);
    },
    fallbackPoint: {
      lat: 22.5830,
      lng: 88.4350,
      name: 'Sector V Partner Stand',
      address: 'Near SDF Building, Bidhannagar',
      zone: 'Transit Area'
    }
  });

  // Active target ride to show (either pending incoming or accepted active ride)
  const currentRide = pendingDriverRequest || (activeRide && activeRide.status !== 'completed' && activeRide.status !== 'cancelled' ? activeRide : null);

  // Set just accepted indicator
  useEffect(() => {
    if (activeRide && activeRide.status === 'driver_assigned') {
      setJustAccepted(true);
    }
  }, [activeRide?.status]);

  // --------------------------------------------------------------------------
  // FEATURE 1: Real-time Ride Request Notification Banner via Firestore Listener
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!isOnline || !driver?.id) {
      setShowRequestBanner(false);
      setIncomingRequest(null);
      return;
    }

    // Listen to 'rideRequests' collection where status is 'searching'
    const rideRequestsRef = collection(db, 'rideRequests');
    const q = query(rideRequestsRef, where('status', '==', 'searching'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const matches: RideRequestDoc[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as RideRequestDoc;
          // Matches this driver or open broadcast to all
          if (data.driverId === driver.id || data.driverId === 'all') {
            matches.push(data);
          }
        });

        if (matches.length > 0) {
          // Sort by newest
          matches.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          const newest = matches[0];

          // Trigger banner alert
          setIncomingRequest(newest);
          setShowRequestBanner(true);
          setBannerCountdown(12);
          triggerSound('alert');
        }
      },
      (error) => {
        console.warn('rideRequests listener warning:', error);
      }
    );

    return () => unsubscribe();
  }, [isOnline, driver?.id]);

  // Banner countdown timer (disappears after a few seconds)
  useEffect(() => {
    if (showRequestBanner) {
      if (bannerTimerRef.current) clearInterval(bannerTimerRef.current);
      bannerTimerRef.current = setInterval(() => {
        setBannerCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(bannerTimerRef.current!);
            setShowRequestBanner(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (bannerTimerRef.current) clearInterval(bannerTimerRef.current);
    }

    return () => {
      if (bannerTimerRef.current) clearInterval(bannerTimerRef.current);
    };
  }, [showRequestBanner]);

  // Handle Driver Acknowledges Banner
  const handleAcknowledgeBanner = async () => {
    if (!incomingRequest) return;
    triggerSound('success');
    setShowRequestBanner(false);

    try {
      // 1. Mark request as accepted in Firestore
      await updateDoc(doc(db, 'rideRequests', incomingRequest.id), {
        status: 'accepted',
        acceptedByDriverId: driver?.id || 'drv_general',
        acceptedAt: new Date().toISOString()
      });
    } catch {
      // Non-blocking
    }

    // 2. Accept ride in context
    driverAcceptRide(incomingRequest.rideId);
    setJustAccepted(true);
  };

  // Simulate an incoming ride request into Firestore for easy testing
  const handleSimulateIncomingRequest = async () => {
    if (!isOnline) {
      triggerSound('alert');
      return;
    }
    triggerSound('beep');
    const randomPick = POPULAR_LOCATIONS[Math.floor(Math.random() * 3)];
    const randomDrop = POPULAR_LOCATIONS[4 + Math.floor(Math.random() * 3)];
    const fare = 50 + Math.floor(Math.random() * 45);

    await dispatchRideRequest({
      passengerName: 'Priyanka Sen',
      pickupName: randomPick.name,
      dropoffName: randomDrop.name,
      fare,
      driverId: driver?.id || 'all'
    });
  };

  // --------------------------------------------------------------------------
  // FEATURE 2: Upgraded Earnings Summary dynamically derived from Firestore 'trips'
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!driver?.id) return;

    // Real-time listener for trips collection in Firestore
    const tripsRef = collection(db, 'trips');
    const q = query(tripsRef, where('status', '==', 'completed'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const records: TripRecord[] = [];
        let total = 0;
        let today = 0;
        const todayStr = new Date().toDateString();

        snapshot.forEach((docSnap) => {
          const trip = docSnap.data() as TripRecord;
          // Match this driver or general driver
          if (
            trip.driverId === driver.id || 
            trip.driverId === 'all' || 
            (driver.id === 'drv_subhashish' && trip.driverId === 'drv_subhashish')
          ) {
            records.push(trip);
            const amount = Number(trip.fare) || 0;
            total += amount;

            if (trip.completedAt && new Date(trip.completedAt).toDateString() === todayStr) {
              today += amount;
            }
          }
        });

        records.sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());
        setCompletedTrips(records);

        // Fallback seed calculation if Firestore collection has newly created driver
        const effectiveTotal = records.length > 0 ? total : (driver.todayEarnings + 3840);
        const effectiveToday = records.length > 0 ? today : (driver.todayEarnings || 1240);
        setFirestoreTotalEarnings(effectiveTotal);
        setFirestoreTodayEarnings(effectiveToday);
      },
      (error) => {
        console.warn('trips listener error:', error);
      }
    );

    return () => unsubscribe();
  }, [driver?.id, driver?.todayEarnings]);

  // Simulate a completed trip directly in Firestore 'trips' collection
  const handleSimulateCompletedTrip = async () => {
    if (!driver) return;
    setIsSimulatingTrip(true);
    triggerSound('success');

    const tripFare = 55 + Math.floor(Math.random() * 30);
    const tripId = `trip_${Date.now()}`;
    const newTrip: TripRecord = {
      id: tripId,
      driverId: driver.id,
      rideId: `ride_${Date.now().toString().slice(-6)}`,
      fare: tripFare,
      status: 'completed',
      pickupName: 'Sector V Metro Station (Gate 2)',
      dropoffName: 'City Centre 1 Mall',
      distanceKm: 2.8,
      completedAt: new Date().toISOString(),
      paymentMethod: 'cash',
      passengerName: 'Sourav Roy'
    };

    try {
      await setDoc(doc(db, 'trips', tripId), sanitizeForFirestore(newTrip));
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.3 } });
    } catch (err) {
      console.error('Failed to add simulated trip:', err);
    } finally {
      setIsSimulatingTrip(false);
    }
  };

  // Handle Online/Offline Status Toggle Switch and persist to Firestore
  const handleToggleAvailability = async (forcedStatus?: boolean) => {
    if (isUpdatingStatus) return;
    const nextStatus = typeof forcedStatus === 'boolean' ? forcedStatus : !isOnline;
    setIsUpdatingStatus(true);
    triggerSound('beep');
    try {
      await setDriverOnlineStatus(nextStatus);
    } catch (err) {
      console.error('Failed to update driver status in Firestore:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Accept
  const handleAccept = () => {
    if (currentRide) {
      driverAcceptRide(currentRide.id);
      setJustAccepted(true);
    }
  };

  // Handle Decline / Cancel
  const handleDecline = () => {
    if (currentRide) {
      driverDeclineRide(currentRide.id);
      setJustAccepted(false);
    }
  };

  // Refresh feed
  const handleRefreshClick = () => {
    triggerSound('beep');
    if (!currentRide && isOnline) {
      createRideBooking(POPULAR_LOCATIONS[0], POPULAR_LOCATIONS[1], 'toto', 'cash');
    }
  };

  // Handle OTP verification
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    const result = driverStartRideWithOtp(otpInput);
    if (!result.success) {
      setOtpError(result.message);
      triggerSound('alert');
    } else {
      setOtpInput('');
      setJustAccepted(false);
    }
  };

  // Handle Ride Complete
  const handleCompleteRide = () => {
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    driverCompleteRide();
    setShowCashSettledModal(true);
    setJustAccepted(false);
  };

  return (
    <div className="w-full max-w-md mx-auto py-2 px-3 sm:px-0 font-sans select-none space-y-4">
      {/* -------------------------------------------------------------------------- */}
      {/* FEATURE 1: RIDE REQUEST NOTIFICATION BANNER (Top of DriverDashboard)        */}
      {/* -------------------------------------------------------------------------- */}
      {showRequestBanner && incomingRequest && isOnline && (
        <div 
          id="driver-ride-request-banner"
          className="bg-[#181818] text-white rounded-3xl p-4 shadow-2xl border-2 border-[#FF6B2C] animate-in slide-in-from-top-4 duration-300 space-y-3"
        >
          {/* Top Banner Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6B2C] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FF6B2C]"></span>
              </span>
              <div>
                <div className="text-[10px] font-bold tracking-wider uppercase text-[#FF6B2C] flex items-center gap-1">
                  <Bell className="w-3 h-3" />
                  <span>NEW RIDE REQUEST!</span>
                </div>
                <div className="text-sm font-extrabold text-white">
                  ₹{incomingRequest.fare} · {incomingRequest.passengerName}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full">
                {bannerCountdown}s
              </span>
              <button
                type="button"
                onClick={() => setShowRequestBanner(false)}
                className="w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer transition-colors"
                title="Dismiss Banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Route Info */}
          <div className="bg-neutral-900 rounded-2xl p-2.5 text-xs space-y-1">
            <div className="flex items-center gap-2 truncate text-neutral-300">
              <span className="w-2 h-2 rounded-full bg-[#FF6B2C] shrink-0" />
              <span className="truncate">{incomingRequest.pickupName}</span>
            </div>
            <div className="flex items-center gap-2 truncate text-neutral-300">
              <span className="w-2 h-2 rounded-xs bg-white shrink-0" />
              <span className="truncate font-semibold text-white">{incomingRequest.dropoffName}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setShowRequestBanner(false)}
              className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-300 rounded-2xl text-xs font-semibold cursor-pointer transition-all"
            >
              Dismiss
            </button>
            <button
              id="acknowledge-banner-btn"
              type="button"
              onClick={handleAcknowledgeBanner}
              className="flex-2 py-2.5 bg-[#FF6B2C] hover:bg-[#E55A1F] active:scale-95 text-white rounded-2xl text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Acknowledge & Accept</span>
            </button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* FEATURE 3: TOP-LEFT CORNER AVATAR / USERNAME CLICK OPENS SETTINGS PANEL    */}
      {/* -------------------------------------------------------------------------- */}
      <div className="flex items-center justify-between pt-1 pb-1">
        <div 
          id="driver-profile-header-trigger"
          onClick={() => {
            triggerSound('beep');
            setShowSettingsModal(true);
          }}
          className="cursor-pointer group flex items-center gap-3 p-1.5 -ml-1.5 rounded-2xl hover:bg-black/5 transition-all"
          title="Click to view & update Toto vehicle details"
        >
          {/* Top-Left Avatar with Driver Photo & Toto Badge */}
          <div className="relative">
            {driver?.avatarUrl || driver?.driverPhoto ? (
              <img
                src={driver.avatarUrl || driver.driverPhoto}
                alt={driver.name}
                className="w-11 h-11 rounded-full object-cover shadow-xs border-2 border-transparent group-hover:border-[#FF6B2C] transition-all"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#181818] text-white flex items-center justify-center font-bold text-base shadow-xs border-2 border-transparent group-hover:border-[#FF6B2C] transition-all">
                {driver?.name ? driver.name.charAt(0).toUpperCase() : 'R'}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
          </div>

          {/* Top-Left Driver Name and Vehicle Plate */}
          <div>
            <div className="text-[10px] font-bold tracking-wider uppercase text-[#C8622A] flex items-center gap-1">
              <span>TOTO CAPTAIN</span>
              <span className="text-neutral-400 group-hover:text-[#FF6B2C] transition-colors">⚙️ Settings</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#111111] tracking-tight group-hover:text-[#FF6B2C] transition-colors">
              {driver?.name || 'Your workday'}
            </h1>
            <div className="text-[11px] font-semibold text-neutral-500 flex items-center gap-1.5">
              <span className="font-mono font-bold text-neutral-800">{driver?.vehicleNumber || 'WB-06-ER-4821'}</span>
              <span>•</span>
              <span className="truncate max-w-[120px]">{driver?.vehicleColor || 'Green'}</span>
            </div>
          </div>
        </div>

        {/* Right side quick actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              triggerSound('beep');
              setActiveRole('user');
            }}
            className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-neutral-800 cursor-pointer shadow-2xs flex items-center gap-1.5 transition-all"
            title="Switch to Passenger App"
          >
            <User className="w-3.5 h-3.5 text-[#E07A00]" />
            <span>Passenger View</span>
          </button>
        </div>
      </div>

      {/* Real-Time Duty Availability Switch Card */}
      <div 
        id="driver-duty-switch-card"
        className={`p-4 rounded-3xl border transition-all duration-300 shadow-xs flex items-center justify-between gap-3.5 ${
          isOnline 
            ? 'bg-emerald-50/80 border-emerald-200/80' 
            : 'bg-neutral-100/90 border-neutral-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors shrink-0 ${
            isOnline 
              ? 'bg-emerald-500 text-white shadow-xs' 
              : 'bg-neutral-300 text-neutral-600'
          }`}>
            <Power className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#111111]">
                {isOnline ? 'You are Online' : 'You are Offline'}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                isOnline 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-neutral-200 text-neutral-600'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
                <span>{isOnline ? 'ACCEPTING RIDES' : 'OFF DUTY'}</span>
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              {isOnline 
                ? 'Broadcasting live Toto beacon to nearby passengers in Firestore' 
                : 'Turn on to start receiving passenger ride bookings'}
            </p>
          </div>
        </div>

        {/* Real-time Toggle Switch */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <button
            id="driver-availability-toggle-switch"
            role="switch"
            aria-checked={isOnline}
            aria-label="Toggle driver availability online or offline"
            disabled={isUpdatingStatus}
            onClick={() => handleToggleAvailability()}
            type="button"
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-[#FF6B2C] focus:ring-offset-2 disabled:opacity-50 ${
              isOnline ? 'bg-emerald-500' : 'bg-neutral-300'
            }`}
          >
            <span className="sr-only">Toggle availability</span>
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                isOnline ? 'translate-x-5' : 'translate-x-0'
              }`}
            >
              {isUpdatingStatus ? (
                <RotateCw className="w-3 h-3 text-neutral-500 animate-spin" />
              ) : (
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
              )}
            </span>
          </button>
          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
            {isUpdatingStatus ? 'Syncing...' : isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* -------------------------------------------------------------------------- */}
      {/* FEATURE 2: UPGRADED EARNINGS SUMMARY CARD DERIVED FROM FIRESTORE 'TRIPS'    */}
      {/* -------------------------------------------------------------------------- */}
      <div 
        id="driver-earnings-summary-card"
        className="bg-[#141414] rounded-3xl p-5 text-white shadow-xs space-y-4 border border-neutral-800"
      >
        {/* Top row: Label & Firestore Sync status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#888888]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>TOTAL EARNINGS (FIRESTORE TRIPS)</span>
          </div>

          <button
            type="button"
            onClick={() => setShowLedgerModal(true)}
            className="text-[11px] font-bold text-[#FF6B2C] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            <span>View Ledger ({completedTrips.length})</span>
          </button>
        </div>

        {/* Big Earnings Amount */}
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-1">
              <span>₹{firestoreTotalEarnings}</span>
            </div>
            <div className="text-xs text-[#AAAAAA] mt-1 flex items-center gap-2">
              <span>Today: <strong className="text-white">₹{firestoreTodayEarnings}</strong></span>
              <span>•</span>
              <span>{completedTrips.length || driver?.totalTrips || 8} rides completed</span>
            </div>
          </div>

          {/* Quick simulation button to dynamically demonstrate Firestore updating */}
          <button
            id="simulate-completed-trip-btn"
            type="button"
            disabled={isSimulatingTrip}
            onClick={handleSimulateCompletedTrip}
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-emerald-400 font-bold text-[11px] rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 border border-neutral-700"
            title="Inserts a completed trip into Firestore to test dynamic calculation"
          >
            {isSimulatingTrip ? (
              <RotateCw className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3 text-emerald-400" />
            )}
            <span>+ Add Trip</span>
          </button>
        </div>

        {/* Dynamic calculation footnote */}
        <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-400 font-medium">
          <span>Live Firestore Listener: <code className="text-emerald-400">/trips</code> collection</span>
          <span className="text-emerald-400 font-bold">Dynamic Auto-Update</span>
        </div>
      </div>

      {/* Live Driver GPS Status Bar */}
      <div className="bg-[#FAF8F5] border border-[#EAE4DB] rounded-2xl p-3 flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div className="overflow-hidden text-left">
            <div className="text-[11px] font-bold text-[#111111] flex items-center gap-1.5">
              <span>Driver GPS Beacon Active</span>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-mono px-1.5 py-0.2 rounded-full">
                ±{gpsState.accuracy}m
              </span>
            </div>
            <p className="text-[10px] text-gray-500 truncate">
              {gpsState.address || `${gpsState.lat.toFixed(4)}, ${gpsState.lng.toFixed(4)}`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={refreshCurrentLocation}
          className="px-2.5 py-1.5 bg-[#181818] hover:bg-black text-white text-[10px] font-bold rounded-xl shrink-0 flex items-center gap-1 shadow-2xs transition-transform active:scale-95 cursor-pointer"
          title="Recalibrate GPS"
        >
          <LocateFixed className="w-3 h-3 text-[#FF6B2C]" />
          <span>Calibrate</span>
        </button>
      </div>

      {/* Section Title & Quick Simulator */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-base font-bold text-[#111111]">
          {currentRide ? 'Active Request' : 'Live Area Radar'}
        </h2>
        <div className="flex items-center gap-2">
          {isOnline && !currentRide && (
            <button
              id="driver-simulate-request-btn"
              type="button"
              onClick={handleSimulateIncomingRequest}
              className="text-[11px] font-bold text-[#FF6B2C] hover:underline flex items-center gap-1 cursor-pointer"
              title="Dispatches a ride request into Firestore rideRequests collection"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Simulate Request</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleRefreshClick}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#C8622A] hover:bg-neutral-100 active:rotate-180 transition-all cursor-pointer"
            title="Refresh Network Feed"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* View 1: Active Incoming / Accepted Ride */}
      {isOnline && currentRide && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <InteractiveMap
            pickup={currentRide.pickup}
            dropoff={currentRide.dropoff}
            activeRide={activeRide}
            mode="driver"
            driverGpsState={gpsState}
            userGpsState={userGpsPoint ? {
              lat: userGpsPoint.lat,
              lng: userGpsPoint.lng,
              accuracy: 12,
              speedKmH: 0,
              timestamp: Date.now(),
              isWatching: true
            } : null}
            onCenterGps={refreshCurrentLocation}
            heightClass="h-[180px] sm:h-[200px]"
          />

          {/* Passenger Request Card */}
          <div className="bg-white rounded-3xl p-5 shadow-xs border border-[#EDE8E0] space-y-4">
            {pendingDriverRequest && (
              <div className="bg-[#FFF4ED] border border-[#FFD8C2] rounded-2xl p-3 flex items-center justify-between text-xs text-[#C8622A] animate-pulse">
                <div className="flex items-center gap-2 font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#FF6B2C] animate-ping" />
                  <span>Passenger selected your Toto bid!</span>
                </div>
                {currentRide.selectedOfferTag && (
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded-full font-bold border border-[#FFD8C2] text-[#C8622A]">
                    {currentRide.selectedOfferTag}
                  </span>
                )}
              </div>
            )}

            {/* Passenger Header Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#FDE8DC] text-[#C8622A] flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                  {currentRide.userName ? currentRide.userName.charAt(0) : 'A'}
                </div>

                <div>
                  <div className="text-sm font-bold text-[#111111]">
                    {currentRide.userName || 'Ananya Sharma'}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <a 
                      href={`tel:${currentRide.userPhone || '+919000012345'}`}
                      className="text-xs text-[#1F7A3E] font-medium flex items-center gap-1 hover:underline"
                    >
                      <Phone className="w-3 h-3 text-[#1F7A3E] fill-[#1F7A3E]" />
                      <span>{currentRide.userPhone || '+91 90000 12345'}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setIsDriverChatOpen(true)}
                      className="px-2 py-0.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                      title="Chat with Passenger"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Chat</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Fare Display */}
              <div className="text-right">
                <div className="text-[10px] text-[#888888] font-bold uppercase tracking-wider">
                  FARE
                </div>
                <div className="text-xl font-extrabold text-[#111111]">
                  ₹{currentRide.totalFare || 89}
                </div>
              </div>
            </div>

            {/* Route Box */}
            <div className="bg-[#F6F4F0] rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-[#111111] font-medium">
                <span className="w-2 h-2 rounded-full bg-[#FF7A1A] shrink-0" />
                <span className="line-clamp-1">{currentRide.pickup.name}</span>
              </div>
              <div className="pl-1 -my-1">
                <div className="w-px h-3 bg-[#DCD6CC]" />
              </div>
              <div className="flex items-center gap-2 text-[#111111] font-medium">
                <span className="w-2 h-2 bg-[#111111] rounded-xs shrink-0" />
                <span className="line-clamp-1">{currentRide.dropoff.name}</span>
              </div>
            </div>

            {/* Bottom Actions Row (Cancel vs. Accept ride) */}
            {activeRide?.status !== 'in_progress' && activeRide?.status !== 'driver_arrived' ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDecline}
                    className="flex-1 py-3 px-4 bg-[#F0EEEA] hover:bg-[#E5E2DC] active:scale-[0.98] text-[#222222] font-semibold text-xs rounded-2xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAccept}
                    disabled={activeRide?.status === 'driver_assigned'}
                    className="flex-2 py-3 px-4 bg-[#23864A] hover:bg-[#1E7740] active:scale-[0.98] text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-90"
                  >
                    <Check className="w-4 h-4 text-white stroke-[3]" />
                    <span>Accept ride</span>
                  </button>
                </div>

                {(justAccepted || activeRide?.status === 'driver_assigned') && (
                  <div className="text-center">
                    <span className="text-xs font-semibold text-[#23864A]">
                      Ride accepted.
                    </span>
                  </div>
                )}
              </div>
            ) : null}

            {/* Interactive Ride Progression Controls (Arrive -> OTP -> Complete) */}
            {activeRide && (activeRide.status === 'driver_assigned' || activeRide.status === 'driver_arrived' || activeRide.status === 'in_progress') && (
              <div className="pt-2 border-t border-neutral-100 space-y-3">
                {activeRide.status === 'driver_assigned' && (
                  <button
                    type="button"
                    onClick={driverArriveAtPickup}
                    className="w-full py-2.5 bg-[#FF6B2C] hover:bg-[#E55A1F] text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Tap When Arrived at Pickup</span>
                  </button>
                )}

                {activeRide.status === 'driver_arrived' && (
                  <form onSubmit={handleVerifyOtp} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-700">Enter Passenger PIN</span>
                      <button
                        type="button"
                        onClick={() => setOtpInput(activeRide.otp)}
                        className="text-[11px] text-[#C8622A] font-bold hover:underline cursor-pointer"
                      >
                        Auto-Fill ({activeRide.otp})
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="4-digit OTP"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                        className="flex-1 bg-[#F6F4F0] border border-neutral-200 px-3 py-2 text-center text-sm font-mono font-bold tracking-widest rounded-2xl focus:outline-none focus:border-black"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#23864A] hover:bg-[#1E7740] text-white font-bold text-xs rounded-2xl shadow-xs cursor-pointer"
                      >
                        Start Trip
                      </button>
                    </div>

                    {otpError && (
                      <p className="text-[11px] text-red-600 font-semibold">{otpError}</p>
                    )}
                  </form>
                )}

                {activeRide.status === 'in_progress' && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowUpiQrModal(true)}
                      className="w-full py-2 bg-[#F6F4F0] hover:bg-[#EAE6DE] text-gray-800 font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5 text-[#FF6B2C]" />
                      <span>Show UPI QR Code to Passenger</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCompleteRide}
                      className="w-full py-3 bg-[#23864A] hover:bg-[#1E7740] text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Complete Ride & Collect ₹{activeRide.totalFare}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* View 2: Idle State (Checking for nearby rides with live map) */}
      {isOnline && !currentRide && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <InteractiveMap
            mode="driver"
            driverGpsState={gpsState}
            onCenterGps={refreshCurrentLocation}
            heightClass="h-[200px] sm:h-[220px]"
          />

          <div className="bg-white rounded-3xl p-6 border border-[#EDE8E0] shadow-xs flex flex-col items-center justify-center space-y-3 text-center">
            <div className="relative w-8 h-8">
              <div className="w-8 h-8 rounded-full border-2 border-[#FDE8DC] border-t-[#FF6B2C] animate-spin" />
            </div>

            <div className="text-sm font-bold text-[#111111] tracking-tight">
              Checking for nearby rides
            </div>
            <p className="text-xs text-gray-500 max-w-xs">
              Broadcasting your live Toto beacon to passengers in your sector. When a ride is requested, you'll get an alert banner right here!
            </p>

            <button
              type="button"
              onClick={handleSimulateIncomingRequest}
              className="mt-1 px-4 py-2 bg-[#FAF8F5] hover:bg-[#F2ECE1] text-[#C8622A] text-xs font-bold rounded-xl border border-[#EDE8E0] cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Test Ride Request Banner</span>
            </button>
          </div>
        </div>
      )}

      {/* View 3: Offline State */}
      {!isOnline && (
        <div className="py-16 flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl p-6 border border-[#EDE8E0] shadow-xs text-center">
          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 font-bold text-lg">
            OFF
          </div>
          <h3 className="font-bold text-base text-[#111111]">You are currently offline</h3>
          <p className="text-xs text-gray-500 max-w-xs">
            Toggle your duty switch above to start receiving ride requests in your vicinity.
          </p>
          <button
            type="button"
            disabled={isUpdatingStatus}
            onClick={() => handleToggleAvailability(true)}
            className="mt-2 px-6 py-2.5 bg-[#FF6B2C] hover:bg-[#E55A1F] text-white font-bold text-xs rounded-2xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isUpdatingStatus ? 'Syncing Status...' : 'Go Online Now'}
          </button>
        </div>
      )}

      {/* Settings Modal (Triggered by top-left avatar/username click) */}
      <DriverSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* Trip History / Earnings Ledger Modal */}
      <TripLedgerModal
        isOpen={showLedgerModal}
        onClose={() => setShowLedgerModal(false)}
        trips={completedTrips}
        totalEarnings={firestoreTotalEarnings}
      />

      {/* UPI QR Payment Modal */}
      {showUpiQrModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xs w-full p-6 text-center space-y-4 shadow-xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-1 border-b border-neutral-100">
              <h3 className="font-bold text-sm text-[#111111]">Scan & Pay ₹{activeRide?.totalFare || 89}</h3>
              <button onClick={() => setShowUpiQrModal(false)} className="text-gray-400 hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-neutral-200 flex flex-col items-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi%3A%2F%2Fpay%3Fpa%3D${driver?.phone || '9874522019'}%40upi%26pn%3D${encodeURIComponent(driver?.name || 'Toto Captain')}%26am%3D${activeRide?.totalFare || 89}%26cu%3DINR`}
                alt="UPI Payment QR Code"
                className="w-40 h-40 rounded-xl"
              />
              <span className="text-[10px] text-gray-500 font-mono mt-2">
                Accepts GPay, PhonePe, Paytm
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowUpiQrModal(false)}
              className="w-full py-2.5 bg-[#181818] text-white font-bold text-xs rounded-2xl cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Cash Collected Modal */}
      {showCashSettledModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xs w-full p-6 text-center space-y-4 shadow-xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#111111]">Trip Completed!</h3>
              <p className="text-xs text-gray-500 mt-1">
                Earnings of ₹{activeRide?.driverEarnings || 78} added to your balance.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCashSettledModal(false)}
              className="w-full py-2.5 bg-[#141414] hover:bg-black text-white font-bold text-xs rounded-2xl shadow-xs cursor-pointer"
            >
              Continue Workday
            </button>
          </div>
        </div>
      )}

      {/* Driver Chat Modal with Passenger */}
      {activeRide && (
        <ChatModal
          isOpen={isDriverChatOpen}
          onClose={() => setIsDriverChatOpen(false)}
          rideId={activeRide.id}
          senderRole="driver"
          currentUserId={driver?.id || 'drv_captain'}
          currentUserName={driver?.name || 'Captain'}
          partnerName={activeRide.userName || 'Passenger'}
          partnerPhone={activeRide.userPhone}
        />
      )}
    </div>
  );
};
