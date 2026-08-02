import {apiPost} from './apiClient';

const ROLE = 'provider' as const;

export interface PhoneLookupResult {
  phoneNumber: string;
  localPhone: string;
  exists: boolean;
  hasPin: boolean;
  role?: string | null;
  roleMatch?: boolean;
  requestedRole?: string;
}

export interface PinAuthResult {
  user: any;
  token: string;
  pin?: string;
  expiresIn?: string;
}

export async function lookupPhone(
  phoneNumber: string,
): Promise<PhoneLookupResult> {
  return apiPost<PhoneLookupResult>(
    '/auth/phone/lookup',
    {phoneNumber, role: ROLE},
    {skipAuth: true},
  );
}

export async function loginPin(
  phoneNumber: string,
  pin: string,
): Promise<PinAuthResult> {
  return apiPost<PinAuthResult>(
    '/auth/phone/login-pin',
    {phoneNumber, pin, role: ROLE},
    {skipAuth: true},
  );
}

export async function sendPhoneOtp(phoneNumber: string): Promise<{
  phoneNumber: string;
  status?: string;
  channel?: string;
  dev?: boolean;
  otp?: string;
  expiresAt?: string;
  expiresInSeconds?: number;
}> {
  return apiPost(
    '/auth/phone/send-otp',
    {phoneNumber},
    {skipAuth: true},
  );
}

export async function resetPin(
  phoneNumber: string,
  code: string,
  pin: string,
): Promise<PinAuthResult> {
  return apiPost<PinAuthResult>(
    '/auth/phone/reset-pin',
    {phoneNumber, code, pin},
    {skipAuth: true},
  );
}

export async function registerWithOtp(
  phoneNumber: string,
  code: string,
  pin: string,
  fullName?: string,
): Promise<PinAuthResult> {
  return apiPost<PinAuthResult>(
    '/auth/phone/register-with-otp',
    {
      phoneNumber,
      code,
      pin,
      fullName: fullName || 'Provider',
      role: ROLE,
    },
    {skipAuth: true},
  );
}
