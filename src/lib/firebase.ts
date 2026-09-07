// Local Real-Time Reactive Store & Auth Provider
// Replaces Firebase Firestore & Auth with a fast, resilient client-side storage engine.

// Standardized Operation Type and Error Info
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

export type DocumentData = Record<string, any>;
export type Unsubscribe = () => void;

export interface FirebaseUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  emailVerified?: boolean;
  isAnonymous?: boolean;
  tenantId?: string | null;
  providerData?: {
    providerId: string;
    email?: string | null;
  }[];
}

// Local mock App and Auth
export const app = { name: '[LOCAL_OFFLINE_STORE]' };
export const db = { name: '[LOCAL_REACTIVE_STORE]' };

export const auth = {
  currentUser: null as FirebaseUser | null,
};

export const googleProvider = {
  providerId: 'google.com',
  setCustomParameters: () => {},
};

// Quota helpers (Firebase Firestore disabled - quota is never exceeded)
export function isQuotaExceededError(_error: unknown): boolean {
  return false;
}

export function getIsQuotaExceeded(): boolean {
  return false;
}

export function getGlobalQuotaMetric(): 'write' | 'read' | 'general' {
  return 'general';
}

export function getGlobalQuotaMessage(): string {
  return '';
}

export function subscribeToQuotaErrors(_listener: (info: FirestoreErrorInfo) => void): () => void {
  return () => {};
}

export function markQuotaExceeded(_errorOrMsg?: unknown) {}

// In-Memory & LocalStorage Local Store
const localDocMemory = new Map<string, any>();

// Initialize memory from existing localStorage keys
try {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('fs_')) {
      const path = key.slice(3);
      try {
        const val = JSON.parse(localStorage.getItem(key) || '{}');
        localDocMemory.set(path, val);
      } catch {}
    }
  }
} catch {}

const localListeners = new Set<{
  path: string;
  isDoc: boolean;
  constraints?: any[];
  callback: (snapshot: any) => void;
}>();

// BroadcastChannel for instant cross-tab real-time reactivity
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    broadcastChannel = new BroadcastChannel('totodrive_local_sync');
    broadcastChannel.onmessage = (event) => {
      const { path, action, data } = event.data || {};
      if (path) {
        if (action === 'delete') {
          localDocMemory.delete(path);
        } else if (data) {
          localDocMemory.set(path, data);
        }
        dispatchLocalUpdate(path, false);
      }
    };
  }
} catch {}

// Cross-tab storage fallback listener
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('fs_')) {
      const path = e.key.slice(3);
      if (e.newValue) {
        try {
          localDocMemory.set(path, JSON.parse(e.newValue));
        } catch {}
      } else {
        localDocMemory.delete(path);
      }
      dispatchLocalUpdate(path, false);
    }
  });
}

function dispatchLocalUpdate(pathChanged: string, broadcast = true) {
  if (broadcast && broadcastChannel) {
    try {
      const data = localDocMemory.get(pathChanged);
      broadcastChannel.postMessage({
        path: pathChanged,
        action: data ? 'update' : 'delete',
        data,
      });
    } catch {}
  }

  localListeners.forEach(({ path, isDoc, constraints, callback }) => {
    try {
      if (isDoc) {
        if (path === pathChanged) {
          callback(getLocalDocSnapshot(path));
        }
      } else {
        const collectionPath = path;
        if (pathChanged.startsWith(collectionPath + '/') || pathChanged === collectionPath) {
          callback(getLocalDocsSnapshot(collectionPath, constraints));
        }
      }
    } catch (err) {
      console.debug('Error notifying listener:', err);
    }
  });
}

function saveToLocalStore(path?: string, data?: any, options?: { merge?: boolean }) {
  if (!path) return;
  try {
    let toSave = data;
    if (options?.merge && localDocMemory.has(path)) {
      toSave = { ...localDocMemory.get(path), ...data };
    }
    localDocMemory.set(path, toSave);
    try {
      localStorage.setItem('fs_' + path, JSON.stringify(toSave));
    } catch {}
    dispatchLocalUpdate(path, true);
  } catch {}
}

function updateInLocalStore(path?: string, updates?: any) {
  if (!path) return;
  try {
    const existing = localDocMemory.get(path) || {};
    const merged = { ...existing, ...updates };
    localDocMemory.set(path, merged);
    try {
      localStorage.setItem('fs_' + path, JSON.stringify(merged));
    } catch {}
    dispatchLocalUpdate(path, true);
  } catch {}
}

function deleteFromLocalStore(path?: string) {
  if (!path) return;
  localDocMemory.delete(path);
  try {
    localStorage.removeItem('fs_' + path);
  } catch {}
  dispatchLocalUpdate(path, true);
}

function createMockDocSnapshot(id: string, data: any) {
  return {
    id,
    exists: () => data !== null && data !== undefined,
    data: () => data,
  };
}

function createMockQuerySnapshot(items: Array<{ id: string; data: any }>) {
  const docs = items.map((item) => createMockDocSnapshot(item.id, item.data));
  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (callback: (doc: any) => void) => {
      docs.forEach(callback);
    },
  };
}

function getLocalDocSnapshot(path?: string) {
  if (!path) return createMockDocSnapshot('', null);
  let data = localDocMemory.get(path);
  if (!data) {
    try {
      const stored = localStorage.getItem('fs_' + path);
      if (stored) {
        data = JSON.parse(stored);
        localDocMemory.set(path, data);
      }
    } catch {}
  }
  const id = path.split('/').pop() || '';
  return createMockDocSnapshot(id, data || null);
}

