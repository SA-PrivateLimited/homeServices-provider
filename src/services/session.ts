/**
 * Backend JWT session for provider app (phone + OTP + PIN).
 * Remembers phone for 30 days so revisit asks for PIN only.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const JWT_STORAGE_KEY = 'hs_provider_jwt';
export const USER_STORAGE_KEY = 'hs_provider_user';
export const SESSION_EXPIRES_KEY = 'hs_provider_session_expires';
export const REMEMBERED_PHONE_KEY = 'hs_provider_remembered_phone';
export const REMEMBERED_DIAL_KEY = 'hs_provider_remembered_dial';
export const REMEMBERED_EXPIRES_KEY = 'hs_provider_remembered_expires';

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface RememberedPhone {
  phoneLocal: string;
  dialCode: string;
  fullPhone: string;
  expiresAt: number;
}

export async function getStoredJwt(): Promise<string | null> {
  try {
    const expiresRaw = await AsyncStorage.getItem(SESSION_EXPIRES_KEY);
    if (expiresRaw) {
      const expiresAt = Number(expiresRaw);
      if (Number.isFinite(expiresAt) && Date.now() > expiresAt) {
        await clearSession();
        return null;
      }
    }
    return await AsyncStorage.getItem(JWT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function setSession(
  token: string,
  user: any,
  ttlMs: number = SESSION_TTL_MS,
): Promise<void> {
  const expiresAt = Date.now() + ttlMs;
  await AsyncStorage.multiSet([
    [JWT_STORAGE_KEY, token],
    [USER_STORAGE_KEY, JSON.stringify(user)],
    [SESSION_EXPIRES_KEY, String(expiresAt)],
  ]);

  const phoneLocal = String(user.phone || '')
    .replace(/\D/g, '')
    .slice(-10);
  const phoneE164 = String(user.phoneNumber || user.phone || '');
  let dialCode = '+91';
  if (phoneE164.startsWith('+') && phoneLocal) {
    dialCode = phoneE164.slice(0, phoneE164.length - phoneLocal.length) || '+91';
  }
  if (phoneLocal.length === 10) {
    await rememberPhone(phoneLocal, dialCode, ttlMs);
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([
    JWT_STORAGE_KEY,
    USER_STORAGE_KEY,
    SESSION_EXPIRES_KEY,
  ]);
}

export async function clearAllCredentials(): Promise<void> {
  await AsyncStorage.multiRemove([
    JWT_STORAGE_KEY,
    USER_STORAGE_KEY,
    SESSION_EXPIRES_KEY,
    REMEMBERED_PHONE_KEY,
    REMEMBERED_DIAL_KEY,
    REMEMBERED_EXPIRES_KEY,
  ]);
}

/** Logout: clear JWT only; keep remembered phone for PIN-only return. */
export async function logoutProvider(): Promise<void> {
  await clearSession();
  await AsyncStorage.removeItem('currentUser');
}

export async function rememberPhone(
  phoneLocal: string,
  dialCode: string,
  ttlMs: number = SESSION_TTL_MS,
): Promise<void> {
  const local = phoneLocal.replace(/\D/g, '').slice(-10);
  if (local.length !== 10) return;
  const expiresAt = Date.now() + ttlMs;
  await AsyncStorage.multiSet([
    [REMEMBERED_PHONE_KEY, local],
    [REMEMBERED_DIAL_KEY, dialCode || '+91'],
    [REMEMBERED_EXPIRES_KEY, String(expiresAt)],
  ]);
}

export async function getRememberedPhone(): Promise<RememberedPhone | null> {
  try {
    const [[, phone], [, dial], [, expiresRaw]] = await AsyncStorage.multiGet([
      REMEMBERED_PHONE_KEY,
      REMEMBERED_DIAL_KEY,
      REMEMBERED_EXPIRES_KEY,
    ]);
    if (!phone) return null;
    const expiresAt = Number(expiresRaw || 0);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
      await AsyncStorage.multiRemove([
        REMEMBERED_PHONE_KEY,
        REMEMBERED_DIAL_KEY,
        REMEMBERED_EXPIRES_KEY,
      ]);
      return null;
    }
    const dialCode = dial || '+91';
    return {
      phoneLocal: phone,
      dialCode,
      fullPhone: `${dialCode}${phone}`,
      expiresAt,
    };
  } catch {
    return null;
  }
}

export async function readStoredUser(): Promise<any | null> {
  try {
    const jwt = await getStoredJwt();
    if (!jwt) return null;
    const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function normalizeUser(user: any): any {
  const id = user.id || user._id || '';
  return {
    ...user,
    id,
    _id: user._id || id,
    phone: user.phone || user.phoneNumber,
    phoneNumber: user.phoneNumber || user.phone,
    phoneVerified: user.phoneVerified !== false,
    role: 'provider',
  };
}

/** Mongo / session user id (replaces Firebase auth().currentUser.uid). */
export function getUserId(user: any | null | undefined): string | null {
  if (!user) return null;
  const id = user.id || user._id || user.uid;
  return id ? String(id) : null;
}

/** True when a non-expired JWT session exists. */
export async function isLoggedIn(): Promise<boolean> {
  const jwt = await getStoredJwt();
  return Boolean(jwt);
}

/** Resolve session user or throw (for services that previously used Firebase auth). */
export async function requireSessionUser(): Promise<any> {
  const user = await readStoredUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  return normalizeUser(user);
}
