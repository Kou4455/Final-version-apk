import { createClient } from '@supabase/supabase-js';

// Retrieve Supabase credentials from environment
const rawUrl = (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL || '' : '').trim();
const rawKey = (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY || '' : '').trim();

// Format URL safely (handling raw project ref e.g. "nmvenxrhqvukgtnmsbhu" or missing https)
export function formatSupabaseUrl(url) {
  if (!url) return 'https://nmvenxrhqvukgtnmsbhu.supabase.co';
  let formatted = url.trim();
  if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
    formatted = `https://${formatted}`;
  }
  if (!formatted.includes('.') && !formatted.includes(':')) {
    formatted = `${formatted}.supabase.co`;
  }
  return formatted;
}

export const SUPABASE_URL = formatSupabaseUrl(rawUrl);
export const SUPABASE_ANON_KEY = rawKey || 'sb_publishable_placeholder_key';

// Initialize Supabase Client with full browser storage and auth listeners
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

export default supabase;
