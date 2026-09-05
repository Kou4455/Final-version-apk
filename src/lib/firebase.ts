import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  signInAnonymously,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  initializeFirestore, 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  type DocumentData,
  type Unsubscribe
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore with the exact database ID from config
// Force long-polling to prevent WebChannel stream buffering / 10s timeout errors in sandboxed iframes and proxy layers
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);

// Initialize Firebase Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Standardized Operation Type and Error Info conforming to Firebase Skill specification
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function isQuotaExceededError(error: unknown): boolean {
  if (!error) return false;
  const str = error instanceof Error ? error.message : (typeof error === 'string' ? error : JSON.stringify(error));
  const code = (error as any)?.code;
  return (
    code === 'resource-exhausted' ||
    str.includes('Quota limit exceeded') ||
    str.includes('Quota exceeded') ||
    str.includes('resource-exhausted') ||
    str.includes('Free daily read units')
  );
}

type QuotaListener = (info: FirestoreErrorInfo) => void;
const quotaListeners = new Set<QuotaListener>();

export function subscribeToQuotaErrors(listener: QuotaListener): () => void {
  quotaListeners.add(listener);
  return () => {
    quotaListeners.delete(listener);
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const isQuota = isQuotaExceededError(error);

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };

  if (isQuota) {
    console.warn('Firestore Quota Notice (running in resilient local mode):', JSON.stringify(errInfo));
    quotaListeners.forEach((fn) => {
      try {
        fn(errInfo);
      } catch (lErr) {
        console.warn('Quota listener handler error:', lErr);
      }
    });
    // Do not throw an uncaught exception on quota exhaustion so the application remains interactive
    return;
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Sanitizes an object before persisting to Cloud Firestore:
 * 1. Converts nested coordinate arrays [[lat, lng], ...] into arrays of objects [{ lat, lng }, ...]
 *    because Firestore explicitly rejects nested arrays (arrays inside arrays).
 * 2. Strips all undefined properties because Firestore throws on undefined field values.
 */
export function sanitizeForFirestore<T = any>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    // Detect nested arrays like [[lat, lng], ...]
    if (data.length > 0 && Array.isArray(data[0])) {
      return data.map((item) => {
        if (Array.isArray(item)) {
          if (item.length === 2 && typeof item[0] === 'number' && typeof item[1] === 'number') {
            return { lat: Number(item[0].toFixed(6)), lng: Number(item[1].toFixed(6)) };
          }
          return { item };
        }
        return sanitizeForFirestore(item);
      }) as unknown as T;
    }
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        sanitized[key] = sanitizeForFirestore(value);
      }
    }
    return sanitized as T;
  }
  return data;
}

export {
  signInWithPopup,
  signOut,
  signInAnonymously,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  type FirebaseUser,
  type DocumentData,
  type Unsubscribe
};
