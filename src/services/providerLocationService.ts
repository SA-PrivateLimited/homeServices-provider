/**
 * Provider Location Service
 * Manages provider's online/offline status and real-time location updates
 * Uses backend API (JWT). Firebase RTDB writes are optional and never block the UI.
 */

import GeolocationService from './geolocationService';
import {
  getMyProfile,
  updateMyProfile,
  updateProviderStatus,
} from './api/providersApi';
import {getUserId, isLoggedIn, requireSessionUser} from './session';

export interface ProviderLocation {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  updatedAt: number;
}

export interface ProviderStatus {
  isOnline: boolean;
  isAvailable: boolean;
  lastSeen: number;
  currentLocation?: ProviderLocation;
}

/** Backend/DB blips — location tracking must not red-screen the app */
const isTransientLocationError = (error: unknown): boolean => {
  const msg = (
    (error as any)?.message ||
    String(error) ||
    ''
  ).toLowerCase();
  return (
    msg.includes('timed out') ||
    msg.includes('timeout') ||
    msg.includes('etimedout') ||
    msg.includes('econnrefused') ||
    msg.includes('econnreset') ||
    msg.includes('network') ||
    msg.includes('database not connected') ||
    msg.includes('connectdb') ||
    msg.includes('mongo') ||
    msg.includes('27017') ||
    msg.includes('server selection') ||
    msg.includes('failed to update location') ||
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('504')
  );
};

/** Single active GPS interval — survives screen remounts; stopped on logout */
let trackingIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
};

export const calculateETA = (distanceKm: number): number => {
  const averageSpeedKmh = 30;
  const timeHours = distanceKm / averageSpeedKmh;
  return Math.ceil(timeHours * 60);
};

/**
 * Set provider online status via backend API (no Firebase auth required).
 */
