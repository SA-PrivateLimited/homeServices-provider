/**
 * Providers API Service (Provider App)
 * Handles provider operations via backend API
 */

import {apiGet, apiPut} from './apiClient';

export interface Provider {
  _id?: string;
  id?: string;
  uid?: string;
  name?: string;
  displayName?: string;
  email?: string;
  phoneNumber?: string;
  phone?: string;
  specialization?: string;
  specialty?: string;
  serviceCategories?: string[];
  experience?: number;
  serviceFee?: number;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  verified?: boolean;
  rating?: number;
  totalReviews?: number;
  isOnline?: boolean;
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  photos?: string[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ProviderFilters {
  serviceType?: string;
  city?: string;
  state?: string;
  isOnline?: boolean;
  minRating?: number;
  limit?: number;
  offset?: number;
  email?: string;
  uid?: string;
}

/**
 * Get all providers with optional filters
 */
export async function getProviders(filters?: ProviderFilters): Promise<Provider[]> {
  try {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/providers?${queryString}` : '/providers';

    const response = await apiGet<{data: Provider[]; count: number}>(endpoint);
    if (Array.isArray(response)) {
      return response;
    }
    return (response as any).data || [];
  } catch (error) {
    console.error('Error fetching providers:', error);
    throw error;
  }
}

/**
 * Get provider by ID
 */
export async function getProviderById(providerId: string): Promise<Provider | null> {
  try {
    return await apiGet<Provider>(`/providers/${providerId}`);
  } catch (error: any) {
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Get provider by email
 */
export async function getProviderByEmail(email: string): Promise<Provider | null> {
  try {
    const providers = await getProviders({email});
    return providers.length > 0 ? providers[0] : null;
  } catch (error: any) {
    console.error('Error fetching provider by email:', error);
    return null;
  }
}

/**
 * Get provider by UID
 */
export async function getProviderByUid(uid: string): Promise<Provider | null> {
  try {
    // Try to get by ID first (uid might be the _id)
    const provider = await getProviderById(uid);
    if (provider) {
      return provider;
    }
    // Fall back to filtering by uid
    const providers = await getProviders({uid});
    return providers.length > 0 ? providers[0] : null;
  } catch (error: any) {
    console.error('Error fetching provider by UID:', error);
    return null;
  }
}

/**
 * Get current provider profile
 */
export async function getMyProfile(): Promise<Provider | null> {
  try {
    return await apiGet<Provider>('/providers/me');
  } catch (error: any) {
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Update provider profile
 */
export async function updateMyProfile(updates: Partial<Provider>): Promise<Provider> {
  return apiPut<Provider>('/providers/me', updates);
}

/**
 * Update provider status (online/offline)
 */
export async function updateProviderStatus(data: {
  isOnline?: boolean;
  isAvailable?: boolean;
  currentLocation?: {latitude: number; longitude: number};
}): Promise<void> {
  await apiPut('/providers/me/status', data);
}

export const providersApi = {
  getAll: getProviders,
  getById: getProviderById,
  getByEmail: getProviderByEmail,
  getByUid: getProviderByUid,
  getMyProfile,
  updateMyProfile,
  updateStatus: updateProviderStatus,
};
