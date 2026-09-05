import {apiGet, apiPost, apiPut, ApiError} from './apiClient';
import {
  toPublicPartner,
  type PublicPartner,
} from '../../utils/partnerPrivacy';

export type PartnerListFilters = {
  serviceType?: string;
  city?: string;
  state?: string;
  district?: string;
  stateId?: string;
  districtId?: string;
  isOnline?: boolean;
  /** Name, mobile digits, or area — server-side; phone never returned. */
  q?: string;
  limit?: number;
  offset?: number;
};

function unwrapList<T>(data: T[] | {data: T[]}): T[] {
  if (Array.isArray(data)) return data;
  return data?.data || [];
}

export async function listCollaborationPartners(
  filters?: PartnerListFilters,
): Promise<PublicPartner[]> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
  }
  const qs = params.toString();
  const endpoint = qs
    ? `/provider/partners?${qs}`
    : '/provider/partners';
  try {
    const response = await apiGet<unknown[] | {data: unknown[]}>(endpoint);
    return unwrapList(response)
      .map((row) => toPublicPartner(row))
      .filter((p): p is PublicPartner => Boolean(p));
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 501)) {
      return listPublicProvidersFallback(filters);
    }
    throw err;
  }
}

/** Fallback when collaboration browse is not deployed yet. */
async function listPublicProvidersFallback(
  filters?: PartnerListFilters,
): Promise<PublicPartner[]> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
  }
  const qs = params.toString();
  const endpoint = qs ? `/providers?${qs}` : '/providers';
  const response = await apiGet<unknown[] | {data: unknown[]}>(endpoint);
  return unwrapList(response)
    .map((row) => toPublicPartner(row))
    .filter((p): p is PublicPartner => Boolean(p));
}

export async function requestPartnerContact(providerId: string): Promise<string> {
  const data = await apiPost<{phone?: string}>(
    `/provider/partners/${encodeURIComponent(providerId)}/contact`,
    {},
  );
  const phone = data?.phone?.trim();
  if (!phone) {
    throw new ApiError('Contact is not available for this Partner right now.', 404);
  }
  return phone;
}

export async function lookupPartnerProfession(
  providerId: string,
  fallbackQuery?: string,
): Promise<string | undefined> {
  const rows = await listCollaborationPartners({
    q: fallbackQuery || undefined,
    limit: 20,
  });
  const exactMatch =
    rows.find((row) => row.id === providerId) ||
    rows.find(
      (row) =>
        fallbackQuery &&
        row.name.trim().toLowerCase() === fallbackQuery.trim().toLowerCase(),
    );
  return exactMatch?.profession || undefined;
}

export type PartnerRequestStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'completed';

export type PartnerCollaborationRequest = {
  id: string;
  jobCardId: string;
  serviceRequestId?: string;
  requestingProviderId: string;
  requestingProviderName: string;
  targetProviderId: string;
  targetProviderName: string;
  targetProviderProfession?: string;
  neededServiceType: string;
  jobServiceType?: string;
  customerName?: string;
  location?: {
    city?: string;
    district?: string;
    state?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  problem?: string;
  extraNotes?: string;
  photos?: string[];
  status: PartnerRequestStatus;
  createdAt?: string;
  updatedAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelledBy?: 'primary' | 'assisting';
};

function asRequest(raw: unknown): PartnerCollaborationRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const targetProvider = toPublicPartner(
    row.targetProvider,
    String(row.targetProviderId || ''),
  );
  const targetProviderProfession =
    targetProvider?.profession ||
    (typeof row.targetProviderProfession === 'string'
      ? row.targetProviderProfession.trim()
      : '') ||
    (typeof row.targetProviderSpecialization === 'string'
      ? row.targetProviderSpecialization.trim()
      : '') ||
    (typeof row.targetProviderServiceType === 'string'
      ? row.targetProviderServiceType.trim()
      : '') ||
    undefined;
  const id = String(row.id || row._id || '');
  if (!id) return null;
  return {
    id,
    jobCardId: String(row.jobCardId || ''),
    serviceRequestId: row.serviceRequestId
      ? String(row.serviceRequestId)
      : undefined,
    requestingProviderId: String(row.requestingProviderId || ''),
    requestingProviderName: String(row.requestingProviderName || ''),
    targetProviderId: String(row.targetProviderId || ''),
    targetProviderName: String(row.targetProviderName || ''),
    targetProviderProfession,
    neededServiceType: String(row.neededServiceType || ''),
    jobServiceType: row.jobServiceType
      ? String(row.jobServiceType)
      : undefined,
    customerName: row.customerName ? String(row.customerName) : undefined,
    location:
      row.location && typeof row.location === 'object'
        ? (row.location as PartnerCollaborationRequest['location'])
        : undefined,
    problem: row.problem ? String(row.problem) : undefined,
    extraNotes: row.extraNotes ? String(row.extraNotes) : undefined,
    photos: Array.isArray(row.photos)
      ? row.photos.map((p) => String(p)).filter(Boolean)
      : [],
    status: (String(row.status || 'pending') as PartnerRequestStatus) || 'pending',
    createdAt: row.createdAt ? String(row.createdAt) : undefined,
    updatedAt: row.updatedAt ? String(row.updatedAt) : undefined,
    acceptedAt: row.acceptedAt ? String(row.acceptedAt) : undefined,
    rejectedAt: row.rejectedAt ? String(row.rejectedAt) : undefined,
    completedAt: row.completedAt ? String(row.completedAt) : undefined,
    cancelledAt: row.cancelledAt ? String(row.cancelledAt) : undefined,
    cancelledBy:
      row.cancelledBy === 'primary' || row.cancelledBy === 'assisting'
        ? row.cancelledBy
        : undefined,
  };
}

