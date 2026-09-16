import {getEffectiveRequestAvailability} from '../src/utils/effectiveRequestAvailability';
import type {Provider} from '../src/services/api/providersApi';

function profile(
  partial: Partial<Provider> &
    Pick<Provider, 'isOnline' | 'showRequestService' | 'allowOfflineProviderOpenRequests'>,
): Provider {
  return partial as Provider;
}

describe('getEffectiveRequestAvailability', () => {
  it('Policy A: online + receive ON → available', () => {
    expect(
      getEffectiveRequestAvailability(
        profile({
          isOnline: true,
          showRequestService: true,
          allowOfflineProviderOpenRequests: false,
        }),
      ),
    ).toBe('available');
  });

  it('Policy A: online + receive OFF → off', () => {
    expect(
      getEffectiveRequestAvailability(
        profile({
          isOnline: true,
          showRequestService: false,
          allowOfflineProviderOpenRequests: false,
        }),
      ),
    ).toBe('off');
  });

  it('Policy A: offline + receive ON → paused_offline', () => {
    expect(
      getEffectiveRequestAvailability(
        profile({
          isOnline: false,
          showRequestService: true,
          allowOfflineProviderOpenRequests: false,
        }),
      ),
    ).toBe('paused_offline');
  });

  it('Policy A: offline + receive OFF → off', () => {
    expect(
      getEffectiveRequestAvailability(
        profile({
          isOnline: false,
          showRequestService: false,
          allowOfflineProviderOpenRequests: false,
        }),
      ),
    ).toBe('off');
  });

  it('Policy B: offline + receive ON → available_offline', () => {
    expect(
      getEffectiveRequestAvailability(
        profile({
          isOnline: false,
          showRequestService: true,
          allowOfflineProviderOpenRequests: true,
        }),
      ),
    ).toBe('available_offline');
  });

  it('Policy B: offline + receive OFF → off', () => {
    expect(
      getEffectiveRequestAvailability(
        profile({
          isOnline: false,
          showRequestService: false,
          allowOfflineProviderOpenRequests: true,
        }),
      ),
    ).toBe('off');
  });
});
