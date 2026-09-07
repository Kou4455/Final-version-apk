import { SupabaseClient, User as SupabaseUser, Session } from '@supabase/supabase-js';
import { UserProfile } from '../types';
import { supabase, getSupabaseClient, isSupabaseConfigured, supabaseConfig } from './supabaseClient';

export { supabase, getSupabaseClient, isSupabaseConfigured, supabaseConfig };

/**
 * Checks if Google OAuth provider is enabled in the Supabase instance
 */
export async function checkGoogleOAuthStatus(): Promise<{ enabled: boolean; reason?: string }> {
  try {
    const res = await fetch('/api/auth/google/check');
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.debug('Error checking Google OAuth provider status:', err);
  }
  return { enabled: false };
}

/**
 * Initiates Google OAuth authentication via Supabase using popup or redirect
 */
export async function signInWithGoogleSupabase(redirectUrl?: string): Promise<{
  success: boolean;
  user?: UserProfile;
  providerEnabled?: boolean;
}> {
  const client = getSupabaseClient();
  const callbackUrl = redirectUrl || `${window.location.origin}/auth/callback`;
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  try {
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
        skipBrowserRedirect: isIframe,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      console.warn('Google sign-in notification:', error.message);
      return { success: false, providerEnabled: false };
    }

    if (data?.url) {
      if (isIframe) {
        const popup = window.open(
          data.url,
          'supabase_google_auth',
          'width=540,height=680,menubar=no,toolbar=no,status=no'
        );
        if (!popup) {
          throw new Error('Sign-in popup was blocked by your browser. Please allow popups for this site.');
        }
      } else {
        window.location.href = data.url;
        return { success: true };
      }
    }

    return { success: true, providerEnabled: true };
  } catch (err) {
    console.warn('OAuth attempt result:', err);
    return { success: false, providerEnabled: false };
  }
}

/**
 * Signs out from Supabase Auth
 */
export async function signOutSupabase(): Promise<void> {
  const client = getSupabaseClient();
  await client.auth.signOut().catch(() => {});
}

/**
 * Maps a Supabase authenticated user to the application's UserProfile format
 */
export function mapSupabaseUserToProfile(sbUser: SupabaseUser): UserProfile {
  const metadata = sbUser.user_metadata || {};
  const fullName = metadata.full_name || metadata.name || metadata.displayName || 'Passenger';
  const email = sbUser.email || metadata.email || `${sbUser.id.slice(0, 8)}@totodrive.in`;
  const avatarUrl =
    metadata.avatar_url ||
    metadata.picture ||
    `https://api.dicebear.com/7.x/micah/svg?seed=${sbUser.id}`;
  const phone = sbUser.phone || metadata.phone || '+91 98301 45289';

  return {
    id: sbUser.id,
    name: fullName,
    phone,
    email,
    rating: 4.95,
    totalRides: 0,
    walletBalance: 250,
    avatarUrl,
    createdAt: sbUser.created_at || new Date().toISOString(),
    savedPlaces: {},
  };
}

/**
 * Subscribes to Supabase Auth state changes
 */
export function onSupabaseAuthStateChange(
  callback: (session: Session | null, user: SupabaseUser | null) => void
): () => void {
  const client = getSupabaseClient();
  const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
    callback(session, session?.user || null);
  });

  return () => {
    subscription.unsubscribe();
  };
}

export default supabase;
