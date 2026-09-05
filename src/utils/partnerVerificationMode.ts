import type {PartnerVerificationMode} from '../services/api/jobsApi';

/** True when Partners go live on profile complete (not manual Admin review). */
export function isPartnerAutoVerifyMode(
  mode?: PartnerVerificationMode | string | null,
): boolean {
  return String(mode || 'AUTO').toUpperCase() !== 'ADMIN';
}
