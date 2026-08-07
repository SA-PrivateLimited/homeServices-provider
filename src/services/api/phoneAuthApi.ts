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

/**
 * Optional probe — Firebase mode does not send SMS.
 * Prefer client Firebase Phone Auth for actual OTP delivery.
 */
export async function sendPhoneOtp(phoneNumber: string): Promise<{
  phoneNumber: string;
  provider?: string;
  status?: string;
  channel?: string;
  dev?: boolean;
  otp?: string;
  expiresAt?: string;
  expiresInSeconds?: number;
}> {
  return apiPost('/auth/phone/send-otp', {phoneNumber}, {skipAuth: true});
}

export async function resetPin(
  phoneNumber: string,
  pin: string,
  opts: {idToken: string} | {code: string},
): Promise<PinAuthResult> {
  const body: Record<string, string> = {phoneNumber, pin};
  if ('idToken' in opts) body.idToken = opts.idToken;
  else body.code = opts.code;

  return apiPost<PinAuthResult>('/auth/phone/reset-pin', body, {
    skipAuth: true,
  });
}

export async function registerWithOtp(
  phoneNumber: string,
  pin: string,
  opts: {idToken: string; fullName?: string} | {code: string; fullName?: string},
): Promise<PinAuthResult> {
  const body: Record<string, string> = {
    phoneNumber,
    pin,
    fullName: opts.fullName || 'Provider',
    role: ROLE,
  };
  if ('idToken' in opts) body.idToken = opts.idToken;
  else body.code = opts.code;

  return apiPost<PinAuthResult>('/auth/phone/register-with-otp', body, {
    skipAuth: true,
  });
}
