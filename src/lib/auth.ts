import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';

/**
 * Starts the OAuth flow by generating PKCE parameters and opening the browser.
 *
 * This function:
 * 1. Calls the backend to generate PKCE parameters and get the auth URL
 * 2. Opens the authorization URL in the user's default browser
 *
 * The OAuth callback will be handled by the deep link handler,
 * which emits an 'auth-callback' event with the authorization code.
 *
 * @throws Error if the backend fails or browser cannot be opened
 */
export async function startOAuth(): Promise<void> {
  const authUrl = await invoke<string>('start_oauth');
  await open(authUrl);
}

/**
 * Completes the OAuth flow by exchanging the authorization code for tokens.
 *
 * This function should be called after receiving the 'auth-callback' event
 * with the authorization code from the deep link handler.
 *
 * On success, an 'auth-state-changed' event is emitted to notify the app
 * that the user is now signed in.
 *
 * @param code - The authorization code received from the OAuth callback
 * @throws Error if token exchange fails
 */
export async function completeOAuth(code: string): Promise<void> {
  await invoke('complete_oauth', { code });
}
