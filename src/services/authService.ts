/**
 * Authentication Service (Provider App)
 * Uses Firebase Auth for authentication
 * Uses backend API for ALL user data operations (create/read/update)
 */

import auth from '@react-native-firebase/auth';
import messaging from '@react-native-firebase/messaging';
import type {User, UserLocation} from '../types/consultation';
import NotificationService from './notificationService';
import {usersApi} from './api/usersApi';

/**
 * Send phone verification code
 */
export const sendPhoneVerificationCode = async (
  phoneNumber: string,
): Promise<any> => {
  try {
    let formattedPhone = phoneNumber.trim();
    formattedPhone = formattedPhone.replace(/[\s\-\(\)]/g, '');

    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(formattedPhone)) {
      throw new Error('Invalid phone number format. Please use format: +91XXXXXXXXXX');
    }

    console.log('[SEND CODE] Sending verification code to:', formattedPhone);
    const confirmation = await auth().signInWithPhoneNumber(formattedPhone, true);
    console.log('[SEND CODE] Code sent successfully');

    return confirmation;
  } catch (error: any) {
    console.error('Phone verification error:', error.code, error.message);

    if (error.code === 'auth/invalid-phone-number') {
      throw new Error('Invalid phone number format. Please check the number and try again.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many verification attempts for this number. Please wait a few minutes or use a different number.');
    } else if (error.code === 'auth/quota-exceeded') {
      throw new Error('SMS service temporarily unavailable. Please try again in a few minutes.');
    } else if (error.code === 'auth/captcha-check-failed') {
      throw new Error('Security verification failed. Please try again.');
    } else if (error.code === 'auth/app-not-authorized') {
      throw new Error('App not authorized for phone authentication. Please add SHA-1 and SHA-256 fingerprints to Firebase Console.');
    } else if (error.code === 'auth/missing-phone-number') {
      throw new Error('Phone number is required.');
    } else if (error.message) {
      throw new Error(error.message);
    }
    throw new Error('Failed to send verification code. Please check your phone number and try again.');
  }
};

/**
 * Verify phone number with code
 * Uses API for user creation/update
 */
