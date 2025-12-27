import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import type {User, UserLocation} from '../types/consultation';
import NotificationService from './notificationService';

/**
 * Authentication Service
 * Handles Firebase Authentication (Google, Phone & Email/Password)
 */

const COLLECTIONS = {
  USERS: 'users',
};

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: '136199853280-v1ea3pa1fr44qv5hihp6ougjcrib3dj5.apps.googleusercontent.com',
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

/**
 * Sign up with email and password
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

    // Create user document in Firestore
    const userData: User = {
      id: userCredential.user.uid,
      name,
      email,
      phone,
      createdAt: new Date(),
      fcmToken,
    };

    // Initialize notification service to save token
    await NotificationService.initializeAndSaveToken();

    await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userCredential.user.uid)
      .set(userData);

    return userData;
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

    // Get user data from Firestore
    const userDoc = await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userCredential.user.uid)
      .get();

    if (!userDoc.exists) {
      throw new Error('User data not found');
    }

    // Update FCM token (use set with merge to create if doesn't exist)
    const fcmToken = await messaging().getToken();
    await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userCredential.user.uid)
      .set({fcmToken}, {merge: true});

    // Initialize notification service to save token
    await NotificationService.initializeAndSaveToken();

    const userData = {
      id: userDoc.id,
      ...userDoc.data(),
      createdAt: userDoc.data()?.createdAt?.toDate(),
      fcmToken,
      role: userDoc.data()?.role || undefined,
    } as User;

    return userData;
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
 * Phone number must be in E.164 format (e.g., +919876543210)
 * Uses invisible reCAPTCHA to reduce rate limiting
 */
