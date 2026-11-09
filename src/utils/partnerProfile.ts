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

export function partnerIdProofFilled(
  profile: ProviderProfile | null | undefined,
): boolean {
  const docs = profile?.documents as
    | {idProof?: string; idProofNumber?: string}
    | undefined;
  return Boolean(
    docs?.idProof ||
      (docs?.idProofNumber && String(docs.idProofNumber).trim()),
  );
}

export type PartnerProfileStepKey =
  | 'basic'
  | 'mobile'
  | 'experience'
  | 'services'
  | 'idProof';

export type PartnerProfileStep = {
  key: PartnerProfileStepKey;
  done: boolean;
};

export const PARTNER_PROFILE_STEP_LABEL_KEY: Record<
  PartnerProfileStepKey,
  string
> = {
  basic: 'profile.stepBasic',
  mobile: 'profile.stepMobile',
  experience: 'profile.stepExperience',
  services: 'profile.stepServices',
  idProof: 'profile.stepIdProof',
};

export function partnerNameFilled(
  profile: ProviderProfile | null | undefined,
): boolean {
  return !isGenericPartnerName(profile?.name || profile?.displayName);
}

export function partnerAddressFilled(
  profile: ProviderProfile | null | undefined,
): boolean {
  return addressFilled(profile);
}

export function partnerPhotoFilled(
  profile: ProviderProfile | null | undefined,
): boolean {
  const url = profile?.profileImage || profile?.photo;
  return Boolean(url && String(url).trim());
}

export function partnerExperienceFilled(
  profile: ProviderProfile | null | undefined,
): boolean {
  return (
    serviceFilled(profile) &&
    typeof profile?.experience === 'number' &&
    Number.isFinite(profile.experience) &&
    profile.experience >= 0
  );
}

function mobileFilled(
  profile: ProviderProfile | null | undefined,
  phoneVerified?: boolean,
): boolean {
  if (phoneVerified || profile?.phoneVerified) return true;
  return Boolean(
    (profile?.phoneNumber && String(profile.phoneNumber).trim()) ||
      (profile?.phone && String(profile.phone).trim()),
  );
}

/** Checklist shown on the profile-completion prompt. */
export function partnerProfileSteps(
  profile: ProviderProfile | null | undefined,
  opts?: {phoneVerified?: boolean},
): PartnerProfileStep[] {
  const nameOk = !isGenericPartnerName(profile?.name || profile?.displayName);
  return [
    {
      key: 'basic',
      done: Boolean(profile) && nameOk && partnerAddressFilled(profile),
    },
    {key: 'mobile', done: mobileFilled(profile, opts?.phoneVerified)},
    {
      key: 'experience',
      done:
        typeof profile?.experience === 'number' &&
        Number.isFinite(profile.experience) &&
        profile.experience > 0,
    },
    {key: 'services', done: serviceFilled(profile)},
    {key: 'idProof', done: partnerIdProofFilled(profile)},
  ];
}

/** Soft completeness score for Profile — never blocking. */
export function partnerProfileCompletionPercent(
  profile: ProviderProfile | null | undefined,
  opts?: {phoneVerified?: boolean},
): number {
  const steps = partnerProfileSteps(profile, opts);
  const filled = steps.filter(step => step.done).length;
  return Math.round((filled / steps.length) * 100);
}

export function formatPartnerId(id?: string | null): string | null {
  const raw = String(id || '').replace(/[^a-zA-Z0-9]/g, '');
  if (raw.length < 4) return null;
  return raw.slice(-8).toUpperCase();
}

export function partnerApproved(
  profile: ProviderProfile | null | undefined,
): boolean {
  return (
    String(profile?.approvalStatus || '').toLowerCase() === 'approved' ||
    profile?.verified === true
  );
}

export type PartnerHomeDashStepKey =
  | 'mobile'
  | 'basic'
  | 'services'
  | 'documents'
  | 'verification';

export type PartnerHomeDashStep = {
  key: PartnerHomeDashStepKey;
  done: boolean;
};

export const PARTNER_HOME_DASH_LABEL_KEY: Record<
  PartnerHomeDashStepKey,
  string
> = {
  mobile: 'home.dashMobile',
  basic: 'home.dashBasic',
  services: 'home.dashServices',
  documents: 'home.dashDocuments',
  verification: 'home.dashVerification',
};

export const PARTNER_HOME_DASH_SCREEN: Record<
  PartnerHomeDashStepKey,
  'SettingsProfile' | 'MyServices'
> = {
  mobile: 'SettingsProfile',
  basic: 'SettingsProfile',
  services: 'MyServices',
  documents: 'SettingsProfile',
  verification: 'SettingsProfile',
};

/** Five home-dashboard steps — honest, never padded. Verified number is 20%. */
export function partnerHomeDashboardSteps(
  profile: ProviderProfile | null | undefined,
  opts?: {phoneVerified?: boolean},
): PartnerHomeDashStep[] {
  return [
    {key: 'mobile', done: mobileFilled(profile, opts?.phoneVerified)},
    {
      key: 'basic',
      done:
        Boolean(profile) &&
        partnerNameFilled(profile) &&
        partnerAddressFilled(profile),
    },
    {key: 'services', done: serviceFilled(profile)},
    {key: 'documents', done: partnerIdProofFilled(profile)},
    {key: 'verification', done: partnerApproved(profile)},
  ];
}

export function partnerHomeDashboardPercent(
  profile: ProviderProfile | null | undefined,
  opts?: {phoneVerified?: boolean},
): number {
  const steps = partnerHomeDashboardSteps(profile, opts);
  const filled = steps.filter(step => step.done).length;
  return Math.round((filled / steps.length) * 100);
}
