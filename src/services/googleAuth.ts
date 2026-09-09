import { auth, googleProvider } from './firebase';
import { signInWithPopup } from 'firebase/auth';

export const GOOGLE_OAUTH_CLIENT_ID = '718315600068-8gicep5jci2hklqru4aun2olg01et2iu.apps.googleusercontent.com';

export interface GoogleAuthResult {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verifiedEmail?: boolean;
}

/**
 * Attempts authentic Google authentication for end users using:
 * 1. Google Identity Services (GSI OAuth2 Token Client via Google Cloud Console)
 * 2. Firebase Google Auth Popup
 * Throws a typed error if the domain requires manual user account verification (e.g., unauthorized domain in preview iframe)
 */
export async function authenticateWithGoogleCloud(): Promise<GoogleAuthResult> {
  // 1. Try Google Identity Services (GSI) if available on window
  if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
    try {
      const google = (window as any).google;
      const tokenPromise = new Promise<string>((resolve, reject) => {
        try {
          const client = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_OAUTH_CLIENT_ID,
            scope: 'openid email profile',
            prompt: 'select_account',
            callback: (response: any) => {
              if (response?.error) {
                reject(new Error(response.error_description || response.error));
              } else if (response?.access_token) {
                resolve(response.access_token);
              } else {
                reject(new Error('No access token received from Google'));
              }
            },
            error_callback: (err: any) => {
              reject(err);
            }
          });

          client.requestAccessToken({ prompt: 'select_account' });
        } catch (e) {
          reject(e);
        }
      });

      // Set timeout for token acquisition
      const accessToken = await Promise.race([
        tokenPromise,
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Google OAuth timed out')), 45000)
        )
      ]);

      // Fetch user profile from Google UserInfo API
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!userinfoRes.ok) {
        throw new Error('Failed to fetch user profile from Google');
      }

      const info = await userinfoRes.json();
      return {
        id: info.sub || `g_${Date.now()}`,
        email: info.email,
        name: info.name || info.email.split('@')[0],
        picture: info.picture,
        verifiedEmail: Boolean(info.email_verified)
      };
    } catch (gsiErr: any) {
      console.warn('GSI OAuth notice, trying Firebase Google Provider fallback:', gsiErr?.message || gsiErr);
    }
  }

  // 2. Try Firebase signInWithPopup
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const u = result.user;
    return {
      id: u.uid,
      email: u.email || 'passenger@totodrive.in',
      name: u.displayName || (u.email ? u.email.split('@')[0] : 'Passenger'),
      picture: u.photoURL || undefined,
      verifiedEmail: u.emailVerified
    };
  } catch (fbErr: any) {
    // If domain is unauthorized or popup blocked, rethrow with specific tag so UI can offer Google Account Selector
    const msg = fbErr?.message || '';
    const isDomainRestricted =
      fbErr?.code === 'auth/unauthorized-domain' ||
      msg.toLowerCase().includes('unauthorized-domain') ||
      fbErr?.code === 'auth/operation-not-allowed';

    if (isDomainRestricted) {
      const err = new Error('GOOGLE_UNAUTHORIZED_DOMAIN');
      (err as any).code = 'auth/unauthorized-domain';
      throw err;
    }
    throw fbErr;
  }
}