function applyQueryConstraints(items: Array<{ id: string; data: any }>, constraints: any[] = []) {
  let result = [...items];
  for (const c of constraints) {
    if (!c) continue;
    if (c.type === 'where') {
      result = result.filter((item) => {
        const val = item.data?.[c.field];
        if (c.op === '==' || c.op === '===') return val === c.val;
        if (c.op === '!=') return val !== c.val;
        if (c.op === '>') return val > c.val;
        if (c.op === '>=') return val >= c.val;
        if (c.op === '<') return val < c.val;
        if (c.op === '<=') return val <= c.val;
        if (c.op === 'array-contains') return Array.isArray(val) && val.includes(c.val);
        return true;
      });
    } else if (c.type === 'orderBy') {
      result.sort((a, b) => {
        const va = a.data?.[c.field] ?? '';
        const vb = b.data?.[c.field] ?? '';
        const comp = String(va).localeCompare(String(vb));
        return c.dir === 'desc' ? -comp : comp;
      });
    } else if (c.type === 'limit') {
      result = result.slice(0, c.n);
    }
  }
  return result;
}

function getLocalDocsSnapshot(collectionPath?: string, constraints: any[] = []) {
  if (!collectionPath) return createMockQuerySnapshot([]);
  const items: Array<{ id: string; data: any }> = [];

  localDocMemory.forEach((val, p) => {
    if (p.startsWith(collectionPath + '/')) {
      const id = p.split('/').pop() || '';
      items.push({ id, data: val });
    }
  });

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('fs_' + collectionPath + '/')) {
        const p = key.replace('fs_', '');
        const id = p.split('/').pop() || '';
        if (!items.some((it) => it.id === id)) {
          const val = JSON.parse(localStorage.getItem(key) || '{}');
          items.push({ id, data: val });
        }
      }
    }
  } catch {}

  const filtered = applyQueryConstraints(items, constraints);
  return createMockQuerySnapshot(filtered);
}

// Document and Collection Reference Helpers
export function doc(_db: any, ...pathSegments: string[]): { id: string; path: string } {
  const cleanPath = pathSegments.filter(Boolean).join('/');
  const id = cleanPath.split('/').pop() || '';
  return { id, path: cleanPath };
}

export function collection(_db: any, ...pathSegments: string[]): { path: string } {
  const cleanPath = pathSegments.filter(Boolean).join('/');
  return { path: cleanPath };
}

export function query(target: any, ...constraints: any[]): { path: string; constraints: any[] } {
  const path = target?.path || '';
  const existingConstraints = target?.constraints || [];
  return { path, constraints: [...existingConstraints, ...constraints] };
}

export function where(field: string, op: string, val: any) {
  return { type: 'where', field, op, val };
}

export function orderBy(field: string, dir: 'asc' | 'desc' = 'asc') {
  return { type: 'orderBy', field, dir };
}

export function limit(n: number) {
  return { type: 'limit', n };
}

export function serverTimestamp(): string {
  return new Date().toISOString();
}

// Local Document Operations
export async function setDoc(docRef: any, data: any, options?: any): Promise<void> {
  saveToLocalStore(docRef?.path, data, options);
}

export async function updateDoc(docRef: any, dataOrField: any, ...moreFields: any[]): Promise<void> {
  let updates = dataOrField;
  if (typeof dataOrField === 'string' && moreFields.length > 0) {
    updates = { [dataOrField]: moreFields[0] };
  }
  updateInLocalStore(docRef?.path, updates);
}

export async function addDoc(colRef: any, data: any): Promise<{ id: string; path: string }> {
  const colPath = colRef?.path || 'col';
  const autoId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const docRef = { id: autoId, path: `${colPath}/${autoId}` };
  saveToLocalStore(docRef.path, { id: autoId, ...data });
  return docRef;
}

export async function deleteDoc(docRef: any): Promise<void> {
  deleteFromLocalStore(docRef?.path);
}

export async function getDoc(docRef: any): Promise<any> {
  return getLocalDocSnapshot(docRef?.path);
}

export async function getDocs(queryOrCol: any): Promise<any> {
  return getLocalDocsSnapshot(queryOrCol?.path, queryOrCol?.constraints);
}

export function onSnapshot(
  target: any,
  onNext: (snapshot: any) => void,
  _onError?: (error: any) => void
): Unsubscribe {
  const path = target?.path || '';
  const constraints = target?.constraints || [];
  const isDoc = Boolean(path && path.includes('/') && path.split('/').length % 2 === 0);

  try {
    const snap = isDoc ? getLocalDocSnapshot(path) : getLocalDocsSnapshot(path, constraints);
    onNext(snap);
  } catch {}

  const listenerObj = { path, isDoc, constraints, callback: onNext };
  localListeners.add(listenerObj);

  return () => {
    localListeners.delete(listenerObj);
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.debug('Local Store notification:', { error, operationType, path });
}

// Sanitizer utility
export function sanitizeForFirestore<T = any>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    if (data.length > 0 && Array.isArray(data[0])) {
      return data.map((item) => {
        if (Array.isArray(item) && item.length === 2 && typeof item[0] === 'number') {
          return { lat: Number(item[0].toFixed(6)), lng: Number(item[1].toFixed(6)) };
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

// Firebase Auth compatibility stubs (Firebase Auth disabled)
export async function signInWithPopup(_auth: any, _provider: any): Promise<any> {
  throw new Error('Firebase Auth is disabled. Please use Supabase Google Sign-In or mobile verification.');
}

export async function signOut(_auth: any): Promise<void> {}

export async function signInAnonymously(_auth: any): Promise<any> {
  const user: FirebaseUser = {
    uid: 'local_' + Date.now(),
    isAnonymous: true,
  };
  return { user };
}

export function onAuthStateChanged(_auth: any, callback: (user: FirebaseUser | null) => void): Unsubscribe {
  callback(null);
  return () => {};
}
