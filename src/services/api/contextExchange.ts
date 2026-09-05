import {apiPost} from './apiClient';

export async function exchangeContextHandoff(
  code: string,
): Promise<{user: Record<string, unknown>; token: string}> {
  const handoffCode = String(code || '').trim();
  if (!handoffCode) throw new Error('Invalid handoff code.');
  return apiPost('/auth/context/exchange', {code: handoffCode}, {skipAuth: true});
}
