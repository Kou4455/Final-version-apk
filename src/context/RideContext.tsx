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
import { appDb, supabase, isSupabaseConfigured } from '../lib/supabase';
import { auth, logOutFromFirebase } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { compressImageIfNeeded } from '../utils/imageCompressor';
import { 
  upsertSupabaseProfile,
  adminGetSupabaseUsers,
  adminUpsertSupabaseUser,
  adminDeleteSupabaseUser,
  adminGetSupabaseRides,
  adminDeleteSupabaseRide,
  upsertSupabaseDriver,
  deleteSupabaseDriver
} from '../services/supabaseService';
import {
  fetchAdminStatus,
  setupInitialAdmin,
  loginAdminApi,
  verifyAdminSessionApi,
  changeAdminUsernameApi,
  changeAdminPasswordApi,
  logoutAdminApi,
  logoutAllAdminSessionsApi,
  AdminSafeProfile
} from '../services/adminAuthService';

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
  isAuthLoading: boolean;
  isSupabaseConnected: boolean;
  
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
  advanceRideStage: () => Promise<void>;
  
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

  // Admin authentication state & methods (Single Admin Account System)
  isAdminAuthenticated: boolean;
  adminProfile: AdminSafeProfile | null;
  adminExistsState: boolean;
  adminCredentials: { username: string; passwordHash: string; updatedAt?: string };
  refreshAdminStatus: () => Promise<void>;
  setupInitialAdminAccount: (username: string, password: string, confirmPassword: string) => Promise<{ success: boolean; message: string }>;
  loginAdmin: (userId: string, password: string) => Promise<{ success: boolean; message: string }>;
  logoutAdmin: () => Promise<void>;
  logoutAllAdminSessions: () => Promise<{ success: boolean; message: string }>;
  updateAdminCredentials: (newUsername: string, newPassword: string, currentPassword?: string) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  updateAdminPassword: (newPassword: string, currentPassword?: string) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };

  // Supabase Database collections & management
  allUsers: UserProfile[];
  allRides: ActiveRide[];
  allDrivers: DriverProfile[];
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  adminUpdateUser: (userId: string, updates: Partial<UserProfile>) => Promise<void>;
  adminCreateUser: (user: Omit<UserProfile, 'id'> & { id?: string }) => Promise<UserProfile>;
  adminDeleteUser: (userId: string) => Promise<void>;
  adminAdjustUserWallet: (userId: string, amount: number, note?: string) => Promise<void>;
  adminToggleUserStatus: (userId: string) => Promise<void>;
  adminUpdateRide: (rideId: string, updates: Partial<ActiveRide>) => Promise<void>;
  adminCreateRide: (rideData: Partial<ActiveRide>) => Promise<ActiveRide>;
  adminDeleteRide: (rideId: string) => Promise<void>;
  adminUpdateDriver: (driverId: string, updates: Partial<DriverProfile>) => Promise<void>;
  adminCreateDriver: (driverData: Partial<DriverProfile>) => Promise<DriverProfile>;

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
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('toto_saved_user');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Error reading saved user:', e);
    }
    return null;
  });
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
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeRole, setActiveRoleState] = useState<AppRole>(() => {
    try {
      const savedRole = localStorage.getItem('toto_active_role');
      if (savedRole === 'driver' || savedRole === 'admin' || savedRole === 'user') {
        return savedRole as AppRole;
      }
      const savedDriver = localStorage.getItem('toto_saved_driver');
      if (savedDriver) {
        return 'driver';
      }
    } catch (e) {
      console.warn('Error reading saved activeRole:', e);
    }
    return 'user';
  });

  const setActiveRole = useCallback((role: AppRole) => {
    setActiveRoleState(role);
    try {
      localStorage.setItem('toto_active_role', role);
    } catch {}
  }, []);
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [pendingDriverRequest, setPendingDriverRequest] = useState<ActiveRide | null>(null);
  const [onlineDrivers, setOnlineDrivers] = useState<DriverProfile[]>([]);
  const [userGpsPoint, setUserGpsPoint] = useState<GeoPoint | null>(null);
  const [driverGpsPoint, setDriverGpsPoint] = useState<GeoPoint | null>(null);
  const [availableTotoOffers, setAvailableTotoOffers] = useState<TotoPartnerOffer[]>([]);
  const [isScanningOffers, setIsScanningOffers] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<TotoPartnerOffer | null>(null);
  const [activeNavTab, setActiveNavTabState] = useState<'home' | 'rides' | 'profile'>('home');
  const setActiveNavTab = useCallback((tab: 'home' | 'rides' | 'profile') => {
    setActiveNavTabState(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  const isSupabaseConnected = isSupabaseConfigured;

  const [earningsHistory, setEarningsHistory] = useState<Array<{ id: string; time: string; amount: number; pickup: string; drop: string }>>([
    { id: 'tx_1', time: '10:15 AM', amount: 45, pickup: 'Sector V Metro', drop: 'City Centre 1' },
    { id: 'tx_2', time: '11:40 AM', amount: 65, pickup: 'Karunamoyee', drop: 'City Centre 1' },
    { id: 'tx_3', time: '01:10 PM', amount: 38, pickup: 'RDB Cinemas', drop: 'Webel More' },
  ]);

  const [driverApprovals, setDriverApprovals] = useState<DriverApprovalRequest[]>([]);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  // Admin authentication state (Single Administrator Account System)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('toto_admin_authenticated') === 'true';
  });

  const [adminProfile, setAdminProfile] = useState<AdminSafeProfile | null>(null);
  const [adminExistsState, setAdminExistsState] = useState<boolean>(true);

  const [adminCredentials, setAdminCredentials] = useState<{ username: string; passwordHash: string; updatedAt?: string }>(() => {
    const saved = localStorage.getItem('toto_admin_credentials');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.username === 'string') {
          return { username: parsed.username, passwordHash: '••••••••', updatedAt: parsed.updatedAt || new Date().toISOString() };
        }
      } catch (e) {
        console.error('Error parsing admin credentials:', e);
      }
    }
    return { username: 'Admin', passwordHash: '••••••••', updatedAt: new Date().toISOString() };
  });

  const refreshAdminStatus = useCallback(async () => {
    try {
      const status = await fetchAdminStatus();
      setAdminExistsState(status.admin_exists);
      if (status.admin_exists) {
        // Attempt session verification
        const session = await verifyAdminSessionApi();
        if (session.authenticated && session.admin) {
          setIsAdminAuthenticated(true);
          setAdminProfile(session.admin);
          setAdminCredentials({
            username: session.admin.username,
            passwordHash: '••••••••',
            updatedAt: session.admin.updated_at
          });
          localStorage.setItem('toto_admin_authenticated', 'true');
        } else {
          setIsAdminAuthenticated(false);
          localStorage.removeItem('toto_admin_authenticated');
        }
      } else {
        setIsAdminAuthenticated(false);
        localStorage.removeItem('toto_admin_authenticated');
      }
    } catch (err) {
      console.warn('Could not refresh admin status:', err);
    }
  }, []);

  useEffect(() => {
    refreshAdminStatus();
  }, [refreshAdminStatus]);

  const setupInitialAdminAccount = async (
    username: string, 
    password: string, 
    confirmPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await setupInitialAdmin({ username, password, confirmPassword });
      setAdminExistsState(true);
      if (res.admin) {
        setAdminProfile(res.admin);
        setAdminCredentials({
          username: res.admin.username,
          passwordHash: '••••••••',
          updatedAt: res.admin.updated_at
        });
      }
      playChime('success');
      return { success: true, message: res.message };
    } catch (err: any) {
      playChime('alert');
      return { success: false, message: err.message || 'Failed to setup administrator account.' };
    }
  };

  const loginAdmin = async (userIdInput: string, passwordInput: string): Promise<{ success: boolean; message: string }> => {
    const cleanId = userIdInput.trim();
    const cleanPass = passwordInput.trim();

    if (!cleanId || !cleanPass) {
      return { success: false, message: 'Please enter both Admin username and password.' };
    }

    try {
      const res = await loginAdminApi({ username: cleanId, password: cleanPass });
      setIsAdminAuthenticated(true);
      setAdminProfile(res.admin);
      setAdminCredentials({
        username: res.admin.username,
        passwordHash: '••••••••',
        updatedAt: res.admin.updated_at
      });
      localStorage.setItem('toto_admin_authenticated', 'true');
      playChime('success');
      return { success: true, message: 'Admin authenticated successfully!' };
    } catch (err: any) {
      playChime('alert');
      return { success: false, message: err.message || 'Invalid username or password.' };
    }
  };

  const logoutAdmin = async (): Promise<void> => {
    try {
      await logoutAdminApi();
    } catch {
      // ignore
    }
    setIsAdminAuthenticated(false);
    setAdminProfile(null);
    localStorage.removeItem('toto_admin_authenticated');
    setActiveRole('user');
    playChime('beep');
  };

  const logoutAllAdminSessions = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await logoutAllAdminSessionsApi();
      setIsAdminAuthenticated(false);
      setAdminProfile(null);
      localStorage.removeItem('toto_admin_authenticated');
      setActiveRole('user');
      playChime('beep');
      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to terminate all sessions.' };
    }
  };

  const updateAdminCredentials = async (
    newUsername: string, 
    newPassword: string, 
    currentPassword?: string
  ): Promise<{ success: boolean; message: string }> => {
    const trimmedUser = newUsername.trim();
    const trimmedPass = newPassword.trim();

    if (!currentPassword) {
      return { success: false, message: 'Current password is required to verify your identity.' };
    }

    try {
      // 1. Update username if changed
      if (trimmedUser && trimmedUser !== (adminProfile?.username || adminCredentials.username)) {
        const uRes = await changeAdminUsernameApi({
          currentPassword,
          newUsername: trimmedUser
        });
        if (uRes.admin) {
          setAdminProfile(uRes.admin);
          setAdminCredentials(prev => ({ ...prev, username: uRes.admin!.username, updatedAt: uRes.admin!.updated_at }));
        }
      }

      // 2. Update password if provided
      if (trimmedPass) {
        await changeAdminPasswordApi({
          currentPassword,
          newPassword: trimmedPass,
          confirmPassword: trimmedPass
        });
      }

      playChime('success');
      return {
        success: true,
        message: 'Admin credentials updated successfully on single account ADMIN_001.'
      };
    } catch (err: any) {
      playChime('alert');
      return { success: false, message: err.message || 'Failed to update admin credentials.' };
    }
  };

  const updateAdminPassword = async (newPassword: string, currentPassword?: string): Promise<{ success: boolean; message: string }> => {
    return updateAdminCredentials(adminProfile?.username || adminCredentials.username, newPassword, currentPassword);
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

  // Full Database Collections
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allRides, setAllRides] = useState<ActiveRide[]>([]);
  const [allDrivers, setAllDrivers] = useState<DriverProfile[]>([]);

  const triggerSound = useCallback((type: 'beep' | 'success' | 'alert') => {
    playChime(type);
  }, []);

  // Primary live production driver specification: (keep only one driver)
  const DEFAULT_PRIMARY_DRIVER: DriverProfile = {
    id: 'drv_1',
    name: 'Bikram Naskar',
    phone: '+91 98314 55029',
    vehicleType: 'toto',
    vehicleNumber: 'WB-24-ER-8841',
    vehicleModel: 'Mayuri Grand Li-ion E-Rickshaw',
    vehicleColor: 'Emerald Green',
    pin: '1234',
    approvalStatus: 'approved',
    rating: 4.9,
    totalTrips: 0,
    batteryPercentage: 92,
    todayEarnings: 0,
    totalEarnings: 0,
    acceptanceRate: 100,
    isOnline: false,
    availabilityStatus: 'inactive',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    kycVerified: true,
    currentLat: 22.5804,
    currentLng: 88.4378,
    updatedAt: new Date().toISOString()
  };

  // 1. Real-time pub/sub listeners for Users, Rides, and Drivers
  useEffect(() => {
    // Maintain single live production driver as requested: (keep only one driver)
    const existingDrivers = appDb.getAll<DriverProfile>('drivers');
    if (existingDrivers.length === 0) {
      appDb.set('drivers', DEFAULT_PRIMARY_DRIVER.id, DEFAULT_PRIMARY_DRIVER);
      appDb.set('driver_approvals', DEFAULT_PRIMARY_DRIVER.id, {
        id: DEFAULT_PRIMARY_DRIVER.id,
        driverName: DEFAULT_PRIMARY_DRIVER.name,
        phone: DEFAULT_PRIMARY_DRIVER.phone,
        vehicleNumber: DEFAULT_PRIMARY_DRIVER.vehicleNumber,
        vehicleModel: DEFAULT_PRIMARY_DRIVER.vehicleModel,
        vehicleColor: DEFAULT_PRIMARY_DRIVER.vehicleColor,
        vehicleType: DEFAULT_PRIMARY_DRIVER.vehicleType,
        status: 'approved',
        generatedPin: DEFAULT_PRIMARY_DRIVER.pin,
        createdAt: new Date().toISOString()
      });
    } else if (existingDrivers.length > 1) {
      const [firstDriver, ...excessDrivers] = existingDrivers;
      excessDrivers.forEach((d) => {
        appDb.delete('drivers', d.id);
        appDb.delete('driver_approvals', d.id);
      });
    }

    const unsubUsers = appDb.subscribe<UserProfile>('users', (list) => {
      setAllUsers(list);
    });
    const unsubRides = appDb.subscribe<ActiveRide>('rides', (list) => {
      setAllRides(list);
    });
    const unsubDrivers = appDb.subscribe<DriverProfile>('drivers', (list) => {
      setAllDrivers(list);
      setOnlineDrivers(list.filter((d) => d.isOnline && d.availabilityStatus !== 'offline' && d.availabilityStatus !== 'inactive'));
    });

    return () => {
      unsubUsers();
      unsubRides();
      unsubDrivers();
    };
  }, []);

  // 2. Real-time listener for driver registration approvals
  useEffect(() => {
    const unsubscribe = appDb.subscribe<DriverApprovalRequest>('driver_approvals', (list) => {
      let pending = 0;
      list.forEach((item) => {
        if (item.status === 'pending') {
          pending += 1;
        }
      });
      const sorted = [...list].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setDriverApprovals(sorted);
      setPendingApprovalsCount(pending);
    });

    return () => unsubscribe();
  }, []);

  // 3. User Authentication state initialization & Supabase Auth Sync
  useEffect(() => {
    try {
      const saved = localStorage.getItem('toto_saved_user');
      if (saved) {
        setUser(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Error reading saved user:', e);
    }
    setIsAuthLoading(false);

    if (!supabase) return;

    // Check current Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        const targetEmail = u.email || 'ulove2182@gmail.com';
        const targetName = u.user_metadata?.full_name || u.user_metadata?.name || targetEmail.split('@')[0];
        const targetAvatar = u.user_metadata?.avatar_url || u.user_metadata?.picture || 'https://lh3.googleusercontent.com/a/default-user=s96-c';
        const targetPhone = u.phone || u.user_metadata?.phone || '+91 98301 45289';
        const profileId = 'usr_' + (u.id || targetEmail.replace(/[^a-zA-Z0-9]/g, '_'));

        const profile: UserProfile = {
          id: profileId,
          name: typeof targetName === 'string' ? targetName : 'Passenger',
          phone: typeof targetPhone === 'string' ? targetPhone : '+91 98301 45289',
          email: targetEmail,
          rating: 4.95,
          totalRides: 0,
          walletBalance: 250,
          avatarUrl: targetAvatar,
          createdAt: new Date().toISOString()
        };

        const existing = appDb.get<UserProfile>('users', profileId);
        if (existing) {
          setUser({ ...profile, ...existing });
        } else {
          appDb.set('users', profileId, profile);
          setUser(profile);
        }
      }
    }).catch(console.warn);

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION')) {
        const u = session.user;
        const targetEmail = u.email || 'ulove2182@gmail.com';
        const targetName = u.user_metadata?.full_name || u.user_metadata?.name || targetEmail.split('@')[0];
        const targetAvatar = u.user_metadata?.avatar_url || u.user_metadata?.picture || 'https://lh3.googleusercontent.com/a/default-user=s96-c';
        const targetPhone = u.phone || u.user_metadata?.phone || '+91 98301 45289';
        const profileId = 'usr_' + (u.id || targetEmail.replace(/[^a-zA-Z0-9]/g, '_'));

        const profile: UserProfile = {
          id: profileId,
          name: typeof targetName === 'string' ? targetName : 'Passenger',
          phone: typeof targetPhone === 'string' ? targetPhone : '+91 98301 45289',
          email: targetEmail,
          rating: 4.95,
          totalRides: 0,
          walletBalance: 250,
          avatarUrl: targetAvatar,
          createdAt: new Date().toISOString()
        };

        const existing = appDb.get<UserProfile>('users', profileId);
        if (existing) {
          setUser({ ...profile, ...existing });
        } else {
          appDb.set('users', profileId, profile);
          setUser(profile);
        }
        try {
          localStorage.setItem('toto_saved_user', JSON.stringify(profile));
        } catch {}
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // 4. Real-time listener on Active Ride
  useEffect(() => {
    if (!activeRide?.id) return;

    const unsubscribe = appDb.subscribe<ActiveRide>('rides', (allRides) => {
      const liveRide = allRides.find((r) => r.id === activeRide.id);
      if (liveRide) {
        setActiveRide(liveRide);
      }
    });

    return () => unsubscribe();
  }, [activeRide?.id]);

  // 5. Real-time listener for online Toto Captains to receive ride dispatches
  useEffect(() => {
    if (!driver || !driver.isOnline) {
      setPendingDriverRequest(null);
      return;
    }

    const unsubscribe = appDb.subscribe<ActiveRide>('rides', (allRides) => {
      let candidate: ActiveRide | null = null;
      allRides.forEach((r) => {
        if (r.status === 'searching') {
          if (!r.driverId || r.driverId === driver.id) {
            candidate = r;
          }
        }
      });

      if (candidate) {
        setPendingDriverRequest(candidate);
        triggerSound('alert');
      } else {
        setPendingDriverRequest(null);
      }
    });

    return () => unsubscribe();
  }, [driver, triggerSound]);

  // 6. Smooth Live GPS Movement: towards Pickup (driver_assigned) or towards Dropoff (in_progress)
  useEffect(() => {
    if (activeRole !== 'user' || !activeRide || activeRide.status === 'completed' || activeRide.status === 'cancelled') {
      return;
    }

    if (activeRide.status === 'driver_assigned' || activeRide.status === 'in_progress') {
      const interval = setInterval(() => {
        setActiveRide((prev) => {
          if (!prev || (prev.status !== 'driver_assigned' && prev.status !== 'in_progress')) return prev;
          const currentLoc = prev.driverLocation || {
            lat: prev.pickup.lat + 0.002,
            lng: prev.pickup.lng + 0.002,
            heading: 0
          };

          const target = prev.status === 'in_progress' ? prev.dropoff : prev.pickup;
          const dLat = target.lat - currentLoc.lat;
          const dLng = target.lng - currentLoc.lng;
          const distance = Math.sqrt(dLat * dLat + dLng * dLng);

          // If arrived within ~25 meters
          if (distance < 0.00035) {
            if (prev.status === 'driver_assigned') {
              triggerSound('beep');
              const arrivedUpdates = {
                status: 'driver_arrived' as const,
                driverLocation: {
                  lat: target.lat,
                  lng: target.lng,
                  heading: currentLoc.heading || 0,
                  timestamp: Date.now()
                }
              };
              appDb.update('rides', prev.id, arrivedUpdates);
              return { ...prev, ...arrivedUpdates };
            } else if (prev.status === 'in_progress') {
              triggerSound('success');
              const completedUpdates = {
                status: 'completed' as const,
                paymentStatus: 'paid' as const,
                completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                driverLocation: {
                  lat: target.lat,
                  lng: target.lng,
                  heading: currentLoc.heading || 0,
                  timestamp: Date.now()
                }
              };
              appDb.update('rides', prev.id, completedUpdates);
              return { ...prev, ...completedUpdates };
            }
          }

          // Move 12% closer per step towards target
          const step = 0.12;
          const nextLat = currentLoc.lat + dLat * step;
          const nextLng = currentLoc.lng + dLng * step;
          const heading = calculateBearing(currentLoc.lat, currentLoc.lng, target.lat, target.lng);

          const newLocation = {
            lat: Number(nextLat.toFixed(6)),
            lng: Number(nextLng.toFixed(6)),
            heading: Math.round(heading),
            timestamp: Date.now()
          };

          // Background sync
          appDb.update('rides', prev.id, { driverLocation: newLocation });

          return {
            ...prev,
            driverLocation: newLocation
          };
        });
      }, 2500);

      return () => clearInterval(interval);
    }
    // C. When driver arrived at pickup, auto-board after 6s to start trip
    if (activeRide.status === 'driver_arrived') {
      const boardTimer = setTimeout(async () => {
        const inProgressUpdates: Partial<ActiveRide> = {
          status: 'in_progress',
          startedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setActiveRide((prev) => prev ? { ...prev, ...inProgressUpdates } : null);
        triggerSound('success');
        try {
          appDb.update('rides', activeRide.id, inProgressUpdates);
        } catch {
          // non-blocking
        }
      }, 6000);

      return () => clearTimeout(boardTimer);
    }
  }, [activeRole, activeRide?.id, activeRide?.status, triggerSound, onlineDrivers]);

  // Passenger Phone / direct profile login
  const loginUser = async (u: UserProfile) => {
    try {
      const uid = u.id || `usr_${Date.now()}`;
      const profileToSave: UserProfile = {
        ...u,
        id: uid
      };
      appDb.set('users', uid, profileToSave);
      setUser(profileToSave);
      try {
        localStorage.setItem('toto_saved_user', JSON.stringify(profileToSave));
      } catch {}
      triggerSound('success');
    } catch (error) {
      console.error('Error logging in user:', error);
    }
  };

  // Sync Firebase Auth state changes
  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
        if (fbUser) {
          setUser((current) => {
            if (current && current.id === fbUser.uid) return current;
            const cleanPhone = (fbUser.phoneNumber || '').replace(/\D/g, '');
            const syncedUser: UserProfile = {
              id: fbUser.uid,
              name: fbUser.displayName || current?.name || 'Passenger',
              email: fbUser.email || current?.email || '',
              phone: fbUser.phoneNumber || current?.phone || (cleanPhone ? `+91 ${cleanPhone.slice(-10)}` : ''),
              avatarUrl: fbUser.photoURL || current?.avatarUrl || `https://api.dicebear.com/7.x/personas/svg?seed=${fbUser.uid}`,
              rating: current?.rating ?? 4.95,
              totalRides: current?.totalRides ?? 0,
              savedPlaces: current?.savedPlaces ?? {},
              walletBalance: current?.walletBalance ?? 250,
              createdAt: current?.createdAt || new Date().toISOString()
            };
            try {
              localStorage.setItem('toto_saved_user', JSON.stringify(syncedUser));
              appDb.set('users', syncedUser.id, syncedUser);
            } catch {}
            return syncedUser;
          });
        }
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Firebase onAuthStateChanged setup notice:', e);
    }
  }, []);

  const logoutUser = async () => {
    try {
      await logOutFromFirebase().catch(() => {});
    } catch {}
    try {
      if (supabase) {
        await supabase.auth.signOut().catch(() => {});
      }
    } catch {}
    try {
      localStorage.removeItem('toto_saved_user');
    } catch {}
    setUser(null);
    setActiveNavTabState('home');
    triggerSound('beep');
  };

  // Driver Login / Registration with instant state update + background sync
  const loginDriver = async (d: DriverProfile) => {
    const onlineDriver: DriverProfile = {
      ...d,
      isOnline: true,
      availabilityStatus: 'online',
      updatedAt: new Date().toISOString()
    };
    setDriver(onlineDriver);
    try {
      localStorage.setItem('toto_saved_driver', JSON.stringify(onlineDriver));
      localStorage.setItem('toto_active_role', 'driver');
    } catch {}
    setActiveRoleState('driver');
    triggerSound('success');
    appDb.set('drivers', onlineDriver.id, onlineDriver);
    setOnlineDrivers((prev) => {
      const exists = prev.some((item) => item.id === onlineDriver.id);
      return exists ? prev.map((item) => item.id === onlineDriver.id ? onlineDriver : item) : [...prev, onlineDriver];
    });
  };

  const logoutDriver = useCallback(async () => {
    // 1. Resolve current driver ID and record
    let currentDriverId = driver?.id;
    let currentDriverData = driver;

    if (!currentDriverId && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('toto_saved_driver');
        if (saved) {
          currentDriverData = JSON.parse(saved);
          currentDriverId = currentDriverData?.id;
        }
      } catch {}
    }

    if (!currentDriverId) {
      const allRegistered = appDb.getAll<DriverProfile>('drivers');
      if (allRegistered.length > 0) {
        currentDriverId = allRegistered[0].id;
        currentDriverData = allRegistered[0];
      }
    }

    if (currentDriverId) {
      const offlineDriver: DriverProfile = {
        ...(currentDriverData || {}),
        id: currentDriverId,
        isOnline: false,
        availabilityStatus: 'inactive',
        lastLocationUpdate: Date.now(),
        updatedAt: new Date().toISOString()
      } as DriverProfile;

      // 2. Immediately update in database (appDb)
      try {
        appDb.set('drivers', currentDriverId, offlineDriver);
      } catch (err) {
        console.error('Error updating driver to inactive in appDb on logout:', err);
      }

      // 3. Sync to Supabase if configured
      if (isSupabaseConfigured) {
        try {
          upsertSupabaseDriver(offlineDriver).catch(() => {});
        } catch {}
      }

      // 4. Trigger reactive UI state update immediately
      setOnlineDrivers((prev) => prev.filter((d) => d.id !== currentDriverId));
      setAllDrivers((prev) =>
        prev.map((d) => (d.id === currentDriverId ? offlineDriver : d))
      );
    } else {
      setOnlineDrivers([]);
    }

    // 5. Clear driver session state & pending requests
    setDriver(null);
    setPendingDriverRequest(null);
    try {
      localStorage.removeItem('toto_saved_driver');
      localStorage.removeItem('rapid_toto_driver');
      if (localStorage.getItem('toto_active_role') === 'driver') {
        localStorage.setItem('toto_active_role', 'user');
      }
    } catch {}
    setActiveRoleState('user');
    triggerSound('beep');
  }, [driver, isSupabaseConfigured, triggerSound]);

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
      appDb.set('driver_approvals', approvalId, approvalDoc);

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
      appDb.set('drivers', driverDocId, initialDriverDoc);

      triggerSound('alert');
      return {
        approvalId,
        message: 'Registration request submitted to Admin! Waiting for verification and 4-digit PIN assignment.'
      };
    } catch (error) {
      console.error('Registration request error:', error);
      throw error;
    }
  };

  // Admin approves driver registration & generates unique 4-digit PIN
  const approveDriverRegistration = async (approvalId: string, customPin?: string): Promise<{ pin: string }> => {
    try {
      // Generate random unique 4-digit security pin
      const pin = customPin || Math.floor(1000 + Math.random() * 9000).toString();
      const approvedAt = new Date().toISOString();

      const targetApproval = driverApprovals.find((a) => a.id === approvalId);
      const cleanPhone = (targetApproval?.phone || '').replace(/\D/g, '');
      const driverDocId = `drv_${cleanPhone.slice(-6) || approvalId.slice(-6)}`;

      // 1. Update driver_approvals document
      appDb.update('driver_approvals', approvalId, {
        status: 'approved',
        generatedPin: pin,
        approvedAt
      });

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
      appDb.set('drivers', driverDocId, approvedDriver);

      triggerSound('success');
      return { pin };
    } catch (error) {
      console.error('Driver approval error:', error);
      throw error;
    }
  };

  // Admin rejects driver registration
  const rejectDriverRegistration = async (approvalId: string): Promise<void> => {
    try {
      appDb.update('driver_approvals', approvalId, {
        status: 'rejected',
        updatedAt: new Date().toISOString()
      });
      triggerSound('beep');
    } catch (error) {
      console.error('Driver rejection error:', error);
      throw error;
    }
  };

  // Admin permanently deletes driver profile (removes from approvals, fleet and local cache)
  const deleteDriverProfile = async (idOrPhone: string): Promise<{ success: boolean; message: string }> => {
    try {
      const cleanDigits = idOrPhone.replace(/\D/g, '');
      const targetApproval = driverApprovals.find(
        (a) => a.id === idOrPhone || (cleanDigits && a.phone.replace(/\D/g, '').endsWith(cleanDigits))
      );
      const approvalDocId = targetApproval ? targetApproval.id : idOrPhone;

      // 1. Delete from driver_approvals
      appDb.delete('driver_approvals', approvalDocId);

      // 2. Delete from drivers
      const targetDriver = onlineDrivers.find(
        (d) => d.id === idOrPhone || (cleanDigits && d.phone.replace(/\D/g, '').endsWith(cleanDigits))
      );
      const driverDocId = targetDriver ? targetDriver.id : (cleanDigits ? `driver_${cleanDigits}` : idOrPhone);
      appDb.delete('drivers', driverDocId);

      // Also clean up phone in drivers collection if valid 10 digits
      if (cleanDigits && cleanDigits.length >= 10) {
        const allDrivers = appDb.getAll<DriverProfile>('drivers');
        allDrivers.forEach((d) => {
          const docPhoneDigits = (d.phone || '').replace(/\D/g, '');
          if (docPhoneDigits.endsWith(cleanDigits) || cleanDigits.endsWith(docPhoneDigits)) {
            appDb.delete('drivers', d.id);
          }
        });
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
      console.error('Delete driver error:', error);
      throw error;
    }
  };

  // Phone + 4-digit PIN Driver Login
  const loginDriverWithPin = async (phone: string, pin: string): Promise<{ success: boolean; message?: string }> => {
    const cleanDigits = phone.replace(/\D/g, '');
    const cleanPin = pin.trim();

    if (!cleanDigits || cleanDigits.length < 10) {
      return { success: false, message: 'Please enter a valid 10-digit mobile number' };
    }
    if (!cleanPin || cleanPin.length !== 4) {
      return { success: false, message: 'Please enter a valid 4-digit security PIN' };
    }

    try {
      // 1. Query drivers collection
      const allDrivers = appDb.getAll<DriverProfile>('drivers');
      const matchedDriver = allDrivers.find((d) => {
        const dPhoneDigits = (d.phone || '').replace(/\D/g, '');
        return dPhoneDigits.endsWith(cleanDigits) || cleanDigits.endsWith(dPhoneDigits);
      });

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
        const expectedPin = driverDoc.pin;
        if (expectedPin && expectedPin === cleanPin) {
          await loginDriver(driverDoc);
          return { success: true };
        } else {
          return { success: false, message: 'Incorrect 4-digit PIN. Please verify your security PIN.' };
        }
      }

      // 2. Query driver_approvals collection
      const allApprovals = appDb.getAll<DriverApprovalRequest>('driver_approvals');
      const matchedAppr = allApprovals.find((a) => {
        const aPhoneDigits = (a.phone || '').replace(/\D/g, '');
        return aPhoneDigits.endsWith(cleanDigits) || cleanDigits.endsWith(aPhoneDigits);
      }) || driverApprovals.find((a) => {
        const aPhoneDigits = (a.phone || '').replace(/\D/g, '');
        return aPhoneDigits.endsWith(cleanDigits) || cleanDigits.endsWith(aPhoneDigits);
      });

      if (matchedAppr) {
        const appr = matchedAppr as DriverApprovalRequest;
        if (appr.status === 'pending') {
          return {
            success: false,
            message: 'Registration is pending admin verification. An admin will review and assign your 4-digit PIN.'
          };
        }
        if (appr.status === 'approved') {
          const expectedPin = appr.generatedPin;
          if (expectedPin && expectedPin === cleanPin) {
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
      appDb.set('drivers', driver.id, updated);
      triggerSound('beep');
    } catch (error) {
      console.error('Update driver details error:', error);
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
      appDb.set('rideRequests', reqId, docData);
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
      availabilityStatus: isOnline ? 'online' : 'inactive',
      lastLocationUpdate: Date.now(),
      updatedAt: new Date().toISOString() 
    };
    setDriver(updated);
    try {
      localStorage.setItem('toto_saved_driver', JSON.stringify(updated));
    } catch {}
    try {
      appDb.set('drivers', driver.id, updated);
      if (isOnline) {
        setOnlineDrivers((prev) => {
          const exists = prev.some((item) => item.id === updated.id);
          return exists ? prev.map((item) => item.id === updated.id ? updated : item) : [...prev, updated];
        });
      } else {
        setOnlineDrivers((prev) => prev.filter((item) => item.id !== updated.id));
      }
      setAllDrivers((prev) => prev.map((item) => item.id === updated.id ? updated : item));
      if (isSupabaseConfigured) {
        upsertSupabaseDriver(updated).catch(() => {});
      }
      triggerSound('beep');
    } catch (error) {
      console.error('Update driver online status error:', error);
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
        appDb.update('drivers', driver.id, {
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
          appDb.update('rides', activeRide.id, {
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

  // Find dynamic bids/offers from registered online Toto Partners
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
      // Gather active online drivers from registered fleet
      const driversToUse = onlineDrivers.filter((d) => d.isOnline && d.availabilityStatus !== 'busy' && d.availabilityStatus !== 'offline' && d.availabilityStatus !== 'inactive');
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
      if (offers.length > 0) {
        triggerSound('success');
      }
    }, 700);
  }, [onlineDrivers, triggerSound]);

  // Passenger selects specific price & Toto Partner and saves ride
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
      userId: user?.id || 'usr_passenger',
      userName: user?.name || 'Passenger',
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

    // Persist real-time ride document
    try {
      appDb.set('rides', rideId, newRide);
    } catch (error) {
      console.error('Ride booking persistence error:', error);
    }

    return newRide;
  };

  // Standard createRideBooking
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
      userId: user?.id || 'usr_passenger',
      userName: user?.name || 'Passenger',
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
      driverLocation: {
        lat: Number((pickup.lat + 0.0032).toFixed(6)),
        lng: Number((pickup.lng + 0.0028).toFixed(6)),
        heading: 45,
        timestamp: Date.now()
      },
    };

    setActiveRide(newRide);
    triggerSound('alert');

    try {
      appDb.set('rides', rideId, newRide);
    } catch (error) {
      console.error('Error creating ride booking:', error);
    }

    return newRide;
  };

  // Driver Accepts Ride
  const driverAcceptRide = async (rideId: string) => {
    if (!driver) return;
    if (!activeRide && !pendingDriverRequest) return;
    const current = pendingDriverRequest || activeRide;
    if (!current || current.id !== rideId) return;

    const assignedDriver = driver;
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
      appDb.update('rides', rideId, updates);
    } catch (error) {
      console.error('Error accepting ride:', error);
    }
  };

  const driverDeclineRide = (_rideId: string) => {
    setPendingDriverRequest(null);
    triggerSound('beep');
  };

  // Driver Arrives at Pickup Location
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
      appDb.update('rides', activeRide.id, updates);
    } catch (error) {
      console.error('Error updating driver arrival:', error);
    }
  };

  // Driver Verifies OTP & Starts Ride
  const driverStartRideWithOtp = async (otpInput: string): Promise<{ success: boolean; message: string }> => {
    if (!activeRide) return { success: false, message: 'No active ride found' };
    if (activeRide.otp !== otpInput.trim()) {
      return { success: false, message: 'Incorrect OTP. Please ask customer for the 4-digit PIN.' };
    }

    const updates = { status: 'in_progress' as const };
    setActiveRide({ ...activeRide, ...updates });
    triggerSound('success');

    try {
      appDb.update('rides', activeRide.id, updates);
    } catch (error) {
      console.error('Error starting ride with OTP:', error);
    }

    return { success: true, message: 'OTP verified! Ride started.' };
  };

  // Driver Completes Ride & Stores Earnings
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

    // 1. Update ride in db
    try {
      appDb.update('rides', activeRide.id, rideUpdates);
    } catch (error) {
      console.error('Error completing ride:', error);
    }

    // 2. Persist earnings record
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
      appDb.set('earnings', earningId, newTx);
    } catch (error) {
      console.error('Error recording earnings:', error);
    }

    // 2b. Persist completed trip in `trips` collection
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
      appDb.set('trips', tripId, tripData);
    } catch (err) {
      console.warn('Error persisting trip record:', err);
    }

    // 3. Update driver todayEarnings
    if (driver) {
      const updatedDriver = {
        ...driver,
        todayEarnings: driver.todayEarnings + earningAmount,
        totalTrips: driver.totalTrips + 1,
      };
      setDriver(updatedDriver);
      try {
        appDb.update('drivers', driver.id, {
          todayEarnings: updatedDriver.todayEarnings,
          totalTrips: updatedDriver.totalTrips,
          updatedAt: new Date().toISOString()
        });
      } catch {
        // Non-blocking
      }
    }
  };

  // Advance Ride Stage (demo helper deprecated in production)
  const advanceRideStage = async () => {
    if (!activeRide) return;
    if (activeRide.status === 'in_progress') {
      await driverCompleteRide();
    }
  };

  // Passenger Rates Ride
  const rateRide = async (rating: number, feedback: string) => {
    if (!activeRide) return;
    try {
      appDb.update('rides', activeRide.id, {
        passengerRating: rating,
        passengerFeedback: feedback,
      });
    } catch {
      // Non-blocking
    }
    setActiveRide(null);
  };

  // Cancel Active Ride
  const cancelRide = async (_reason?: string) => {
    if (activeRide) {
      try {
        appDb.update('rides', activeRide.id, {
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
      appDb.set('saved_places', newPlace.id, newPlace);
      triggerSound('beep');
    } catch {
      // Offline fallback
    }
  };

  const deleteSavedPlace = async (placeId: string) => {
    setSavedPlaces((prev) => prev.filter((p) => p.id !== placeId));
    try {
      appDb.delete('saved_places', placeId);
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
      appDb.set('emergency_contacts', contact.id, contact);
      triggerSound('beep');
    } catch {
      // Offline fallback
    }
  };

  const deleteEmergencyContact = async (id: string) => {
    setEmergencyContacts((prev) => prev.filter((c) => c.id !== id));
    try {
      appDb.delete('emergency_contacts', id);
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
      appDb.set('support_tickets', newTicket.id, newTicket);
      triggerSound('beep');
    } catch {
      // Offline fallback
    }
  };

  const createScheduledRide = async (ride: ScheduledRide) => {
    setScheduledRides((prev) => [ride, ...prev]);
    try {
      appDb.set('scheduled_rides', ride.id, ride);
      triggerSound('success');
    } catch {
      // Offline fallback
    }
  };

  const rateRideWithTags = async (stars: number, compliments: string[], review: string) => {
    if (!activeRide) return;
    try {
      appDb.update('rides', activeRide.id, {
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

  // User Profile Updates
  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    try {
      localStorage.setItem('toto_saved_user', JSON.stringify(updated));
      appDb.update('users', user.id, updates);
      await upsertSupabaseProfile(updated);
      triggerSound('success');
    } catch (e) {
      console.warn('Error updating profile:', e);
    }
  };

  // Admin User Management
  const adminUpdateUser = async (userId: string, updates: Partial<UserProfile>) => {
    appDb.update('users', userId, updates);
    if (user && user.id === userId) {
      const updated = { ...user, ...updates };
      setUser(updated);
      localStorage.setItem('toto_saved_user', JSON.stringify(updated));
    }
    const targetUser = appDb.get<UserProfile>('users', userId);
    if (targetUser) {
      adminUpsertSupabaseUser(targetUser).catch(() => {});
    }
    triggerSound('beep');
  };

  const adminCreateUser = async (userData: Omit<UserProfile, 'id'> & { id?: string }): Promise<UserProfile> => {
    const id = userData.id || `usr_${Date.now().toString(36)}`;
    const newUser: UserProfile = {
      ...userData,
      id,
      rating: userData.rating ?? 5.0,
      totalRides: userData.totalRides ?? 0,
      walletBalance: userData.walletBalance ?? 0,
      status: userData.status ?? 'active',
      avatarUrl: userData.avatarUrl || `https://api.dicebear.com/7.x/micah/svg?seed=${id}`,
      createdAt: new Date().toISOString()
    };
    appDb.set('users', id, newUser);
    adminUpsertSupabaseUser(newUser).catch(() => {});
    triggerSound('success');
    return newUser;
  };

  const adminDeleteUser = async (userId: string) => {
    appDb.delete('users', userId);
    adminDeleteSupabaseUser(userId).catch(() => {});
    triggerSound('alert');
  };

  const adminAdjustUserWallet = async (userId: string, amount: number, note?: string) => {
    const target = appDb.get<UserProfile>('users', userId);
    if (!target) return;
    const newBal = Math.max(0, (target.walletBalance || 0) + amount);
    appDb.update('users', userId, { walletBalance: newBal, notes: note || target.notes });
    if (user && user.id === userId) {
      const updated = { ...user, walletBalance: newBal };
      setUser(updated);
      setWalletBalance(newBal);
      localStorage.setItem('toto_saved_user', JSON.stringify(updated));
      localStorage.setItem('toto_wallet_balance', newBal.toString());
    }
    const refreshed = appDb.get<UserProfile>('users', userId);
    if (refreshed) {
      adminUpsertSupabaseUser(refreshed).catch(() => {});
    }
    triggerSound('success');
  };

  const adminToggleUserStatus = async (userId: string) => {
    const target = appDb.get<UserProfile>('users', userId);
    if (!target) return;
    const newStatus = target.status === 'blocked' ? 'active' : 'blocked';
    appDb.update('users', userId, { status: newStatus });
    if (user && user.id === userId) {
      const updated = { ...user, status: newStatus };
      setUser(updated);
      localStorage.setItem('toto_saved_user', JSON.stringify(updated));
    }
    const refreshed = appDb.get<UserProfile>('users', userId);
    if (refreshed) {
      adminUpsertSupabaseUser(refreshed).catch(() => {});
    }
    triggerSound('beep');
  };

  // Admin Ride Management
  const adminUpdateRide = async (rideId: string, updates: Partial<ActiveRide>) => {
    appDb.update('rides', rideId, updates);
    if (activeRide && activeRide.id === rideId) {
      setActiveRide({ ...activeRide, ...updates });
    }
    triggerSound('beep');
  };

  const adminCreateRide = async (rideData: Partial<ActiveRide>): Promise<ActiveRide> => {
    const id = rideData.id || `RIDE-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRide: ActiveRide = {
      id,
      userId: rideData.userId || 'usr_subrata',
      userName: rideData.userName || 'Passenger',
      userPhone: rideData.userPhone || '+91 98301 45289',
      userRating: rideData.userRating || 4.9,
      driverId: rideData.driverId,
      driverName: rideData.driverName,
      driverPhone: rideData.driverPhone,
      driverPhoto: rideData.driverPhoto,
      vehicleNumber: rideData.vehicleNumber,
      vehicleModel: rideData.vehicleModel,
      vehicleType: rideData.vehicleType || 'toto',
      pickup: rideData.pickup || {
        lat: 22.5735,
        lng: 88.4331,
        name: 'Sector V Metro Station',
        address: 'Sector V Metro Station, Salt Lake'
      },
      dropoff: rideData.dropoff || {
        lat: 22.5898,
        lng: 88.4082,
        name: 'City Centre 1 Mall',
        address: 'City Centre 1 Mall, DC Block, Salt Lake'
      },
      distanceKm: rideData.distanceKm ?? 2.0,
      estimatedMins: rideData.estimatedMins ?? 8,
      basePrice: rideData.basePrice ?? 35,
      discount: rideData.discount ?? 0,
      totalFare: rideData.totalFare ?? 35,
      driverEarnings: rideData.driverEarnings ?? 30,
      paymentMethod: rideData.paymentMethod || 'cash',
      paymentStatus: rideData.paymentStatus || 'paid',
      status: rideData.status || 'completed',
      otp: rideData.otp || generate4DigitOtp(),
      bookedAt: rideData.bookedAt || 'Just now',
      completedAt: rideData.completedAt,
    };
    appDb.set('rides', id, newRide);
    triggerSound('success');
    return newRide;
  };

  const adminDeleteRide = async (rideId: string) => {
    appDb.delete('rides', rideId);
    adminDeleteSupabaseRide(rideId).catch(() => {});
    if (activeRide && activeRide.id === rideId) {
      setActiveRide(null);
    }
    triggerSound('alert');
  };

  // Admin Driver Management
  const adminUpdateDriver = async (driverId: string, updates: Partial<DriverProfile>) => {
    appDb.update('drivers', driverId, updates);
    const target = appDb.get<DriverProfile>('drivers', driverId);
    if (target) {
      upsertSupabaseDriver(target).catch(() => {});
    }
    if (driver && driver.id === driverId) {
      setDriver({ ...driver, ...updates });
    }
    triggerSound('beep');
  };

  const adminCreateDriver = async (driverData: Partial<DriverProfile>): Promise<DriverProfile> => {
    const id = driverData.id || `drv_${Date.now().toString(36)}`;
    const pin = driverData.accessPin || Math.floor(1000 + Math.random() * 9000).toString();
    const newDriver: DriverProfile = {
      id,
      name: driverData.name || 'Toto Captain',
      phone: driverData.phone || '+91 98000 00000',
      photoUrl: driverData.photoUrl || `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80`,
      avatarUrl: driverData.avatarUrl || driverData.photoUrl || `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80`,
      kycVerified: true,
      rating: driverData.rating ?? 4.9,
      totalTrips: driverData.totalTrips ?? driverData.totalRides ?? 0,
      totalRides: driverData.totalRides ?? driverData.totalTrips ?? 0,
      vehicleType: driverData.vehicleType || 'toto',
      vehicleNumber: driverData.vehicleNumber || 'WB-24-ER-' + Math.floor(1000 + Math.random() * 9000),
      vehicleModel: driverData.vehicleModel || 'Mayuri Grand Li-ion E-Rickshaw',
      vehicleColor: driverData.vehicleColor || 'Emerald Green',
      isOnline: driverData.isOnline ?? true,
      availabilityStatus: driverData.availabilityStatus || 'online',
      todayEarnings: driverData.todayEarnings ?? 0,
      todayRides: driverData.todayRides ?? 0,
      acceptanceRate: driverData.acceptanceRate ?? 98,
      batteryPercentage: driverData.batteryPercentage ?? 85,
      pin,
      accessPin: pin,
      currentLat: driverData.currentLat || 22.5804,
      currentLng: driverData.currentLng || 88.4378,
      updatedAt: new Date().toISOString()
    };
    appDb.set('drivers', id, newDriver);
    upsertSupabaseDriver(newDriver).catch(() => {});
    triggerSound('success');
    return newDriver;
  };

  // Convert real online drivers into markers for Leaflet map display (filtering out stale updates)
  const simulatedDrivers: SimulatedDriverMarker[] = onlineDrivers
    .filter((d) => d.isOnline && d.availabilityStatus !== 'offline' && d.availabilityStatus !== 'inactive' && isDriverLocationFresh(d.lastLocationUpdate || d.updatedAt))
    .map((d, index) => ({
      id: d.id,
      name: `${d.name.split(' ')[0]} (Toto)`,
      vehicleType: d.vehicleType,
      vehicleNumber: d.vehicleNumber,
      lat: d.currentLat || 22.5804 + (index % 2 === 0 ? 0.002 : -0.002),
      lng: d.currentLng || 88.4378 + (index > 1 ? 0.002 : -0.002),
      heading: d.heading ?? (45 * index),
      isAvailable: d.isOnline && d.availabilityStatus !== 'busy' && d.availabilityStatus !== 'offline' && d.availabilityStatus !== 'inactive',
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
        isAuthLoading,
        availableTotoOffers,
        isScanningOffers,
        selectedOffer,
        findNearbyTotoOffers,
        selectTotoOfferAndBook,
        cancelOfferSearch,
        setActiveRole,
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
        advanceRideStage,
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
        adminProfile,
        adminExistsState,
        adminCredentials,
        refreshAdminStatus,
        setupInitialAdminAccount,
        loginAdmin,
        logoutAdmin,
        logoutAllAdminSessions,
        updateAdminCredentials,
        updateAdminPassword,
        allUsers,
        allRides,
        allDrivers,
        updateUserProfile,
        adminUpdateUser,
        adminCreateUser,
        adminDeleteUser,
        adminAdjustUserWallet,
        adminToggleUserStatus,
        adminUpdateRide,
        adminCreateRide,
        adminDeleteRide,
        adminUpdateDriver,
        adminCreateDriver,
        triggerSound,
        isSupabaseConnected,
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
