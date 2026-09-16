import {
  normalizeVerificationStatus,
  verificationStatusLabelKey,
} from '../src/utils/partnerServices';

describe('verificationStatusLabelKey', () => {
  it('maps known statuses to i18n keys', () => {
    expect(verificationStatusLabelKey('required')).toBe(
      'settings.verification.needsDocuments',
    );
    expect(verificationStatusLabelKey('pending')).toBe(
      'settings.verification.underReview',
    );
    expect(verificationStatusLabelKey('approved')).toBe(
      'settings.verification.approved',
    );
    expect(verificationStatusLabelKey('rejected')).toBe(
      'settings.verification.needsChanges',
    );
  });

  it('normalizes unknown to required', () => {
    expect(normalizeVerificationStatus(undefined)).toBe('required');
    expect(normalizeVerificationStatus('APPROVED')).toBe('approved');
    expect(normalizeVerificationStatus('weird')).toBe('required');
  });
});
