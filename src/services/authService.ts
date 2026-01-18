/**
 * Authentication Service (Provider App)
 * Uses Firebase Auth for authentication
 * Uses backend API for ALL user data operations (create/read/update)
 */

import auth from '@react-native-firebase/auth';
import messaging from '@react-native-firebase/messaging';
import functions from '@react-native-firebase/functions';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import type {User, UserLocation} from '../types/consultation';
import NotificationService from './notificationService';
import {usersApi} from './api/usersApi';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: '425944993130-342d2o2ao3is7ljq3bi52m6q55279bh9.apps.googleusercontent.com',
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

/**
 * Sign up with email and password
 * Uses API for user creation
 */
export const signUpWithEmail = async (
  email: string,
  password: string,
  name: string,
  phone: string,
): Promise<User> => {
  try {
    // Create Firebase Auth user
    const userCredential = await auth().createUserWithEmailAndPassword(
      email,
      password,
    );

    // Update display name
    await userCredential.user.updateProfile({
      displayName: name,
    });

    // Get FCM token
    const fcmToken = await messaging().getToken();

    // Create user via API with provider role
    const apiUser = await usersApi.createOrUpdate({
      name,
      email,
      phone,
      fcmToken,
      role: 'provider',
    });

    // Initialize notification service to save token
    await NotificationService.initializeAndSaveToken();

    return {
      id: apiUser._id || apiUser.id || userCredential.user.uid,
      name: apiUser.name || name,
      email: apiUser.email || email,
      phone: apiUser.phone || phone,
      createdAt: apiUser.createdAt ? new Date(apiUser.createdAt as string) : new Date(),
      fcmToken,
    };
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Email is already registered. Please login instead.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password should be at least 6 characters.');
    }
    throw new Error('Failed to create account. Please try again.');
  }
};

/**
 * Login with email and password
 * Uses API for user data retrieval
 */
export const loginWithEmail = async (
  email: string,
  password: string,
): Promise<User> => {
  try {
    const userCredential = await auth().signInWithEmailAndPassword(
      email,
      password,
    );

    // Get FCM token
    const fcmToken = await messaging().getToken();

    // Get/update user via API (createOrUpdate handles both cases)
    const apiUser = await usersApi.createOrUpdate({
      name: userCredential.user.displayName || '',
      email: userCredential.user.email || email,
      fcmToken,
      role: 'provider',
    });

    // Initialize notification service to save token
    await NotificationService.initializeAndSaveToken();

    return {
      id: apiUser._id || apiUser.id || userCredential.user.uid,
      name: apiUser.name || '',
      email: apiUser.email || '',
      phone: apiUser.phone || '',
      createdAt: apiUser.createdAt ? new Date(apiUser.createdAt as string) : new Date(),
      fcmToken,
      role: apiUser.role,
      location: apiUser.location,
    };
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email.');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('Incorrect password.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address.');
    }
    throw new Error('Failed to login. Please try again.');
  }
};

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
 * Update user role via API
 */
export const updateUserRole = async (userId: string, role: 'patient' | 'doctor' | 'admin'): Promise<void> => {
  await usersApi.updateMe({role} as any);
};

/**
 * Logout current user
 */
export const logout = async (): Promise<void> => {
  try {
    // Disconnect WebSocket if connected
    try {
      const websocketService = (await import('./websocketService')).default;
      websocketService.disconnect();
    } catch (wsError) {
      // WebSocket disconnect is non-critical, continue with logout
      console.warn('WebSocket disconnect failed during logout:', wsError);
    }

    // Sign out from Firebase Auth
    await auth().signOut();
  } catch (error: any) {
    console.error('Logout error:', error);
    // Even if signOut fails, we should still try to clear local state
    throw new Error(error.message || 'Failed to logout. Please try again.');
  }
};

/**
 * Change user role via API
 */
export const changeUserRole = async (
  userId: string,
  newRole: 'patient' | 'doctor' | 'admin',
  currentUserRole?: 'patient' | 'doctor' | 'admin',
): Promise<User> => {
  try {
    if (newRole === 'admin' && currentUserRole !== 'admin') {
      throw new Error('Admin role can only be assigned by system administrators. Please contact support.');
    }

    const allowedRoles: ('patient' | 'doctor' | 'admin')[] = ['patient', 'doctor'];
    if (!allowedRoles.includes(newRole) && currentUserRole !== 'admin') {
      throw new Error('Invalid role. You can only change to patient or doctor role.');
    }

    const updatedUser = await usersApi.updateMe({role: newRole} as any);
    return {
      id: updatedUser._id || updatedUser.id || userId,
      name: updatedUser.name || '',
      email: updatedUser.email || '',
      phone: updatedUser.phone || '',
      createdAt: updatedUser.createdAt ? new Date(updatedUser.createdAt as string) : new Date(),
      role: updatedUser.role,
    };
  } catch (error) {
    throw new Error('Failed to change role. Please try again.');
  }
};

/**
 * Get current authenticated user via API
 */
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
 * Reset password via email
 */
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await auth().sendPasswordResetEmail(email);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address.');
    }
    throw new Error('Failed to send reset email. Please try again.');
  }
};

/**
 * Sign in with Google
 * Uses API for user creation/update
 */
