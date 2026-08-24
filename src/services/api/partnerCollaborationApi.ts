import {apiGet, apiPost, apiPut} from './apiClient';

export type PartnerIncomingRequest = {
  id: string;
  requestingProviderName?: string;
  neededServiceType?: string;
  jobServiceType?: string;
  customerName?: string;
  problem?: string;
  extraNotes?: string;
  status?: string;
};

export async function listIncomingPartnerRequests(): Promise<
  PartnerIncomingRequest[]
> {
  try {
    const data = await apiGet<PartnerIncomingRequest[]>(
      '/provider/partnerRequests/incoming?status=pending',
    );
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function acceptPartnerRequest(id: string): Promise<void> {
  await apiPut(`/provider/partnerRequests/${id}/accept`, {});
}

export async function rejectPartnerRequest(id: string): Promise<void> {
  await apiPut(`/provider/partnerRequests/${id}/reject`, {});
}

export async function createCustomerContextHandoff(): Promise<string> {
  const data = await apiPost<{code?: string} | string>(
    '/auth/context/customer-handoff',
    {},
  );
  if (typeof data === 'string') return data.trim();
  const code =
    data && typeof data === 'object' ? String(data.code || '').trim() : '';
  if (!code) throw new Error('Could not start Customer session.');
  return code;
}

export async function addMyProviderService(serviceName: string): Promise<unknown> {
  return apiPost('/providers/me/services', {serviceName});
}

export async function updateProviderServiceAvailability(
  serviceName: string,
  active: boolean,
): Promise<unknown> {
  return apiPut('/providers/me/service-availability', {serviceName, active});
}
