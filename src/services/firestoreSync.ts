import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc,
  updateDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  DriverApprovalRequest, 
  DriverProfile, 
  ActiveRide, 
  TripRecord, 
  UserProfile 
} from '../types';

const APPROVALS_COLLECTION = 'driver_approvals';
const DRIVERS_COLLECTION = 'drivers';
const RIDES_COLLECTION = 'rides';
const TRIPS_COLLECTION = 'trips';
const USERS_COLLECTION = 'users';

/**
 * Strips undefined properties recursively so Firestore does not reject writes
 */
function sanitizeForFirestore<T>(data: T): Record<string, any> {
  if (!data || typeof data !== 'object') return {};
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(data as Record<string, any>)) {
    if (val !== undefined) {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        cleaned[key] = sanitizeForFirestore(val);
      } else {
        cleaned[key] = val;
      }
    }
  }
  return cleaned;
}

// ==============================================================================
// 1. DRIVER APPROVALS / KYC
// ==============================================================================

export async function saveDriverApprovalToFirestore(approval: DriverApprovalRequest): Promise<void> {
  try {
    const docRef = doc(db, APPROVALS_COLLECTION, approval.id);
    const sanitized = sanitizeForFirestore({
      ...approval,
      updatedAt: new Date().toISOString()
    });
    await setDoc(docRef, sanitized, { merge: true });
  } catch (err) {
    console.warn('Firestore: Could not save driver approval:', err);
  }
}

export async function fetchDriverApprovalsFromFirestore(): Promise<DriverApprovalRequest[]> {
  try {
    const colRef = collection(db, APPROVALS_COLLECTION);
    const snap = await getDocs(colRef);
    const results: DriverApprovalRequest[] = [];
    snap.forEach((d) => {
      results.push({ id: d.id, ...d.data() } as DriverApprovalRequest);
    });
    return results.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  } catch (err) {
    console.warn('Firestore: Could not fetch driver approvals:', err);
    return [];
  }
}

export async function updateDriverApprovalInFirestore(
  id: string, 
  updates: Partial<DriverApprovalRequest>
): Promise<void> {
  try {
    const docRef = doc(db, APPROVALS_COLLECTION, id);
    const sanitized = sanitizeForFirestore({
      ...updates,
      updatedAt: new Date().toISOString()
    });
    await setDoc(docRef, sanitized, { merge: true });
  } catch (err) {
    console.warn('Firestore: Could not update driver approval:', err);
  }
}

export async function deleteDriverApprovalFromFirestore(id: string): Promise<void> {
  try {
    const docRef = doc(db, APPROVALS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore: Could not delete driver approval:', err);
  }
}

export function subscribeToDriverApprovalsFirestore(
  callback: (approvals: DriverApprovalRequest[]) => void
): () => void {
  try {
    const colRef = collection(db, APPROVALS_COLLECTION);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const list: DriverApprovalRequest[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as DriverApprovalRequest);
        });
        const sorted = list.sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        callback(sorted);
      },
      (error) => {
        console.warn('Firestore real-time subscription error on driver_approvals:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to Firestore driver_approvals:', err);
    return () => {};
  }
}

// ==============================================================================
// 2. DRIVERS FLEET & LIVE GPS
// ==============================================================================

export async function saveDriverToFirestore(driver: DriverProfile): Promise<void> {
  try {
    const docRef = doc(db, DRIVERS_COLLECTION, driver.id);
    const sanitized = sanitizeForFirestore({
      ...driver,
      updatedAt: new Date().toISOString()
    });
    await setDoc(docRef, sanitized, { merge: true });
  } catch (err) {
    console.warn('Firestore: Could not save driver:', err);
  }
}

export async function updateDriverInFirestore(
  driverId: string, 
  updates: Partial<DriverProfile>
): Promise<void> {
  try {
    const docRef = doc(db, DRIVERS_COLLECTION, driverId);
    const sanitized = sanitizeForFirestore({
      ...updates,
      updatedAt: new Date().toISOString()
    });
    await setDoc(docRef, sanitized, { merge: true });
  } catch (err) {
    console.warn('Firestore: Could not update driver:', err);
  }
}

export async function fetchDriversFromFirestore(): Promise<DriverProfile[]> {
  try {
    const colRef = collection(db, DRIVERS_COLLECTION);
    const snap = await getDocs(colRef);
    const results: DriverProfile[] = [];
    snap.forEach((d) => {
      results.push({ id: d.id, ...d.data() } as DriverProfile);
    });
    return results;
  } catch (err) {
    console.warn('Firestore: Could not fetch drivers:', err);
    return [];
  }
}

