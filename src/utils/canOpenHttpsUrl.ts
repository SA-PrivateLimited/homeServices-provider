/**
 * True when the device can open an https: URL in a browser (Chrome, etc.).
 * Firebase Phone Auth reCAPTCHA uses VIEW https — without a handler the native
 * RecaptchaActivity throws ActivityNotFoundException and kills the app.
 */
import {Linking, Platform} from 'react-native';

const PROBE_URL = 'https://example.com';

export async function canOpenHttpsUrl(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      return await Linking.canOpenURL(PROBE_URL);
    }
    // iOS canOpenURL for https often needs LSApplicationQueriesSchemes; https is fine.
    return await Linking.canOpenURL(PROBE_URL);
  } catch {
    return false;
  }
}

export const BROWSER_REQUIRED_FOR_OTP_CODE = 'auth/browser-required';

export function isBrowserRequiredOtpError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as {code?: string}).code || '') : '';
  if (code === BROWSER_REQUIRED_FOR_OTP_CODE) return true;
  const message =
    error instanceof Error
      ? error.message
      : String((error as {message?: string}).message || '');
  const nativeMessage =
    'nativeErrorMessage' in error
      ? String((error as {nativeErrorMessage?: string}).nativeErrorMessage || '')
      : '';
  return /ActivityNotFoundException|No Activity found to handle Intent/i.test(
    `${message} ${nativeMessage}`,
  );
}