export const signInWithGoogle = async (): Promise<User> => {
  try {
    try {
      await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
    } catch (playServicesError: any) {
      throw new Error('Google Play Services is not available. Please update Google Play Services.');
    }

    let idToken: string;
    try {
      await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      if (!tokens.idToken) {
        throw new Error('Failed to get ID token from Google Sign-In');
      }
      idToken = tokens.idToken;
    } catch (signInError: any) {
      console.error('Google Sign-In error:', signInError);
      if (signInError.code === 'SIGN_IN_CANCELLED' || signInError.message?.includes('cancelled')) {
        throw new Error('Sign-in cancelled');
      } else if (signInError.code === 'IN_PROGRESS') {
        throw new Error('Sign-in already in progress');
      } else if (signInError.code === 'DEVELOPER_ERROR') {
        throw new Error('Google Sign-In configuration error. Please check webClientId and SHA-1 fingerprint in Firebase Console.');
      } else if (signInError.message) {
        throw new Error(`Google Sign-In failed: ${signInError.message}`);
      }
      throw new Error('Failed to sign in with Google. Please try again.');
    }

    const googleCredential = auth.GoogleAuthProvider.credential(idToken);

    let userCredential;
    try {
      userCredential = await auth().signInWithCredential(googleCredential);
    } catch (authError: any) {
      console.error('Firebase Auth error:', authError);
      if (authError.code === 'auth/invalid-credential') {
        throw new Error('Invalid Google credential. Please try again.');
      } else if (authError.code === 'auth/account-exists-with-different-credential') {
        throw new Error('An account already exists with this email using a different sign-in method.');
      } else if (authError.code === 'auth/missing-client-identifier') {
        throw new Error('Google Sign-In configuration error. Please ensure SHA-1 fingerprint is added to Firebase Console.');
      }
      throw new Error(`Failed to authenticate with Firebase: ${authError.message || authError.code || 'Unknown error'}`);
    }

    const fcmToken = await messaging().getToken();
    const phoneVerified = userCredential.user.phoneNumber &&
                         userCredential.user.phoneNumberVerified === true;

    // Create or update user via API with provider role
    const apiUser = await usersApi.createOrUpdate({
      name: userCredential.user.displayName || 'User',
      email: userCredential.user.email || '',
      phone: userCredential.user.phoneNumber || '',
      fcmToken,
      phoneVerified: phoneVerified || false,
      role: 'provider',
    });

    await NotificationService.initializeAndSaveToken();

    return {
      id: apiUser._id || apiUser.id || userCredential.user.uid,
      name: apiUser.name || userCredential.user.displayName || 'User',
      email: apiUser.email || userCredential.user.email || '',
      phone: apiUser.phone || userCredential.user.phoneNumber || '',
      phoneVerified: apiUser.phoneVerified || false,
      createdAt: apiUser.createdAt ? new Date(apiUser.createdAt as string) : new Date(),
      fcmToken,
      role: apiUser.role,
      location: apiUser.location,
    };
  } catch (error: any) {
    if (error.message && !error.message.includes('Error signing in')) {
      throw error;
    }
    throw new Error(error.message || 'Failed to sign in with Google. Please try again.');
  }
};

/**
 * Send Email OTP for login
 */
export const sendEmailOTP = async (email: string): Promise<{expiresAt: number}> => {
  try {
    const sendEmailOTPFunction = functions().httpsCallable('sendEmailOTP');
    const result = await sendEmailOTPFunction({email});

    return {
      expiresAt: result.data.expiresAt,
    };
  } catch (error: any) {
    console.error('Error sending email OTP:', error);
    if (error.code === 'functions/invalid-argument') {
      throw new Error(error.message || 'Invalid email address');
    } else if (error.code === 'functions/internal') {
      throw new Error('Failed to send email OTP. Please try again.');
    }
    throw new Error(error.message || 'Failed to send email OTP');
  }
};

/**
 * Verify Email OTP and sign in
 * Uses API for user creation/update
 */
export const verifyEmailOTP = async (
  email: string,
  otpCode: string,
  name?: string,
): Promise<User> => {
  try {
    const verifyEmailOTPFunction = functions().httpsCallable('verifyEmailOTP');
    const result = await verifyEmailOTPFunction({
      email,
      otpCode,
      name: name || 'Provider',
    });

    const {customToken, uid} = result.data;
    await auth().signInWithCustomToken(customToken);

    const fcmToken = await messaging().getToken();

    // Create or update user via API with provider role
    const apiUser = await usersApi.createOrUpdate({
      name: name || 'Provider',
      email: email,
      fcmToken,
      phoneVerified: false,
      role: 'provider',
    });

    await NotificationService.initializeAndSaveToken();

    return {
      id: apiUser._id || apiUser.id || uid,
      name: apiUser.name || name || 'Provider',
      email: apiUser.email || email,
      phone: apiUser.phone || '',
      phoneVerified: false,
      createdAt: apiUser.createdAt ? new Date(apiUser.createdAt as string) : new Date(),
      fcmToken,
      role: apiUser.role,
    };
  } catch (error: any) {
    console.error('Error verifying email OTP:', error);
    if (error.code === 'functions/invalid-argument') {
      throw new Error('Invalid OTP code. Please try again.');
    } else if (error.code === 'functions/deadline-exceeded') {
      throw new Error('OTP code has expired. Please request a new one.');
    } else if (error.code === 'functions/resource-exhausted') {
      throw new Error('Too many failed attempts. Please request a new code.');
    } else if (error.code === 'functions/not-found') {
      throw new Error('OTP not found. Please request a new code.');
    }
    throw new Error(error.message || 'Failed to verify email OTP');
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return auth().currentUser !== null;
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
  signUpWithEmail,
  loginWithEmail,
  signInWithGoogle,
  sendPhoneVerificationCode,
  verifyPhoneCode,
  sendEmailOTP,
  verifyEmailOTP,
  logout,
  getCurrentUser,
  updateUserProfile,
  updateUserLocation,
  resetPassword,
  changeUserRole,
  updateUserRole,
  removeSecondaryPhone,
  isAuthenticated,
  onAuthStateChanged,
};
