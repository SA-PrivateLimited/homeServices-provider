// Polyfill for TextEncoder/TextDecoder (required for react-native-qrcode-svg)
// This MUST be at the very top, before any other imports
import 'fast-text-encoding';

// Ensure TextEncoder/TextDecoder are available globally
if (typeof global.TextEncoder === 'undefined' || typeof global.TextDecoder === 'undefined') {
  const {TextEncoder, TextDecoder} = require('fast-text-encoding');
  global.TextEncoder = global.TextEncoder || TextEncoder;
  global.TextDecoder = global.TextDecoder || TextDecoder;
}

// Also set on window for browser-like environments
if (typeof window !== 'undefined') {
  if (typeof window.TextEncoder === 'undefined') {
    window.TextEncoder = global.TextEncoder;
  }
  if (typeof window.TextDecoder === 'undefined') {
    window.TextDecoder = global.TextDecoder;
  }
}

import React, {useEffect} from 'react';
import {StatusBar, Platform, PermissionsAndroid} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import {useStore} from './src/store';
import NotificationService from './src/services/notificationService';
import GeolocationService from './src/services/geolocationService';
import WebSocketService from './src/services/websocketService';

// OneSignal App ID
const ONESIGNAL_APP_ID = 'b0020b77-3e0c-43c5-b92e-912b1cec1623';