export const verifyPhoneCode = async (
  confirmation: any,
  code: string,
  name: string,
  email?: string,
  retryCount: number = 0,
): Promise<User> => {
  const MAX_RETRIES = 2;

  try {
    console.log('[VERIFY] Attempting to verify code');

    if (!confirmation) {
      throw new Error('Verification session expired. Please request a new code.');
    }

    let userCredential;
    try {
      userCredential = await confirmation.confirm(code);
    } catch (confirmError: any) {
      if (
        (confirmError.code === 'auth/unknown' ||
         confirmError.message?.includes('Connection reset') ||
         confirmError.message?.includes('network') ||
         confirmError.message?.includes('timeout')) &&
        retryCount < MAX_RETRIES
      ) {
        console.log(`[VERIFY] Connection error, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return verifyPhoneCode(confirmation, code, name, email, retryCount + 1);
      }
      throw confirmError;
    }

    console.log('[VERIFY] Code verified successfully:', {
      uid: userCredential.user.uid,
      phoneNumber: userCredential.user.phoneNumber,
    });

    // Get FCM token with timeout
    let fcmToken = '';
    try {
      fcmToken = await Promise.race([
        messaging().getToken(),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('FCM token timeout')), 5000)
        ),
      ]);
    } catch (fcmError: any) {
      if (__DEV__) {
        console.debug('[VERIFY] FCM token retrieval timeout (non-blocking)');
      }
    }

    // Create or update user via API with provider role
    const apiUser = await usersApi.createOrUpdate({
      name,
      email: email || '',
      phone: userCredential.user.phoneNumber || '',
      fcmToken,
      phoneVerified: true,
      role: 'provider',
    });

    // Initialize notification service (non-blocking)
    NotificationService.initializeAndSaveToken().catch(error => {
      console.warn('[VERIFY] Notification service initialization failed (non-blocking):', error);
    });

    return {
      id: apiUser._id || apiUser.id || userCredential.user.uid,
      name: apiUser.name || name,
      email: apiUser.email || email || '',
      phone: apiUser.phone || userCredential.user.phoneNumber || '',
      phoneVerified: true,
      createdAt: apiUser.createdAt ? new Date(apiUser.createdAt as string) : new Date(),
      fcmToken,
      role: apiUser.role,
      location: apiUser.location,
    };
  } catch (error: any) {
    console.error('[VERIFY] Verification error:', error);

    if (error.code === 'auth/invalid-verification-code') {
      throw new Error('Invalid verification code. Please check the code and try again.');
    } else if (error.code === 'auth/code-expired') {
      throw new Error('Verification code expired. Please request a new one.');
    } else if (error.code === 'auth/session-expired') {
      throw new Error('Verification session expired. Please request a new code.');
    } else if (error.code === 'auth/unknown' || error.message?.includes('Connection reset')) {
      throw new Error('Connection error occurred. Please check your internet connection and try again.');
    } else if (error.message) {
      throw new Error(error.message);
    }
    throw new Error(`Failed to verify code: ${error.code || 'Unknown error'}. Please try again.`);
  }
};

/**
 * Logout current user
 */
export const logout = async (): Promise<void> => {
  try {
    try {
      const {stopLocationTracking} = await import('./providerLocationService');
      stopLocationTracking();
    } catch {
      // ignore
    }

    try {
      const websocketService = (await import('./websocketService')).default;
      websocketService.disconnect();
    } catch (wsError) {
      console.warn('WebSocket disconnect failed during logout:', wsError);
    }

    try {
      const {logoutRemote} = await import('./api/phoneAuthApi');
      await logoutRemote();
    } catch {
      // Local session still clears below
    }

    const {logoutProvider} = await import('./session');
    await logoutProvider();

    // Best-effort Firebase sign-out if still present
    try {
      const auth = (await import('@react-native-firebase/auth')).default;
      if (auth().currentUser) {
        await auth().signOut();
      }
    } catch {
      // Firebase may be unused on JWT path
    }
  } catch (error: any) {
    console.error('Logout error:', error);
    throw new Error(error.message || 'Failed to logout. Please try again.');
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const currentUser = auth().currentUser;

    if (!currentUser) {
      return null;
    }

    const apiUser = await usersApi.getMe();
    if (!apiUser) {
      return null;
    }

    return {
      id: apiUser._id || apiUser.id || currentUser.uid,
      name: apiUser.name || '',
      email: apiUser.email || '',
      phone: apiUser.phone || '',
      createdAt: apiUser.createdAt ? new Date(apiUser.createdAt as string) : new Date(),
      role: apiUser.role,
      location: apiUser.location,
    };
  } catch (error) {
    return null;
  }
};

/**
 * Update user profile via API
 */
export const updateUserProfile = async (
  userId: string,
  updates: Partial<User>,
): Promise<User> => {
  try {
    const updatedUser = await usersApi.updateMe({
      name: updates.name,
      email: updates.email,
      phone: updates.phone,
      location: updates.location,
    });

    return {
      id: updatedUser._id || updatedUser.id || userId,
      name: updatedUser.name || '',
      email: updatedUser.email || '',
      phone: updatedUser.phone || '',
      createdAt: updatedUser.createdAt ? new Date(updatedUser.createdAt as string) : new Date(),
      location: updatedUser.location,
      role: updatedUser.role,
    };
  } catch (error) {
    throw new Error('Failed to update profile. Please try again.');
  }
};

/**
 * Update user location via API
 */
export const updateUserLocation = async (
  userId: string,
  location: UserLocation,
): Promise<User> => {
  try {
    const updatedUser = await usersApi.updateMe({location});
    return {
      id: updatedUser._id || updatedUser.id || userId,
      name: updatedUser.name || '',
      email: updatedUser.email || '',
      phone: updatedUser.phone || '',
      createdAt: updatedUser.createdAt ? new Date(updatedUser.createdAt as string) : new Date(),
      location: updatedUser.location,
      role: updatedUser.role,
    };
  } catch (error) {
    throw new Error('Failed to update location. Please try again.');
  }
};

/**
 * Check if user is authenticated (JWT session from phone + PIN).
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const {isLoggedIn} = await import('./session');
    return await isLoggedIn();
  } catch {
    return auth().currentUser !== null;
  }
};

/**
 * Remove secondary phone number via API
 */
export const removeSecondaryPhone = async (): Promise<void> => {
  try {
    const authUser = auth().currentUser;
    if (!authUser) {
      throw new Error('User not authenticated');
    }

    await usersApi.updateMe({
      secondaryPhone: null,
      secondaryPhoneVerified: null,
    } as any);
  } catch (error: any) {
    console.error('Error removing secondary phone:', error);
    throw new Error(error.message || 'Failed to remove secondary phone');
  }
};

/**
 * Listen to auth state changes
 */
export const onAuthStateChanged = (
  callback: (user: User | null) => void,
): (() => void) => {
  return auth().onAuthStateChanged(async firebaseUser => {
    if (firebaseUser) {
      const userData = await getCurrentUser();
      callback(userData);
    } else {
      callback(null);
    }
  });
};

export default {
  sendPhoneVerificationCode,
  verifyPhoneCode,
  logout,
  getCurrentUser,
  updateUserProfile,
  updateUserLocation,
  removeSecondaryPhone,
  isAuthenticated,
  onAuthStateChanged,
};
