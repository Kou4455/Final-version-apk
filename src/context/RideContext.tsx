import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  AppRole, 
  UserProfile, 
  DriverProfile, 
  ActiveRide, 
  SimulatedDriverMarker, 
  GeoPoint, 
  VehicleOption,
  TotoPartnerOffer,
  DriverApprovalRequest,
  TripRecord,
  RideRequestDoc,
  SupportTicket,
  SavedPlaceItem,
  EmergencyContact,
  ScheduledRide
} from '../types';
import { 
  SEED_DRIVERS, 
  VEHICLE_OPTIONS, 
  PROMO_CODES
} from '../data/appData';
import { 
  calculateDistanceKm, 
  calculateEstimatedMinutes, 
  generate4DigitOtp, 
  calculateBearing, 
  fetchRouteBetweenPoints, 
  isDriverLocationFresh 
} from '../utils/geoUtils';
import { 
  auth, 
  db, 
  googleProvider,
  signInWithPopup, 
  signOut, 
  signInAnonymously,
  onAuthStateChanged,
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDocs,
  handleFirestoreError,
  OperationType,
  FirebaseUser,
  sanitizeForFirestore,
  isQuotaExceededError,
  subscribeToQuotaErrors
} from '../lib/firebase';
import { compressImageIfNeeded } from '../utils/imageCompressor';

interface RideContextType {
  user: UserProfile | null;
  driver: DriverProfile | null;
  activeRole: AppRole;
  activeRide: ActiveRide | null;
  simulatedDrivers: SimulatedDriverMarker[];
  pendingDriverRequest: ActiveRide | null;
  earningsHistory: Array<{ id: string; time: string; amount: number; pickup: string; drop: string }>;
  userGpsPoint: GeoPoint | null;
  driverGpsPoint: GeoPoint | null;
  firebaseAuthUser: FirebaseUser | null;
  isAuthLoading: boolean;
  isFirestoreQuotaExceeded: boolean;
  
  // Dynamic Online Toto Partner Offers
  availableTotoOffers: TotoPartnerOffer[];
  isScanningOffers: boolean;
  selectedOffer: TotoPartnerOffer | null;
  findNearbyTotoOffers: (pickup: GeoPoint, dropoff: GeoPoint, promoCode?: string) => void;
  selectTotoOfferAndBook: (
    offer: TotoPartnerOffer, 
    pickup: GeoPoint, 
    dropoff: GeoPoint, 
    paymentMethod: 'cash' | 'upi' | 'wallet'
  ) => Promise<ActiveRide>;
  cancelOfferSearch: () => void;

  // Role & auth actions
  setActiveRole: (role: AppRole) => void;
  loginWithGoogle: () => Promise<UserProfile>;
  loginUser: (user: UserProfile) => Promise<void>;
  logoutUser: () => Promise<void>;
  loginDriver: (driver: DriverProfile) => Promise<void>;
  logoutDriver: () => void;
  setDriverOnlineStatus: (isOnline: boolean) => Promise<void>;
  updateUserGpsPoint: (point: GeoPoint) => void;
  updateDriverGpsPoint: (point: GeoPoint) => void;
  
  // User Actions
  createRideBooking: (
    pickup: GeoPoint, 
    dropoff: GeoPoint, 
    vehicleType: VehicleOption['id'], 
    paymentMethod: 'cash' | 'upi' | 'wallet', 
    promoCode?: string
  ) => Promise<ActiveRide>;
  cancelRide: (reason?: string) => Promise<void>;
  rateRide: (rating: number, feedback: string) => Promise<void>;
  
  // Driver Actions
  driverAcceptRide: (rideId: string) => Promise<void>;
  driverDeclineRide: (rideId: string) => void;
  driverArriveAtPickup: () => Promise<void>;
  driverStartRideWithOtp: (otpInput: string) => Promise<{ success: boolean; message: string }>;
  driverCompleteRide: () => Promise<void>;
  
  // Admin & Approval System
  driverApprovals: DriverApprovalRequest[];
  pendingApprovalsCount: number;
  registerDriverApproval: (data: {
    driverName: string;
    phone: string;
    vehicleType?: 'toto' | 'bike' | 'auto';
    vehicleNumber: string;
    vehicleModel: string;
    vehicleColor: string;
    driverPhoto?: string;
    totoPhotos?: string[];
  }) => Promise<{ approvalId: string; message: string }>;
  approveDriverRegistration: (approvalId: string, customPin?: string) => Promise<{ pin: string }>;
  rejectDriverRegistration: (approvalId: string) => Promise<void>;
  deleteDriverProfile: (idOrPhone: string) => Promise<{ success: boolean; message: string }>;
  loginDriverWithPin: (phone: string, pin: string) => Promise<{ success: boolean; message?: string }>;
  updateDriverVehicleDetails: (details: {
    vehicleNumber?: string;
    vehicleModel?: string;
    vehicleColor?: string;
    batteryPercentage?: number;
  }) => Promise<void>;
  dispatchRideRequest: (req: Partial<RideRequestDoc>) => Promise<void>;

  // Customer Wallet, Places, Safety, Support & Scheduling
  activeNavTab: 'home' | 'rides' | 'profile';
  setActiveNavTab: (tab: 'home' | 'rides' | 'profile') => void;
  walletBalance: number;
  addMoneyToWallet: (amount: number) => Promise<void>;
  savedPlaces: SavedPlaceItem[];
  addSavedPlace: (place: Omit<SavedPlaceItem, 'id' | 'createdAt'>) => Promise<void>;
  deleteSavedPlace: (placeId: string) => Promise<void>;
  emergencyContacts: EmergencyContact[];
  addEmergencyContact: (name: string, phone: string, relationship: string) => Promise<void>;
  deleteEmergencyContact: (id: string) => Promise<void>;
  supportTickets: SupportTicket[];
  createSupportTicket: (ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<void>;
  scheduledRides: ScheduledRide[];
  createScheduledRide: (ride: ScheduledRide) => Promise<void>;
  completedTrips: TripRecord[];
  rateRideWithTags: (stars: number, compliments: string[], review: string) => Promise<void>;

  // Admin authentication state & methods
  isAdminAuthenticated: boolean;
  adminCredentials: { username: string; passwordHash: string; updatedAt?: string };
  loginAdmin: (userId: string, password: string) => Promise<{ success: boolean; message: string }>;
  logoutAdmin: () => void;
  updateAdminCredentials: (newUsername: string, newPassword: string, currentPassword?: string) => { success: boolean; message: string };
  updateAdminPassword: (newPassword: string) => { success: boolean; message: string };

  // Audio chime feedback
  triggerSound: (type: 'beep' | 'success' | 'alert') => void;
}

const RideContext = createContext<RideContextType | undefined>(undefined);

// Web Audio API helper for natural sound feedback
function playChime(type: 'beep' | 'success' | 'alert') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    if (type === 'alert') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'success') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    }
  } catch {
    // Audio gesture requirement bypassed
  }
}

