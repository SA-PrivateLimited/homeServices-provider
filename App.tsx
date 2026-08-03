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

import React, {useEffect, useState, useMemo} from 'react';
import {StatusBar, Platform, PermissionsAndroid} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppThemeProvider} from 'sapvt-ltd-app-packages';
import AppNavigator from './src/navigation/AppNavigator';
import {useStore} from './src/store';
import NotificationService from './src/services/notificationService';
import GeolocationService from './src/services/geolocationService';
import WebSocketService from './src/services/websocketService';
import {loadAndApplyBranding} from './src/services/brandingService';
import {lightTheme, darkTheme} from './src/utils/theme';
import './src/i18n'; // Initialize i18n

const App = () => {
  const {isDarkMode, hydrate, currentUser} = useStore();
  const [bootReady, setBootReady] = useState(false);
  const theme = isDarkMode ? darkTheme : lightTheme;
  const appThemeColors = useMemo(
    () => ({
      primary: theme.primary,
      background: theme.background,
      card: theme.card,
      text: theme.text,
      textSecondary: theme.textSecondary,
      border: theme.border,
    }),
    [
      theme.primary,
      theme.background,
      theme.card,
      theme.text,
      theme.textSecondary,
      theme.border,
    ],
  );

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

    // Request notification permission for FCM (Android 13+)
    const requestNotificationPermission = async () => {
      try {
        if (Platform.OS === 'android' && Platform.Version >= 33) {
          // Android 13+ requires POST_NOTIFICATIONS permission
          const permissionStatus = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );

          if (permissionStatus === PermissionsAndroid.RESULTS.GRANTED) {
            console.log('✅ Notification permission granted');
          } else {
            console.warn('⚠️ Notification permission denied');
          }
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    };

    // Request notification permission
    requestNotificationPermission();

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

    // Hydrate store + remote themeColors as colorPalette before first UI paint
    (async () => {
      try {
        await hydrate();
        await loadAndApplyBranding();
      } finally {
        setBootReady(true);
      }
    })();
    
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

  // FCM tokens are automatically saved to Firestore via NotificationService.initializeAndSaveToken()
  // No need to manually set user IDs - FCM uses Firebase Auth UID automatically

  // Initialize WebSocket connection for real-time booking notifications
  useEffect(() => {
    // Check for both 'provider' and 'doctor' roles for backward compatibility
    // NOTE: WebSocket connection is now handled in ProviderDashboardScreen when provider goes online
    // This is to ensure connection only happens when provider is actually online
    const userRole = (currentUser as any)?.role;
    if (!currentUser?.id) {
      // Disconnect WebSocket when user logs out
      console.log('Disconnecting WebSocket - user logged out');
      WebSocketService.disconnect();
    } else if (userRole !== 'provider' && userRole !== 'doctor') {
      console.log('⚠️ WebSocket not initialized - user role:', userRole, 'user ID:', currentUser?.id);
      // Don't connect here - let ProviderDashboardScreen handle it when provider goes online
    }

    // Cleanup on unmount
    return () => {
      if (!currentUser?.id) {
        WebSocketService.disconnect();
      }
    };
  }, [currentUser?.id]);

  if (!bootReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AppThemeProvider colors={appThemeColors}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={theme.background}
        />
        <AppNavigator />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;

