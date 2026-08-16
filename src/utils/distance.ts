/**
 * Format backend nearby-pending distanceKm the same way as provider web.
 */

export function formatDistanceKm(km?: number | null): string {
  if (km == null || typeof km !== 'number' || !Number.isFinite(km) || km < 0) {
    return '';
  }
  return `${km.toFixed(1)} km`;
}
