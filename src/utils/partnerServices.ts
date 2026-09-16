import type {
  ProviderProfile,
  ServiceQualification,
  ServiceVerificationStatus,
} from '../services/api/jobsApi';

export function allPartnerServices(profile: ProviderProfile | null): string[] {
  if (!profile) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (raw?: string) => {
    const s = String(raw || '').trim();
    const key = s.toLowerCase();
    if (!s || seen.has(key)) return;
    seen.add(key);
    out.push(s);
  };
  add(profile.serviceType);
  add(profile.specialization);
  add(profile.specialty);
  if (Array.isArray(profile.serviceCategories)) {
    for (const s of profile.serviceCategories) add(s);
  }
  for (const q of profile.serviceQualifications || []) add(q.name);
  return out;
}

export function primaryPartnerService(profile: ProviderProfile | null): string {
  return (
    profile?.serviceType ||
    profile?.specialization ||
    profile?.specialty ||
    allPartnerServices(profile)[0] ||
    ''
  );
}

export function isPartnerServiceActive(
  profile: ProviderProfile | null,
  service: string,
): boolean {
  const inactive = (profile?.inactiveServiceCategories || []).map((s) =>
    s.toLowerCase(),
  );
  return !inactive.includes(service.toLowerCase());
}

export function qualificationOf(
  profile: ProviderProfile | null,
  service: string,
): ServiceQualification | undefined {
  return (profile?.serviceQualifications || []).find(
    (q) => String(q.name || '').toLowerCase() === service.toLowerCase(),
  );
}

export function verificationOf(
  profile: ProviderProfile | null,
  service: string,
): ServiceVerificationStatus {
  const q = qualificationOf(profile, service);
  const status = q?.verificationStatus;
  if (status === 'approved' || status === 'required' || status === 'rejected') {
    return status;
  }
  if (status === 'pending') {
    return q?.submittedAt ? 'pending' : 'required';
  }
  const account = String(profile?.approvalStatus || '').toLowerCase();
  if (account === 'rejected') return 'rejected';
  if (account === 'pending') return 'pending';
  return 'approved';
}

export function canReceiveJobs(
  profile: ProviderProfile | null,
  service: string,
): boolean {
  return (
    verificationOf(profile, service) === 'approved' &&
    isPartnerServiceActive(profile, service)
  );
}

export function serviceDetailsPath(service: string): string {
  return `/settings/services/${encodeURIComponent(service)}`;
}

export type ServiceCardAction = 'complete' | 'view' | 'update' | 'details';

export function serviceCardAction(
  status: ServiceVerificationStatus,
): ServiceCardAction {
  if (status === 'required') return 'complete';
  if (status === 'pending') return 'view';
  if (status === 'rejected') return 'update';
  return 'details';
}

/** i18n key for human-readable verification status (UI only). */
export function verificationStatusLabelKey(
  status: ServiceVerificationStatus,
): string {
  switch (status) {
    case 'required':
      return 'settings.verification.needsDocuments';
    case 'pending':
      return 'settings.verification.underReview';
    case 'rejected':
      return 'settings.verification.needsChanges';
    case 'approved':
    default:
      return 'settings.verification.approved';
  }
}

export function normalizeVerificationStatus(
  raw?: string | null,
): ServiceVerificationStatus {
  const s = String(raw || '').toLowerCase();
  if (s === 'approved' || s === 'pending' || s === 'required' || s === 'rejected') {
    return s;
  }
  return 'required';
}

export function serviceAssetDocKey(serviceName: string, docKey: string): string {
  const slug = serviceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 28);
  return `svc_${slug}_${docKey}`.slice(0, 64);
}