export const setProviderOnline = async (isOnline: boolean): Promise<void> => {
  try {
    await requireSessionUser();

    // Preferred status endpoint
    try {
      await updateProviderStatus({
        isOnline,
        isAvailable: isOnline,
      });
    } catch (statusErr) {
      // Fallback for older backends
      await updateMyProfile({
        isOnline,
        isAvailable: isOnline,
        lastSeen: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);
    }

    // Optional Firebase RTDB mirror — JWT sessions usually lack Firebase auth,
    // so permission-denied is expected and must not fail the toggle.
    try {
      const provider = await getMyProfile();
      const providerId = getUserId(provider);
      if (providerId) {
        const database = require('@react-native-firebase/database').default;
        await database()
          .ref(`providers/${providerId}/status`)
          .set({
            isOnline,
            isAvailable: isOnline,
            lastSeen: Date.now(),
          });
      }
    } catch {
      // ignore RTDB failures
    }

    console.log(`Provider ${isOnline ? 'online' : 'offline'}`);
  } catch (error: any) {
    console.error('Error setting provider online status:', error);
    throw new Error(`Failed to update online status: ${error.message}`);
  }
};

/**
 * Update provider's current location when online.
 */
export const updateProviderLocation = async (): Promise<void> => {
  try {
    if (!(await isLoggedIn())) {
      return;
    }

    await requireSessionUser();

    const provider = await getMyProfile();
    if (!provider) {
      return;
    }

    if (!provider?.isOnline) {
      console.log('Provider is offline, skipping location update');
      return;
    }

    const permissionStatus = await GeolocationService.checkLocationPermission();
    if (permissionStatus !== 'granted') {
      console.log('Location permission not granted, skipping location update');
      return;
    }

    const location = await GeolocationService.getCurrentLocation();
    if (!location) {
      console.warn('Failed to get current location, skipping update');
      return;
    }

    const providerLocation: ProviderLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address,
      city: location.city,
      state: location.state,
      pincode: location.pincode,
      updatedAt: Date.now(),
    };

    try {
      await updateProviderStatus({
        currentLocation: {
          latitude: providerLocation.latitude,
          longitude: providerLocation.longitude,
        },
      });
    } catch (statusErr) {
      // Avoid a second Mongo hit when the API is already timing out
      if (isTransientLocationError(statusErr)) {
        console.warn(
          '⚠️ Location status update skipped (transient backend/DB issue):',
          (statusErr as any)?.message || statusErr,
        );
        return;
      }
      await updateMyProfile({
        currentLocation: {
          ...providerLocation,
          updatedAt: new Date().toISOString(),
        },
        lastSeen: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);
    }

    // Optional RTDB mirror — never fail the call
    try {
      const providerId = getUserId(provider);
      if (providerId) {
        const database = require('@react-native-firebase/database').default;
        await database()
          .ref(`providers/${providerId}/location`)
          .set(providerLocation);
      }
    } catch {
      // ignore RTDB permission errors under JWT auth
    }

    console.log('Provider location updated:', providerLocation);
  } catch (error: any) {
    const msg = error?.message || String(error) || '';
    if (
      msg.toLowerCase().includes('not authenticated') ||
      !(await isLoggedIn())
    ) {
      return;
    }
    if (isTransientLocationError(error)) {
      console.warn(
        '⚠️ Location update skipped (transient backend/DB issue):',
        msg,
      );
      return;
    }

    console.warn('Error updating provider location (non-critical):', msg);
  }
};

export const startLocationTracking = (): (() => void) => {
  // Replace any previous tracker (e.g. remount / re-toggle)
  stopLocationTracking();

  const updateLocation = async () => {
    try {
      // Logged out — do not hit the API
      if (!(await isLoggedIn())) {
        stopLocationTracking();
        return;
      }
      await updateProviderLocation();
    } catch (error: any) {
      // Never console.error here — LogBox turns it into a red screen
      const errorMessage = error?.message || String(error) || '';
      if (
        errorMessage.toLowerCase().includes('not authenticated') ||
        errorMessage.toLowerCase().includes('permission') ||
        isTransientLocationError(error)
      ) {
        return;
      }
      console.warn('Location tracking issue (non-critical):', errorMessage);
    }
  };

  updateLocation();
  trackingIntervalId = setInterval(updateLocation, 30000);

  return stopLocationTracking;
};

/** Stop GPS pings — call on logout / going offline */
export const stopLocationTracking = (): void => {
  if (trackingIntervalId) {
    clearInterval(trackingIntervalId);
    trackingIntervalId = null;
  }
};

export const getProviderStatus = async (
  _providerId: string,
): Promise<ProviderStatus | null> => {
  try {
    const provider = await getMyProfile();
    if (!provider) {
      return null;
    }

    const location = provider.location || (provider as any).currentLocation;
    return {
      isOnline: provider.isOnline || false,
      isAvailable: (provider as any).isAvailable !== false,
      lastSeen: (provider as any).lastSeen
        ? new Date((provider as any).lastSeen).getTime()
        : Date.now(),
      currentLocation: location
        ? {
            latitude: location.latitude || 0,
            longitude: location.longitude || 0,
            address: location.address,
            city: location.city,
            state: location.state,
            pincode: location.pincode,
            updatedAt: (location as any).updatedAt
              ? new Date((location as any).updatedAt).getTime()
              : Date.now(),
          }
        : undefined,
    };
  } catch (error) {
    console.warn('Error getting provider status:', (error as any)?.message || error);
    return null;
  }
};

export const getDistanceToCustomer = (
  providerLocation: ProviderLocation,
  customerLocation: {latitude: number; longitude: number},
): {distanceKm: number; distanceFormatted: string; etaMinutes: number} => {
  const distanceKm = calculateDistance(
    providerLocation.latitude,
    providerLocation.longitude,
    customerLocation.latitude,
    customerLocation.longitude,
  );

  return {
    distanceKm,
    distanceFormatted: formatDistance(distanceKm),
    etaMinutes: calculateETA(distanceKm),
  };
};
