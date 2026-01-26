/**
 * Provider Location Service
 * Manages provider's online/offline status and real-time location updates
 * Similar to Ola/Uber driver location tracking
 */

import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import GeolocationService from './geolocationService';
import {getMyProfile, updateMyProfile} from './api/providersApi';

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
  isAvailable: boolean; // Available for new requests
  lastSeen: number;
  currentLocation?: ProviderLocation;
}

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
  const R = 6371; // Radius of the Earth in kilometers
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

/**
 * Format distance for display
 */
export const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
};

/**
 * Calculate estimated time of arrival (ETA) in minutes
 * Assumes average speed of 30 km/h for local travel
 */
export const calculateETA = (distanceKm: number): number => {
  const averageSpeedKmh = 30; // 30 km/h average speed
  const timeHours = distanceKm / averageSpeedKmh;
  return Math.ceil(timeHours * 60); // Convert to minutes
};

/**
 * Set provider online status
 */
export const setProviderOnline = async (isOnline: boolean): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const providerId = currentUser.uid;

    // Update via backend API
    await updateMyProfile({
      isOnline,
      lastSeen: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any);

    // Update in Realtime Database for real-time status
    await database()
      .ref(`providers/${providerId}/status`)
      .set({
        isOnline,
        isAvailable: isOnline, // When going online, also set as available
        lastSeen: Date.now(),
      });

    console.log(`Provider ${isOnline ? 'online' : 'offline'}`);
  } catch (error: any) {
    console.error('Error setting provider online status:', error);
    throw new Error(`Failed to update online status: ${error.message}`);
  }
};

/**
 * Update provider's current location
 * Should be called periodically when provider is online
 */
export const updateProviderLocation = async (): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Check if provider is online via API
    const provider = await getMyProfile();

    if (!provider) {
      throw new Error('Provider profile not found');
    }

    if (!provider?.isOnline) {
      console.log('Provider is offline, skipping location update');
      return;
    }

    // Check location permission before attempting to get location
    const permissionStatus = await GeolocationService.checkLocationPermission();
    if (permissionStatus !== 'granted') {
      // Permission not granted - skip location update silently
      // This is not an error, just a normal case when permission hasn't been granted yet
      console.log('Location permission not granted, skipping location update');
      return;
    }

    // Get current location
    const location = await GeolocationService.getCurrentLocation();
    if (!location) {
      throw new Error('Failed to get current location');
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

    // Update via backend API
    // Use updateProviderStatus endpoint for location updates to avoid database connection issues
    try {
      await updateMyProfile({
        currentLocation: {
          ...providerLocation,
          updatedAt: new Date().toISOString(),
        },
        lastSeen: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);
    } catch (apiError: any) {
      // If updateMyProfile fails, try using updateProviderStatus endpoint instead
      if (apiError.message?.includes('Database not connected') || apiError.message?.includes('connectDB')) {
        console.warn('⚠️ updateMyProfile failed, trying updateProviderStatus endpoint...');
        const {updateProviderStatus} = require('./api/providersApi');
        await updateProviderStatus({
          currentLocation: {
            latitude: providerLocation.latitude,
            longitude: providerLocation.longitude,
          },
        });
      } else {
        throw apiError; // Re-throw if it's a different error
      }
    }

    // Update in Realtime Database for real-time tracking
    await database()
      .ref(`providers/${currentUser.uid}/location`)
      .set(providerLocation);

    console.log('Provider location updated:', providerLocation);
  } catch (error: any) {
    const errorMessage = error?.message || String(error) || '';
    
    // Don't throw database connection errors - they're non-critical for location tracking
    if (errorMessage.includes('Database not connected') || errorMessage.includes('connectDB')) {
      console.warn('⚠️ Database connection issue when updating location (non-critical):', errorMessage);
      // Still update Firebase Realtime Database even if backend API fails
      try {
        await database()
          .ref(`providers/${currentUser.uid}/location`)
          .set(providerLocation);
        console.log('✅ Location updated in Firebase Realtime Database (backend API failed)');
      } catch (rtdbError) {
        console.warn('⚠️ Failed to update Firebase Realtime Database:', rtdbError);
      }
      return; // Exit gracefully without throwing
    }
    
    console.error('Error updating provider location:', error);
    throw new Error(`Failed to update location: ${error.message}`);
  }
};

/**
 * Start real-time location tracking
 * Updates location every 30 seconds when provider is online
 */
export const startLocationTracking = (): (() => void) => {
  let intervalId: NodeJS.Timeout | null = null;

  const updateLocation = async () => {
    try {
      await updateProviderLocation();
    } catch (error: any) {
      // Check if it's a permission error - if so, log as warning instead of error
      const errorMessage = error?.message || String(error) || '';
      if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
        console.warn('Location permission not granted, skipping location update');
      } else if (errorMessage.includes('Database not connected') || errorMessage.includes('connectDB')) {
        // Database connection error - log as warning, don't break the app
        console.warn('⚠️ Database connection issue in location tracking (non-critical):', errorMessage);
      } else {
        // For other errors (network, etc.), log as error but don't throw
        console.error('Error in location tracking (non-critical):', error);
      }
      // Don't throw - location tracking errors should not break the app
    }
  };

  // Update immediately
  updateLocation();

  // Then update every 30 seconds
  intervalId = setInterval(updateLocation, 30000); // 30 seconds

  // Return stop function
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
};

/**
 * Get provider's current status
 */
export const getProviderStatus = async (providerId: string): Promise<ProviderStatus | null> => {
  try {
    // Get provider status via API
    const provider = await getMyProfile();

    if (!provider) {
      return null;
    }

    const location = provider.location;
    return {
      isOnline: provider.isOnline || false,
      isAvailable: (provider as any).isAvailable !== false, // Default to true if not set
      lastSeen: (provider as any).lastSeen ? new Date((provider as any).lastSeen).getTime() : Date.now(),
      currentLocation: location
        ? {
            latitude: location.latitude || 0,
            longitude: location.longitude || 0,
            address: location.address,
            city: location.city,
            state: location.state,
            pincode: location.pincode,
            updatedAt: (location as any).updatedAt ? new Date((location as any).updatedAt).getTime() : Date.now(),
          }
        : undefined,
    };
  } catch (error) {
    console.error('Error getting provider status:', error);
    return null;
  }
};

/**
 * Calculate distance from provider to customer
 */
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