export const sendPhoneVerificationCode = async (
  phoneNumber: string,
): Promise<any> => {
  try {
    // Ensure phone number is in E.164 format
    let formattedPhone = phoneNumber.trim();
    
    // Remove any spaces, dashes, or parentheses
    formattedPhone = formattedPhone.replace(/[\s\-\(\)]/g, '');
    
    // Ensure it starts with +
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }
    
    // Validate E.164 format: + followed by 1-15 digits
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(formattedPhone)) {
      throw new Error('Invalid phone number format. Please use format: +91XXXXXXXXXX');
    }

    console.log('Sending verification code to:', formattedPhone);
    
    // Use signInWithPhoneNumber with automatic reCAPTCHA verification
    // This helps reduce rate limiting by verifying the request is legitimate
    const confirmation = await auth().signInWithPhoneNumber(formattedPhone, true);

    return confirmation;
  } catch (error: any) {
    console.error('Phone verification error:', error.code, error.message);
    
    if (error.code === 'auth/invalid-phone-number') {
      throw new Error('Invalid phone number format. Please check the number and try again.');
    } else if (error.code === 'auth/too-many-requests') {
      // Rate limiting is per phone number, not per user
      // This usually happens during testing with the same number
      throw new Error('Too many verification attempts for this number. Please wait a few minutes or use a different number.');
    } else if (error.code === 'auth/quota-exceeded') {
      throw new Error('SMS service temporarily unavailable. Please try again in a few minutes.');
    } else if (error.code === 'auth/captcha-check-failed') {
      throw new Error('Security verification failed. Please try again.');
    } else if (error.code === 'auth/app-not-authorized') {
      throw new Error('App not authorized for phone authentication. Please contact support.');
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
 */
export const verifyPhoneCode = async (
  confirmation: any,
  code: string,
  name: string,
  email?: string,
): Promise<User> => {
  try {

    const userCredential = await confirmation.confirm(code);

    // Check if user document exists
    const userDoc = await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userCredential.user.uid)
      .get();

    let userData: User;

    if (userDoc.exists) {
      // Existing user - update FCM token and mark phone as verified
      const fcmToken = await messaging().getToken();
      await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(userCredential.user.uid)
        .set({fcmToken, phoneVerified: true}, {merge: true});

      userData = {
        id: userDoc.id,
        ...userDoc.data(),
        createdAt: userDoc.data()?.createdAt?.toDate(),
        fcmToken,
        phoneVerified: true, // Phone is verified via Firebase Auth
        role: userDoc.data()?.role || undefined,
      } as User;

      // Initialize notification service to save token
      await NotificationService.initializeAndSaveToken();
    } else {
      // New user - create document with phone verified
      const fcmToken = await messaging().getToken();

      userData = {
        id: userCredential.user.uid,
        name,
        email: email || '',
        phone: userCredential.user.phoneNumber || '',
        phoneVerified: true, // Phone is verified via Firebase Auth
        createdAt: new Date(),
        fcmToken,
      };

      await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(userCredential.user.uid)
        .set({
          ...userData,
          phoneVerified: true,
        });

      // Initialize notification service to save token
      await NotificationService.initializeAndSaveToken();
    }

    return userData;
  } catch (error: any) {
    if (error.code === 'auth/invalid-verification-code') {
      throw new Error('Invalid verification code. Please try again.');
    } else if (error.code === 'auth/code-expired') {
      throw new Error('Verification code expired. Please request a new one.');
    }
    throw new Error('Failed to verify code. Please try again.');
  }
};

/**
 * Update user role in Firestore
 */
export const updateUserRole = async (userId: string, role: 'patient' | 'doctor' | 'admin'): Promise<void> => {
  try {
    await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .set({role}, {merge: true});
  } catch (error) {
    throw new Error('Failed to update user role. Please try again.');
  }
};

/**
 * Logout current user
 */
export const logout = async (): Promise<void> => {
  try {
    await auth().signOut();
  } catch (error) {
    throw new Error('Failed to logout. Please try again.');
  }
};

/**
 * Change user role
 * SECURITY: Users can only change to patient or doctor. Admin role can only be assigned by system administrators.
 */
export const changeUserRole = async (
  userId: string,
  newRole: 'patient' | 'doctor' | 'admin',
  currentUserRole?: 'patient' | 'doctor' | 'admin',
): Promise<User> => {
  try {

    // SECURITY: Prevent non-admin users from assigning admin role
    if (newRole === 'admin' && currentUserRole !== 'admin') {
      throw new Error('Admin role can only be assigned by system administrators. Please contact support.');
    }

    // SECURITY: Users can only change to patient or doctor
    const allowedRoles: ('patient' | 'doctor' | 'admin')[] = ['patient', 'doctor'];
    if (!allowedRoles.includes(newRole) && currentUserRole !== 'admin') {
      throw new Error('Invalid role. You can only change to patient or doctor role.');
    }

    await firestore().collection(COLLECTIONS.USERS).doc(userId).update({
      role: newRole,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    // Fetch updated user data
    const userDoc = await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .get();

    if (!userDoc.exists) {
      throw new Error('User data not found');
    }

    const userData = {
      id: userDoc.id,
      ...userDoc.data(),
      createdAt: userDoc.data()?.createdAt?.toDate(),
      role: userDoc.data()?.role || undefined,
    } as User;

    return userData;
  } catch (error) {
    throw new Error('Failed to change role. Please try again.');
  }
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const currentUser = auth().currentUser;

    if (!currentUser) {
      return null;
    }

    const userDoc = await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(currentUser.uid)
      .get();

    if (!userDoc.exists) {
      return null;
    }

    const userData = {
      id: userDoc.id,
      ...userDoc.data(),
      createdAt: userDoc.data()?.createdAt?.toDate(),
      role: userDoc.data()?.role || undefined,
    } as User;

    return userData;
  } catch (error) {
    return null;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string,
  updates: Partial<User>,
): Promise<User> => {
  try {

    // Convert Date objects to Firestore Timestamps
    const firestoreUpdates: any = {
      ...updates,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    // Handle location update
    if (updates.location) {
      firestoreUpdates.location = {
        ...updates.location,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };
    }

    await firestore().collection(COLLECTIONS.USERS).doc(userId).update(firestoreUpdates);

    const userDoc = await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .get();

    const userData = {
      id: userDoc.id,
      ...userDoc.data(),
      createdAt: userDoc.data()?.createdAt?.toDate(),
      location: userDoc.data()?.location
        ? {
            ...userDoc.data()?.location,
            updatedAt: userDoc.data()?.location?.updatedAt?.toDate(),
          }
        : undefined,
    } as User;

    return userData;
  } catch (error) {
    throw new Error('Failed to update profile. Please try again.');
  }
};

/**
 * Update user location
 */
export const updateUserLocation = async (
  userId: string,
  location: UserLocation,
): Promise<User> => {
  try {

    await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .update({
        location: {
          ...location,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

    const userDoc = await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .get();

    const userData = {
      id: userDoc.id,
      ...userDoc.data(),
      createdAt: userDoc.data()?.createdAt?.toDate(),
      location: userDoc.data()?.location
        ? {
            ...userDoc.data()?.location,
            updatedAt: userDoc.data()?.location?.updatedAt?.toDate(),
          }
        : undefined,
    } as User;

    return userData;
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
 */
export const signInWithGoogle = async (): Promise<User> => {
  try {

    // Check if device supports Google Play services
    try {
      await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
    } catch (playServicesError: any) {
      throw new Error('Google Play Services is not available. Please update Google Play Services.');
    }

    // Get user's ID token
    let idToken: string;
    try {
      // Sign in with Google
      await GoogleSignin.signIn();
      
      // Get the ID token after sign-in
      const tokens = await GoogleSignin.getTokens();
      if (!tokens.idToken) {
        throw new Error('Failed to get ID token from Google Sign-In');
      }
      idToken = tokens.idToken;
    } catch (signInError: any) {
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

    // Create Google credential
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);

    // Sign in with credential
    let userCredential;
    try {
      userCredential = await auth().signInWithCredential(googleCredential);
    } catch (authError: any) {
      if (authError.code === 'auth/invalid-credential') {
        throw new Error('Invalid Google credential. Please try again.');
      } else if (authError.code === 'auth/account-exists-with-different-credential') {
        throw new Error('An account already exists with this email using a different sign-in method.');
      }
      throw new Error('Failed to authenticate with Firebase. Please try again.');
    }

    // Check if user document exists
    const userDoc = await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userCredential.user.uid)
      .get();

    let userData: User;

    if (userDoc.exists) {
      // Existing user - update FCM token
      const fcmToken = await messaging().getToken();
      const existingData = userDoc.data();
      
      // Check if phone is already verified
      const phoneVerified = existingData?.phoneVerified === true || 
                           (userCredential.user.phoneNumber && 
                            userCredential.user.phoneNumberVerified === true);
      
      await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(userCredential.user.uid)
        .set({fcmToken}, {merge: true});

      userData = {
        id: userDoc.id,
        ...existingData,
        createdAt: existingData?.createdAt?.toDate(),
        fcmToken,
        phoneVerified: phoneVerified || false,
        role: existingData?.role || undefined,
      } as User;

      // Initialize notification service to save token
      await NotificationService.initializeAndSaveToken();
    } else {
      // New user - create document
      // Phone is NOT verified for Google Sign-In users - they need to verify separately
      const fcmToken = await messaging().getToken();
      const phoneVerified = userCredential.user.phoneNumber && 
                           userCredential.user.phoneNumberVerified === true;

      userData = {
        id: userCredential.user.uid,
        name: userCredential.user.displayName || 'User',
        email: userCredential.user.email || '',
        phone: userCredential.user.phoneNumber || '',
        phoneVerified: phoneVerified || false,
        createdAt: new Date(),
        fcmToken,
      };

      await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(userCredential.user.uid)
        .set({
          ...userData,
          phoneVerified: phoneVerified || false,
        });

      // Initialize notification service to save token
      await NotificationService.initializeAndSaveToken();
    }

    return userData;
  } catch (error: any) {
    // Re-throw if it's already a user-friendly error
    if (error.message && !error.message.includes('Error signing in')) {
      throw error;
    }
    throw new Error(error.message || 'Failed to sign in with Google. Please try again.');
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return auth().currentUser !== null;
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
  logout,
  getCurrentUser,
  updateUserProfile,
  updateUserLocation,
  resetPassword,
  changeUserRole,
  updateUserRole,
  isAuthenticated,
  onAuthStateChanged,
};