const App = () => {
  const {isDarkMode, hydrate, currentUser} = useStore();

  useEffect(() => {
    // Handle unhandled promise rejections for geolocation errors
    const rejectionHandler = (event: any) => {
      const error = event?.reason || event;
      const errorMessage = error?.message || String(error) || '';
      
      if (errorMessage.includes('RNFusedLocation') || 
          errorMessage.includes('FusedLocationProviderClient') ||
          errorMessage.includes('Could not invoke') ||
          (errorMessage.includes('interface') && errorMessage.includes('class was expected'))) {
        event.preventDefault?.();
        return;
      }
    };

    // Add unhandled rejection listener (if available)
    if (typeof global.addEventListener === 'function') {
      global.addEventListener('unhandledrejection', rejectionHandler);
    }

    // Initialize OneSignal with error handling
    const initializeOneSignal = async () => {
      try {
        // Import OneSignal dynamically
        const OneSignalModule = require('react-native-onesignal');
        // For v5.x, OneSignal is nested inside the module
        const OneSignal = OneSignalModule.OneSignal || OneSignalModule.default || OneSignalModule;
        
        if (!OneSignal) {
          return;
        }

        // For react-native-onesignal v5.x, use setAppId on the OneSignal object
        if (OneSignal.setAppId && typeof OneSignal.setAppId === 'function') {
          OneSignal.setAppId(ONESIGNAL_APP_ID);
        } else if (OneSignal.initialize && typeof OneSignal.initialize === 'function') {
          OneSignal.initialize(ONESIGNAL_APP_ID);
        } else {
          return;
        }
        
        // Request notification permission (OneSignal v5.x)
        // Check current permission status first
        if (OneSignal.Notifications && OneSignal.Notifications.getPermissionAsync) {
          const hasPermission = await OneSignal.Notifications.getPermissionAsync();

          if (!hasPermission) {
            // Request permission using v5.x API
            if (OneSignal.Notifications.requestPermission) {
              const granted = await OneSignal.Notifications.requestPermission(true);

              if (granted) {
              } else {
              }
            }
          } else {
          }
        } else if (OneSignal.promptForPushNotificationsWithUserResponse && typeof OneSignal.promptForPushNotificationsWithUserResponse === 'function') {
          // Fallback for older versions
          OneSignal.promptForPushNotificationsWithUserResponse(response => {
          });
        }

        // For Android, also check system notification settings
        if (Platform.OS === 'android') {
          const {PermissionsAndroid} = require('react-native');
          if (Platform.Version >= 33) {
            // Android 13+ requires POST_NOTIFICATIONS permission
            const permissionStatus = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
            );

            if (permissionStatus === PermissionsAndroid.RESULTS.GRANTED) {
            } else {
            }
          }
        }

        // Set up notification handlers
        if (OneSignal.setNotificationWillShowInForegroundHandler && typeof OneSignal.setNotificationWillShowInForegroundHandler === 'function') {
          OneSignal.setNotificationWillShowInForegroundHandler(notifReceivedEvent => {
            const notification = notifReceivedEvent.getNotification();
            notifReceivedEvent.complete(notification);
          });
        }

        if (OneSignal.setNotificationOpenedHandler && typeof OneSignal.setNotificationOpenedHandler === 'function') {
          OneSignal.setNotificationOpenedHandler(notification => {
          });
        }
      } catch (error) {
        console.error('Error initializing OneSignal:', error);
      }
    };

    // Initialize OneSignal
    initializeOneSignal();

    // Request location permission (similar to notification permission)
    const requestLocationPermission = async () => {
      try {
        if (Platform.OS === 'android') {
          // Check current permission status first
          const currentStatus = await GeolocationService.checkLocationPermission();

          if (currentStatus !== 'granted') {
            // Request permission using GeolocationService
            const requestResult = await GeolocationService.requestLocationPermission();

            if (requestResult === 'granted') {
            } else if (requestResult === 'never_ask_again') {
            } else {
            }
          } else {
          }
        } else {
          // iOS - permissions are requested automatically when needed
        }
      } catch (error) {
        console.error('Error requesting location permission:', error);
      }
    };

    // Request location permission
    requestLocationPermission();

    // Hydrate store from AsyncStorage on app start
    hydrate();
    
    // Initialize notification service and save FCM token (for local notifications)
    NotificationService.initializeAndSaveToken().catch(error => {
      console.error('Error initializing notifications:', error);
    });

    // Cleanup
    return () => {
      if (typeof global.removeEventListener === 'function') {
        global.removeEventListener('unhandledrejection', rejectionHandler);
      }
    };
  }, [hydrate]);

  // Set OneSignal external user ID when user logs in
  useEffect(() => {
    const setOneSignalUserId = () => {
      try {

        const OneSignalModule = require('react-native-onesignal');
        const OneSignal = OneSignalModule.OneSignal || OneSignalModule.default || OneSignalModule;

        if (!OneSignal) {
          return;
        }

        if (currentUser?.id) {

          // For OneSignal SDK v5.x, use login() method instead of setExternalUserId
          if (OneSignal.login && typeof OneSignal.login === 'function') {
            OneSignal.login(currentUser.id);
          } else if (OneSignal.setExternalUserId && typeof OneSignal.setExternalUserId === 'function') {
            // Fallback for older versions
            OneSignal.setExternalUserId(currentUser.id, (results: any) => {
              if (results?.push?.success) {
              } else {
              }
            });
          } else {
          }
        } else {

          // For OneSignal SDK v5.x, use logout() method
          if (OneSignal.logout && typeof OneSignal.logout === 'function') {
            OneSignal.logout();
          } else if (OneSignal.removeExternalUserId && typeof OneSignal.removeExternalUserId === 'function') {
            // Fallback for older versions
            OneSignal.removeExternalUserId();
          }
        }
      } catch (error) {
        console.error('❌ Error managing OneSignal external user ID:', error);
      }
    };

    setOneSignalUserId();

    // Initialize WebSocket connection for real-time booking notifications
    // Check for both 'provider' and 'doctor' roles for backward compatibility
    const userRole = (currentUser as any)?.role;
    if (currentUser?.id && (userRole === 'provider' || userRole === 'doctor')) {
      console.log('✅ Initializing WebSocket for provider:', currentUser.id, 'role:', userRole);
      WebSocketService.connect(currentUser.id);
    } else if (!currentUser?.id) {
      // Disconnect WebSocket when user logs out
      console.log('Disconnecting WebSocket - user logged out');
      WebSocketService.disconnect();
    } else {
      console.log('⚠️ WebSocket not initialized - user role:', userRole, 'user ID:', currentUser?.id);
    }

    // Cleanup on unmount
    return () => {
      if (!currentUser?.id) {
        WebSocketService.disconnect();
      }
    };
  }, [currentUser?.id]);

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#1A202C' : '#F5F7FA'}
      />
      <AppNavigator />
    </SafeAreaProvider>
  );
};

export default App;
