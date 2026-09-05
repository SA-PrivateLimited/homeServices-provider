import {apiPost} from './apiClient';

function extractHandoffCode(data: unknown): string {
  if (typeof data === 'string') return data.trim();
  if (data && typeof data === 'object' && 'code' in data) {
    const raw = (data as {code?: unknown}).code;
    if (typeof raw === 'string') return raw.trim();
  }
  return '';
}

export async function createCustomerContextHandoff(): Promise<string> {
  const data = await apiPost<unknown>('/auth/context/customer-handoff', {});
  const code = extractHandoffCode(data);
  if (!code || code === '[object Object]') {
    throw new Error('Could not start Customer session.');
  }
  return code;
}
