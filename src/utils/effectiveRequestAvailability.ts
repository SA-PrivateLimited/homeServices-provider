import type {Provider} from '../services/api/providersApi';
import {canReceiveOpenServiceRequests} from './providerOpenRequests';

/**
 * Partner Home “what customers can do” — mirrors open-request eligibility
 * (`isOnline` + `showRequestService` + Admin `allowOfflineProviderOpenRequests`).
 */
export type EffectiveRequestAvailability =
  | 'available'
  | 'available_offline'
  | 'paused_offline'
  | 'off';

export function getEffectiveRequestAvailability(
  profile: Provider | null | undefined,
): EffectiveRequestAvailability {
  if (!profile || profile.showRequestService === false) {
    return 'off';
  }
  if (canReceiveOpenServiceRequests(profile)) {
    return profile.isOnline ? 'available' : 'available_offline';
  }
  return 'paused_offline';
}
