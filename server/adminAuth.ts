import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface AdminRecord {
  id: 'ADMIN_001';
  admin_id: 'ADMIN_001';
  username: string;
  password_hash: string;
  role: 'super_admin';
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  status: 'active';
  session_version: number;
}

export interface SecurityLogEvent {
  id: string;
  event: string;
  timestamp: string;
  ip: string;
  success: boolean;
  details?: string;
}

export interface SessionData {
  token: string;
  admin_id: string;
  createdAt: number;
  expiresAt: number;
  sessionVersion: number;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const ADMIN_FILE = path.join(DATA_DIR, 'admin_account.json');
const LOGS_FILE = path.join(DATA_DIR, 'admin_security_logs.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn('Could not create data dir:', err);
  }
}

// In-memory active sessions (token -> SessionData)
const activeSessions = new Map<string, SessionData>();

// Rate limiting map: key -> { count: number, firstAttempt: number, lockedUntil?: number }
const loginRateLimit = new Map<string, { count: number; firstAttempt: number; lockedUntil?: number }>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

// In-memory cache for fast access, backed by disk
let cachedAdmin: AdminRecord | null = null;
let securityLogs: SecurityLogEvent[] = [];

// Initialize data from disk
function loadAdminFromDisk(): AdminRecord | null {
  try {
    if (fs.existsSync(ADMIN_FILE)) {
      const data = fs.readFileSync(ADMIN_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && parsed.admin_id === 'ADMIN_001' && parsed.role === 'super_admin') {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading admin file:', err);
  }
  return null;
}

function saveAdminToDisk(admin: AdminRecord | null) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (admin) {
      fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin, null, 2), 'utf-8');
    } else if (fs.existsSync(ADMIN_FILE)) {
      fs.unlinkSync(ADMIN_FILE);
    }
  } catch (err) {
    console.error('Error saving admin file:', err);
  }
}

function loadLogsFromDisk(): SecurityLogEvent[] {
  try {
    if (fs.existsSync(LOGS_FILE)) {
      const data = fs.readFileSync(LOGS_FILE, 'utf-8');
      return JSON.parse(data) || [];
    }
  } catch {
    // ignore
  }
  return [];
}

function saveLogsToDisk(logs: SecurityLogEvent[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs.slice(-100), null, 2), 'utf-8');
  } catch {
    // ignore
  }
}

// Initialize cached states
cachedAdmin = loadAdminFromDisk();
securityLogs = loadLogsFromDisk();

/**
 * Log a security activity event
 */
