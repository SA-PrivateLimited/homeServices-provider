/** Customer web origin for “Use as Customer” — Play Store uses the live site until App Links. */
export const CUSTOMER_WEB_URL = 'https://akanso.in';

export function getCustomerWebUrl(): string {
  return CUSTOMER_WEB_URL;
}

export function customerHandoffUrl(code: string): string {
  const safe = typeof code === 'string' ? code.trim() : '';
  if (!safe || safe === '[object Object]') {
    throw new Error('Invalid handoff code.');
  }
  return `${CUSTOMER_WEB_URL}/auth/handoff?code=${encodeURIComponent(safe)}`;
}