function emptyIfMissing(err: unknown): PartnerCollaborationRequest[] {
  if (err instanceof ApiError && (err.status === 404 || err.status === 501)) {
    return [];
  }
  throw err;
}

export async function listOutgoingPartnerRequests(
  jobCardId?: string,
): Promise<PartnerCollaborationRequest[]> {
  try {
    const qs = jobCardId
      ? `?jobCardId=${encodeURIComponent(jobCardId)}`
      : '';
    const response = await apiGet<unknown[] | {data: unknown[]}>(
      `/provider/partnerRequests/outgoing${qs}`,
    );
    return unwrapList(response)
      .map(asRequest)
      .filter((r): r is PartnerCollaborationRequest => Boolean(r));
  } catch (err) {
    return emptyIfMissing(err);
  }
}

export async function listIncomingPartnerRequests(
  status: 'pending' | 'all' = 'pending',
): Promise<PartnerCollaborationRequest[]> {
  try {
    const response = await apiGet<unknown[] | {data: unknown[]}>(
      `/provider/partnerRequests/incoming?status=${status}`,
    );
    return unwrapList(response)
      .map(asRequest)
      .filter((r): r is PartnerCollaborationRequest => Boolean(r));
  } catch (err) {
    return emptyIfMissing(err);
  }
}

export async function getPartnerRequestById(
  id: string,
): Promise<PartnerCollaborationRequest> {
  const data = await apiGet<unknown>(`/provider/partnerRequests/${id}`);
  const parsed = asRequest(data);
  if (!parsed) {
    throw new ApiError('Request not found.', 404);
  }
  return parsed;
}

export async function createPartnerJobRequest(input: {
  jobCardId: string;
  targetProviderId: string;
  neededServiceType: string;
  extraNotes?: string;
}): Promise<PartnerCollaborationRequest> {
  const data = await apiPost<unknown>('/provider/partnerRequests', input);
  const parsed = asRequest(data);
  if (!parsed) {
    throw new ApiError('Could not send the request.', 500);
  }
  return parsed;
}

export async function acceptPartnerRequest(
  id: string,
): Promise<PartnerCollaborationRequest> {
  const data = await apiPut<unknown>(`/provider/partnerRequests/${id}/accept`, {});
  const parsed = asRequest(data);
  if (!parsed) throw new ApiError('Could not accept the request.', 500);
  return parsed;
}

export async function rejectPartnerRequest(
  id: string,
): Promise<PartnerCollaborationRequest> {
  const data = await apiPut<unknown>(`/provider/partnerRequests/${id}/reject`, {});
  const parsed = asRequest(data);
  if (!parsed) throw new ApiError('Could not decline the request.', 500);
  return parsed;
}

export async function cancelPartnerRequest(
  id: string,
): Promise<PartnerCollaborationRequest> {
  const data = await apiPut<unknown>(`/provider/partnerRequests/${id}/cancel`, {});
  const parsed = asRequest(data);
  if (!parsed) throw new ApiError('Could not remove this Partner.', 500);
  return parsed;
}

export async function completePartnerCollaboration(
  id: string,
): Promise<PartnerCollaborationRequest> {
  const data = await apiPut<unknown>(`/provider/partnerRequests/${id}/complete`, {});
  const parsed = asRequest(data);
  if (!parsed) throw new ApiError('Could not mark collaboration complete.', 500);
  return parsed;
}

export async function listAssistingCollaborations(
  status: 'accepted' | 'all' = 'accepted',
): Promise<PartnerCollaborationRequest[]> {
  try {
    const response = await apiGet<unknown[] | {data: unknown[]}>(
      `/provider/partnerRequests/assisting?status=${status}`,
    );
    return unwrapList(response)
      .map(asRequest)
      .filter((r): r is PartnerCollaborationRequest => Boolean(r));
  } catch (err) {
    return emptyIfMissing(err);
  }
}
