import type {ProviderProfile} from '../services/api/jobsApi';
import {isGenericPartnerName} from './partnerDisplayName';

function addressFilled(profile: ProviderProfile | null | undefined): boolean {
  const raw = profile?.address || profile?.location;
  if (!raw) return false;
  if (typeof raw === 'string') return raw.trim().length > 4;
  return Boolean(
    (typeof (raw as {address?: unknown}).address === 'string' &&
      (raw as {address: string}).address.trim()) ||
      (raw.pincode && String(raw.pincode).trim().length >= 6),
  );
}

function serviceFilled(profile: ProviderProfile | null | undefined): boolean {
  if (!profile) return false;
  return Boolean(
    profile.serviceType ||
      profile.specialization ||
      profile.specialty ||
      (Array.isArray(profile.serviceCategories) &&
        profile.serviceCategories[0]),
  );
}

export function isProfileIncomplete(
  profile: ProviderProfile | null | undefined,
): boolean {
  if (!profile) return true;
  const name = (profile.name || profile.displayName || '').trim();
  return (
    isGenericPartnerName(name) ||
    !serviceFilled(profile) ||
    !addressFilled(profile)
  );
}

/** Soft completeness score for Profile — never blocking. */
export function partnerProfileCompletionPercent(
  profile: ProviderProfile | null | undefined,
): number {
  if (!profile) return 0;
  const nameOk = !isGenericPartnerName(profile.name || profile.displayName);
  const checks = [nameOk, serviceFilled(profile), addressFilled(profile)];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

export function formatPartnerId(id?: string | null): string | null {
  const raw = String(id || '').replace(/[^a-zA-Z0-9]/g, '');
  if (raw.length < 4) return null;
  return raw.slice(-8).toUpperCase();
}
