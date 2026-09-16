const GENERIC_PARTNER_NAME = /^(customer|provider|user)([-\s]\d{1,4})?$/i;
const SINGLE_LETTER = /^[\p{L}]$/u;
const LATIN_NAME = /^[\sA-Za-z.'’-]+$/;

export function isGenericPartnerName(value?: string | null): boolean {
  const s = String(value || '').trim();
  return !s || GENERIC_PARTNER_NAME.test(s);
}

function isSingleLetterToken(token: string): boolean {
  return SINGLE_LETTER.test(token);
}

function titleCaseLatinWord(word: string): string {
  if (word.length <= 1) return word.toUpperCase();
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/** Drop leftover trailing initials like “g h”; title-case Latin names. */
export function tidyPersonName(raw: string): string {
  const trimmed = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  const parts = trimmed.split(' ');
  if (parts.some((part) => !isSingleLetterToken(part))) {
    while (parts.length > 1 && isSingleLetterToken(parts[parts.length - 1])) {
      parts.pop();
    }
  }
  const joined = parts.join(' ');
  if (!LATIN_NAME.test(joined)) return joined;
  return parts.map(titleCaseLatinWord).join(' ');
}

/** Customer name on a Partner job — never a role word like Provider. */
export function jobCustomerDisplayName(
  raw?: string | null,
  fallback = 'Customer',
): string {
  const s = String(raw || '').trim();
  if (isGenericPartnerName(s) || /^partner$/i.test(s)) return fallback;
  return tidyPersonName(s);
}

export function formatDefaultProviderName(displayId?: number | null): string {
  if (displayId == null || !Number.isFinite(Number(displayId))) {
    return 'Provider-0000';
  }
  return `Provider-${String(Math.trunc(Number(displayId)) % 10000).padStart(4, '0')}`;
}

/** Prefer a real name over stale signup displayName placeholders. */
export function partnerDisplayName(
  person?: {
    name?: string;
    displayName?: string;
    customerDisplayId?: number | null;
  } | null,
  fallback = '',
): string {
  const name = String(person?.name || '').trim();
  const displayName = String(person?.displayName || '').trim();
  if (!isGenericPartnerName(name)) return tidyPersonName(name);
  if (!isGenericPartnerName(displayName)) return tidyPersonName(displayName);
  if (person?.customerDisplayId != null) {
    return formatDefaultProviderName(person.customerDisplayId);
  }
  return tidyPersonName(name || displayName) || fallback;
}
