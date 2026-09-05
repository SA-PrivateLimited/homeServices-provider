import type {Provider} from '../services/api/providersApi';

export function canReceiveOpenServiceRequests(
  profile: Provider | null | undefined,
): boolean {
  if (!profile) return false;
  if (profile.showRequestService === false) return false;
  if (profile.isOnline) return true;
  return Boolean(profile.allowOfflineProviderOpenRequests);
}
