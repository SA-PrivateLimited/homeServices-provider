/**
 * Users API Service (Provider App)
 * Handles user operations via backend API
 */

import {apiGet, apiPut, apiPost} from './apiClient';

export interface UserLocation {
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  updatedAt?: string | Date;
}

export interface User {
  _id?: string;
  id?: string;
  uid?: string;
  name?: string;
  email?: string;
  phone?: string;
  phoneVerified?: boolean;
  role?: 'patient' | 'doctor' | 'admin';
  location?: UserLocation;
  fcmToken?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CreateUserData {
  name: string;
  email?: string;
  phone?: string;
  fcmToken?: string;
  phoneVerified?: boolean;
  role?: string;
  location?: UserLocation;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  phone?: string;
  location?: UserLocation;
  fcmToken?: string;
  role?: string;
}

/**
 * Get current user profile
 */
export async function getMe(): Promise<User | null> {
  try {
    return await apiGet<User>('/users/me');
  } catch (error: any) {
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    return await apiGet<User>(`/users/${userId}`);
  } catch (error: any) {
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Update current user profile
 */
export async function updateMe(updates: UpdateUserData): Promise<User> {
  return apiPut<User>('/users/me', updates);
}

/**
 * Update FCM token
 */
export async function updateFcmToken(userId: string, fcmToken: string): Promise<void> {
  await apiPut(`/users/${userId}/fcmToken`, {fcmToken});
}

/**
 * Create or update user (used during auth)
 */
export async function createOrUpdateUser(userData: CreateUserData): Promise<User> {
  return apiPost<User>('/users/me', userData);
}

export const usersApi = {
  getMe,
  getById: getUserById,
  updateMe,
  updateFcmToken,
  createOrUpdate: createOrUpdateUser,
};
