/**
 * Presentation helpers for job status — labels, colors, status-aware dates.
 * Does not change job lifecycle / API behavior.
 */

export const STATUS_COLORS = {
  pending: '#FF9500',
  accepted: '#007AFF',
  'in-progress': '#FF6B35',
  completed: '#34C759',
  cancelled: '#FF3B30',
  rejected: '#FF3B30',
  expired: '#8E8E93',
  default: '#8E8E93',
} as const;

export type JobStatusKey =
  | 'pending'
  | 'accepted'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'expired'
  | 'unknown';

export function normalizeJobStatusKey(status?: string | null): JobStatusKey {
  const s = (status || '').toLowerCase().trim().replace(/[\s_]+/g, '-');
  if (s === 'completed' || s === 'done' || s === 'finished') return 'completed';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'rejected' || s === 'declined') return 'rejected';
  if (s === 'expired') return 'expired';
  if (
    s === 'in-progress' ||
    s === 'inprogress' ||
    s === 'active' ||
    s === 'ongoing' ||
    s === 'started'
  ) {
    return 'in-progress';
  }
  if (
    s === 'accepted' ||
    s === 'confirmed' ||
    s === 'assigned' ||
    s === 'provider-accepted'
  ) {
    return 'accepted';
  }
  if (s === 'pending' || s === 'waiting' || s === 'new' || s === 'open') {
    return 'pending';
  }
  return 'unknown';
}

export function getJobStatusColor(status?: string | null): string {
  const key = normalizeJobStatusKey(status);
  if (key === 'unknown') return STATUS_COLORS.default;
  return STATUS_COLORS[key];
}

/** Display title for status (English fallbacks; prefer i18n at call site). */
export function getJobStatusTitle(status?: string | null): string {
  switch (normalizeJobStatusKey(status)) {
    case 'pending':
      return 'Awaiting response';
    case 'accepted':
      return 'Accepted';
    case 'in-progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'rejected':
      return 'Rejected';
    case 'expired':
      return 'Expired';
    default:
      return status
        ? String(status).replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        : 'Unknown';
  }
}

export function formatJobDate(date?: Date | string | number | null | any): string {
  if (!date) return '';
  try {
    let d: Date;
    if (date instanceof Date) d = date;
    else if (date && typeof date.toDate === 'function') d = date.toDate();
    else d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

/** Status-aware date line — never label cancelled as "Completed". */
export function formatJobStatusDate(
  status?: string | null,
  date?: Date | string | number | null | any,
): string {
  const formatted = formatJobDate(date);
  if (!formatted) return '';
  switch (normalizeJobStatusKey(status)) {
    case 'completed':
      return `Completed on ${formatted}`;
    case 'cancelled':
      return `Cancelled on ${formatted}`;
    case 'rejected':
      return `Rejected on ${formatted}`;
    case 'accepted':
      return `Accepted on ${formatted}`;
    case 'in-progress':
      return `Updated ${formatted}`;
    case 'pending':
      return `Requested ${formatted}`;
    default:
      return formatted;
  }
}