export function logSecurityActivity(event: string, ip: string, success: boolean, details?: string) {
  const logItem: SecurityLogEvent = {
    id: `log_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    event,
    timestamp: new Date().toISOString(),
    ip,
    success,
    details
  };
  securityLogs.unshift(logItem);
  if (securityLogs.length > 100) {
    securityLogs = securityLogs.slice(0, 100);
  }
  saveLogsToDisk(securityLogs);
}

/**
 * Password Hashing with scrypt and random salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

/**
 * Verify Password using constant-time equality check
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    if (!storedHash) return false;
    const parts = storedHash.split(':');
    if (parts.length === 3 && parts[0] === 'scrypt') {
      const salt = parts[1];
      const originalHash = Buffer.from(parts[2], 'hex');
      const testHash = crypto.scryptSync(password, salt, 64);
      if (originalHash.length !== testHash.length) return false;
      return crypto.timingSafeEqual(originalHash, testHash);
    }
    // Fallback for legacy plain or simple hashes
    return password === storedHash;
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}

/**
 * Check if the single admin account exists
 */
export function adminExists(): boolean {
  if (!cachedAdmin) {
    cachedAdmin = loadAdminFromDisk();
  }
  return cachedAdmin !== null && cachedAdmin.status === 'active';
}

/**
 * Get current admin record (without password hash)
 */
export function getAdminSafe() {
  const admin = getAdminRecord();
  if (!admin) return null;
  return {
    id: admin.id,
    admin_id: admin.admin_id,
    username: admin.username,
    role: admin.role,
    created_at: admin.created_at,
    updated_at: admin.updated_at,
    last_login_at: admin.last_login_at,
    status: admin.status,
    session_version: admin.session_version
  };
}

/**
 * Get raw admin record
 */
export function getAdminRecord(): AdminRecord | null {
  if (!cachedAdmin) {
    cachedAdmin = loadAdminFromDisk();
  }
  return cachedAdmin;
}

/**
 * Validate username format
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  const trimmed = username.trim();
  if (!trimmed) {
    return { valid: false, error: 'Username is required.' };
  }
  if (trimmed.length < 3 || trimmed.length > 32) {
    return { valid: false, error: 'Username must be between 3 and 32 characters.' };
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, hyphens, dots, and underscores.' };
  }
  return { valid: true };
}

/**
 * Enforce strong password requirements
 */
export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (!password) {
    return { valid: false, error: 'Password is required.' };
  }
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters long.' };
  }
  // Check for some complexity
  const hasLetters = /[a-zA-Z]/.test(password);
  const hasNumbersOrSpecial = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  if (!hasLetters || !hasNumbersOrSpecial) {
    return { valid: false, error: 'Password must include both letters and numbers or symbols.' };
  }
  return { valid: true };
}

/**
 * 1. SINGLE ADMIN ACCOUNT RULE:
 * Setup the FIRST and ONLY admin account.
 * Rejects if an admin account already exists.
 */
export function createInitialAdmin(username: string, password: string, ip: string): { success: boolean; message: string; admin?: any } {
  if (adminExists()) {
    logSecurityActivity('Attempted Duplicate Admin Registration Rejected', ip, false, `Attempted user: ${username}`);
    throw new Error('Admin account already exists. Registration is disabled.');
  }

  const uCheck = validateUsername(username);
  if (!uCheck.valid) {
    return { success: false, message: uCheck.error! };
  }

  const pCheck = validatePasswordStrength(password);
  if (!pCheck.valid) {
    return { success: false, message: pCheck.error! };
  }

  const now = new Date().toISOString();
  const hashedPassword = hashPassword(password);

  const newAdmin: AdminRecord = {
    id: 'ADMIN_001',
    admin_id: 'ADMIN_001',
    username: username.trim(),
    password_hash: hashedPassword,
    role: 'super_admin',
    created_at: now,
    updated_at: now,
    last_login_at: null,
    status: 'active',
    session_version: 1
  };

  cachedAdmin = newAdmin;
  saveAdminToDisk(newAdmin);

  logSecurityActivity('Initial Super Admin Account Created', ip, true, `admin_id: ADMIN_001, username: ${newAdmin.username}`);

  return {
    success: true,
    message: 'Administrator account created successfully.',
    admin: getAdminSafe()
  };
}

/**
 * Check rate limit for an IP
 */
export function checkRateLimit(ip: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const record = loginRateLimit.get(ip);
  if (!record) return { allowed: true };

  if (record.lockedUntil && now < record.lockedUntil) {
    const remaining = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, waitSeconds: remaining };
  }

  // Reset if window has elapsed
  if (now - record.firstAttempt > ATTEMPT_WINDOW_MS) {
    loginRateLimit.delete(ip);
    return { allowed: true };
  }

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_WINDOW_MS;
    return { allowed: false, waitSeconds: Math.ceil(LOCKOUT_WINDOW_MS / 1000) };
  }

  return { allowed: true };
}

export function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const record = loginRateLimit.get(ip);
  if (!record) {
    loginRateLimit.set(ip, { count: 1, firstAttempt: now });
  } else {
    record.count += 1;
    if (record.count >= MAX_FAILED_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_WINDOW_MS;
    }
  }
}

export function resetRateLimit(ip: string) {
  loginRateLimit.delete(ip);
}

/**
 * Authenticate Admin Login
 */
export function authenticateAdmin(username: string, password: string, ip: string): { success: boolean; token?: string; error?: string } {
  // Check rate limit
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    logSecurityActivity('Admin Login Blocked by Rate Limit', ip, false, `Lockout remaining: ${rateLimit.waitSeconds}s`);
    return {
      success: false,
      error: `Too many failed login attempts. Please wait ${rateLimit.waitSeconds} seconds before trying again.`
    };
  }

  const admin = getAdminRecord();
  if (!admin || admin.status !== 'active') {
    return { success: false, error: 'Admin account does not exist. Please complete initial setup.' };
  }

  // Compare username (case-sensitive or trimmed)
  const isUsernameMatch = admin.username.trim().toLowerCase() === username.trim().toLowerCase();
  const isPasswordMatch = isUsernameMatch && verifyPassword(password, admin.password_hash);

  if (!isUsernameMatch || !isPasswordMatch) {
    recordFailedAttempt(ip);
    logSecurityActivity('Failed Admin Login Attempt', ip, false, `Input user: "${username.slice(0, 15)}"`);
    // Generic error: never reveal whether username or password was incorrect
    return { success: false, error: 'Invalid username or password.' };
  }

  // Success
  resetRateLimit(ip);
  const now = new Date().toISOString();
  admin.last_login_at = now;
  saveAdminToDisk(admin);

  // Generate cryptographically secure session token
  const token = crypto.randomBytes(32).toString('hex');
  const sessionData: SessionData = {
    token,
    admin_id: admin.admin_id,
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    sessionVersion: admin.session_version
  };
  activeSessions.set(token, sessionData);

  logSecurityActivity('Admin Login Succeeded', ip, true, `User: ${admin.username}, admin_id: ${admin.admin_id}`);

  return { success: true, token };
}

/**
 * Validate session token
 */
export function validateSessionToken(token: string | undefined): { valid: boolean; admin?: any } {
  if (!token) return { valid: false };

  const session = activeSessions.get(token);
  if (!session) return { valid: false };

  // Check expiration
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return { valid: false };
  }

  const admin = getAdminRecord();
  if (!admin || admin.status !== 'active') {
    return { valid: false };
  }

  // Verify session version matches (invalidated on logout-all or password change)
  if (session.sessionVersion !== admin.session_version) {
    activeSessions.delete(token);
    return { valid: false };
  }

  return { valid: true, admin: getAdminSafe() };
}

/**
 * Invalidate a specific session (Logout)
 */
export function invalidateSession(token: string | undefined) {
  if (token) {
    activeSessions.delete(token);
  }
}

/**
 * Invalidate ALL sessions (Logout All Sessions)
 */
export function invalidateAllSessions(ip: string): boolean {
  const admin = getAdminRecord();
  if (!admin) return false;

  admin.session_version = (admin.session_version || 1) + 1;
  admin.updated_at = new Date().toISOString();
  saveAdminToDisk(admin);

  activeSessions.clear();
  logSecurityActivity('All Admin Sessions Terminated', ip, true);
  return true;
}

/**
 * Change Admin Username (keeps the SAME single admin account ADMIN_001)
 */
export function changeAdminUsername(currentPassword: string, newUsername: string, ip: string): { success: boolean; message: string; admin?: any } {
  const admin = getAdminRecord();
  if (!admin) {
    return { success: false, message: 'Admin account not found.' };
  }

  if (!verifyPassword(currentPassword, admin.password_hash)) {
    logSecurityActivity('Failed Change Username (Bad Current Password)', ip, false);
    return { success: false, message: 'Verification failed: Current password is incorrect.' };
  }

  const uCheck = validateUsername(newUsername);
  if (!uCheck.valid) {
    return { success: false, message: uCheck.error! };
  }

  const oldName = admin.username;
  admin.username = newUsername.trim();
  admin.updated_at = new Date().toISOString();
  saveAdminToDisk(admin);

  logSecurityActivity('Admin Username Changed', ip, true, `Changed from "${oldName}" to "${admin.username}"`);

  return {
    success: true,
    message: `Admin username updated to "${admin.username}" successfully.`,
    admin: getAdminSafe()
  };
}

/**
 * Change Admin Password (keeps the SAME single admin account ADMIN_001)
 */
export function changeAdminPassword(
  currentPassword: string, 
  newPassword: string, 
  confirmPassword: string, 
  ip: string
): { success: boolean; message: string } {
  const admin = getAdminRecord();
  if (!admin) {
    return { success: false, message: 'Admin account not found.' };
  }

  if (!verifyPassword(currentPassword, admin.password_hash)) {
    logSecurityActivity('Failed Change Password (Bad Current Password)', ip, false);
    return { success: false, message: 'Verification failed: Current password is incorrect.' };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, message: 'New password and confirmation do not match.' };
  }

  const pCheck = validatePasswordStrength(newPassword);
  if (!pCheck.valid) {
    return { success: false, message: pCheck.error! };
  }

  // Hash new password securely
  admin.password_hash = hashPassword(newPassword);
  admin.session_version = (admin.session_version || 1) + 1; // Invalidate other sessions
  admin.updated_at = new Date().toISOString();
  saveAdminToDisk(admin);

  // Clear older sessions so re-login is required on other devices
  activeSessions.clear();

  logSecurityActivity('Admin Password Changed', ip, true, 'All other sessions invalidated');

  return {
    success: true,
    message: 'Admin password changed successfully. Other sessions have been signed out.'
  };
}

/**
 * Get Security Dashboard Data
 */
export function getAdminSecurityInfo() {
  const admin = getAdminRecord();
  if (!admin) return null;

  return {
    admin_id: admin.admin_id,
    username: admin.username,
    role: admin.role,
    status: admin.status,
    created_at: admin.created_at,
    updated_at: admin.updated_at,
    last_login_at: admin.last_login_at,
    active_sessions_count: activeSessions.size,
    recent_activity: securityLogs.slice(0, 15)
  };
}
