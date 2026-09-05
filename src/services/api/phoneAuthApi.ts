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

export async function enablePartnerProfile(
  phoneNumber: string,
  pin: string,
): Promise<PinAuthResult> {
  return apiPost<PinAuthResult>(
    '/auth/phone/enable-partner-profile',
    {phoneNumber, pin},
    {skipAuth: true},
  );
}

export async function resetPin(
  phoneNumber: string,
  pin: string,
  opts: {idToken: string},
): Promise<PinAuthResult> {
  return apiPost<PinAuthResult>(
    '/auth/phone/reset-pin',
    {phoneNumber, pin, idToken: opts.idToken},
    {skipAuth: true},
  );
}

export async function registerWithOtp(
  phoneNumber: string,
  pin: string,
  opts: {idToken: string; fullName?: string},
): Promise<PinAuthResult> {
  const body: Record<string, string> = {
    phoneNumber,
    pin,
    fullName: opts.fullName || 'Provider',
    role: ROLE,
    idToken: opts.idToken,
  };
  return apiPost<PinAuthResult>('/auth/phone/register-with-otp', body, {
    skipAuth: true,
  });
}

/** POST /auth/logout — best-effort; local session is still cleared by the caller. */
export async function logoutRemote(): Promise<void> {
  try {
    await apiPost('/auth/logout', {});
  } catch {
    // JWT is stateless; local logout still proceeds
  }
}
