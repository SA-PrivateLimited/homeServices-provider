import PushNotification, {Importance} from 'react-native-push-notification';
import messaging from '@react-native-firebase/messaging';
import {Platform, PermissionsAndroid} from 'react-native';

class NotificationService {
  constructor() {
    try {
      PushNotification.configure({
        onNotification: function (notification) {
          notification.finish();
        },
        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },
        popInitialNotification: false, // Disable to prevent null reference errors
        requestPermissions: Platform.OS === 'ios',
      });
    } catch (error) {
      console.warn('PushNotification configure error:', error);
    }

    // Only create channels on Android
    if (Platform.OS === 'android') {
      // General Reminders Channel
      PushNotification.createChannel(
        {
          channelId: 'general-reminders',
          channelName: 'General Reminders',
          channelDescription: 'General reminders and notifications',
          importance: Importance.HIGH,
          vibrate: true,
        },
        () => {},
      );

      // Chat Messages Channel
      PushNotification.createChannel(
        {
          channelId: 'chat-messages',
          channelName: 'Chat Messages',
          channelDescription: 'New messages',
          importance: Importance.DEFAULT,
          vibrate: true,
        },
        () => {},
      );

    }

    // Request Android notification permission for Android 13+ (API 33+)
    if (Platform.OS === 'android') {
      this.requestAndroidNotificationPermission();
    }

    // Initialize FCM
    this.initializeFCM();
  }

  /**
   * Request POST_NOTIFICATIONS permission for Android 13+ (API 33+)
   * This is required for notifications to be displayed on Android 13+
   */
  async requestAndroidNotificationPermission(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      // Check Android version - POST_NOTIFICATIONS is required for API 33+
      const androidVersion = Platform.Version;
      if (androidVersion < 33) {
        // Android 12 and below don't require runtime permission for notifications
        console.log('ℹ️ Android version < 33, notification permission not required');
        return;
      }

      // Check if permission is already granted
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );

      if (hasPermission) {
        console.log('✅ Android notification permission already granted');
        return;
      }

      // Request permission
      console.log('📱 Requesting Android notification permission...');
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Notification Permission',
          message: 'HomeServices needs permission to send you notifications about your services and appointments.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Allow',
        },
      );

      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('✅ Android notification permission granted');
      } else if (result === PermissionsAndroid.RESULTS.DENIED) {
        console.warn('⚠️ Android notification permission denied');
      } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        console.warn('⚠️ Android notification permission denied and set to never ask again');
      }
    } catch (error: any) {
      console.error('❌ Error requesting Android notification permission:', error?.message);
    }
  }

  async initializeFCM() {
    try {
      // Request permission
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {

        // Get FCM token
        const token = await messaging().getToken();

        // Listen for token refresh
        messaging().onTokenRefresh(async token => {
          // Update token in Firestore user document
          await this.updateFCMTokenInFirestore(token);
        });

        // Handle foreground messages
        messaging().onMessage(async remoteMessage => {
          this.handleFCMMessage(remoteMessage);
        });

        // Handle background messages
        messaging().setBackgroundMessageHandler(async remoteMessage => {
        });
      }
    } catch (error) {
    }
  }

  handleFCMMessage(remoteMessage: any) {
    const {notification, data} = remoteMessage;

    if (notification) {
      // Determine channel based on notification type
      let channelId = 'service_requests'; // Default to service requests
      if (data?.type === 'chat') {
        channelId = 'chat-messages';
      } else if (data?.type === 'reminder') {
        channelId = 'general-reminders';
      } else if (data?.type === 'service') {
        channelId = 'service_requests';
      }

      PushNotification.localNotification({
        channelId,
        title: notification.title || 'HomeServices',
        message: notification.body || '',
        playSound: true,
        soundName: 'default',
        userInfo: data,
      });
    }
  }

  async getFCMToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      return token;
    } catch (error) {
      return null;
    }
  }

  scheduleNotification(
    id: string,
    title: string,
    message: string,
    date: Date,
    repeatType?: 'day' | 'week' | 'time',
  ) {
    PushNotification.localNotificationSchedule({
      channelId: 'medicine-reminders',
      id: id,
      title: title,
      message: message,
      date: date,
      allowWhileIdle: true,
      repeatType: repeatType,
      playSound: true,
      soundName: 'default',
    });
  }

  cancelNotification(id: string) {
    PushNotification.cancelLocalNotification(id);
  }

  cancelAllNotifications() {
    PushNotification.cancelAllLocalNotifications();
  }

  checkPermissions(callback: (permissions: any) => void) {
    PushNotification.checkPermissions(callback);
  }

  requestPermissions() {
    return PushNotification.requestPermissions();
  }


  /**
   * Update FCM token in Firestore for current user
   */
  async updateFCMTokenInFirestore(token: string): Promise<void> {
    try {
      const auth = require('@react-native-firebase/auth').default;
      const firestore = require('@react-native-firebase/firestore').default;
      
      const currentUser = auth().currentUser;
      if (!currentUser) {
        return;
      }

      // Use set with merge: true to create document if it doesn't exist
      await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .set({
          fcmToken: token,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        }, {merge: true});

      // Also check if user is a provider and update providers collection
      try {
        const userDoc = await firestore()
          .collection('users')
          .doc(currentUser.uid)
          .get();
        
        if (userDoc.exists) {
          const userData = userDoc.data();
          if (userData?.role === 'provider') {
            // Also update in providers collection if provider profile exists
            const providerQuery = await firestore()
              .collection('providers')
              .where('email', '==', currentUser.email)
              .limit(1)
              .get();
            
            if (!providerQuery.empty) {
              const providerDoc = providerQuery.docs[0];
              await firestore()
                .collection('providers')
                .doc(providerDoc.id)
                .set({
                  fcmToken: token,
                  updatedAt: firestore.FieldValue.serverTimestamp(),
                }, {merge: true});
            }
          }
        }
      } catch (roleError) {
        // Silently ignore role check errors - not critical
        if (__DEV__) {
        }
      }

      if (__DEV__) {
      }
    } catch (error: any) {
      // Only log error, don't crash the app
      const errorCode = error?.code || '';
      if (errorCode !== 'firestore/not-found') {
      } else if (__DEV__) {
      }
    }
  }

  /**
   * Update FCM token in Firestore for provider
   */
  async updateProviderFCMTokenInFirestore(providerId: string, token: string): Promise<void> {
    try {
      const firestore = require('@react-native-firebase/firestore').default;
      
      // Use set with merge: true to create document if it doesn't exist
      await firestore()
        .collection('providers')
        .doc(providerId)
        .set({
          fcmToken: token,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        }, {merge: true});

      if (__DEV__) {
        console.log('✅ FCM: Provider token saved');
      }
    } catch (error: any) {
      // Only log error, don't crash the app
      const errorCode = error?.code || '';
      if (errorCode !== 'firestore/not-found') {
        console.error('❌ FCM: Error saving provider token:', error?.message);
      } else if (__DEV__) {
        console.warn('⚠️ FCM: Provider document not found');
      }
    }
  }

  /**
   * Initialize and save FCM token for current user
   */
  async initializeAndSaveToken(): Promise<string | null> {
    try {
      const token = await this.getFCMToken();
      if (token) {
        await this.updateFCMTokenInFirestore(token);
      }
      return token;
    } catch (error) {
      return null;
    }
  }
}

export default new NotificationService();