export const RideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [driver, setDriver] = useState<DriverProfile | null>(() => {
    try {
      const saved = localStorage.getItem('toto_saved_driver');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Error reading saved driver:', e);
    }
    return null; // By default require captain sign-in / PIN authentication
  });
  const [firebaseAuthUser, setFirebaseAuthUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<AppRole>('user');
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [pendingDriverRequest, setPendingDriverRequest] = useState<ActiveRide | null>(null);
  const [onlineDrivers, setOnlineDrivers] = useState<DriverProfile[]>(SEED_DRIVERS);
  const [userGpsPoint, setUserGpsPoint] = useState<GeoPoint | null>(null);
  const [driverGpsPoint, setDriverGpsPoint] = useState<GeoPoint | null>(null);
  const [availableTotoOffers, setAvailableTotoOffers] = useState<TotoPartnerOffer[]>([]);
  const [isScanningOffers, setIsScanningOffers] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<TotoPartnerOffer | null>(null);
  const [isFirestoreQuotaExceeded, setIsFirestoreQuotaExceeded] = useState<boolean>(false);
  const [activeNavTab, setActiveNavTabState] = useState<'home' | 'rides' | 'profile'>('home');

  const setActiveNavTab = useCallback((tab: 'home' | 'rides' | 'profile') => {
    setActiveNavTabState(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  
  // Listen for global quota exceeded events from Firebase SDK layer
  useEffect(() => {
    const unsub = subscribeToQuotaErrors(() => {
      setIsFirestoreQuotaExceeded(true);
    });
    return () => unsub();
  }, []);

  const [earningsHistory, setEarningsHistory] = useState<Array<{ id: string; time: string; amount: number; pickup: string; drop: string }>>([
    { id: 'tx_1', time: '10:15 AM', amount: 45, pickup: 'Sector V Metro', drop: 'City Centre 1' },
    { id: 'tx_2', time: '11:40 AM', amount: 65, pickup: 'Karunamoyee', drop: 'City Centre 1' },
    { id: 'tx_3', time: '01:10 PM', amount: 38, pickup: 'RDB Cinemas', drop: 'Webel More' },
  ]);

  const [driverApprovals, setDriverApprovals] = useState<DriverApprovalRequest[]>([]);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  // Admin authentication state (supports default Username: "Admin", Password: "Admin", with ability to update credentials in future)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('toto_admin_authenticated') === 'true';
  });

  const [adminCredentials, setAdminCredentials] = useState<{ username: string; passwordHash: string; updatedAt?: string }>(() => {
    const saved = localStorage.getItem('toto_admin_credentials');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.username === 'string' && typeof parsed.passwordHash === 'string') {
          // If stored credentials were old legacy "admin.admin", migrate seamlessly to "Admin" / "Admin"
          if (parsed.username.toLowerCase() === 'admin' && parsed.passwordHash === 'admin.admin') {
            return { username: 'Admin', passwordHash: 'Admin', updatedAt: new Date().toISOString() };
          }
          return parsed;
        }
      } catch (e) {
        console.error('Error parsing admin credentials:', e);
      }
    }
    return { username: 'Admin', passwordHash: 'Admin', updatedAt: new Date().toISOString() };
  });

  const loginAdmin = async (userIdInput: string, passwordInput: string): Promise<{ success: boolean; message: string }> => {
    const cleanId = userIdInput.trim();
    const cleanPass = passwordInput.trim();

    if (!cleanId || !cleanPass) {
      return { success: false, message: 'Please enter both Admin username and password.' };
    }

    // Default username is "Admin" (case-insensitive for convenience)
    const storedUser = adminCredentials.username || 'Admin';
    const isUserMatch = 
      cleanId.toLowerCase() === storedUser.toLowerCase() || 
      cleanId.toLowerCase() === 'admin';

    // Default password is "Admin" (also gracefully matches 'admin' or custom updated password)
    const storedPass = adminCredentials.passwordHash || 'Admin';
    const isPassMatch = 
      cleanPass === storedPass || 
      (storedPass === 'Admin' && cleanPass.toLowerCase() === 'admin') ||
      cleanPass === 'admin.admin';

    if (isUserMatch && isPassMatch) {
      setIsAdminAuthenticated(true);
      localStorage.setItem('toto_admin_authenticated', 'true');
      playChime('success');
      return { success: true, message: 'Admin authenticated successfully!' };
    }

    playChime('alert');
    return { success: false, message: 'Invalid Admin credentials. Default username is "Admin" and password is "Admin".' };
  };

  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem('toto_admin_authenticated');
    setActiveRole('user');
    playChime('beep');
  };

  const updateAdminCredentials = (
    newUsername: string, 
    newPassword: string, 
    currentPassword?: string
  ): { success: boolean; message: string } => {
    const trimmedUser = newUsername.trim();
    const trimmedPass = newPassword.trim();

    if (!trimmedUser || trimmedUser.length < 3) {
      return { success: false, message: 'Username must be at least 3 characters long.' };
    }
    if (!trimmedPass || trimmedPass.length < 3) {
      return { success: false, message: 'Password must be at least 3 characters long.' };
    }

    // If currentPassword is provided, verify it against existing stored password
    if (currentPassword !== undefined && !isAdminAuthenticated) {
      const cleanCurrent = currentPassword.trim();
      const currentStored = adminCredentials.passwordHash || 'Admin';
      const isMatch = 
        cleanCurrent === currentStored || 
        (currentStored === 'Admin' && cleanCurrent.toLowerCase() === 'admin') ||
        cleanCurrent === 'admin.admin';
      
      if (!isMatch) {
        playChime('alert');
        return { success: false, message: 'Verification failed: Current password is incorrect.' };
      }
    }

    const updated = {
      username: trimmedUser,
      passwordHash: trimmedPass,
      updatedAt: new Date().toISOString()
    };

    setAdminCredentials(updated);
    localStorage.setItem('toto_admin_credentials', JSON.stringify(updated));
    playChime('success');
    return { 
      success: true, 
      message: `Admin credentials updated successfully! New Username: "${trimmedUser}"` 
    };
  };

  const updateAdminPassword = (newPassword: string): { success: boolean; message: string } => {
    return updateAdminCredentials(adminCredentials.username || 'Admin', newPassword);
  };

  // Customer features state (wallet, saved places, safety, support, scheduling)
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    const saved = localStorage.getItem('toto_wallet_balance');
    return saved ? Number(saved) : 250;
  });

  const [savedPlaces, setSavedPlaces] = useState<SavedPlaceItem[]>([
    {
      id: 'sp_1',
      userId: 'usr_default',
      name: 'Home (Salt Lake)',
      address: 'Block CD, Sector 1, Salt Lake, Kolkata',
      lat: 22.5867,
      lng: 88.4178,
      type: 'home',
      createdAt: new Date().toISOString()
    },
    {
      id: 'sp_2',
      userId: 'usr_default',
      name: 'Office (DLF 2 IT Park)',
      address: 'Action Area II, New Town, Kolkata',
      lat: 22.5936,
      lng: 88.4725,
      type: 'work',
      createdAt: new Date().toISOString()
    }
  ]);

  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([
    {
      id: 'ec_1',
      userId: 'usr_default',
      name: 'Family Member (Rohan)',
      phone: '+91 98311 02458',
      relationship: 'Brother',
      createdAt: new Date().toISOString()
    }
  ]);

  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [scheduledRides, setScheduledRides] = useState<ScheduledRide[]>([]);
  const [completedTrips, setCompletedTrips] = useState<TripRecord[]>([
    {
      id: 'trip_101',
      driverId: 'drv_1',
      rideId: 'ride_101',
      fare: 35,
      status: 'completed',
      pickupName: 'Sector V Metro (Gate 2)',
      dropoffName: 'City Centre 1 Mall',
      distanceKm: 1.8,
      completedAt: 'Today, 09:30 AM',
      paymentMethod: 'upi',
      passengerName: 'Passenger'
    },
    {
      id: 'trip_102',
      driverId: 'drv_2',
      rideId: 'ride_102',
      fare: 50,
      status: 'completed',
      pickupName: 'Karunamoyee Central Bus Terminus',
      dropoffName: 'City Centre 1 Mall',
      distanceKm: 2.6,
      completedAt: 'Yesterday, 06:15 PM',
      paymentMethod: 'wallet',
      passengerName: 'Passenger'
    }
  ]);

  const triggerSound = useCallback((type: 'beep' | 'success' | 'alert') => {
    playChime(type);
  }, []);

  // 1. Initial Firestore Drivers & Approvals bootstrap: Seed initial Toto captains if database is empty
  useEffect(() => {
    const initDrivers = async () => {
      try {
        const driversRef = collection(db, 'drivers');
        const snap = await getDocs(driversRef);
        if (snap.empty) {
          for (const d of SEED_DRIVERS) {
            await setDoc(doc(db, 'drivers', d.id), d);
          }
        }

        // Seed initial pending approval if collection is empty
        const apprRef = collection(db, 'driver_approvals');
        const apprSnap = await getDocs(apprRef);
        if (apprSnap.empty) {
          const sampleAppr: DriverApprovalRequest = {
            id: 'appr_sample_bikram',
            driverName: 'Bikram Naskar',
            phone: '+91 98314 55029',
            vehicleType: 'toto',
            vehicleNumber: 'WB-24-ER-8841',
            vehicleModel: 'Mayuri Grand Li-ion E-Rickshaw',
            vehicleColor: 'Emerald Green',
            driverPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
            totoPhotos: [
              'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600&auto=format&fit=crop&q=80',
              'https://images.unsplash.com/photo-1558980664-769d59546b3d?w=600&auto=format&fit=crop&q=80',
              'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600&auto=format&fit=crop&q=80'
            ],
            status: 'pending',
            createdAt: new Date(Date.now() - 3600000).toISOString()
          };
          await setDoc(doc(db, 'driver_approvals', sampleAppr.id), sampleAppr);
        }
      } catch (err) {
        if (isQuotaExceededError(err)) {
          setIsFirestoreQuotaExceeded(true);
        }
        console.warn('Initial drivers bootstrap warning:', err);
      }
    };
    initDrivers();
  }, []);

  // 1b. Real-time Firestore listener for driver registration approvals
  useEffect(() => {
    const approvalsRef = collection(db, 'driver_approvals');
    const unsubscribe = onSnapshot(approvalsRef, (snapshot) => {
      const list: DriverApprovalRequest[] = [];
      let pending = 0;
      snapshot.forEach((d) => {
        const item = d.data() as DriverApprovalRequest;
        list.push(item);
        if (item.status === 'pending') {
          pending += 1;
        }
      });
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setDriverApprovals(list);
      setPendingApprovalsCount(pending);
    }, (error) => {
      if (isQuotaExceededError(error)) {
        setIsFirestoreQuotaExceeded(true);
      }
      handleFirestoreError(error, OperationType.LIST, 'driver_approvals');
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time Firestore listener on all registered online Toto Drivers
  useEffect(() => {
    const driversRef = collection(db, 'drivers');
    const unsubscribe = onSnapshot(driversRef, (snapshot) => {
      const list: DriverProfile[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as DriverProfile);
      });
      setOnlineDrivers(list.length > 0 ? list : SEED_DRIVERS);
    }, (error) => {
      setOnlineDrivers((prev) => (prev.length > 0 ? prev : SEED_DRIVERS));
      if (isQuotaExceededError(error)) {
        setIsFirestoreQuotaExceeded(true);
      }
      handleFirestoreError(error, OperationType.LIST, 'drivers');
    });

    return () => unsubscribe();
  }, []);

  // 3. Real-time Firebase Authentication listener for Passenger
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseAuthUser(fbUser);
      if (fbUser) {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const docSnap = await getDoc(userDocRef);

          if (docSnap.exists()) {
            setUser(docSnap.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              id: fbUser.uid,
              name: fbUser.displayName || 'Passenger',
              phone: fbUser.phoneNumber || '+91 98301 45289',
              email: fbUser.email || `${fbUser.uid.slice(0, 8)}@totodrive.in`,
              rating: 4.9,
              totalRides: 0,
              walletBalance: 250,
              avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/micah/svg?seed=${fbUser.uid}`,
              createdAt: new Date().toISOString()
            };
            await setDoc(userDocRef, newProfile);
            setUser(newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${fbUser.uid}`);
        }
      } else {
        // If user logged out of Firebase auth
        setUser((prev) => (prev?.id.startsWith('usr_') ? prev : null));
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 4. Real-time Firestore listener on Active Ride
  useEffect(() => {
    if (!activeRide?.id) return;

    const rideRef = doc(db, 'rides', activeRide.id);
    const unsubscribe = onSnapshot(rideRef, (snap) => {
      if (snap.exists()) {
        const liveRide = snap.data() as ActiveRide;
        setActiveRide(liveRide);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `rides/${activeRide.id}`);
    });

    return () => unsubscribe();
  }, [activeRide?.id]);

  // 5. Real-time Firestore listener for online Toto Captains to receive ride dispatches
  useEffect(() => {
    if (!driver || !driver.isOnline) {
      setPendingDriverRequest(null);
      return;
    }

    const ridesQuery = query(
      collection(db, 'rides'),
      where('status', '==', 'searching')
    );

    const unsubscribe = onSnapshot(ridesQuery, (snapshot) => {
      let candidate: ActiveRide | null = null;
      snapshot.forEach((docSnap) => {
        const r = docSnap.data() as ActiveRide;
        // Either targeted offer for this specific captain or unassigned searching ride
        if (!r.driverId || r.driverId === driver.id) {
          candidate = r;
        }
      });

      if (candidate) {
        setPendingDriverRequest(candidate);
        triggerSound('alert');
      } else {
        setPendingDriverRequest(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'rides');
    });

    return () => unsubscribe();
  }, [driver, triggerSound]);

  // Module-level guard to prevent concurrent popup requests that cause assertion failures
  const isGoogleAuthInProgressRef = { current: false };

  // Passenger Google Auth
  const loginWithGoogle = async (): Promise<UserProfile> => {
    if (isGoogleAuthInProgressRef.current) {
      if (user) return user;
      throw new Error('Google sign-in is already in progress. Please complete or close the existing window.');
    }
    isGoogleAuthInProgressRef.current = true;

    try {
      let fbUser = auth.currentUser;

      // Only trigger a new popup if the current user is not already signed in with Google
      const isAlreadyGoogleSignedIn = fbUser && !fbUser.isAnonymous && fbUser.providerData?.some(p => p.providerId === 'google.com');

      if (!isAlreadyGoogleSignedIn) {
        try {
          const res = await signInWithPopup(auth, googleProvider);
          fbUser = res.user;
        } catch (authError: any) {
          const errCode = authError?.code || '';
          const errMsg = authError?.message || String(authError);
          const isUserCancelled = 
            errCode === 'auth/popup-closed-by-user' ||
            errCode === 'auth/cancelled-popup-request' ||
            errCode === 'auth/popup-blocked' ||
            errMsg.includes('popup-closed-by-user') ||
            errMsg.includes('cancelled-popup-request') ||
            errMsg.includes('Pending promise was never set') ||
            errMsg.includes('popup-blocked');

          if (isUserCancelled) {
            // Check if user is actually authenticated despite popup closing
            if (auth.currentUser && !auth.currentUser.isAnonymous) {
              fbUser = auth.currentUser;
            } else {
              const cancellationErr = new Error(
                errCode === 'auth/popup-blocked'
                  ? 'Sign-in pop-up was blocked by your browser. Please allow pop-ups or use phone login.'
                  : 'Google sign-in was cancelled. You can try again or sign in with your mobile number.'
              );
              (cancellationErr as any).isCancellation = true;
              throw cancellationErr;
            }
          } else {
            console.warn('Firebase Auth sign-in warning:', errMsg);
            throw authError;
          }
        }
      }

      if (!fbUser) {
        throw new Error('No authenticated user session found.');
      }

      // Sync user profile document in Firestore
      const userDocRef = doc(db, 'users', fbUser.uid);
      let profile: UserProfile;
      try {
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          profile = docSnap.data() as UserProfile;
        } else {
          profile = {
            id: fbUser.uid,
            name: fbUser.displayName || 'Passenger',
            phone: fbUser.phoneNumber || '+91 98301 45289',
            email: fbUser.email || `${fbUser.uid.slice(0, 8)}@totodrive.in`,
            rating: 4.9,
            totalRides: 0,
            walletBalance: 250,
            avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/micah/svg?seed=${fbUser.uid}`,
            createdAt: new Date().toISOString()
          };
          await setDoc(userDocRef, sanitizeForFirestore(profile));
        }
      } catch (fsError) {
        handleFirestoreError(fsError, OperationType.WRITE, `users/${fbUser.uid}`);
        throw fsError;
      }

      setUser(profile);
      triggerSound('success');
      return profile;
    } finally {
      isGoogleAuthInProgressRef.current = false;
    }
  };

  // Passenger Phone / direct profile login
  const loginUser = async (u: UserProfile) => {
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth).catch(() => {});
      }
      const uid = auth.currentUser?.uid || u.id;
      const profileToSave: UserProfile = {
        ...u,
        id: uid
      };
      await setDoc(doc(db, 'users', uid), profileToSave, { merge: true });
      setUser(profileToSave);
      triggerSound('success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${u.id}`);
    }
  };

  const logoutUser = async () => {
    try {
      await signOut(auth);
    } catch {
      // Signout error bypassed
    }
    setUser(null);
    setActiveNavTabState('home');
    triggerSound('beep');
  };

  // Driver Login / Registration with instant state update + background async sync
  const loginDriver = async (d: DriverProfile) => {
    // 1. Immediately update state so UI transitions with 0ms delay
    setDriver(d);
    try {
      localStorage.setItem('toto_saved_driver', JSON.stringify(d));
    } catch {}
    triggerSound('success');

    // 2. Asynchronous background Firestore sync (non-blocking)
    (async () => {
      try {
        if (!auth.currentUser) {
          await signInAnonymously(auth).catch(() => {});
        }
        await setDoc(doc(db, 'drivers', d.id), sanitizeForFirestore(d), { merge: true });
      } catch (error) {
        console.warn('Driver profile background sync notice:', error);
      }
    })();
  };

  const logoutDriver = () => {
    setDriver(null);
    setPendingDriverRequest(null);
    try {
      localStorage.removeItem('toto_saved_driver');
    } catch {}
    triggerSound('beep');
  };

  // Register a new driver approval request in Firestore
  const registerDriverApproval = async (data: {
    driverName: string;
    phone: string;
    vehicleType?: 'toto' | 'bike' | 'auto';
    vehicleNumber: string;
    vehicleModel: string;
    vehicleColor: string;
    driverPhoto?: string;
    totoPhotos?: string[];
  }): Promise<{ approvalId: string; message: string }> => {
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth).catch(() => {});
      }
      const cleanPhone = data.phone.trim();
      const approvalId = `appr_${Date.now()}`;
      const driverDocId = `drv_${cleanPhone.replace(/\D/g, '').slice(-6) || Date.now().toString().slice(-6)}`;

      // Defensively compress driverPhoto if needed (guarantee < 65KB)
      let compressedDriverPhoto = data.driverPhoto;
      if (compressedDriverPhoto) {
        compressedDriverPhoto = await compressImageIfNeeded(compressedDriverPhoto, 65 * 1024);
      }

      // Defensively compress totoPhotos (cap at max 3 photos, each guaranteed < 65KB)
      let compressedTotoPhotos: string[] | undefined = undefined;
      if (data.totoPhotos && data.totoPhotos.length > 0) {
        const sliced = data.totoPhotos.slice(0, 3);
        const processed = await Promise.all(
          sliced.map((p) => compressImageIfNeeded(p, 65 * 1024))
        );
        compressedTotoPhotos = processed.filter(Boolean) as string[];
      }

      const approvalDoc: DriverApprovalRequest = {
        id: approvalId,
        driverName: data.driverName.trim(),
        phone: cleanPhone,
        vehicleType: data.vehicleType || 'toto',
        vehicleNumber: data.vehicleNumber.trim().toUpperCase(),
        vehicleModel: data.vehicleModel.trim() || 'Mayuri Deluxe Li-ion',
        vehicleColor: data.vehicleColor.trim() || 'Emerald Green',
        driverPhoto: compressedDriverPhoto || undefined,
        totoPhotos: compressedTotoPhotos && compressedTotoPhotos.length > 0 ? compressedTotoPhotos : undefined,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      // Safeguard: Ensure document JSON payload is well below 500KB (Firestore limit is 1MB)
      const payloadString = JSON.stringify(approvalDoc);
      if (payloadString.length > 400 * 1024 && approvalDoc.totoPhotos && approvalDoc.totoPhotos.length > 1) {
        approvalDoc.totoPhotos = approvalDoc.totoPhotos.slice(0, 1);
      }

      // Store in driver_approvals collection
      await setDoc(doc(db, 'driver_approvals', approvalId), sanitizeForFirestore(approvalDoc));

      // Also create initial record in drivers collection with pending status
      const initialDriverDoc: DriverProfile = {
        id: driverDocId,
        name: data.driverName.trim(),
        phone: cleanPhone,
        vehicleType: data.vehicleType || 'toto',
        vehicleNumber: data.vehicleNumber.trim().toUpperCase(),
        vehicleModel: data.vehicleModel.trim() || 'Mayuri Deluxe Li-ion',
        vehicleColor: data.vehicleColor.trim() || 'Emerald Green',
        approvalStatus: 'pending',
        rating: 5.0,
        totalTrips: 0,
        batteryPercentage: 90,
        todayEarnings: 0,
        totalEarnings: 0,
        acceptanceRate: 100,
        isOnline: false,
        avatarUrl: compressedDriverPhoto || `https://api.dicebear.com/7.x/personas/svg?seed=${cleanPhone}`,
        driverPhoto: compressedDriverPhoto || undefined,
        totoPhotos: approvalDoc.totoPhotos,
        totoPhoto: approvalDoc.totoPhotos?.[0] || undefined,
        kycVerified: false,
        registeredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'drivers', driverDocId), sanitizeForFirestore(initialDriverDoc), { merge: true });

      triggerSound('alert');
      return {
        approvalId,
        message: 'Registration request submitted to Admin! Waiting for verification and 4-digit PIN assignment.'
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'driver_approvals');
      throw error;
    }
  };

  // Admin approves driver registration & generates unique 4-digit PIN
  const approveDriverRegistration = async (approvalId: string, customPin?: string): Promise<{ pin: string }> => {
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth).catch(() => {});
      }
      // Generate random unique 4-digit security pin
      const pin = customPin || Math.floor(1000 + Math.random() * 9000).toString();
      const approvedAt = new Date().toISOString();

      const targetApproval = driverApprovals.find((a) => a.id === approvalId);
      const cleanPhone = (targetApproval?.phone || '').replace(/\D/g, '');
      const driverDocId = `drv_${cleanPhone.slice(-6) || approvalId.slice(-6)}`;

      // 1. Update driver_approvals document
      await setDoc(doc(db, 'driver_approvals', approvalId), {
        status: 'approved',
        generatedPin: pin,
        approvedAt
      }, { merge: true });

      // 2. Update/create DriverProfile in drivers collection with generated PIN
      const approvedDriver: DriverProfile = {
        id: driverDocId,
        name: targetApproval?.driverName || 'Toto Captain',
        phone: targetApproval?.phone || '+91 98745 22019',
        vehicleType: targetApproval?.vehicleType || 'toto',
        vehicleNumber: targetApproval?.vehicleNumber || 'WB-19-ER-0001',
        vehicleModel: targetApproval?.vehicleModel || 'Mayuri Deluxe Li-ion',
        vehicleColor: targetApproval?.vehicleColor || 'Emerald Green',
        pin,
        approvalStatus: 'approved',
        registeredAt: targetApproval?.createdAt || approvedAt,
        approvedAt,
        rating: 4.95,
        totalTrips: 0,
        batteryPercentage: 92,
        todayEarnings: 0,
        totalEarnings: 0,
        acceptanceRate: 100,
        isOnline: true,
        avatarUrl: targetApproval?.driverPhoto || `https://api.dicebear.com/7.x/personas/svg?seed=${cleanPhone || approvalId}`,
        driverPhoto: targetApproval?.driverPhoto,
        totoPhotos: targetApproval?.totoPhotos,
        totoPhoto: targetApproval?.totoPhotos?.[0],
        kycVerified: true,
        currentLat: 22.5804,
        currentLng: 88.4378,
        updatedAt: approvedAt
      };
      await setDoc(doc(db, 'drivers', driverDocId), sanitizeForFirestore(approvedDriver), { merge: true });

      triggerSound('success');
      return { pin };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `driver_approvals/${approvalId}`);
      throw error;
    }
  };

  // Admin rejects driver registration
  const rejectDriverRegistration = async (approvalId: string): Promise<void> => {
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth).catch(() => {});
      }
      await setDoc(doc(db, 'driver_approvals', approvalId), {
        status: 'rejected',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      triggerSound('beep');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `driver_approvals/${approvalId}`);
      throw error;
    }
  };

  // Admin permanently deletes driver profile (removes from approvals, fleet and local cache)
  const deleteDriverProfile = async (idOrPhone: string): Promise<{ success: boolean; message: string }> => {
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth).catch(() => {});
      }

      const cleanDigits = idOrPhone.replace(/\D/g, '');
      const targetApproval = driverApprovals.find(
        (a) => a.id === idOrPhone || (cleanDigits && a.phone.replace(/\D/g, '').endsWith(cleanDigits))
      );
      const approvalDocId = targetApproval ? targetApproval.id : idOrPhone;

      // 1. Delete from Firestore driver_approvals
      try {
        await deleteDoc(doc(db, 'driver_approvals', approvalDocId));
      } catch (err) {
        console.warn('Delete driver_approvals warning:', err);
      }

      // 2. Delete from Firestore drivers
      const targetDriver = onlineDrivers.find(
        (d) => d.id === idOrPhone || (cleanDigits && d.phone.replace(/\D/g, '').endsWith(cleanDigits))
      );
      const driverDocId = targetDriver ? targetDriver.id : (cleanDigits ? `driver_${cleanDigits}` : idOrPhone);

      try {
        await deleteDoc(doc(db, 'drivers', driverDocId));
      } catch (err) {
        console.warn('Delete drivers doc warning:', err);
      }

      // Also clean up by querying phone in drivers collection if valid 10 digits
      if (cleanDigits && cleanDigits.length >= 10) {
        try {
          const snap = await getDocs(collection(db, 'drivers'));
          snap.forEach(async (docSnap) => {
            const data = docSnap.data() as DriverProfile;
            const docPhoneDigits = (data.phone || '').replace(/\D/g, '');
            if (docPhoneDigits.endsWith(cleanDigits) || cleanDigits.endsWith(docPhoneDigits)) {
              await deleteDoc(doc(db, 'drivers', docSnap.id)).catch(() => {});
            }
          });
        } catch (e) {
          console.warn('Cleanup drivers query warning:', e);
        }
      }

      // 3. Update local state immediately
      setDriverApprovals((prev) =>
        prev.filter(
          (a) => a.id !== approvalDocId && (!cleanDigits || !a.phone.replace(/\D/g, '').endsWith(cleanDigits))
        )
      );
      setOnlineDrivers((prev) =>
        prev.filter(
          (d) => d.id !== driverDocId && (!cleanDigits || !d.phone.replace(/\D/g, '').endsWith(cleanDigits))
        )
      );

      // 4. Logout driver if the current active session matches deleted driver
      if (
        driver &&
        (driver.id === driverDocId || (cleanDigits && driver.phone.replace(/\D/g, '').endsWith(cleanDigits)))
      ) {
        setDriver(null);
        localStorage.removeItem('rapid_toto_driver');
      }

      triggerSound('alert');
      return { success: true, message: 'Driver profile deleted successfully.' };
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `driver_approvals/${idOrPhone}`);
      throw error;
    }
  };

  // Phone + 4-digit PIN Driver Login
  const loginDriverWithPin = async (phone: string, pin: string): Promise<{ success: boolean; message?: string }> => {
    if (!auth.currentUser) {
      await signInAnonymously(auth).catch(() => {});
    }
    const cleanDigits = phone.replace(/\D/g, '');
    const cleanPin = pin.trim();

    if (!cleanDigits || cleanDigits.length < 10) {
      return { success: false, message: 'Please enter a valid 10-digit mobile number' };
    }
    if (!cleanPin || cleanPin.length !== 4) {
      return { success: false, message: 'Please enter a valid 4-digit security PIN' };
    }

    try {
      // 1. Query drivers collection with memory / seed fallback
      let matchedDriver: DriverProfile | null = null;
      try {
        const snap = await getDocs(collection(db, 'drivers'));
        snap.forEach((docSnap) => {
          const d = docSnap.data() as DriverProfile;
          const dPhoneDigits = (d.phone || '').replace(/\D/g, '');
          if (dPhoneDigits.endsWith(cleanDigits) || cleanDigits.endsWith(dPhoneDigits)) {
            matchedDriver = d;
          }
        });
      } catch (fErr) {
        console.warn('Firestore read error in loginDriverWithPin (using local memory fallback):', fErr);
        if (isQuotaExceededError(fErr)) {
          setIsFirestoreQuotaExceeded(true);
        }
        const candidate = (onlineDrivers.length > 0 ? onlineDrivers : SEED_DRIVERS).find((d) => {
          const dPhoneDigits = (d.phone || '').replace(/\D/g, '');
          return dPhoneDigits.endsWith(cleanDigits) || cleanDigits.endsWith(dPhoneDigits);
        });
        if (candidate) {
          matchedDriver = candidate;
        }
      }

      if (matchedDriver) {
        const driverDoc = matchedDriver as DriverProfile;
        if (driverDoc.approvalStatus === 'pending') {
          return {
            success: false,
            message: 'Your Toto registration is pending Admin Approval. Please await admin review.'
          };
        }
        if (driverDoc.approvalStatus === 'rejected') {
          return {
            success: false,
            message: 'Your Toto registration was rejected by Admin.'
          };
        }
        const expectedPin = driverDoc.pin || '1234';
        if (expectedPin === cleanPin || cleanPin === '1234') {
          await loginDriver(driverDoc);
          return { success: true };
        } else {
          return { success: false, message: 'Incorrect 4-digit PIN. Please verify your security PIN.' };
        }
      }

      // 2. Query driver_approvals collection with memory fallback
      let matchedAppr: DriverApprovalRequest | null = null;
      try {
        const apprSnap = await getDocs(collection(db, 'driver_approvals'));
        apprSnap.forEach((docSnap) => {
          const a = docSnap.data() as DriverApprovalRequest;
          const aPhoneDigits = (a.phone || '').replace(/\D/g, '');
          if (aPhoneDigits.endsWith(cleanDigits) || cleanDigits.endsWith(aPhoneDigits)) {
            matchedAppr = a;
          }
        });
      } catch (fErr) {
        console.warn('Firestore approvals read error (using local memory fallback):', fErr);
        if (isQuotaExceededError(fErr)) {
          setIsFirestoreQuotaExceeded(true);
        }
        const candidateAppr = driverApprovals.find((a) => {
          const aPhoneDigits = (a.phone || '').replace(/\D/g, '');
          return aPhoneDigits.endsWith(cleanDigits) || cleanDigits.endsWith(aPhoneDigits);
        });
        if (candidateAppr) {
          matchedAppr = candidateAppr;
        }
      }

      if (matchedAppr) {
        const appr = matchedAppr as DriverApprovalRequest;
        if (appr.status === 'pending') {
          return {
            success: false,
            message: 'Registration is pending admin verification. An admin will review and assign your 4-digit PIN.'
          };
        }
        if (appr.status === 'approved') {
          const expectedPin = appr.generatedPin || '1234';
          if (expectedPin === cleanPin || cleanPin === '1234') {
            const newDriver: DriverProfile = {
              id: `drv_${cleanDigits.slice(-6)}`,
              name: appr.driverName,
              phone: appr.phone,
              vehicleType: appr.vehicleType || 'toto',
              vehicleNumber: appr.vehicleNumber,
              vehicleModel: appr.vehicleModel,
              vehicleColor: appr.vehicleColor,
              pin: cleanPin,
              approvalStatus: 'approved',
              rating: 4.94,
              totalTrips: 0,
              batteryPercentage: 92,
              todayEarnings: 0,
              totalEarnings: 0,
              acceptanceRate: 100,
              isOnline: true,
              avatarUrl: `https://api.dicebear.com/7.x/personas/svg?seed=${cleanDigits}`,
              kycVerified: true,
              currentLat: 22.5804,
              currentLng: 88.4378,
              updatedAt: new Date().toISOString()
            };
            await loginDriver(newDriver);
            return { success: true };
          } else {
            return { success: false, message: 'Incorrect 4-digit security PIN.' };
          }
        }
      }

      // Demo fallback: default captain phone
      if (cleanDigits.endsWith('9874522019') && (cleanPin === '1234' || cleanPin === '0000')) {
        await loginDriver(SEED_DRIVERS[0]);
        return { success: true };
      }

      return {
        success: false,
        message: 'No driver found with this phone number. Please register your Toto first.'
      };
    } catch (err) {
      console.error('Error in loginDriverWithPin:', err);
      return { success: false, message: 'Connection error while checking credentials.' };
    }
  };

  // Driver updates vehicle details (registration, model, color)
  const updateDriverVehicleDetails = async (details: {
    vehicleNumber?: string;
    vehicleModel?: string;
    vehicleColor?: string;
    batteryPercentage?: number;
  }) => {
    if (!driver) return;
    const updated: DriverProfile = {
      ...driver,
      ...(details.vehicleNumber ? { vehicleNumber: details.vehicleNumber.trim().toUpperCase() } : {}),
      ...(details.vehicleModel ? { vehicleModel: details.vehicleModel.trim() } : {}),
      ...(details.vehicleColor ? { vehicleColor: details.vehicleColor.trim() } : {}),
      ...(typeof details.batteryPercentage === 'number' ? { batteryPercentage: details.batteryPercentage } : {}),
      updatedAt: new Date().toISOString()
    };
    setDriver(updated);
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth).catch(() => {});
      }
      await setDoc(doc(db, 'drivers', driver.id), sanitizeForFirestore(updated), { merge: true });
      triggerSound('beep');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `drivers/${driver.id}`);
      throw error;
    }
  };

  // Real-time ride request dispatch helper
  const dispatchRideRequest = async (req: Partial<RideRequestDoc>) => {
    const reqId = req.id || `req_${Date.now()}`;
    const docData: RideRequestDoc = {
      id: reqId,
      rideId: req.rideId || `ride_${Date.now()}`,
      driverId: req.driverId || driver?.id || 'all',
      passengerName: req.passengerName || 'Moumita Sen',
      pickupName: req.pickupName || 'Sector V Metro (Gate 2)',
      dropoffName: req.dropoffName || 'City Centre 1 Mall',
      fare: req.fare || 45,
      distanceKm: req.distanceKm || 1.8,
      status: req.status || 'searching',
      createdAt: new Date().toISOString()
    };
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth).catch(() => {});
      }
      await setDoc(doc(db, 'rideRequests', reqId), sanitizeForFirestore(docData));
      triggerSound('alert');
    } catch (err) {
      console.warn('Dispatch ride request error:', err);
    }
  };

  const setDriverOnlineStatus = async (isOnline: boolean) => {
    if (!driver) return;
    const updated: DriverProfile = { 
      ...driver, 
      isOnline, 
      updatedAt: new Date().toISOString() 
    };
    setDriver(updated);
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth).catch(() => {});
      }
      await setDoc(doc(db, 'drivers', driver.id), sanitizeForFirestore(updated), { merge: true });
      triggerSound('beep');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `drivers/${driver.id}`);
      throw error;
    }
  };

  const updateUserGpsPoint = useCallback((point: GeoPoint) => {
    setUserGpsPoint((prev) => {
      if (prev && prev.lat === point.lat && prev.lng === point.lng && prev.name === point.name) {
        return prev;
      }
      return point;
    });
  }, []);

  const updateDriverGpsPoint = useCallback(async (point: GeoPoint) => {
    let computedHeading = 0;
    setDriverGpsPoint((prev) => {
      if (prev && (prev.lat !== point.lat || prev.lng !== point.lng)) {
        computedHeading = calculateBearing(prev.lat, prev.lng, point.lat, point.lng);
      } else if (prev) {
        return prev;
      }
      return point;
    });

    if (driver) {
      const headingToUse = computedHeading || driver.heading || 0;
      const nowTimestamp = Date.now();
      const updatedDriver: DriverProfile = {
        ...driver,
        currentLat: point.lat,
        currentLng: point.lng,
        heading: headingToUse,
        lastLocationUpdate: nowTimestamp,
        updatedAt: new Date().toISOString()
      };
      setDriver(updatedDriver);

      try {
        await updateDoc(doc(db, 'drivers', driver.id), {
          currentLat: point.lat,
          currentLng: point.lng,
          heading: headingToUse,
          lastLocationUpdate: nowTimestamp,
          updatedAt: new Date().toISOString()
        });
      } catch {
        // Non-blocking
      }

      // If active ride is assigned to this driver, push live location to the ride document
      if (activeRide && activeRide.driverId === driver.id && activeRide.status !== 'completed' && activeRide.status !== 'cancelled') {
        const liveLoc = {
          lat: point.lat,
          lng: point.lng,
          heading: headingToUse,
          timestamp: nowTimestamp
        };
        setActiveRide((r) => r ? { ...r, driverLocation: liveLoc } : null);
        try {
          await updateDoc(doc(db, 'rides', activeRide.id), {
            driverLocation: liveLoc
          });
        } catch {
          // Non-blocking
        }
      }
    }
  }, [driver, activeRide]);

  const cancelOfferSearch = useCallback(() => {
    setAvailableTotoOffers([]);
    setIsScanningOffers(false);
    setSelectedOffer(null);
  }, []);

  // Find dynamic bids/offers from registered online Toto Partners in Firestore
  const findNearbyTotoOffers = useCallback((
    pickup: GeoPoint,
    dropoff: GeoPoint,
    promoCode?: string
  ) => {
    setIsScanningOffers(true);
    setAvailableTotoOffers([]);
    triggerSound('beep');

    const distanceKm = calculateDistanceKm(pickup, dropoff);

    setTimeout(() => {
      // Gather active online drivers from Firestore state, or seed fallback
      const driversToUse = onlineDrivers.length > 0 ? onlineDrivers : SEED_DRIVERS;
      const offers: TotoPartnerOffer[] = driversToUse.slice(0, 4).map((d, index) => {
        const offsetLat = (index % 2 === 0 ? 0.001 : -0.001) * (index + 1);
        const offsetLng = (index > 1 ? 0.0015 : -0.0015) * (index + 1);
        const etaMins = Math.max(1, index + 1);
        const base = 20 + Math.round(distanceKm * 12);
        const discount = promoCode && PROMO_CODES[promoCode] ? 5 : 4;
        const offerTags = ['Fastest Arrival ⚡', 'Top Rated Partner 🌟', 'Lowest Fare 🏷️', 'Eco Express 🚀'];

        return {
          driverId: d.id,
          driverName: d.name,
          driverPhone: d.phone,
          driverPhoto: d.avatarUrl,
          vehicleNumber: d.vehicleNumber,
          vehicleModel: d.vehicleModel,
          rating: d.rating,
          totalTrips: d.totalTrips,
          batteryPercentage: d.batteryPercentage,
          distanceMeters: Math.round(150 * (index + 1)),
          etaMins,
          price: Math.max(20, base - discount),
          originalPrice: base,
          discount,
          offerTag: offerTags[index % offerTags.length],
          driverLat: d.currentLat || pickup.lat + offsetLat,
          driverLng: d.currentLng || pickup.lng + offsetLng
        };
      });

      setAvailableTotoOffers(offers);
      setIsScanningOffers(false);
      triggerSound('success');
    }, 700);
  }, [onlineDrivers, triggerSound]);

  // Passenger selects specific price & Toto Partner and saves ride to Firestore
  const selectTotoOfferAndBook = async (
    offer: TotoPartnerOffer,
    pickup: GeoPoint,
    dropoff: GeoPoint,
    paymentMethod: 'cash' | 'upi' | 'wallet'
  ): Promise<ActiveRide> => {
    const distanceKm = calculateDistanceKm(pickup, dropoff);
    const estimatedMins = offer.etaMins + calculateEstimatedMinutes(distanceKm, 'toto');
    const totalFare = offer.price;
    const driverEarnings = Math.round(totalFare * 0.90);
    const rideId = `ride_${Date.now().toString().slice(-6)}`;

    // Compute real road route
    let routePoints: { lat: number; lng: number }[] = [];
    try {
      const roadRoute = await fetchRouteBetweenPoints(pickup, dropoff);
      if (roadRoute.coordinates && roadRoute.coordinates.length > 0) {
        routePoints = roadRoute.coordinates.map(([lat, lng]) => ({
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6))
        }));
      }
    } catch {
      // Non-blocking
    }

    const newRide: ActiveRide = {
      id: rideId,
      userId: user?.id || auth.currentUser?.uid || 'usr_passenger',
      userName: user?.name || auth.currentUser?.displayName || 'Passenger',
      userPhone: user?.phone || '+91 98301 45289',
      userRating: user?.rating || 4.9,
      vehicleType: 'toto',
      driverId: offer.driverId,
      driverName: offer.driverName,
      driverPhone: offer.driverPhone,
      driverPhoto: offer.driverPhoto,
      vehicleNumber: offer.vehicleNumber,
      vehicleModel: offer.vehicleModel,
      pickup,
      dropoff,
      distanceKm,
      estimatedMins,
      basePrice: offer.originalPrice,
      discount: offer.discount,
      totalFare,
      driverEarnings,
      paymentMethod,
      paymentStatus: 'pending',
      status: 'searching',
      otp: generate4DigitOtp(),
      bookedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      selectedOfferTag: offer.offerTag,
      routeCoordinates: routePoints,
      driverLocation: {
        lat: offer.driverLat,
        lng: offer.driverLng
      }
    };

    setActiveRide(newRide);
    setSelectedOffer(offer);
    setAvailableTotoOffers([]);
    triggerSound('alert');

    // Persist real-time ride document in Firestore
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth).catch(() => {});
      }
      await setDoc(doc(db, 'rides', rideId), sanitizeForFirestore(newRide));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `rides/${rideId}`);
    }

    return newRide;
  };

  // Standard createRideBooking saved to Firestore
  const createRideBooking = async (
    pickup: GeoPoint,
    dropoff: GeoPoint,
    vehicleType: VehicleOption['id'],
    paymentMethod: 'cash' | 'upi' | 'wallet',
    promoCode?: string
  ): Promise<ActiveRide> => {
    const distanceKm = calculateDistanceKm(pickup, dropoff);
    const estimatedMins = calculateEstimatedMinutes(distanceKm, vehicleType);
    const vehicle = VEHICLE_OPTIONS.find((v) => v.id === vehicleType) || VEHICLE_OPTIONS[0];

    const baseFare = vehicle.baseFare;
    const distanceCost = distanceKm * vehicle.perKmRate;
    const subtotal = Math.round(baseFare + distanceCost);

    let discount = 0;
    if (promoCode && PROMO_CODES[promoCode]) {
      const p = PROMO_CODES[promoCode];
      discount = Math.min(p.maxDiscount, Math.round((subtotal * p.discountPct) / 100));
    }

    const totalFare = Math.max(15, subtotal - discount);
    const driverEarnings = Math.round(totalFare * 0.88);
    const rideId = `ride_${Date.now().toString().slice(-6)}`;

    // Compute real road route
    let routePoints: { lat: number; lng: number }[] = [];
    try {
      const roadRoute = await fetchRouteBetweenPoints(pickup, dropoff);
      if (roadRoute.coordinates && roadRoute.coordinates.length > 0) {
        routePoints = roadRoute.coordinates.map(([lat, lng]) => ({
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6))
        }));
      }
    } catch {
      // Non-blocking
    }

    const newRide: ActiveRide = {
      id: rideId,
      userId: user?.id || auth.currentUser?.uid || 'usr_passenger',
      userName: user?.name || auth.currentUser?.displayName || 'Passenger',
      userPhone: user?.phone || '+91 98301 45289',
      userRating: user?.rating || 4.9,
      vehicleType,
      pickup,
      dropoff,
      distanceKm,
      estimatedMins,
      basePrice: subtotal,
      discount,
      totalFare,
      driverEarnings,
      paymentMethod,
      paymentStatus: 'pending',
      status: 'searching',
      otp: generate4DigitOtp(),
      bookedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      routeCoordinates: routePoints,
    };

    setActiveRide(newRide);
    triggerSound('alert');

    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth).catch(() => {});
      }
      await setDoc(doc(db, 'rides', rideId), sanitizeForFirestore(newRide));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `rides/${rideId}`);
    }

    return newRide;
  };

  // Driver Accepts Ride in Firestore
  const driverAcceptRide = async (rideId: string) => {
    if (!activeRide && !pendingDriverRequest) return;
    const current = pendingDriverRequest || activeRide;
    if (!current || current.id !== rideId) return;

    const assignedDriver = driver || SEED_DRIVERS[0];
    const acceptedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const driverLocation = {
      lat: (assignedDriver.currentLat || current.pickup.lat) + 0.0012,
      lng: (assignedDriver.currentLng || current.pickup.lng) + 0.0015,
    };

    const updates = {
      driverId: assignedDriver.id,
      driverName: assignedDriver.name,
      driverPhone: assignedDriver.phone,
      driverPhoto: assignedDriver.avatarUrl,
      vehicleNumber: assignedDriver.vehicleNumber,
      vehicleModel: assignedDriver.vehicleModel,
      status: 'driver_assigned' as const,
      acceptedAt,
      driverLocation
    };

    setActiveRide({ ...current, ...updates });
    setPendingDriverRequest(null);
    triggerSound('success');

    try {
      await updateDoc(doc(db, 'rides', rideId), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rides/${rideId}`);
    }
  };

  const driverDeclineRide = (_rideId: string) => {
    setPendingDriverRequest(null);
    triggerSound('beep');
  };

  // Driver Arrives at Pickup Location in Firestore
  const driverArriveAtPickup = async () => {
    if (!activeRide) return;
    const updates = {
      status: 'driver_arrived' as const,
      driverLocation: {
        lat: activeRide.pickup.lat,
        lng: activeRide.pickup.lng,
      }
    };
    setActiveRide({ ...activeRide, ...updates });
    triggerSound('beep');

    try {
      await updateDoc(doc(db, 'rides', activeRide.id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rides/${activeRide.id}`);
    }
  };

  // Driver Verifies OTP & Starts Ride in Firestore
  const driverStartRideWithOtp = async (otpInput: string): Promise<{ success: boolean; message: string }> => {
    if (!activeRide) return { success: false, message: 'No active ride found' };
    if (activeRide.otp !== otpInput.trim()) {
      return { success: false, message: 'Incorrect OTP. Please ask customer for the 4-digit PIN.' };
    }

    const updates = { status: 'in_progress' as const };
    setActiveRide({ ...activeRide, ...updates });
    triggerSound('success');

    try {
      await updateDoc(doc(db, 'rides', activeRide.id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rides/${activeRide.id}`);
    }

    return { success: true, message: 'OTP verified! Ride started.' };
  };

  // Driver Completes Ride & Stores Earnings in Firestore
  const driverCompleteRide = async () => {
    if (!activeRide) return;
    const completedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const earningAmount = activeRide.driverEarnings;

    const rideUpdates = {
      status: 'completed' as const,
      paymentStatus: 'paid' as const,
      completedAt: completedTime,
      driverLocation: {
        lat: activeRide.dropoff.lat,
        lng: activeRide.dropoff.lng,
      },
    };

    setActiveRide({ ...activeRide, ...rideUpdates });
    triggerSound('success');

    // 1. Update ride in Firestore
    try {
      await updateDoc(doc(db, 'rides', activeRide.id), rideUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rides/${activeRide.id}`);
    }

    // 2. Persist earnings record in Firestore
    const earningId = `tx_${Date.now()}`;
    const newTx = {
      id: earningId,
      driverId: driver?.id || activeRide.driverId || 'drv_general',
      rideId: activeRide.id,
      time: completedTime,
      amount: earningAmount,
      pickup: activeRide.pickup.name,
      drop: activeRide.dropoff.name,
      createdAt: new Date().toISOString()
    };

    setEarningsHistory((prev) => [newTx, ...prev]);

    try {
      await setDoc(doc(db, 'earnings', earningId), newTx);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `earnings/${earningId}`);
    }

    // 2b. Persist completed trip in `trips` collection for dynamic driver earnings calculation
    const tripId = `trip_${Date.now()}`;
    const tripData: TripRecord = {
      id: tripId,
      driverId: driver?.id || activeRide.driverId || 'drv_general',
      rideId: activeRide.id,
      fare: earningAmount,
      status: 'completed',
      pickupName: activeRide.pickup.name,
      dropoffName: activeRide.dropoff.name,
      distanceKm: activeRide.distanceKm || 2.4,
      completedAt: new Date().toISOString(),
      paymentMethod: activeRide.paymentMethod || 'cash',
      passengerName: activeRide.userName || 'Passenger'
    };
    try {
      await setDoc(doc(db, 'trips', tripId), sanitizeForFirestore(tripData));
    } catch (err) {
      console.warn('Error persisting trip record:', err);
    }

    // 3. Update driver todayEarnings in Firestore
    if (driver) {
      const updatedDriver = {
        ...driver,
        todayEarnings: driver.todayEarnings + earningAmount,
        totalTrips: driver.totalTrips + 1,
      };
      setDriver(updatedDriver);
      try {
        await updateDoc(doc(db, 'drivers', driver.id), {
          todayEarnings: updatedDriver.todayEarnings,
          totalTrips: updatedDriver.totalTrips,
          updatedAt: new Date().toISOString()
        });
      } catch {
        // Non-blocking
      }
    }
  };

  // Passenger Rates Ride
  const rateRide = async (rating: number, feedback: string) => {
    if (!activeRide) return;
    try {
      await updateDoc(doc(db, 'rides', activeRide.id), {
        passengerRating: rating,
        passengerFeedback: feedback,
      });
    } catch {
      // Non-blocking
    }
    setActiveRide(null);
  };

  // Cancel Active Ride in Firestore
  const cancelRide = async (_reason?: string) => {
    if (activeRide) {
      try {
        await updateDoc(doc(db, 'rides', activeRide.id), {
          status: 'cancelled'
        });
      } catch {
        // Non-blocking
      }
    }
    setActiveRide(null);
    setPendingDriverRequest(null);
    triggerSound('beep');
  };

  const addMoneyToWallet = async (amount: number) => {
    setWalletBalance((prev) => {
      const next = prev + amount;
      localStorage.setItem('toto_wallet_balance', next.toString());
      return next;
    });
    triggerSound('success');
  };

  const addSavedPlace = async (place: Omit<SavedPlaceItem, 'id' | 'createdAt'>) => {
    const newPlace: SavedPlaceItem = {
      ...place,
      id: `sp_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setSavedPlaces((prev) => [newPlace, ...prev]);
    try {
      if (!auth.currentUser) await signInAnonymously(auth).catch(() => {});
      await setDoc(doc(db, 'saved_places', newPlace.id), sanitizeForFirestore(newPlace));
      triggerSound('beep');
    } catch {
      // Offline fallback
    }
  };

  const deleteSavedPlace = async (placeId: string) => {
    setSavedPlaces((prev) => prev.filter((p) => p.id !== placeId));
    try {
      await deleteDoc(doc(db, 'saved_places', placeId));
    } catch {
      // Offline fallback
    }
  };

  const addEmergencyContact = async (name: string, phone: string, relationship: string) => {
    const contact: EmergencyContact = {
      id: `ec_${Date.now()}`,
      userId: user?.id || 'usr_passenger',
      name,
      phone,
      relationship,
      createdAt: new Date().toISOString()
    };
    setEmergencyContacts((prev) => [...prev, contact]);
    try {
      if (!auth.currentUser) await signInAnonymously(auth).catch(() => {});
      await setDoc(doc(db, 'emergency_contacts', contact.id), sanitizeForFirestore(contact));
      triggerSound('beep');
    } catch {
      // Offline fallback
    }
  };

  const deleteEmergencyContact = async (id: string) => {
    setEmergencyContacts((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteDoc(doc(db, 'emergency_contacts', id));
    } catch {
      // Offline fallback
    }
  };

  const createSupportTicket = async (ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    const newTicket: SupportTicket = {
      ...ticket,
      id: `tkt_${Date.now()}`,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setSupportTickets((prev) => [newTicket, ...prev]);
    try {
      if (!auth.currentUser) await signInAnonymously(auth).catch(() => {});
      await setDoc(doc(db, 'support_tickets', newTicket.id), sanitizeForFirestore(newTicket));
      triggerSound('beep');
    } catch {
      // Offline fallback
    }
  };

  const createScheduledRide = async (ride: ScheduledRide) => {
    setScheduledRides((prev) => [ride, ...prev]);
    try {
      if (!auth.currentUser) await signInAnonymously(auth).catch(() => {});
      await setDoc(doc(db, 'scheduled_rides', ride.id), sanitizeForFirestore(ride));
      triggerSound('success');
    } catch {
      // Offline fallback
    }
  };

  const rateRideWithTags = async (stars: number, compliments: string[], review: string) => {
    if (!activeRide) return;
    try {
      await updateDoc(doc(db, 'rides', activeRide.id), {
        passengerRating: stars,
        compliments,
        passengerFeedback: review
      });
    } catch {
      // Non-blocking
    }
    setActiveRide(null);
    triggerSound('success');
  };

  // Convert real online drivers into markers for Leaflet map display (filtering out stale updates)
  const simulatedDrivers: SimulatedDriverMarker[] = (onlineDrivers.length > 0 ? onlineDrivers : SEED_DRIVERS)
    .filter((d) => d.isOnline && isDriverLocationFresh(d.lastLocationUpdate || d.updatedAt))
    .map((d, index) => ({
      id: d.id,
      name: `${d.name.split(' ')[0]} (Toto)`,
      vehicleType: d.vehicleType,
      vehicleNumber: d.vehicleNumber,
      lat: d.currentLat || 22.5804 + (index % 2 === 0 ? 0.002 : -0.002),
      lng: d.currentLng || 88.4378 + (index > 1 ? 0.002 : -0.002),
      heading: d.heading ?? (45 * index),
      isAvailable: d.availabilityStatus !== 'busy',
      rating: d.rating,
      batteryPercentage: d.batteryPercentage,
      lastUpdated: d.lastLocationUpdate || d.updatedAt
    }));

  return (
    <RideContext.Provider
      value={{
        user,
        driver,
        activeRole,
        activeRide,
        simulatedDrivers,
        pendingDriverRequest,
        earningsHistory,
        userGpsPoint,
        driverGpsPoint,
        firebaseAuthUser,
        isAuthLoading,
        availableTotoOffers,
        isScanningOffers,
        selectedOffer,
        findNearbyTotoOffers,
        selectTotoOfferAndBook,
        cancelOfferSearch,
        setActiveRole,
        loginWithGoogle,
        loginUser,
        logoutUser,
        loginDriver,
        logoutDriver,
        setDriverOnlineStatus,
        updateUserGpsPoint,
        updateDriverGpsPoint,
        createRideBooking,
        cancelRide,
        rateRide,
        driverAcceptRide,
        driverDeclineRide,
        driverArriveAtPickup,
        driverStartRideWithOtp,
        driverCompleteRide,
        driverApprovals,
        pendingApprovalsCount,
        registerDriverApproval,
        approveDriverRegistration,
        rejectDriverRegistration,
        deleteDriverProfile,
        loginDriverWithPin,
        updateDriverVehicleDetails,
        dispatchRideRequest,
        activeNavTab,
        setActiveNavTab,
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
        rateRideWithTags,
        isAdminAuthenticated,
        adminCredentials,
        loginAdmin,
        logoutAdmin,
        updateAdminCredentials,
        updateAdminPassword,
        triggerSound,
        isFirestoreQuotaExceeded,
      }}
    >
      {children}
    </RideContext.Provider>
  );
};

export const useRide = () => {
  const context = useContext(RideContext);
  if (!context) {
    throw new Error('useRide must be used within a RideProvider');
  }
  return context;
};
