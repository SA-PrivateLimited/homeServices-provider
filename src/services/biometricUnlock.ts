/**
 * Local Face / Fingerprint unlock for returning Partner sessions.
 * Does not change backend auth, PIN rules, or Firebase OTP.
 * Biometrics only gate an already-stored JWT session; PIN remains fallback.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBiometrics, {
  BiometryTypes,
  type BiometryType,
} from 'react-native-biometrics';

export const BIOMETRIC_UNLOCK_ENABLED_KEY = 'hs_provider_biometric_unlock';

const rnBiometrics = new ReactNativeBiometrics({
  allowDeviceCredentials: false,
});

export type BiometricAvailability = {
  available: boolean;
  biometryType?: BiometryType;
  error?: string;
};

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  try {
    const result = await rnBiometrics.isSensorAvailable();
    return {
      available: Boolean(result.available),
      biometryType: result.biometryType,
      error: result.error,
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unavailable';
    return {available: false, error: message};
  }
}

export async function isBiometricUnlockEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(BIOMETRIC_UNLOCK_ENABLED_KEY);
    return raw === '1' || raw === 'true';
  } catch {
    return false;
  }
}

export async function setBiometricUnlockEnabled(
  enabled: boolean,
): Promise<void> {
  if (enabled) {
    await AsyncStorage.setItem(BIOMETRIC_UNLOCK_ENABLED_KEY, '1');
  } else {
    await AsyncStorage.removeItem(BIOMETRIC_UNLOCK_ENABLED_KEY);
  }
}

/** Provider-friendly label for the sensor type. */
export function biometricKindLabel(
  biometryType: BiometryType | undefined,
  t: (key: string) => string,
): string {
  if (biometryType === BiometryTypes.FaceID) {
    return String(t('biometric.kindFace'));
  }
  if (biometryType === BiometryTypes.TouchID) {
    return String(t('biometric.kindFingerprint'));
  }
  // Android reports generic "Biometrics" for face or fingerprint.
  return String(t('biometric.kindBiometric'));
}

export async function promptBiometricUnlock(options: {
  promptMessage: string;
  cancelButtonText: string;
}): Promise<{success: boolean; error?: string}> {
  try {
    const result = await rnBiometrics.simplePrompt({
      promptMessage: options.promptMessage,
      cancelButtonText: options.cancelButtonText,
    });
    return {success: Boolean(result.success), error: result.error};
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'failed';
    return {success: false, error: message};
  }
}

/**
 * Prove the sensor works, then persist the preference.
 * Returns false if the user cancels or hardware fails.
 */
export async function enableBiometricUnlock(options: {
  promptMessage: string;
  cancelButtonText: string;
}): Promise<{enabled: boolean; error?: string}> {
  const availability = await getBiometricAvailability();
  if (!availability.available) {
    return {
      enabled: false,
      error: availability.error || 'unavailable',
    };
  }
  const prompted = await promptBiometricUnlock(options);
  if (!prompted.success) {
    return {enabled: false, error: prompted.error};
  }
  await setBiometricUnlockEnabled(true);
  return {enabled: true};
}
