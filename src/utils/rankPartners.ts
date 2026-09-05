/**
 * Rank Partners for a job: profession, then same district → same state → other.
 * Distance is used only when both sides have real coordinates.
 */

import type {PartnerLocation, PublicPartner} from './partnerPrivacy';

export type RankOrigin = {
  district?: string;
  city?: string;
  state?: string;
  districtId?: string;
  stateId?: string;
  latitude?: number;
  longitude?: number;
};

export type RankOptions = {
  serviceType?: string;
  origin?: RankOrigin | null;
  excludeId?: string;
  onlineOnly?: boolean;
};

function norm(value?: string): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function professionMatches(
  partner: PublicPartner,
  serviceType?: string,
): boolean {
  const needed = norm(serviceType);
  if (!needed) return true;
  if (norm(partner.profession) === needed) return true;
  return partner.serviceCategories.some((c) => norm(c) === needed);
}

function sameDistrict(partner: PublicPartner, origin?: RankOrigin | null): boolean {
  if (!origin) return false;
  if (origin.districtId && partner.location.districtId) {
    return origin.districtId === partner.location.districtId;
  }
  const want = norm(origin.district || origin.city);
  if (!want) return false;
  return (
    norm(partner.location.district) === want ||
    norm(partner.location.city) === want
  );
}

function sameState(partner: PublicPartner, origin?: RankOrigin | null): boolean {
  if (!origin) return false;
  if (origin.stateId && partner.location.stateId) {
    return origin.stateId === partner.location.stateId;
  }
  const want = norm(origin.state);
  if (!want) return false;
  return norm(partner.location.state) === want;
}

/** 0 same district, 1 same state, 2 elsewhere */
export function locationBand(
  partner: PublicPartner,
  origin?: RankOrigin | null,
): 0 | 1 | 2 {
  if (sameDistrict(partner, origin)) return 0;
  if (sameState(partner, origin)) return 1;
  return 2;
}

export function haversineKm(
  a: {latitude?: number; longitude?: number},
  b: {latitude?: number; longitude?: number},
): number | undefined {
  const lat1 = a.latitude;
  const lon1 = a.longitude;
  const lat2 = b.latitude;
  const lon2 = b.longitude;
  if (
    lat1 == null ||
    lon1 == null ||
    lat2 == null ||
    lon2 == null ||
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return undefined;
  }
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function withDistance(
  partner: PublicPartner,
  origin?: RankOrigin | null,
): PublicPartner {
  if (!origin) return partner;
  const km = haversineKm(origin, partner.location);
  if (km == null) return partner;
  return {...partner, distanceKm: Math.round(km * 10) / 10};
}

export function rankPartners(
  partners: PublicPartner[],
  options: RankOptions = {},
): PublicPartner[] {
  const exclude = options.excludeId ? String(options.excludeId) : '';
  return partners
    .filter((p) => {
      if (!p.id) return false;
      if (!exclude) return true;
      return p.id !== exclude;
    })
    .filter((p) => (options.onlineOnly ? p.isOnline : true))
    .map((p) => withDistance(p, options.origin))
    .sort((a, b) => {
      const aProf = professionMatches(a, options.serviceType) ? 0 : 1;
      const bProf = professionMatches(b, options.serviceType) ? 0 : 1;
      if (aProf !== bProf) return aProf - bProf;
      const aLoc = locationBand(a, options.origin);
      const bLoc = locationBand(b, options.origin);
      if (aLoc !== bLoc) return aLoc - bLoc;
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      if (a.verified !== b.verified) return a.verified ? -1 : 1;
      const aDist = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const bDist = b.distanceKm ?? Number.POSITIVE_INFINITY;
      if (aDist !== bDist) return aDist - bDist;
      const aRate = a.rating ?? -1;
      const bRate = b.rating ?? -1;
      return bRate - aRate;
    });
}

export function takeRelevant(
  partners: PublicPartner[],
  options: RankOptions = {},
  limit = 5,
): PublicPartner[] {
  const ranked = rankPartners(partners, options);
  const matching = options.serviceType
    ? ranked.filter((p) => professionMatches(p, options.serviceType))
    : ranked;
  const pool = matching.length ? matching : ranked;
  return pool.slice(0, Math.max(1, limit));
}

export type LocationFilter =
  | 'nearby'
  | 'my-district'
  | 'my-state'
  | 'all-states';

export function applyLocationFilter(
  partners: PublicPartner[],
  filter: LocationFilter,
  origin?: RankOrigin | null,
): PublicPartner[] {
  if (filter === 'all-states' || !origin) return partners;
  if (filter === 'my-district' || filter === 'nearby') {
    const same = partners.filter((p) => sameDistrict(p, origin));
    if (filter === 'my-district') return same;
    if (same.length) return same;
    return partners.filter((p) => sameState(p, origin));
  }
  if (filter === 'my-state') {
    return partners.filter((p) => sameState(p, origin));
  }
  return partners;
}
