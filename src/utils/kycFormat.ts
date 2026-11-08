/** Format checks copied from retail-pos-web. They do not verify a government record. */

export type IdProofKind = 'aadhaar' | 'pan' | 'dl' | 'voter' | 'passport';
export type AddressProofKind = 'utility' | 'rent' | 'aadhaar' | 'other';
export type CertificateKind = 'trade' | 'licence' | 'other';

export function isValidPan(value: string) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value.replace(/\s/g, '').toUpperCase());
}

export function isValidAadhaar(value: string) {
  return /^[2-9]\d{11}$/.test(value.replace(/\D/g, ''));
}

export function formatAadhaarInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function formatPanInput(value: string) {
  return value.replace(/\s/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
}

export function formatDlInput(value: string) {
  return value.replace(/\s/g, '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);
}

export function formatIdNumber(kind: IdProofKind | '', value: string) {
  if (kind === 'aadhaar') return formatAadhaarInput(value);
  if (kind === 'pan') return formatPanInput(value);
  if (kind === 'dl') return formatDlInput(value);
  if (kind === 'voter') {
    return value.replace(/\s/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  }
  if (kind === 'passport') {
    return value.replace(/\s/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  }
  const compact = value.replace(/\s/g, '');
  if (/^[A-Za-z]/.test(compact)) return formatPanInput(value);
  return formatAadhaarInput(value);
}

/** Empty is allowed. Typed Aadhaar/PAN are checked when a number is entered. */
export function idProofNumberIssue(
  value: string,
  kind?: IdProofKind | '',
): 'aadhaar' | 'pan' | 'short' | null {
  const raw = value.trim();
  if (!raw) return null;
  if (kind === 'aadhaar') return isValidAadhaar(raw) ? null : 'aadhaar';
  if (kind === 'pan') return isValidPan(raw) ? null : 'pan';
  if (kind === 'dl' || kind === 'voter' || kind === 'passport') {
    return raw.replace(/\s/g, '').length < 6 ? 'short' : null;
  }
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 10 && /^\d[\d\s]+$/.test(raw)) {
    return isValidAadhaar(digits) ? null : 'aadhaar';
  }
  const compact = raw.replace(/\s/g, '').toUpperCase();
  if (/^[A-Z]/.test(compact) && compact.length >= 5 && compact.length <= 10) {
    return isValidPan(compact) ? null : 'pan';
  }
  if (raw.replace(/\s/g, '').length < 6) return 'short';
  return null;
}

export function genericDocNumberIssue(value: string): 'short' | null {
  const raw = value.trim();
  if (!raw) return null;
  return raw.replace(/\s/g, '').length < 4 ? 'short' : null;
}
