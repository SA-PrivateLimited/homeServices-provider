/**
 * Strip private Partner fields so UI never renders another Partner's phone,
 * email, street address, or identity documents — even if an API leaks them.
 */

const PRIVATE_KEYS = [
  'phone',
  'phoneNumber',
  'email',
  'fcmToken',
  'encryptedPin',
  'pinHash',
  'documents',
  'bankAccount',
  'bankDetails',
  'panNumber',
  'aadharNumber',
  'aadhaarNumber',
  'gstNumber',
  'address',
] as const;

export type PartnerLocation = {
  city?: string;
  district?: string;
  state?: string;
  stateId?: string;
  districtId?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
};

export type PublicPartner = {
  id: string;
  name: string;
  profession: string;
  serviceCategories: string[];
  location: PartnerLocation;
  isOnline: boolean;
  verified: boolean;
  rating?: number;
  totalReviews?: number;
  profileImage?: string;
  distanceKm?: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function locationFrom(raw: Record<string, unknown>): PartnerLocation {
  const loc = asRecord(raw.location);
  const addr = asRecord(raw.address);
  const pincode = str(loc.pincode || addr.pincode);
  return {
    city: str(loc.city || addr.city) || undefined,
    district: str(loc.district || addr.district || loc.city || addr.city) || undefined,
    state: str(loc.state || addr.state) || undefined,
    stateId: str(loc.stateId || addr.stateId) || undefined,
    districtId: str(loc.districtId || addr.districtId) || undefined,
    pincode: pincode && /^\d{4,6}$/.test(pincode) ? pincode : undefined,
    latitude: num(loc.latitude ?? addr.latitude),
    longitude: num(loc.longitude ?? addr.longitude),
  };
}

function professionFrom(raw: Record<string, unknown>): string {
  const specialization = str(raw.specialization);
  if (specialization) return specialization;
  const serviceType = str(raw.serviceType);
  if (serviceType) return serviceType;
  const cats = raw.serviceCategories;
  if (Array.isArray(cats) && cats[0]) return String(cats[0]);
  return str(raw.profession);
}

export function toPublicPartner(raw: unknown, fallbackId = ''): PublicPartner | null {
  const row = asRecord(raw);
  const id = str(row.id || row._id) || fallbackId;
  if (!id) return null;
  const rating = num(row.rating);
  const totalReviews = num(row.totalReviews);
  const categories = Array.isArray(row.serviceCategories)
    ? row.serviceCategories.map((c) => String(c)).filter(Boolean)
    : [];
  return {
    id,
    name: str(row.name || row.displayName),
    profession: professionFrom(row),
    serviceCategories: categories,
    location: locationFrom(row),
    isOnline: Boolean(row.isOnline),
    verified:
      row.verified === true || str(row.approvalStatus) === 'approved',
    rating: rating && rating > 0 ? rating : undefined,
    totalReviews: totalReviews && totalReviews > 0 ? totalReviews : undefined,
    profileImage: str(row.profileImage) || undefined,
  };
}

export function stripPrivatePartnerFields<T extends Record<string, unknown>>(
  raw: T,
): Omit<T, (typeof PRIVATE_KEYS)[number]> {
  const out = {...raw};
  for (const key of PRIVATE_KEYS) {
    delete out[key];
  }
  return out;
}

const PHONE_IN_TEXT = /(?:\+91[\s-]*)?\d{5}[\s-]?\d{5}|\b\d{10}\b/;

export function textExposesPhone(value: string): boolean {
  return PHONE_IN_TEXT.test(value.replace(/\s+/g, ' '));
}

export function partnerCardHasPrivateData(partner: PublicPartner): boolean {
  const blob = JSON.stringify(partner);
  if (PHONE_IN_TEXT.test(blob)) return true;
  if (/"phone"/i.test(blob) || /phoneNumber/i.test(blob)) return true;
  if (/"email"/i.test(blob)) return true;
  return false;
}

export function partnerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'P';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

export function partnerPlaceLabel(location: PartnerLocation): string {
  const district = location.district || location.city;
  const state = location.state;
  const pincode = location.pincode;
  const base = [district, state].filter(Boolean).join(', ');
  return pincode ? `${base} — ${pincode}` : base;
}
