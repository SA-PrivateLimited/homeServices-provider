/**
 * Account-bound Partner biometric helpers for Settings.
 * Unlock itself lives in biometricAuth + LoginScreen (Keystore PIN, then loginPin).
 */
import {
  clearBinding,
  clearOfferSkipped,
  getBiometryKind,
  hasBinding,
} from './biometricAuth';

export async function getBiometricAvailability(): Promise<{
  available: boolean;
  kind: 'fingerprint' | 'face' | 'iris' | null;
}> {
  const kind = await getBiometryKind();
  return {available: Boolean(kind), kind};
}

export function biometricKindLabel(
  kind: 'fingerprint' | 'face' | 'iris' | null,
  t: (key: string) => string,
): string {
  if (kind === 'face') {
    return String(t('biometric.kindFace'));
  }
  if (kind === 'fingerprint') {
    return String(t('biometric.kindFingerprint'));
  }
  return String(t('biometric.kindBiometric'));
}

export async function isAccountBiometricEnabled(phone: string): Promise<boolean> {
  return hasBinding(phone);
}

export async function disableAccountBiometric(phone: string): Promise<void> {
  await clearBinding(phone);
}

export async function allowBiometricOfferNextLogin(phone: string): Promise<void> {
  await clearOfferSkipped(phone);
}
