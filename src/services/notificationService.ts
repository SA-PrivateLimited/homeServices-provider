import PushNotification, {Importance} from 'react-native-push-notification';
import messaging from '@react-native-firebase/messaging';
import {Platform, PermissionsAndroid} from 'react-native';
import {getUserId, readStoredUser} from './session';
import {usersApi} from './api/usersApi';

class NotificationService {
  private listenersBound = false;

  constructor() {
    try {
      PushNotification.configure({
        onNotification: function (notification: {finish?: () => void}) {
          notification.finish?.();
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

      PushNotification.createChannel(
        {
          channelId: 'service_requests',
          channelName: 'Service Requests',
          channelDescription: 'New jobs and job updates',
          importance: Importance.HIGH,
          vibrate: true,
        },
        () => {},
      );
    }

    // Request Android notification permission for Android 13+ (API 33+)
    if (Platform.OS === 'android') {
      this.requestAndroidNotificationPermission();
    }
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
          message: 'Akansho Partner needs permission to send you notifications about new jobs and updates.',
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
        await this.saveTokenToBackend(token);

        if (!this.listenersBound) {
          this.listenersBound = true;
          messaging().onTokenRefresh(next => {
            void this.saveTokenToBackend(next);
          });

          messaging().onMessage(async remoteMessage => {
            this.handleFCMMessage(remoteMessage);
          });
        }
      }
    } catch (error) {
    }
  }

  handleFCMMessage(remoteMessage: any) {
    const {notification, data} = remoteMessage || {};
    const title = notification?.title || data?.title || 'Akansho';
    const message =
      notification?.body || data?.body || data?.message || '';
    if (!message && !title) return;

    let channelId = 'service_requests';
    if (data?.type === 'chat') {
      channelId = 'chat-messages';
    } else if (data?.type === 'reminder') {
      channelId = 'general-reminders';
    }

    PushNotification.localNotification({
      channelId,
      title,
      message,
      playSound: true,
      soundName: 'default',
      userInfo: data,
    });
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


  /** PUT /users/:id/fcmToken — Mongo + FCM topics (not Firestore). */
  async saveTokenToBackend(token?: string | null): Promise<void> {
    const fcmToken = token || (await this.getFCMToken());
    if (!fcmToken) return;
    const user = await readStoredUser();
    const userId = getUserId(user);
    if (!userId) return;
    await usersApi.updateFcmToken(userId, fcmToken);
  }

  async initializeAndSaveToken(): Promise<string | null> {
    try {
      await this.initializeFCM();
      const token = await this.getFCMToken();
      await this.saveTokenToBackend(token);
      return token;
    } catch {
      return null;
    }
  }
}

export default new NotificationService();
