import { api } from '@/lib/tauri';
import type { ProfileSummary } from '@/bindings';

/**
 * Scans browser cookies for a SoundCloud oauth_token, verifies it
 * against the API, and caches the result. Emits an auth state event.
 *
 * @param profileKey Optional profile key to use (persisted from prior selection)
 * @returns true if a valid token was found, false otherwise
 * @throws Error if the check fails
 */
export async function checkAuth(profileKey: string | null = null): Promise<boolean> {
  return api.checkAuth(profileKey);
}

/**
 * Re-scans browser cookies on demand (e.g., after user logs in via browser).
 * Same logic as checkAuth.
 *
 * @returns true if a valid token was found, false otherwise
 * @throws Error if the refresh fails
 */
export async function refreshAuth(): Promise<boolean> {
  return api.refreshAuth();
}

/**
 * Signs out the user by clearing cached auth state.
 *
 * Note: This does NOT delete the browser cookie — the user remains logged in
 * to SoundCloud in their browser. It only clears the app's cached token.
 *
 * @throws Error if sign-out fails
 */
export async function signOut(): Promise<void> {
  await api.signOut();
}

/**
 * Lists all available browser profiles with SoundCloud accounts.
 * Each profile is verified via the SoundCloud /me endpoint.
 *
 * @returns Array of profile summaries with username, avatar, and plan info
 * @throws Error if the listing fails
 */
export async function listProfiles(): Promise<ProfileSummary[]> {
  return api.listProfiles();
}

export function checkFirefoxInstalled(): Promise<boolean> {
  return api.checkFirefoxInstalled();
}

export async function openInFirefox(): Promise<void> {
  await api.openInFirefox();
}
