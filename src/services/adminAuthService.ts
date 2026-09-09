export interface AdminSafeProfile {
  id: string;
  admin_id: string;
  username: string;
  role: 'super_admin';
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  status: string;
  session_version?: number;
}

export interface SecurityActivityLog {
  id: string;
  event: string;
  timestamp: string;
  ip: string;
  success: boolean;
  details?: string;
}

export interface AdminSecurityInfo {
  admin_id: string;
  username: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  active_sessions_count: number;
  recent_activity: SecurityActivityLog[];
}

const TOKEN_STORAGE_KEY = 'toto_admin_auth_token';

export function getStoredAdminToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredAdminToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota or blocked errors
  }
}

/**
 * Check if the single administrator account exists on the backend
 */
export async function fetchAdminStatus(): Promise<{ admin_exists: boolean; initialized: boolean; admin_count: number }> {
  try {
    const res = await fetch('/api/admin/status');
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch admin status from backend:', err);
    // In local sandbox fallback, check if existing initialized admin exists
    const hasExisting = localStorage.getItem('toto_admin_exists') === 'true';
    return { admin_exists: hasExisting, initialized: hasExisting, admin_count: hasExisting ? 1 : 0 };
  }
}

/**
 * Initial Administrator Setup (Allowed ONLY once when admin_count == 0)
 */
export async function setupInitialAdmin(data: {
  username: string;
  password: string;
  confirmPassword: string;
}): Promise<{ success: boolean; message: string; admin?: AdminSafeProfile }> {
  const res = await fetch('/api/admin/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to setup administrator account.');
  }

  try {
    localStorage.setItem('toto_admin_exists', 'true');
  } catch {
    // ignore
  }

  return json;
}

/**
 * Admin Login via secure backend endpoint
 */
export async function loginAdminApi(data: {
  username: string;
  password: string;
}): Promise<{ success: boolean; token: string; admin: AdminSafeProfile }> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Invalid username or password.');
  }

  if (json.token) {
    setStoredAdminToken(json.token);
  }

  return json;
}

/**
 * Verify active admin session token with server
 */
export async function verifyAdminSessionApi(): Promise<{ authenticated: boolean; admin?: AdminSafeProfile }> {
  const token = getStoredAdminToken();
  if (!token) {
    return { authenticated: false };
  }

  try {
    const res = await fetch('/api/admin/verify-session', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      setStoredAdminToken(null);
      return { authenticated: false };
    }

    const json = await res.json();
    return json;
  } catch (err) {
    console.warn('Session verification network error:', err);
    return { authenticated: false };
  }
}

/**
 * Change Admin Username (maintains same ADMIN_001 account)
 */
export async function changeAdminUsernameApi(data: {
  currentPassword: string;
  newUsername: string;
}): Promise<{ success: boolean; message: string; admin?: AdminSafeProfile }> {
  const token = getStoredAdminToken();
  const res = await fetch('/api/admin/change-username', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`
    },
    body: JSON.stringify(data)
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to change admin username.');
  }
  return json;
}

/**
 * Change Admin Password (maintains same ADMIN_001 account, invalidates other sessions)
 */
export async function changeAdminPasswordApi(data: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ success: boolean; message: string; token?: string }> {
  const token = getStoredAdminToken();
  const res = await fetch('/api/admin/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`
    },
    body: JSON.stringify(data)
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to change admin password.');
  }

  if (json.token) {
    setStoredAdminToken(json.token);
  }

  return json;
}

/**
 * Terminate current session (Logout)
 */
export async function logoutAdminApi(): Promise<void> {
  const token = getStoredAdminToken();
  try {
    await fetch('/api/admin/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token || ''}`
      }
    });
  } catch {
    // Non-blocking
  }
  setStoredAdminToken(null);
}

/**
 * Terminate ALL active sessions across all devices
 */
export async function logoutAllAdminSessionsApi(): Promise<{ success: boolean; message: string }> {
  const token = getStoredAdminToken();
  const res = await fetch('/api/admin/logout-all', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token || ''}`
    }
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to terminate all sessions.');
  }

  setStoredAdminToken(null);
  return json;
}

/**
 * Get Security Dashboard Info (login history, session count, creation date)
 */
export async function fetchAdminSecurityInfoApi(): Promise<AdminSecurityInfo> {
  const token = getStoredAdminToken();
  const res = await fetch('/api/admin/security-info', {
    headers: {
      'Authorization': `Bearer ${token || ''}`
    }
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to load admin security information.');
  }
  return json.securityInfo;
}
