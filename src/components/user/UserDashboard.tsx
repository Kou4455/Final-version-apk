import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRide } from '../../context/RideContext';
import { POPULAR_LOCATIONS, VEHICLE_OPTIONS } from '../../data/appData';
import { GeoPoint, TotoPartnerOffer, ActiveRide, CouponItem } from '../../types';
import { InteractiveMap } from '../map/InteractiveMap';
import { useMobileGps } from '../../hooks/useMobileGps';
import { searchPlacesOnline, calculateDistanceKm } from '../../utils/geoUtils';
import { 
  Search, 
  Check, 
  Phone, 
  Star, 
  MapPin, 
  ChevronDown, 
  X, 
  ShieldCheck, 
  Navigation,
  CreditCard,
  QrCode,
  Wallet,
  LocateFixed,
  Radio,
  Sparkles,
  Building2,
  Train,
  ShoppingBag,
  HeartPulse,
  Landmark,
  Compass,
  Loader2,
  BatteryCharging,
  Clock,
  ArrowRight,
  BellRing,
  Tag,
  Zap,
  MessageSquare,
  Share2,
  AlertTriangle,
  FileText,
  Bookmark,
  History,
  LifeBuoy,
  Settings
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ShareTripModal } from '../modals/ShareTripModal';
import { RideReceiptModal } from '../modals/RideReceiptModal';
import { RatingModal } from '../modals/RatingModal';
import { WalletModal } from '../modals/WalletModal';
import { ScheduleRideModal } from '../modals/ScheduleRideModal';
import { SupportModal } from '../modals/SupportModal';
import { SavedPlacesModal } from '../modals/SavedPlacesModal';
import { SafetyCenterModal } from '../modals/SafetyCenterModal';
import { ChatModal } from '../modals/ChatModal';
import { SosModal } from '../modals/SosModal';
import { FareBreakdownModal } from '../modals/FareBreakdownModal';
import { CouponsModal } from '../modals/CouponsModal';
import { RideHistoryPage } from './RideHistoryPage';
import { ProfileSettingsPage } from './ProfileSettingsPage';

