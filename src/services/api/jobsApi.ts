import {apiGet, apiPost, apiPut} from './apiClient';
import {getMyProfile, type Provider} from './providersApi';

export type ServiceVerificationStatus =
  | 'approved'
  | 'pending'
  | 'required'
  | 'rejected';

export type PartnerVerificationMode = 'AUTO' | 'ADMIN';

export interface ServiceQualificationDocument {
  key?: string;
  label?: string;
  url?: string;
  fileName?: string;
  uploadedAt?: string;
}

export interface ServiceQualification {
  name?: string;
  verificationStatus?: ServiceVerificationStatus;
  rejectionReason?: string;
  experience?: number;
  notes?: string;
  serviceInfo?: Record<string, unknown>;
  documents?: ServiceQualificationDocument[];
  submittedAt?: string | null;
  reviewedAt?: string | null;
}

export interface ServiceDocumentRequirement {
  key: string;
  required?: boolean;
  label?: string;
  labelHi?: string;
}

export interface PartnerServiceDetails {
  serviceName: string;
  qualification: ServiceQualification | null;
  requiredDocuments: ServiceDocumentRequirement[];
  identityReady?: boolean;
  addressReady?: boolean;
  partnerVerificationMode?: PartnerVerificationMode;
}

export interface UpdatePartnerServicePayload {
  experience?: number;
  notes?: string;
  documents?: ServiceQualificationDocument[];
}

export interface ProviderAddress {
  type?: string;
  address?: string;
  landmark?: string;
  city?: string;
  district?: string;
  state?: string;
  stateId?: string;
  districtId?: string;
  blockId?: string;
  block?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
}

export interface ProviderDocuments {
  idProof?: string;
  addressProof?: string;
  certificate?: string;
  idProofVerified?: boolean;
  addressProofVerified?: boolean;
  certificateVerified?: boolean;
}

export interface ProviderProfile extends Provider {
  inactiveServiceCategories?: string[];
  serviceQualifications?: ServiceQualification[];
  partnerVerificationMode?: PartnerVerificationMode;
  documents?: ProviderDocuments;
}

export async function getMyProviderProfile(): Promise<ProviderProfile> {
  const me = await getMyProfile();
  return (me || {}) as ProviderProfile;
}

export async function updateProviderServiceAvailability(
  serviceName: string,
  active: boolean,
): Promise<ProviderProfile> {
  return apiPut<ProviderProfile>('/providers/me/service-availability', {
    serviceName,
    active,
  });
}

export async function addMyProviderService(
  serviceName: string,
): Promise<ProviderProfile> {
  return apiPost<ProviderProfile>('/providers/me/services', {serviceName});
}

export async function getMyServiceDetails(
  serviceName: string,
): Promise<PartnerServiceDetails> {
  return apiGet<PartnerServiceDetails>(
    `/providers/me/services/${encodeURIComponent(serviceName)}`,
  );
}

export async function updateMyServiceDetails(
  serviceName: string,
  payload: UpdatePartnerServicePayload,
): Promise<ProviderProfile> {
  return apiPut<ProviderProfile>(
    `/providers/me/services/${encodeURIComponent(serviceName)}`,
    payload,
  );
}

export async function submitMyServiceForReview(
  serviceName: string,
): Promise<ProviderProfile> {
  return apiPost<ProviderProfile>(
    `/providers/me/services/${encodeURIComponent(serviceName)}/submit`,
    {},
  );
}

export async function getJobCardById(id: string): Promise<{
  _id?: string;
  id?: string;
  serviceType?: string;
  customerAddress?: ProviderAddress;
}> {
  return apiGet(`/provider/jobCards/${encodeURIComponent(id)}`);
}

export interface ProviderJobCard {
  _id?: string;
  id?: string;
  status?: string;
  serviceType?: string;
  customerName?: string;
  customerPhone?: string;
  customerProfileImage?: string;
  customerAddress?: ProviderAddress;
  problem?: string;
  contact?: {canCallCustomer?: boolean};
  updatedAt?: string;
  createdAt?: string;
  cancellationReason?: string;
}

function unwrapJobCards(
  raw: ProviderJobCard[] | {data?: ProviderJobCard[]},
): ProviderJobCard[] {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.data)) return raw.data;
  return [];
}

export async function getMyJobCards(opts?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<ProviderJobCard[]> {
  // Build qs manually — RN's URLSearchParams.set is not implemented on Android.
  const parts: string[] = [];
  if (opts?.status) parts.push(`status=${encodeURIComponent(opts.status)}`);
  if (opts?.limit != null) parts.push(`limit=${encodeURIComponent(String(opts.limit))}`);
  if (opts?.offset != null) {
    parts.push(`offset=${encodeURIComponent(String(opts.offset))}`);
  }
  const qs = parts.join('&');
  const raw = await apiGet<
    ProviderJobCard[] | {data?: ProviderJobCard[]; count?: number}
  >(`/provider/jobCards${qs ? `?${qs}` : ''}`);
  return unwrapJobCards(raw);
}
