import {formatDistanceKm} from '../src/utils/distance';

describe('formatDistanceKm', () => {
  it('matches provider web one-decimal km', () => {
    expect(formatDistanceKm(2.46)).toBe('2.5 km');
    expect(formatDistanceKm(0)).toBe('0.0 km');
  });

  it('returns empty for missing or invalid values', () => {
    expect(formatDistanceKm(undefined)).toBe('');
    expect(formatDistanceKm(null)).toBe('');
    expect(formatDistanceKm(Number.NaN)).toBe('');
    expect(formatDistanceKm(-1)).toBe('');
  });
});