const TotoRickshawIcon = ({ className = "w-5 h-5", color = "#FF6B2C" }: { className?: string; color?: string }) => (
  <svg 
    viewBox="0 0 48 48" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
    aria-label="E-Rickshaw Toto Icon"
  >
    {/* Chassis & Body */}
    <path d="M10 28H38L42 34H6L10 28Z" fill={color} />
    {/* Canopy Roof */}
    <path d="M8 12C8 10.8954 8.89543 10 10 10H38C39.1046 10 40 10.8954 40 12V16H8V12Z" fill="#181818" />
    {/* Pillars */}
    <path d="M11 16V28M24 16V28M37 16V28" stroke="#181818" strokeWidth="2.5" strokeLinecap="round" />
    {/* Front Windshield Angle */}
    <path d="M37 16L41 28" stroke="#181818" strokeWidth="2" strokeLinecap="round" />
    {/* Driver Seat & Handle */}
    <path d="M30 24H35" stroke="#181818" strokeWidth="2.5" strokeLinecap="round" />
    {/* Rear Wheels */}
    <circle cx="14" cy="36" r="5" fill="#181818" />
    <circle cx="14" cy="36" r="2.2" fill="#FFFFFF" />
    <circle cx="34" cy="36" r="5" fill="#181818" />
    <circle cx="34" cy="36" r="2.2" fill="#FFFFFF" />
    {/* Front Single Steer Wheel */}
    <circle cx="42" cy="36" r="3.5" fill="#181818" />
    <circle cx="42" cy="36" r="1.5" fill="#FFFFFF" />
    {/* Electric Bolt Accent on Body */}
    <path d="M22 29L20 32H24L22 35" stroke="#FFE600" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const UserDashboard: React.FC = () => {
  const { 
    user, 
    activeRide, 
    simulatedDrivers, 
    userGpsPoint,
    driverGpsPoint,
    updateUserGpsPoint,
    availableTotoOffers,
    isScanningOffers,
    findNearbyTotoOffers,
    selectTotoOfferAndBook,
    cancelOfferSearch,
    createRideBooking, 
    cancelRide, 
    rateRide,
    rateRideWithTags,
    walletBalance,
    addMoneyToWallet,
    savedPlaces,
    addSavedPlace,
    deleteSavedPlace,
    emergencyContacts,
    addEmergencyContact,
    deleteEmergencyContact,
    supportTickets,
    createSupportTicket,
    scheduledRides,
    createScheduledRide,
    completedTrips,
    triggerSound,
    logoutUser,
    activeNavTab,
    setActiveNavTab
  } = useRide();

  const [pickup, setPickup] = useState<GeoPoint>(POPULAR_LOCATIONS[0]);
  const [dropoff, setDropoff] = useState<GeoPoint | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState<'pickup' | 'dropoff' | null>(null);
  const [customSearchQuery, setCustomSearchQuery] = useState('');
  const [selectedPlaceCategory, setSelectedPlaceCategory] = useState<string>('all');
  const [onlineSearchResults, setOnlineSearchResults] = useState<GeoPoint[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [isSearchInputFocused, setIsSearchInputFocused] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'wallet'>('cash');
  const [gpsAutoSynced, setGpsAutoSynced] = useState(false);
  const [notificationToast, setNotificationToast] = useState<{
    driverName: string;
    vehicleNumber: string;
    price: number;
    offerTag: string;
  } | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Modals Visibility States
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isSavedPlacesOpen, setIsSavedPlacesOpen] = useState(false);
  const [isSafetyOpen, setIsSafetyOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isShareTripOpen, setIsShareTripOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isFareBreakdownOpen, setIsFareBreakdownOpen] = useState(false);
  const [isCouponsOpen, setIsCouponsOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponItem | null>(null);
  const [receiptRideData, setReceiptRideData] = useState<ActiveRide | null>(null);
  const [supportRideId, setSupportRideId] = useState<string | undefined>(undefined);
  
  // Real-Time Mobile GPS Tracking Hook
  const {
    gpsState,
    hasRealGpsFix,
    isLocating,
    refreshCurrentLocation,
  } = useMobileGps({
    autoStart: true,
    enableHighAccuracy: true,
    onLocationUpdate: (point) => {
      updateUserGpsPoint(point);
    },
    fallbackPoint: POPULAR_LOCATIONS[0]
  });

  useEffect(() => {
    const handleOpenProfile = () => setActiveNavTab('profile');
    const handleOpenHistory = () => setActiveNavTab('rides');
    const handleCloseAll = () => setActiveNavTab('home');

    window.addEventListener('openProfileSettings', handleOpenProfile);
    window.addEventListener('openRideHistory', handleOpenHistory);
    window.addEventListener('closeAllModals', handleCloseAll);
    return () => {
      window.removeEventListener('openProfileSettings', handleOpenProfile);
      window.removeEventListener('openRideHistory', handleOpenHistory);
      window.removeEventListener('closeAllModals', handleCloseAll);
    };
  }, [setActiveNavTab]);

  // When location picker opens, autofocus input and reset query if desired
  useEffect(() => {
    if (showLocationPicker) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setCustomSearchQuery('');
      setOnlineSearchResults([]);
      setSelectedPlaceCategory('all');
      setIsSearchInputFocused(false);
    }
  }, [showLocationPicker]);

  // Debounced online place search
  useEffect(() => {
    const query = customSearchQuery.trim();
    if (query.length < 2) {
      setOnlineSearchResults([]);
      setIsSearchingOnline(false);
      return;
    }

    setIsSearchingOnline(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchPlacesOnline(query, gpsState.lat, gpsState.lng);
        setOnlineSearchResults(results);
      } catch (e) {
        console.debug('Search error:', e);
      } finally {
        setIsSearchingOnline(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [customSearchQuery, gpsState.lat, gpsState.lng]);

  // Filtered places combining local catalog + online search results
  const suggestedPlaces = useMemo(() => {
    const query = customSearchQuery.trim().toLowerCase();

    // 1. Filter local popular catalog
    let localMatches = POPULAR_LOCATIONS.filter((loc) => {
      // Category filter
      if (selectedPlaceCategory !== 'all') {
        const zone = (loc.zone || '').toLowerCase();
        if (selectedPlaceCategory === 'metro' && !zone.includes('metro') && !loc.name.toLowerCase().includes('metro')) return false;
        if (selectedPlaceCategory === 'it' && !zone.includes('it') && !zone.includes('office') && !loc.name.toLowerCase().includes('park')) return false;
        if (selectedPlaceCategory === 'mall' && !zone.includes('shopping') && !loc.name.toLowerCase().includes('mall') && !loc.name.toLowerCase().includes('centre')) return false;
        if (selectedPlaceCategory === 'hospital' && !zone.includes('health') && !loc.name.toLowerCase().includes('hospital')) return false;
        if (selectedPlaceCategory === 'railway' && !zone.includes('railway') && !loc.name.toLowerCase().includes('station')) return false;
      }

      if (!query) return true;

      const nameMatch = loc.name.toLowerCase().includes(query);
      const addressMatch = loc.address.toLowerCase().includes(query);
      const landmarkMatch = (loc.landmark || '').toLowerCase().includes(query);
      const zoneMatch = (loc.zone || '').toLowerCase().includes(query);

      return nameMatch || addressMatch || landmarkMatch || zoneMatch;
    });

    // 2. Append online results if query active, avoiding duplicate names
    const existingNames = new Set(localMatches.map((l) => l.name.toLowerCase()));
    const additionalOnline = onlineSearchResults.filter(
      (onlineLoc) => !existingNames.has(onlineLoc.name.toLowerCase())
    );

    return [...localMatches, ...additionalOnline];
  }, [customSearchQuery, selectedPlaceCategory, onlineSearchResults]);

  // When first real GPS fix arrives, automatically offer to sync pickup
  useEffect(() => {
    if (hasRealGpsFix && !gpsAutoSynced && gpsState.lat && gpsState.lng) {
      const livePoint: GeoPoint = {
        lat: gpsState.lat,
        lng: gpsState.lng,
        name: gpsState.name || 'My Current GPS Location',
        address: gpsState.address || `Lat: ${gpsState.lat.toFixed(4)}, Lng: ${gpsState.lng.toFixed(4)}`,
        zone: 'Live GPS'
      };
      setPickup(livePoint);
      setGpsAutoSynced(true);
    }
  }, [hasRealGpsFix, gpsAutoSynced, gpsState.lat, gpsState.lng, gpsState.name, gpsState.address]);

  // Helper icon for place category
  const getPlaceIcon = (loc: GeoPoint) => {
    const text = `${loc.name} ${loc.zone || ''} ${loc.address}`.toLowerCase();
    if (text.includes('metro') || text.includes('subway') || text.includes('transit')) {
      return <Train className="w-4 h-4 text-emerald-600 shrink-0" />;
    }
    if (text.includes('park') || text.includes('tech') || text.includes('office') || text.includes('dlf') || text.includes('tower')) {
      return <Building2 className="w-4 h-4 text-blue-600 shrink-0" />;
    }
    if (text.includes('mall') || text.includes('centre') || text.includes('market') || text.includes('shopping')) {
      return <ShoppingBag className="w-4 h-4 text-purple-600 shrink-0" />;
    }
    if (text.includes('hospital') || text.includes('health') || text.includes('apollo') || text.includes('clinic')) {
      return <HeartPulse className="w-4 h-4 text-rose-600 shrink-0" />;
    }
    if (text.includes('station') || text.includes('railway') || text.includes('howrah') || text.includes('sealdah')) {
      return <Landmark className="w-4 h-4 text-amber-700 shrink-0" />;
    }
    return <MapPin className="w-4 h-4 text-[#FF7A1A] shrink-0" />;
  };

  // Helper to compute distance from user GPS
  const getDistanceLabel = (loc: GeoPoint) => {
    if (!gpsState.lat || !gpsState.lng || !loc.lat || !loc.lng) return null;
    const distKm = calculateDistanceKm(
      { lat: gpsState.lat, lng: gpsState.lng },
      { lat: loc.lat, lng: loc.lng }
    );
    if (distKm < 1) {
      return `${Math.round(distKm * 1000)} m`;
    }
    return `${distKm.toFixed(1)} km`;
  };

  // Rating states
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('Great eco-friendly toto ride!');

  // Handle Find a ride - Scan nearby online Toto partners with dynamic bids
  const handleFindRide = () => {
    if (!pickup) return;
    if (!dropoff) {
      setShowLocationPicker('dropoff');
      triggerSound('alert');
      return;
    }
    findNearbyTotoOffers(pickup, dropoff, selectedTier.name);
  };

  // Handle passenger selecting a specific Toto Partner and price
  const handleSelectPartnerOffer = (offer: TotoPartnerOffer) => {
    if (!pickup || !dropoff) return;
    triggerSound('alert');
    selectTotoOfferAndBook(offer, pickup, dropoff, paymentMethod);
    setNotificationToast({
      driverName: offer.driverName,
      vehicleNumber: offer.vehicleNumber,
      price: offer.price,
      offerTag: offer.offerTag
    });
    // Auto-dismiss notification after 7s
    setTimeout(() => {
      setNotificationToast(null);
    }, 7000);
  };

  // Instant apply current live GPS to pickup
  const handleApplyCurrentGpsToPickup = () => {
    refreshCurrentLocation();
    triggerSound('success');
    const livePoint: GeoPoint = {
      lat: gpsState.lat,
      lng: gpsState.lng,
      name: gpsState.name || 'My Current GPS Location',
      address: gpsState.address || `Coordinates: ${gpsState.lat.toFixed(4)}, ${gpsState.lng.toFixed(4)}`,
      zone: 'Real-time Mobile GPS'
    };
    if (showLocationPicker === 'dropoff') {
      setDropoff(livePoint);
    } else {
      setPickup(livePoint);
    }
    setShowLocationPicker(null);
  };

  // Submit custom entered location
  const handleSelectCustomLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSearchQuery.trim()) return;
    const newPoint: GeoPoint = {
      lat: (showLocationPicker === 'pickup' ? pickup?.lat : dropoff?.lat) || 22.5804,
      lng: (showLocationPicker === 'pickup' ? pickup?.lng : dropoff?.lng) || 88.4378,
      name: customSearchQuery.trim(),
      address: `${customSearchQuery.trim()}, City Area`,
      zone: 'Custom Address'
    };
    if (showLocationPicker === 'pickup') {
      setPickup(newPoint);
    } else {
      setDropoff(newPoint);
    }
    setCustomSearchQuery('');
    setShowLocationPicker(null);
    triggerSound('beep');
  };

  // Submit review
  const handleRateSubmit = () => {
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    rateRide(ratingScore, ratingComment);
  };

  // Vehicle Tiers matching user specification
  const VEHICLE_TIERS = useMemo(() => [
    {
      id: 'erickshaw',
      name: 'E-Rickshaw (1 Person)',
      capacity: '1 Person',
      baseFare: 20,
      perKmRate: 14,
    },
    {
      id: 'toto_premium',
      name: 'Toto Premium (2 Person)',
      capacity: '2 Person',
      baseFare: 30,
      perKmRate: 16,
    },
    {
      id: 'toto_deluxe',
      name: 'Toto Deluxe (3 Person)',
      capacity: '3 Person',
      baseFare: 60,
      perKmRate: 18,
    },
    {
      id: 'full_reserve',
      name: 'Full Reserve Toto',
      capacity: 'Full Reserve',
      baseFare: 500,
      perKmRate: 20,
    },
  ], []);

  const [selectedTierId, setSelectedTierId] = useState<string>('erickshaw');

  const selectedTier = useMemo(() => {
    return VEHICLE_TIERS.find((t) => t.id === selectedTierId) || VEHICLE_TIERS[0];
  }, [VEHICLE_TIERS, selectedTierId]);

  // Calculate estimated distance & fare
  const estimatedDistanceKm = useMemo(() => {
    if (!pickup?.lat || !pickup?.lng || !dropoff?.lat || !dropoff?.lng) return 2.2;
    const d = calculateDistanceKm(
      { lat: pickup.lat, lng: pickup.lng },
      { lat: dropoff.lat, lng: dropoff.lng }
    );
    return Math.max(0.8, Number(d.toFixed(1)));
  }, [pickup, dropoff]);

  const baseFare = selectedTier.baseFare;
  const distanceCharge = Math.round(estimatedDistanceKm * selectedTier.perKmRate);
  const timeCharge = 0;
  const rawFare = baseFare + distanceCharge;

  const couponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0;
    const disc = Math.round((rawFare * appliedCoupon.discountPct) / 100);
    return Math.min(disc, appliedCoupon.maxDiscount);
  }, [appliedCoupon, rawFare]);

  const currentFare = activeRide?.totalFare || Math.max(15, rawFare - couponDiscount);

  return (
    <div className="w-full max-w-lg md:max-w-xl mx-auto py-2 px-2.5 sm:px-4 font-sans select-none space-y-3.5 flex-1 flex flex-col">
      {activeNavTab === 'rides' ? (
        <RideHistoryPage
          activeRide={activeRide}
          completedTrips={completedTrips}
          onBookAgain={(pName, dName) => {
            const matchedPickup = POPULAR_LOCATIONS.find((l) => l.name === pName) || {
              name: pName,
              address: pName,
              lat: 22.5804,
              lng: 88.4378
            };
            const matchedDropoff = POPULAR_LOCATIONS.find((l) => l.name === dName) || {
              name: dName,
              address: dName,
              lat: 22.5867,
              lng: 88.4178
            };
            setPickup(matchedPickup);
            setDropoff(matchedDropoff);
            setActiveNavTab('home');
            triggerSound('beep');
          }}
          onOpenReceipt={(trip) => {
            const rideItem: ActiveRide = {
              id: trip.rideId || trip.id,
              userId: user?.id || 'usr_passenger',
              userName: user?.name || trip.passengerName || 'Passenger',
              userPhone: user?.phone || '+91 98311 02458',
              userRating: 4.9,
              pickup: { name: trip.pickupName, lat: 22.5804, lng: 88.4378, address: trip.pickupName },
              dropoff: { name: trip.dropoffName, lat: 22.5867, lng: 88.4178, address: trip.dropoffName },
              vehicleType: 'toto',
              totalFare: trip.fare,
              basePrice: 20,
              discount: 0,
              driverEarnings: Math.round(trip.fare * 0.85),
              distanceKm: trip.distanceKm,
              estimatedMins: Math.round(trip.distanceKm * 4),
              paymentMethod: trip.paymentMethod || 'cash',
              paymentStatus: 'paid',
              status: 'completed',
              otp: '8492',
              driverName: 'Subhashish Mondal',
              vehicleNumber: 'WB-06-ER-4821',
              driverPhone: '+91 98745 22019',
              bookedAt: trip.completedAt || new Date().toISOString()
            };
            setReceiptRideData(rideItem);
            setIsReceiptOpen(true);
            triggerSound('click');
          }}
          onReportIssue={(tripId) => {
            setSupportRideId(tripId);
            setIsSupportOpen(true);
            triggerSound('click');
          }}
          onNavigateHome={() => setActiveNavTab('home')}
        />
      ) : activeNavTab === 'profile' ? (
        <ProfileSettingsPage
          user={user}
          walletBalance={walletBalance}
          completedRidesCount={completedTrips.length}
          onOpenWallet={() => setIsWalletOpen(true)}
          onOpenSchedule={() => setIsScheduleOpen(true)}
          onOpenSavedPlaces={() => setIsSavedPlacesOpen(true)}
          onOpenHistory={() => setActiveNavTab('rides')}
          onOpenSafety={() => setIsSafetyOpen(true)}
          onOpenSupport={() => setIsSupportOpen(true)}
          onOpenCoupons={() => setIsCouponsOpen(true)}
          onLogout={() => {
            logoutUser();
            triggerSound('beep');
          }}
          onNavigateHome={() => setActiveNavTab('home')}
        />
      ) : (
        <>
          {/* Top Header Section */}
          <div className="flex items-center justify-between pt-1 pb-1 w-full">
            <div>
              <div className="text-[11px] font-bold tracking-wider uppercase text-[#C8622A] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>LIVE GPS ACTIVE</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
                Where to next?
              </h1>
            </div>
          </div>

      {/* Real-time Interactive Leaflet Map with Mobile GPS Tracking */}
      <InteractiveMap
        pickup={pickup}
        dropoff={dropoff}
        activeRide={activeRide}
        drivers={simulatedDrivers}
        mode="user"
        userGpsState={gpsState}
        driverGpsState={driverGpsPoint ? {
          lat: driverGpsPoint.lat,
          lng: driverGpsPoint.lng,
          accuracy: 10,
          speedKmH: 22,
          timestamp: Date.now(),
          isWatching: true
        } : null}
        onSelectLocation={(point, type) => {
          if (type === 'pickup') setPickup(point);
          else setDropoff(point);
          triggerSound('beep');
        }}
        onCenterGps={refreshCurrentLocation}
        heightClass="h-[230px] xs:h-[250px] sm:h-[280px]"
      />


      {/* Route & Booking Card */}
      <div className="bg-white rounded-3xl p-3.5 sm:p-5 shadow-xs border border-[#EDE8E0] space-y-3.5 sm:space-y-4 w-full">
        {/* Unified Search Bar matching search bar.jpeg */}
        <div 
          id="unified-search-bar"
          className="rounded-3xl bg-[#FAF9F7] sm:bg-[#F8F9FA] hover:bg-[#F4F3EF] border border-[#E2E8F0] p-4 sm:p-4.5 shadow-2xs transition-all flex items-center gap-3.5 sm:gap-4 group"
        >
          {/* Left: Route Track Icons (Green halo dot, dashed line, terracotta dot) */}
          <div className="flex flex-col items-center justify-between py-1 shrink-0 self-stretch select-none">
            {/* Top: Pickup Green Concentric Indicator with soft halo */}
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#D1FAE5] flex items-center justify-center shrink-0 shadow-2xs">
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#15803D] flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            </div>

            {/* Vertical Dashed Line */}
            <div className="w-[2px] flex-1 my-1.5 border-l-2 border-dashed border-[#475569] min-h-[22px] sm:min-h-[26px]" />

            {/* Bottom: Drop Terracotta Concentric Indicator */}
            <div className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-[#9A3412] flex items-center justify-center shrink-0 shadow-2xs">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
          </div>

          {/* Right: Location Text Rows */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            {/* Pickup Location Row */}
            <div 
              id="search-pickup-location"
              onClick={() => {
                triggerSound('beep');
                setShowLocationPicker('pickup');
              }}
              className="py-1 sm:py-1.5 flex items-center justify-between cursor-pointer min-h-[38px] select-none"
              title="Click to set pickup location"
            >
              <div className="flex-1 min-w-0 pr-2">
                <span className={`text-[15px] sm:text-base tracking-tight truncate block ${
                  pickup?.name ? 'font-medium text-[#111111]' : 'text-[#475569]'
                }`}>
                  {pickup?.name || 'Pickup location'}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors shrink-0" />
            </div>

            {/* Subtle Horizontal Divider Line */}
            <div className="h-[1px] bg-[#E2E8F0] my-1 sm:my-1.5" />

            {/* Drop Location Row */}
            <div 
              id="search-drop-location"
              onClick={() => {
                triggerSound('beep');
                setShowLocationPicker('dropoff');
              }}
              className="py-1 sm:py-1.5 flex items-center justify-between cursor-pointer min-h-[38px] select-none"
              title="Click to set destination drop location"
            >
              <div className="flex-1 min-w-0 pr-2">
                <span className={`text-[15px] sm:text-base tracking-tight truncate block ${
                  dropoff?.name ? 'font-medium text-[#111111]' : 'text-[#475569]'
                }`}>
                  {dropoff?.name || 'Drop location'}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {dropoff && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDropoff(null);
                      triggerSound('beep');
                    }}
                    className="w-5 h-5 rounded-full bg-neutral-200 hover:bg-neutral-300 text-neutral-600 flex items-center justify-center text-xs transition-colors cursor-pointer"
                    title="Clear destination"
                  >
                    ✕
                  </button>
                )}
                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle / Ride Tier Selection Buttons (Matching user screenshot) */}
        <div 
          id="vehicle-tier-selection-list" 
          className="space-y-2.5 pt-1 w-full"
        >
          {VEHICLE_TIERS.map((tier) => {
            const isSelected = selectedTierId === tier.id;
            const tierFare = tier.baseFare + Math.round(estimatedDistanceKm * tier.perKmRate);
            return (
              <button
                key={tier.id}
                id={`vehicle-tier-${tier.id}`}
                type="button"
                onClick={() => {
                  setSelectedTierId(tier.id);
                  triggerSound('beep');
                }}
                className={`w-full p-4 rounded-2xl sm:rounded-3xl text-left transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                  isSelected
                    ? 'border-2 border-[#111111] bg-white shadow-xs'
                    : 'border border-[#E5E5E5] bg-white hover:border-neutral-300 hover:bg-[#FAFAFA]'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className={`text-sm sm:text-[15px] font-bold tracking-tight ${
                    isSelected ? 'text-[#111111]' : 'text-[#1F1F1F]'
                  }`}>
                    {tier.name}
                  </div>
                  <div className="text-xs sm:text-[13px] text-neutral-500 font-normal pt-1">
                    Base: ₹{tier.baseFare} • Per KM: ₹{tier.perKmRate}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm sm:text-base font-extrabold text-[#111111]">
                    ₹{tierFare}
                  </div>
                  <div className="text-[10px] font-medium text-neutral-400">
                    {estimatedDistanceKm} km
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Payment Method Selector Pills */}
        <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-neutral-100 w-full">
          <button
            type="button"
            onClick={() => setPaymentMethod('cash')}
            className={`w-full min-h-[42px] py-1.5 px-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              paymentMethod === 'cash'
                ? 'bg-[#181818] text-white shadow-2xs'
                : 'bg-[#F6F4F0] text-gray-600 hover:bg-[#EAE6DE]'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Cash</span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod('upi')}
            className={`w-full min-h-[42px] py-1.5 px-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              paymentMethod === 'upi'
                ? 'bg-[#181818] text-white shadow-2xs'
                : 'bg-[#F6F4F0] text-gray-600 hover:bg-[#EAE6DE]'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-[#FF6B2C] shrink-0" />
            <span className="truncate">UPI QR</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setPaymentMethod('wallet');
              if (walletBalance < currentFare) {
                setIsWalletOpen(true);
              }
            }}
            className={`w-full min-h-[42px] py-1.5 px-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              paymentMethod === 'wallet'
                ? 'bg-[#181818] text-white shadow-2xs'
                : 'bg-[#F6F4F0] text-gray-600 hover:bg-[#EAE6DE]'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Wallet (₹{walletBalance})</span>
          </button>
        </div>

        {/* Coupons and Fare Breakdown Row */}
        <div className="flex items-center justify-between text-xs pt-0.5 px-0.5 w-full">
          <button
            type="button"
            onClick={() => { setIsCouponsOpen(true); triggerSound('beep'); }}
            className="flex items-center gap-1 text-[#C8622A] hover:text-[#9E4616] font-bold cursor-pointer transition-colors min-h-[36px]"
          >
            <Tag className="w-3.5 h-3.5 text-[#FF6B2C] shrink-0" />
            <span className="truncate">
              {appliedCoupon ? `${appliedCoupon.code} (-₹${couponDiscount})` : 'Apply Coupon'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setIsFareBreakdownOpen(true); triggerSound('beep'); }}
            className="text-gray-600 hover:text-black font-semibold flex items-center gap-1 cursor-pointer transition-colors min-h-[36px]"
          >
            <span>Est. ₹{currentFare}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          </button>
        </div>

        {/* Find a ride Button */}
        <button
          id="find-ride-btn"
          type="button"
          onClick={handleFindRide}
          disabled={Boolean(activeRide && activeRide.status !== 'completed' && activeRide.status !== 'cancelled')}
          className="w-full min-h-[48px] bg-[#141414] hover:bg-black active:scale-[0.99] text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-sm shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isScanningOffers ? (
            <>
              <Loader2 className="w-4 h-4 text-[#FF6B2C] animate-spin" />
              <span>Scanning Nearby Toto Partners...</span>
            </>
          ) : (
            <>
              <TotoRickshawIcon className="w-5 h-5 shrink-0" color="#FF6B2C" />
              <span>Find a ride</span>
            </>
          )}
        </button>

        {/* Inline Section: Scanning Active Toto Partners */}
        {isScanningOffers && (
          <div className="pt-2 border-t border-neutral-100 animate-in fade-in duration-200 space-y-2.5">
            <div className="bg-[#FAF8F5] border border-[#EBE5DB] rounded-2xl p-3.5 sm:p-4 text-center space-y-2.5">
              <div className="relative w-12 h-12 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-[#FF6B2C]/15 animate-ping" />
                <div className="w-11 h-11 rounded-2xl bg-[#FFF4ED] border border-[#FFD8C2] text-[#FF6B2C] flex items-center justify-center shadow-xs">
                  <TotoRickshawIcon className="w-6 h-6 animate-bounce" color="#FF6B2C" />
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-[#111111] flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Scanning Active Nearby E-Rickshaws...</span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Fetching live driver price bids near {pickup?.name || 'pickup location'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Inline Section: Active Nearby Toto Partners & Real-Time Price Offers */}
        {!isScanningOffers && availableTotoOffers.length > 0 && (
          <div className="pt-2.5 border-t border-neutral-100 animate-in fade-in slide-in-from-top-2 duration-300 space-y-2.5">
            {/* Header with Toto Icon, Active Badge & Collapse Button */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#FFF4ED] border border-[#FFD8C2] flex items-center justify-center shrink-0 shadow-2xs">
                  <TotoRickshawIcon className="w-4 h-4 sm:w-5 sm:h-5" color="#FF6B2C" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-extrabold text-[#111111] tracking-tight truncate">
                    Nearby E-Rickshaw Partners
                  </h3>
                  <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="truncate">{availableTotoOffers.length} Online Drivers • Live Bids</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={cancelOfferSearch}
                className="text-[11px] text-gray-500 hover:text-black font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-neutral-100 transition-colors shrink-0 cursor-pointer"
                title="Collapse list"
              >
                <span>Hide</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* List of Available Driver Offers - Mobile Optimized */}
            <div className="space-y-2 max-h-[340px] sm:max-h-[380px] overflow-y-auto pr-0.5 overscroll-contain">
              {availableTotoOffers.map((offer) => (
                <div
                  key={offer.driverId}
                  className="bg-[#FAF8F5] hover:bg-white border border-[#E5DFD4] hover:border-[#FF6B2C] rounded-2xl p-2.5 sm:p-3 space-y-2 transition-all shadow-2xs group"
                >
                  {/* Top Row: Driver Avatar with Toto Badge, Name, Vehicle & Price */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={offer.driverPhoto}
                          alt={offer.driverName}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-neutral-200 shadow-2xs"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 shadow-2xs border border-neutral-100">
                          <TotoRickshawIcon className="w-3 h-3" color="#FF6B2C" />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#111111] flex items-center gap-1">
                          <span className="truncate">{offer.driverName}</span>
                          <span className="text-[8px] sm:text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-md shrink-0">
                            ✓
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono leading-tight truncate">
                          {offer.vehicleNumber}
                        </div>
                        <div className="text-[9.5px] text-[#C8622A] font-semibold truncate leading-tight">
                          {offer.vehicleModel}
                        </div>
                      </div>
                    </div>

                    {/* Price Column with Tag */}
                    <div className="text-right shrink-0">
                      <span className="inline-block text-[8.5px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 bg-[#FFF4ED] text-[#C8622A] border border-[#FFD8C2] rounded-full mb-0.5">
                        {offer.offerTag}
                      </span>
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-[11px] text-gray-400 line-through">
                          ₹{offer.originalPrice}
                        </span>
                        <span className="text-base sm:text-lg font-black text-[#111111]">
                          ₹{offer.price}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Driver Stats: Rating, Battery %, Distance & ETA in 3 equal columns for mobile */}
                  <div className="grid grid-cols-3 gap-1 text-[9.5px] sm:text-[10px] bg-white px-2 py-1.5 rounded-xl text-gray-600 font-medium border border-[#EDE8E0]">
                    <div className="flex items-center justify-center gap-1 text-amber-700 font-bold truncate">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" />
                      <span className="truncate">{offer.rating} ({offer.totalTrips})</span>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-emerald-700 font-bold border-x border-neutral-100 px-1 truncate">
                      <BatteryCharging className="w-3 h-3 shrink-0" />
                      <span className="truncate">{offer.batteryPercentage}% ⚡</span>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-blue-700 font-bold truncate">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span className="truncate">{offer.etaMins}m ({offer.distanceMeters}m)</span>
                    </div>
                  </div>

                  {/* Action Button: Mobile friendly touch target */}
                  <button
                    type="button"
                    onClick={() => handleSelectPartnerOffer(offer)}
                    className="w-full min-h-[40px] py-2 px-3 bg-[#181818] group-hover:bg-[#FF6B2C] active:scale-[0.99] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <TotoRickshawIcon className="w-4 h-4 shrink-0" color="#FFFFFF" />
                    <span className="truncate">Select Partner • ₹{offer.price}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Location Picker Modal / Sheet */}
      {showLocationPicker && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <h3 className="font-bold text-sm text-[#111111]">
                Select {showLocationPicker === 'pickup' ? 'Pickup Location' : 'Destination'}
              </h3>
              <button 
                onClick={() => setShowLocationPicker(null)} 
                className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* GPS Locate Me Button */}
            <button
              type="button"
              onClick={handleApplyCurrentGpsToPickup}
              disabled={isLocating}
              className="w-full py-2.5 px-3 bg-[#FDE8DC] hover:bg-[#FCD8C4] text-[#C8622A] rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition-colors cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5 fill-[#C8622A] rotate-45" />
              <span>{isLocating ? 'Acquiring GPS fix...' : 'Use My Current Live GPS Location'}</span>
            </button>

            {/* Search Input with Clear Button, Category Filter & Live Suggestions */}
            <div className="space-y-2.5">
              <form onSubmit={handleSelectCustomLocation} className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center pointer-events-none text-gray-400">
                  {isSearchingOnline ? (
                    <Loader2 className="w-4 h-4 text-[#FF6B2C] animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 text-gray-500" />
                  )}
                </div>

                <input
                  ref={searchInputRef}
                  id="place-search-input"
                  type="text"
                  value={customSearchQuery}
                  onFocus={() => setIsSearchInputFocused(true)}
                  onChange={(e) => setCustomSearchQuery(e.target.value)}
                  placeholder="Search place, metro, landmark, street..."
                  className="w-full bg-[#F6F4F0] border border-[#E5DFD4] hover:border-[#D5CFC4] focus:border-[#111111] focus:bg-white rounded-2xl pl-10 pr-20 py-2.5 text-xs font-semibold text-[#111111] placeholder-gray-400 focus:outline-none transition-all shadow-2xs"
                />

                <div className="absolute right-2 flex items-center gap-1">
                  {customSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomSearchQuery('');
                        setOnlineSearchResults([]);
                        searchInputRef.current?.focus();
                      }}
                      className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-[#181818] hover:bg-black text-white text-[11px] font-bold rounded-xl shadow-2xs transition-transform active:scale-95 cursor-pointer"
                  >
                    Select
                  </button>
                </div>
              </form>

              {/* Quick Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
                {[
                  { id: 'all', label: '✨ All Places' },
                  { id: 'metro', label: '🚇 Metro Stations' },
                  { id: 'it', label: '🏢 Tech & IT' },
                  { id: 'mall', label: '🛍️ Malls' },
                  { id: 'hospital', label: '🏥 Hospitals' },
                  { id: 'railway', label: '🚆 Railway' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedPlaceCategory(cat.id);
                      triggerSound('beep');
                    }}
                    className={`px-2.5 py-1 rounded-full whitespace-nowrap font-bold transition-all cursor-pointer ${
                      selectedPlaceCategory === cat.id
                        ? 'bg-[#181818] text-white shadow-xs'
                        : 'bg-[#F2ECE3] text-gray-700 hover:bg-[#EAE4D9]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Suggestions List */}
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-gray-400 px-1 pt-1">
                <span>
                  {customSearchQuery
                    ? isSearchingOnline
                      ? 'Searching places...'
                      : `Matching Suggestions (${suggestedPlaces.length})`
                    : 'Recommended Spots'}
                </span>
                {suggestedPlaces.length > 0 && (
                  <span className="text-gray-400 font-normal lowercase">tap to select</span>
                )}
              </div>

              {suggestedPlaces.length > 0 ? (
                suggestedPlaces.map((loc, idx) => {
                  const dist = getDistanceLabel(loc);
                  return (
                    <button
                      key={`${loc.name}-${idx}`}
                      type="button"
                      onClick={() => {
                        if (showLocationPicker === 'pickup') {
                          setPickup(loc);
                        } else {
                          setDropoff(loc);
                        }
                        setShowLocationPicker(null);
                        triggerSound('success');
                      }}
                      className="w-full text-left p-2.5 rounded-2xl bg-white hover:bg-[#F9F7F4] border border-transparent hover:border-[#EAE4DA] flex items-start gap-2.5 transition-all cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-[#F6F4F0] group-hover:bg-white group-hover:shadow-2xs flex items-center justify-center shrink-0 mt-0.5 border border-[#EDE8E0]">
                        {getPlaceIcon(loc)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <div className="text-xs font-bold text-[#111111] truncate group-hover:text-[#FF6B2C] transition-colors">
                            {loc.name}
                          </div>
                          {dist && (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md shrink-0">
                              {dist}
                            </span>
                          )}
                        </div>

                        <div className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">
                          {loc.address}
                        </div>

                        {loc.landmark && (
                          <div className="text-[9px] text-[#C8622A] font-medium mt-0.5">
                            📍 {loc.landmark}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-6 px-4 text-center space-y-2 bg-[#FAF8F5] rounded-2xl border border-dashed border-[#E5DFD4]">
                  <p className="text-xs text-gray-500">
                    No matching landmark found for "{customSearchQuery}"
                  </p>
                  <button
                    type="button"
                    onClick={handleSelectCustomLocation}
                    className="px-3 py-1.5 bg-[#181818] text-white text-xs font-bold rounded-xl hover:bg-black transition-all cursor-pointer"
                  >
                    Set "{customSearchQuery}" as custom location
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast when Passenger Selects a Toto Partner & Dispatches Request */}
      {notificationToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md bg-[#181818] text-white p-4 rounded-3xl shadow-2xl border border-neutral-700 flex items-start gap-3.5 animate-in slide-in-from-top-4 duration-300">
          <div className="w-9 h-9 rounded-2xl bg-[#FF6B2C] text-white flex items-center justify-center shrink-0 shadow-xs">
            <BellRing className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Request Dispatched to Partner</span>
                <span className="text-[9px] bg-[#23864A] text-white font-mono px-1.5 py-0.2 rounded-full">
                  LIVE
                </span>
              </h4>
              <button 
                onClick={() => setNotificationToast(null)}
                className="text-gray-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-gray-300 mt-0.5">
              Selected <strong>{notificationToast.driverName}</strong> ({notificationToast.vehicleNumber}) for <strong className="text-[#FF6B2C]">₹{notificationToast.price}</strong>.
            </p>
            <div className="text-[10px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Partner has received your offer notification!</span>
            </div>
          </div>
        </div>
      )}

      {/* Status 1: Ride Requested (Screenshot 1 & 2 exact banner) */}
      {activeRide && activeRide.status === 'searching' && (
        <div className="w-full bg-[#EAF5ED] text-[#1E3A24] rounded-2xl p-3.5 sm:p-4 flex items-center justify-between border border-[#D5EBDA] shadow-xs animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#23864A] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
              <Check className="w-4 h-4 text-white stroke-[3]" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-[#111111] truncate">
                Ride requested
              </div>
              <div className="text-xs text-[#555555] truncate">
                {activeRide.driverName 
                  ? `Selected Toto partner ${activeRide.driverName} notified.` 
                  : 'Your toto request is visible to nearby drivers.'}
              </div>
            </div>
          </div>
          <div className="text-base font-extrabold text-[#111111] ml-2 shrink-0">
            ₹{activeRide.totalFare || currentFare}
          </div>
        </div>
      )}

      {/* Status 2: Driver Assigned & En Route */}
      {activeRide && (activeRide.status === 'driver_assigned' || activeRide.status === 'driver_arrived' || activeRide.status === 'in_progress') && (
        <div className="w-full bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-[#EDE8E0] space-y-3.5 sm:space-y-4 animate-in fade-in duration-300">
          {/* Top Driver Info */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              {activeRide.driverPhoto ? (
                <img 
                  src={activeRide.driverPhoto} 
                  alt={activeRide.driverName}
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-full object-cover border border-neutral-200 shadow-xs shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-[#FDE8DC] text-[#C8622A] flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                  {activeRide.driverName ? activeRide.driverName.charAt(0) : 'S'}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#111111] truncate">
                  {activeRide.driverName || 'Subhashish Mondal'}
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-gray-500 truncate">
                  <span className="font-mono">{activeRide.vehicleNumber || 'WB-06-ER-4821'}</span>
                  <span>•</span>
                  <span className="flex items-center text-amber-600 font-semibold shrink-0">
                    ★ 4.94
                  </span>
                </div>
                {activeRide.selectedOfferTag && (
                  <div className="text-[10px] text-[#C8622A] font-bold mt-0.5 truncate">
                    {activeRide.selectedOfferTag}
                  </div>
                )}
              </div>
            </div>

            {/* OTP Code Badge */}
            <div className="text-right shrink-0">
              <div className="text-[10px] uppercase font-bold text-gray-400">PIN OTP</div>
              <div className="text-base sm:text-lg font-black tracking-widest text-[#111111] font-mono">
                {activeRide.otp}
              </div>
            </div>
          </div>

          {/* Ride Progress Status Banner */}
          <div className="p-3 bg-[#F6F4F0] rounded-2xl flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <span className="font-semibold text-[#111111] truncate">
                {activeRide.status === 'driver_assigned' && 'Toto Captain is arriving (2 mins)'}
                {activeRide.status === 'driver_arrived' && 'Captain arrived at pickup spot!'}
                {activeRide.status === 'in_progress' && 'Trip in progress to destination...'}
              </span>
            </div>
            <div className="font-bold text-[#111111] shrink-0">₹{activeRide.totalFare}</div>
          </div>

          {/* Actions: Communication, Safety Suite & Cancellation */}
          <div className="space-y-2 pt-1">
            {/* 4-button Rapid Action Bar */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              <a
                href={`tel:${activeRide.driverPhone || '+919874522019'}`}
                className="min-h-[44px] py-2 px-1 bg-[#FAF8F5] hover:bg-[#F0EEEA] text-[#111111] font-bold text-[11px] rounded-2xl flex flex-col items-center justify-center gap-1 border border-neutral-200 transition-colors"
                title="Call Captain"
              >
                <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">Call</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setIsChatOpen(true);
                  triggerSound('beep');
                }}
                className="min-h-[44px] py-2 px-1 bg-[#FAF8F5] hover:bg-[#F0EEEA] text-[#111111] font-bold text-[11px] rounded-2xl flex flex-col items-center justify-center gap-1 border border-neutral-200 transition-colors cursor-pointer"
                title="Chat with Captain"
              >
                <MessageSquare className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">Chat</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsShareTripOpen(true);
                  triggerSound('beep');
                }}
                className="min-h-[44px] py-2 px-1 bg-[#FAF8F5] hover:bg-[#F0EEEA] text-[#111111] font-bold text-[11px] rounded-2xl flex flex-col items-center justify-center gap-1 border border-neutral-200 transition-colors cursor-pointer"
                title="Share Live Trip"
              >
                <Share2 className="w-4 h-4 text-[#FF6B2C] shrink-0" />
                <span className="truncate">Share</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsSosOpen(true);
                  triggerSound('alert');
                }}
                className="min-h-[44px] py-2 px-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] rounded-2xl flex flex-col items-center justify-center gap-1 border border-red-200 transition-colors cursor-pointer animate-pulse"
                title="Emergency SOS"
              >
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="truncate">SOS</span>
              </button>
            </div>

            {/* Secondary Controls: Safety Shield & Cancel Ride */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsSafetyOpen(true);
                  triggerSound('beep');
                }}
                className="flex-1 min-h-[42px] py-2 px-3 bg-[#FAF8F5] hover:bg-[#F0EEEA] text-neutral-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-neutral-200 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Safety Center</span>
              </button>

              {activeRide.status !== 'in_progress' && (
                <button
                  type="button"
                  onClick={() => cancelRide('Passenger requested cancellation')}
                  className="min-h-[42px] py-2 px-3 bg-[#FEE2E2] hover:bg-[#FECACA] text-[#DC2626] font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel Ride
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status 3: Ride Completed & Rating / Receipt */}
      {activeRide && activeRide.status === 'completed' && (
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-[#EDE8E0] space-y-4 animate-in fade-in duration-300">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 shadow-2xs">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <h3 className="font-extrabold text-base text-[#111111]">Trip Completed!</h3>
            <p className="text-xs text-neutral-500">
              Total fare of <strong className="text-[#111111]">₹{activeRide.totalFare}</strong> settled via {activeRide.paymentMethod.toUpperCase()}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setReceiptRideData(activeRide);
                setIsReceiptOpen(true);
                triggerSound('beep');
              }}
              className="py-2.5 px-3 bg-[#FAF8F5] hover:bg-[#F2ECE1] text-[#111111] font-bold text-xs rounded-2xl border border-neutral-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-[#FF6B2C]" />
              <span>Tax Receipt</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsRatingOpen(true);
                triggerSound('beep');
              }}
              className="py-2.5 px-3 bg-[#FFF4ED] hover:bg-[#FFE5D3] text-[#C8622A] font-bold text-xs rounded-2xl border border-[#FFD8C2] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Star className="w-3.5 h-3.5 fill-[#FF6B2C] text-[#FF6B2C]" />
              <span>Rate Captain</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              cancelRide('Completed and reset');
              triggerSound('success');
            }}
            className="w-full py-3 bg-[#111111] hover:bg-black text-white font-bold text-xs rounded-2xl shadow-xs transition-colors cursor-pointer"
          >
            Book Next Ride
          </button>
        </div>
      )}
        </>
      )}

      {/* MODALS SUITE */}

      {/* 1. Wallet Modal */}
      <WalletModal
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
        balance={walletBalance}
        onAddMoney={addMoneyToWallet}
      />

      {/* 2. Schedule Ride Modal */}
      <ScheduleRideModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        currentPickup={pickup}
        currentDropoff={dropoff}
        userId={user?.id || 'usr_passenger'}
        userName={user?.name || 'Passenger'}
        userPhone={user?.phone || '+91 98311 02458'}
        onConfirmSchedule={createScheduledRide}
      />

      {/* 3. Saved Places Modal */}
      <SavedPlacesModal
        isOpen={isSavedPlacesOpen}
        onClose={() => setIsSavedPlacesOpen(false)}
        savedPlaces={savedPlaces}
        onAddPlace={addSavedPlace}
        onDeletePlace={deleteSavedPlace}
        onSelectPlace={(point) => {
          setDropoff(point);
          triggerSound('success');
        }}
      />

      {/* 5. Safety Center Modal */}
      <SafetyCenterModal
        isOpen={isSafetyOpen}
        onClose={() => setIsSafetyOpen(false)}
        onOpenSos={() => {
          setIsSafetyOpen(false);
          setIsSosOpen(true);
        }}
      />

      {/* 6. Support Modal */}
      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => {
          setIsSupportOpen(false);
          setSupportRideId(undefined);
        }}
        userId={user?.id || 'usr_passenger'}
        userName={user?.name || 'Passenger'}
        userRole="user"
        activeRideId={supportRideId || activeRide?.id}
        onSubmitTicket={createSupportTicket}
      />

      {/* 7. Live SOS Modal */}
      <SosModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        rideId={activeRide?.id || 'emergency_alert'}
        userId={user?.id || 'usr_passenger'}
        userName={user?.name || 'Passenger'}
        driverId={activeRide?.driverId}
        driverName={activeRide?.driverName}
        vehicleNumber={activeRide?.driverVehicleNumber}
        currentLocation={pickup}
        emergencyContacts={emergencyContacts}
        onAddContact={addEmergencyContact}
      />

      {/* 8. Live In-Ride Chat Modal */}
      {activeRide && (
        <ChatModal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          rideId={activeRide.id}
          senderRole="user"
          currentUserId={user?.id || 'usr_passenger'}
          currentUserName={user?.name || 'Passenger'}
          partnerName={activeRide.driverName || 'Captain'}
          partnerPhone={activeRide.driverPhone}
        />
      )}

      {/* 9. Share Trip Modal */}
      {activeRide && (
        <ShareTripModal
          isOpen={isShareTripOpen}
          onClose={() => setIsShareTripOpen(false)}
          ride={activeRide}
        />
      )}

      {/* 10. Printable Tax Receipt Modal */}
      {receiptRideData && (
        <RideReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => {
            setIsReceiptOpen(false);
            setReceiptRideData(null);
          }}
          ride={receiptRideData}
          customerName={user?.name || 'Passenger'}
        />
      )}

      {/* 11. Rating Modal */}
      <RatingModal
        isOpen={isRatingOpen}
        onClose={() => setIsRatingOpen(false)}
        driverName={activeRide?.driverName || 'Captain Subhashish'}
        vehicleNumber={activeRide?.driverVehicleNumber || 'WB-06-ER-4821'}
        onSubmitRating={rateRideWithTags}
      />

      {/* 12. Fare Breakdown Modal */}
      <FareBreakdownModal
        isOpen={isFareBreakdownOpen}
        onClose={() => setIsFareBreakdownOpen(false)}
        baseFare={baseFare}
        distanceCharge={distanceCharge}
        timeCharge={timeCharge}
        couponDiscount={couponDiscount}
        totalFare={currentFare}
        distanceKm={Number(estimatedDistanceKm.toFixed(1))}
        durationMins={Math.round(estimatedDistanceKm * 4)}
        vehicleName={selectedTier.name}
        appliedCouponCode={appliedCoupon?.code}
      />

      {/* 13. Coupons & Offers Modal */}
      <CouponsModal
        isOpen={isCouponsOpen}
        onClose={() => setIsCouponsOpen(false)}
        currentFare={rawFare}
        appliedCoupon={appliedCoupon}
        onApplyCoupon={(coupon) => {
          setAppliedCoupon(coupon);
          triggerSound('success');
        }}
        onRemoveCoupon={() => {
          setAppliedCoupon(null);
          triggerSound('beep');
        }}
      />
    </div>
  );
};
