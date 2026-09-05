/** Compact place line for GPS-detected location chips. */
export function formatDetectedPlaceLine(parts: {
  block?: string;
  district?: string;
  city?: string;
  state?: string;
}): string {
  return [parts.block, parts.district || parts.city, parts.state]
    .filter(Boolean)
    .join(', ');
}

/** Address display helpers for Partner job cards and details. */

export type AreaPinInput = {
  address?: string;
  landmark?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string | number | null;
};

export function normalizePincode(value?: string | number | null): string {
  return String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, 6);
}

/**
 * Full readable service address — does not truncate.
 * street/landmark + place + state — PIN when available.
 */
export function formatFullAddressLine(addr?: AreaPinInput | null): string {
  if (!addr || typeof addr !== 'object') return '';

  const street = String(addr.address || '')
    .replace(/\s+/g, ' ')
    .trim();
  const landmark = String(addr.landmark || '')
    .replace(/\s+/g, ' ')
    .trim();
  const place = String(addr.district || addr.city || '').trim();
  const state = String(addr.state || '').trim();
  const pin = normalizePincode(addr.pincode);

  const head = [street, landmark, place, state].filter(Boolean);
  if (head.length && pin) return `${head.join(', ')} — ${pin}`;
  if (head.length) return head.join(', ');
  return pin;
}

export function hasAnyAddress(addr?: AreaPinInput | null): boolean {
  return Boolean(formatFullAddressLine(addr));
}