export function subscribeToDriversFirestore(
  callback: (drivers: DriverProfile[]) => void
): () => void {
  try {
    const colRef = collection(db, DRIVERS_COLLECTION);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const list: DriverProfile[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as DriverProfile);
        });
        callback(list);
      },
      (error) => {
        console.warn('Firestore real-time subscription error on drivers:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to Firestore drivers:', err);
    return () => {};
  }
}

// ==============================================================================
// 3. AUTHORITATIVE REALTIME RIDES
// ==============================================================================

export async function saveRideToFirestore(ride: ActiveRide): Promise<void> {
  try {
    const docRef = doc(db, RIDES_COLLECTION, ride.id);
    const sanitized = sanitizeForFirestore({
      ...ride,
      updatedAt: new Date().toISOString()
    });
    await setDoc(docRef, sanitized, { merge: true });
  } catch (err) {
    console.warn('Firestore: Could not save ride:', err);
  }
}

export async function updateRideInFirestore(
  rideId: string, 
  updates: Partial<ActiveRide>
): Promise<void> {
  try {
    const docRef = doc(db, RIDES_COLLECTION, rideId);
    const sanitized = sanitizeForFirestore({
      ...updates,
      updatedAt: new Date().toISOString()
    });
    await setDoc(docRef, sanitized, { merge: true });
  } catch (err) {
    console.warn('Firestore: Could not update ride:', err);
  }
}

export async function fetchRidesFromFirestore(): Promise<ActiveRide[]> {
  try {
    const colRef = collection(db, RIDES_COLLECTION);
    const snap = await getDocs(colRef);
    const results: ActiveRide[] = [];
    snap.forEach((d) => {
      results.push({ id: d.id, ...d.data() } as ActiveRide);
    });
    return results.sort((a, b) => (b.bookedAt || '').localeCompare(a.bookedAt || ''));
  } catch (err) {
    console.warn('Firestore: Could not fetch rides:', err);
    return [];
  }
}

export function subscribeToRidesFirestore(
  callback: (rides: ActiveRide[]) => void
): () => void {
  try {
    const colRef = collection(db, RIDES_COLLECTION);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const list: ActiveRide[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as ActiveRide);
        });
        callback(list);
      },
      (error) => {
        console.warn('Firestore real-time subscription error on rides:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to Firestore rides:', err);
    return () => {};
  }
}

// ==============================================================================
// 4. COMPLETED TRIPS & REVENUE LEDGER
// ==============================================================================

export async function saveTripToFirestore(trip: TripRecord): Promise<void> {
  try {
    const docRef = doc(db, TRIPS_COLLECTION, trip.id);
    const sanitized = sanitizeForFirestore({
      ...trip,
      updatedAt: new Date().toISOString()
    });
    await setDoc(docRef, sanitized, { merge: true });
  } catch (err) {
    console.warn('Firestore: Could not save trip:', err);
  }
}

export async function fetchTripsFromFirestore(): Promise<TripRecord[]> {
  try {
    const colRef = collection(db, TRIPS_COLLECTION);
    const snap = await getDocs(colRef);
    const results: TripRecord[] = [];
    snap.forEach((d) => {
      results.push({ id: d.id, ...d.data() } as TripRecord);
    });
    return results.sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());
  } catch (err) {
    console.warn('Firestore: Could not fetch trips:', err);
    return [];
  }
}

export function subscribeToTripsFirestore(
  callback: (trips: TripRecord[]) => void
): () => void {
  try {
    const colRef = collection(db, TRIPS_COLLECTION);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const list: TripRecord[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as TripRecord);
        });
        const sorted = list.sort(
          (a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
        );
        callback(sorted);
      },
      (error) => {
        console.warn('Firestore real-time subscription error on trips:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to Firestore trips:', err);
    return () => {};
  }
}

// ==============================================================================
// 5. USER PROFILES
// ==============================================================================

export async function saveUserToFirestore(user: UserProfile): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, user.id);
    const sanitized = sanitizeForFirestore({
      ...user,
      updatedAt: new Date().toISOString()
    });
    await setDoc(docRef, sanitized, { merge: true });
  } catch (err) {
    console.warn('Firestore: Could not save user:', err);
  }
}

export function subscribeToUsersFirestore(
  callback: (users: UserProfile[]) => void
): () => void {
  try {
    const colRef = collection(db, USERS_COLLECTION);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as UserProfile);
        });
        callback(list);
      },
      (error) => {
        console.warn('Firestore real-time subscription error on users:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to Firestore users:', err);
    return () => {};
  }
}

