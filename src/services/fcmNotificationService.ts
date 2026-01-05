/**
 * Firebase Cloud Messaging (FCM) Notification Service
 * 
 * Uses Firebase Cloud Functions to send push notifications (recommended)
 * - Free tier: Unlimited notifications
 * - No API keys needed (uses Firebase Auth)
 * - More secure (server-side)
 * - Integrated with Firebase project
 * 
 * Setup:
 * 1. Deploy Cloud Function: sendPushNotification
 * 2. Users' FCM tokens are stored in Firestore users/{userId}/fcmToken
 */

import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import auth from '@react-native-firebase/auth';
import {Platform} from 'react-native';

const COLLECTIONS = {
  USERS: 'users',
  PROVIDERS: 'providers',
};

export interface PushNotificationData {
  title: string;
  body: string;
  type: 'consultation' | 'prescription' | 'reminder' | 'admin' | 'chat' | 'service';
  consultationId?: string;
  prescriptionId?: string;
  status?: string;
  [key: string]: any;
}

/**
 * FCM Notification Service
 * Sends push notifications via Firebase Cloud Messaging (FCM)
 */
class FCMNotificationService {
  /**
   * Send push notification to a specific user by user ID
   * Retrieves FCM token from Firestore and sends notification
   */
  async sendToUser(
    userId: string,
    notification: PushNotificationData,
  ): Promise<void> {
    try {
      // Validate userId
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        console.warn('⚠️ FCM: Invalid userId:', userId);
        return;
      }

      console.log('🔍 FCM: Fetching user document for:', userId);

      // Get user's FCM token from Firestore
      const userDoc = await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(userId)
        .get();

      if (!userDoc.exists) {
        console.warn('⚠️ FCM: User document not found:', userId);
        return;
      }

      const userData = userDoc.data();
      const fcmToken = userData?.fcmToken;

      console.log('🔍 FCM: User document found:', {
        userId,
        hasFcmToken: !!fcmToken,
        fcmTokenPreview: fcmToken ? fcmToken.substring(0, 20) + '...' : 'none',
      });

      if (!fcmToken) {
        console.warn('⚠️ FCM: No FCM token found for user:', userId);
        console.warn('💡 FCM: Customer needs to log in to the app to receive notifications');
        return;
      }

      // Send notification via Cloud Function
      await this.sendToFCMToken(fcmToken, notification);
    } catch (error: any) {
      // FCM errors are non-critical - log in dev mode
      console.error('❌ FCM: Error sending notification to user:', {
        userId,
        error: error.message || error,
        code: error.code,
      });
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Send notification to FCM token directly via Cloud Function
   * 
   * ⚠️ IMPORTANT: This method tries to call Cloud Function, but auth is optional.
   * For production, use Firestore triggers instead (see firebase/functions/src/index.ts)
   * Firestore triggers work even when app is killed/backgrounded.
   */
  private async sendToFCMToken(
    fcmToken: string,
    notification: PushNotificationData,
  ): Promise<void> {
    try {
      console.log('📤 FCM: Sending notification via Cloud Function:', {
        token: fcmToken.substring(0, 20) + '...',
        title: notification.title,
        body: notification.body,
        type: notification.type,
      });

      // Try to call Cloud Function (auth optional - will fail gracefully if not authenticated)
      // For production apps, use Firestore triggers instead (see firebase/functions/src/index.ts)
      const currentUser = auth().currentUser;
      if (!currentUser) {
        // Don't block - Firestore triggers will handle notifications when app is killed
        console.debug('ℹ️ FCM: Not authenticated. Firestore triggers will handle notifications.');
        console.debug('💡 FCM: For killed/backgrounded apps, use Firestore triggers (onServiceRequestUpdate)');
        return;
      }

      const sendNotification = functions().httpsCallable('sendPushNotification');
      
      console.log('📞 FCM: Calling Cloud Function sendPushNotification...');
      
      const result = await sendNotification({
        token: fcmToken,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          consultationId: notification.consultationId || '',
          prescriptionId: notification.prescriptionId || '',
          status: notification.status || '',
          type: notification.type,
          // Spread other notification data (excluding type to avoid duplicate)
          ...Object.fromEntries(
            Object.entries(notification).filter(([key]) => 
              !['type', 'consultationId', 'prescriptionId', 'status', 'title', 'body'].includes(key)
            )
          ),
        },
        // Add Android-specific config for hooter sound
        android: {
          priority: 'high',
          notification: {
            channelId: notification.type === 'service' ? 'service_requests' : 'consultation-updates',
            sound: notification.type === 'service' ? 'hooter.wav' : 'default',
            priority: 'high',
          },
        },
      });

      // Log success
      console.log('✅ FCM notification sent successfully:', {
        success: result.data?.success,
        messageId: result.data?.messageId,
      });
    } catch (error: unknown) {
      // Handle Cloud Function errors gracefully
      // Don't log errors in production - Firestore triggers will handle it
      const err = error as {code?: string; message?: string};
      
      if (__DEV__) {
        console.debug('ℹ️ FCM: Cloud Function call failed (non-critical):', {
          code: err.code,
          message: err.message?.substring(0, 50),
        });
      }
      
      // Handle specific error cases
      if (err.code === 'functions/not-found' || 
          err.message?.includes('NOT_FOUND') ||
          err.message?.includes('not found')) {
        if (__DEV__) {
          console.debug('💡 FCM: Cloud Function not found. Use Firestore triggers instead.');
        }
      } else if (err.code === 'unauthenticated' || err.code === 'functions/unauthenticated') {
        // Silent fail - Firestore triggers will handle it
        if (__DEV__) {
          console.debug('ℹ️ FCM: Not authenticated. Firestore triggers will handle notifications.');
        }
      } else if (err.code === 'messaging/registration-token-not-registered') {
        // Token is invalid - should clean up
        console.warn('⚠️ FCM: Token invalid. Should be cleaned up from Firestore.');
        // Note: Token cleanup should be handled by Firestore trigger or manual cleanup
      }
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Send push notification to a provider by provider ID
   */
  async sendToProvider(
    providerId: string,
    notification: PushNotificationData,
  ): Promise<void> {
    // Try to get FCM token from providers collection first
    try {
      const providerDoc = await firestore()
        .collection(COLLECTIONS.PROVIDERS)
        .doc(providerId)
        .get();

      if (providerDoc.exists) {
        const providerData = providerDoc.data();
        const fcmToken = providerData?.fcmToken;

        if (fcmToken) {
          await this.sendToFCMToken(fcmToken, notification);
          return;
        }
      }
    } catch (error) {
      // Fall through to users collection
    }

    // Fallback to users collection
    await this.sendToUser(providerId, notification);
  }

  /**
   * Send push notification to all admins
   */
  async sendToAdmins(notification: PushNotificationData): Promise<void> {
    try {
      // Get all admin user IDs
      const snapshot = await firestore()
        .collection(COLLECTIONS.USERS)
        .where('role', '==', 'admin')
        .get();

      const adminIds = snapshot.docs.map(doc => doc.id);

      // Send to all admins
      const promises = adminIds.map(adminId =>
        this.sendToUser(adminId, notification),
      );

      await Promise.all(promises);
    } catch (error: unknown) {
      // FCM errors are non-critical - log silently in dev mode only
      if (__DEV__) {
        const err = error as {code?: string; message?: string};
        console.debug('ℹ️ FCM: Error sending to admins (non-critical):', err.code || err.message);
      }
    }
  }

  /**
   * Helper to format scheduled time safely
   */
  private formatScheduledTime(scheduledTime: Date | any): string {
    try {
      if (!scheduledTime) {
        return 'the scheduled time';
      }

      let date: Date;
      if (scheduledTime instanceof Date) {
        date = scheduledTime;
      } else if (
        scheduledTime &&
        typeof scheduledTime === 'object' &&
        'toDate' in scheduledTime
      ) {
        date = (scheduledTime as any).toDate();
      } else if (
        typeof scheduledTime === 'string' ||
        typeof scheduledTime === 'number'
      ) {
        date = new Date(scheduledTime);
      } else {
        return 'the scheduled time';
      }

      if (isNaN(date.getTime())) {
        return 'the scheduled time';
      }

      return date.toLocaleString();
    } catch (error) {
      return 'the scheduled time';
    }
  }

  /**
   * Notify customer when provider accepts their service request
   */
  async notifyCustomerServiceAccepted(
    customerId: string,
    providerName: string,
    serviceType: string,
    consultationId: string,
  ): Promise<void> {
    console.log('📱 FCM: Sending notification - Service Accepted:', {
      customerId,
      providerName,
      serviceType,
      consultationId,
    });
    
    try {
      await this.sendToUser(customerId, {
        title: 'Service Request Accepted',
        body: `${providerName} has accepted your ${serviceType} service request`,
        type: 'service',
        consultationId,
        status: 'accepted',
      });
      console.log('✅ FCM: Notification sent successfully to customer:', customerId);
    } catch (error: unknown) {
      const err = error as {code?: string; message?: string};
      console.error('❌ FCM: Failed to send notification to customer:', {
        customerId,
        error: err.message || String(error),
        code: err.code,
      });
      // Don't throw - notification failure shouldn't block booking acceptance
    }
  }

  /**
   * Notify customer when provider starts service (with PIN)
   */
  async notifyCustomerServiceStarted(
    customerId: string,
    providerName: string,
    serviceType: string,
    consultationId: string,
    jobCardId?: string,
    pin?: string,
  ): Promise<void> {
    console.log('📱 FCM: Sending notification - Service Started:', {
      customerId,
      providerName,
      serviceType,
      consultationId,
      jobCardId,
      hasPIN: !!pin,
    });
    
    const body = pin 
      ? `${providerName} has started your ${serviceType} service. Your verification PIN is: ${pin}. Please share this PIN when the provider completes the service.`
      : `${providerName} has started your ${serviceType} service`;
    
    await this.sendToUser(customerId, {
      title: 'Service Started',
      body,
      type: 'service',
      consultationId,
      jobCardId: jobCardId || '',
      status: 'in-progress',
      pin: pin || '',
    });
  }

  /**
   * Notify customer when provider completes service
   */
  async notifyCustomerServiceCompleted(
    customerId: string,
    providerName: string,
    serviceType: string,
    consultationId: string,
  ): Promise<void> {
    console.log('📱 FCM: Sending notification - Service Completed:', {
      customerId,
      providerName,
      serviceType,
      consultationId,
    });
    await this.sendToUser(customerId, {
      title: 'Service Completed',
      body: `${providerName} has completed your ${serviceType} service`,
      type: 'service',
      consultationId,
      status: 'completed',
    });
  }

  /**
   * Notify customer when provider cancels service
   */
  async notifyCustomerServiceCancelled(
    customerId: string,
    providerName: string,
    serviceType: string,
    consultationId: string,
    cancellationReason: string,
  ): Promise<void> {
    console.log('📱 FCM: Sending notification - Service Cancelled:', {
      customerId,
      providerName,
      serviceType,
      consultationId,
      cancellationReason,
    });
    await this.sendToUser(customerId, {
      title: 'Service Cancelled',
      body: `${providerName} has cancelled your ${serviceType} service. Reason: ${cancellationReason}`,
      type: 'service',
      consultationId,
      status: 'cancelled',
      cancellationReason,
    });
  }
}

export default new FCMNotificationService();

