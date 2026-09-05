import type {PartnerCollaborationRequest, PartnerRequestStatus} from '../services/api/partnerCollaborationApi';

const VISIBLE: PartnerRequestStatus[] = ['pending', 'accepted', 'completed'];

/** All collaborations for one customer job, newest first within status groups. */
export function collaborationsForJob(
  rows: PartnerCollaborationRequest[] | undefined,
  jobId: string,
): PartnerCollaborationRequest[] {
  const statusOrder: Record<PartnerRequestStatus, number> = {
    accepted: 0,
    pending: 1,
    completed: 2,
    rejected: 3,
    cancelled: 4,
  };
  return (rows || [])
    .filter((r) => r.jobCardId === jobId && VISIBLE.includes(r.status))
    .sort((a, b) => {
      const ds = statusOrder[a.status] - statusOrder[b.status];
      if (ds !== 0) return ds;
      return (
        (Date.parse(b.updatedAt || b.createdAt || '') || 0) -
        (Date.parse(a.updatedAt || a.createdAt || '') || 0)
      );
    });
}

/** Partners already pending or accepted on this job — exclude from browse. */
export function blockedPartnerIdsForJob(
  rows: PartnerCollaborationRequest[] | undefined,
  jobId: string,
): Set<string> {
  const ids = new Set<string>();
  for (const r of rows || []) {
    if (r.jobCardId !== jobId) continue;
    if (r.status === 'pending' || r.status === 'accepted') {
      ids.add(r.targetProviderId);
    }
  }
  return ids;
}

export function joinedCollaborationCount(
  rows: PartnerCollaborationRequest[] | undefined,
  jobId: string,
): number {
  return (rows || []).filter(
    (r) =>
      r.jobCardId === jobId &&
      (r.status === 'pending' || r.status === 'accepted' || r.status === 'completed'),
  ).length;
}

export function activeCollaborationCount(
  rows: PartnerCollaborationRequest[] | undefined,
  jobId: string,
): number {
  return (rows || []).filter(
    (r) => r.jobCardId === jobId && (r.status === 'pending' || r.status === 'accepted'),
  ).length;
}

export function allVisibleCollaborationsComplete(
  rows: PartnerCollaborationRequest[] | undefined,
  jobId: string,
): boolean {
  const visible = collaborationsForJob(rows, jobId);
  return visible.length > 0 && visible.every((r) => r.status === 'completed');
}

export function collaborationPlace(collab: PartnerCollaborationRequest): string {
  const loc = collab.location;
  if (!loc) return '';
  return [loc.district || loc.city, loc.state].filter(Boolean).join(', ');
}

export type CollaborationUiState =
  | 'none'
  | 'pending'
  | 'accepted'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export function collaborationUiState(status: PartnerRequestStatus): CollaborationUiState {
  if (status === 'pending') return 'pending';
  if (status === 'accepted') return 'accepted';
  if (status === 'completed') return 'completed';
  if (status === 'rejected') return 'rejected';
  if (status === 'cancelled') return 'cancelled';
  return 'none';
}

export function collaborationStatusLabelKey(status: PartnerRequestStatus): string {
  switch (status) {
    case 'pending':
      return 'collab.rowPending';
    case 'accepted':
      return 'collab.rowAccepted';
    case 'completed':
      return 'collab.rowCompleted';
    case 'rejected':
      return 'collab.rowRejected';
    case 'cancelled':
      return 'collab.rowCancelled';
    default:
      return 'collab.rowPending';
  }
}

export function assistingCollaborations(
  rows: PartnerCollaborationRequest[],
  status: 'accepted' | 'all' = 'accepted',
): PartnerCollaborationRequest[] {
  return rows.filter((r) => {
    if (status === 'accepted') return r.status === 'accepted';
    return r.status === 'accepted' || r.status === 'pending';
  });
}

/** @deprecated use collaborationsForJob */
export function activeCollaborationForJob(
  rows: PartnerCollaborationRequest[] | undefined,
  jobId: string,
): PartnerCollaborationRequest | undefined {
  return collaborationsForJob(rows, jobId)[0];
}
