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

import React, {useEffect, useState, useMemo, useCallback, useRef} from 'react';
import {
  StatusBar,
  Platform,
  PermissionsAndroid,
  StyleSheet,
  View,
  InteractionManager,
} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppThemeProvider, ToastProvider} from 'sapvt-ltd-app-packages';
import './src/i18n'; // Initialize i18n before store (store imports changeLanguage)
import AppNavigator from './src/navigation/AppNavigator';
import {BootSplash, SPLASH_SKY} from './src/components/BootSplash';
import {hideNativeSplash} from './src/native/nativeSplash';
import {useStore} from './src/store';
import NotificationService from './src/services/notificationService';
import GeolocationService from './src/services/geolocationService';
import WebSocketService from './src/services/websocketService';
import {loadAndApplyBranding} from './src/services/brandingService';
import {resolveTheme} from './src/utils/theme';
const App = () => {
  const {isDarkMode, hydrate, currentUser, colorTheme} = useStore();
  const [bootReady, setBootReady] = useState(false);
  const [navReady, setNavReady] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const nativeSplashHidden = useRef(false);
  const handleNavReady = useCallback(() => setNavReady(true), []);
  const handleSplashPainted = useCallback(() => {
    if (nativeSplashHidden.current) {
      return;
    }
    nativeSplashHidden.current = true;
    hideNativeSplash();
  }, []);
  const theme = resolveTheme(isDarkMode);
  const appThemeColors = useMemo(
    () => ({
      primary: theme.primary,
      background: theme.background,
      card: theme.card,
      text: theme.text,
      textSecondary: theme.textSecondary,
      border: theme.border,
      danger: theme.error,
      success: theme.success,
      warning: theme.warning,
      controlH: 36,
      controlHLg: 44,
      controlPx: 12,
      radiusSm: 8,
      radius: 10,
      radiusCard: 12,
    }),
    // colorTheme forces refresh when Brand/Cool/Warm mutates theme.primary in place
    [
      colorTheme,
      isDarkMode,
      theme.primary,
      theme.background,
      theme.card,
      theme.text,
      theme.textSecondary,
      theme.border,
      theme.error,
      theme.success,
      theme.warning,
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

    // Hydrate store + remote themeColors as colorPalette before first UI paint
    (async () => {
      try {
        await hydrate();
        await loadAndApplyBranding();
      } finally {
        setBootReady(true);
      }
    })();
    
    // Cleanup
    return () => {
      if (typeof global.removeEventListener === 'function') {
        global.removeEventListener('unhandledrejection', rejectionHandler);
      }
    };
  }, [hydrate]);

  useEffect(() => {
    if (splashVisible) {
      return;
    }

    const requestNotificationPermission = async () => {
      try {
        if (Platform.OS === 'android' && Platform.Version >= 33) {
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

    const requestLocationPermission = async () => {
      try {
        if (Platform.OS === 'android') {
          const currentStatus = await GeolocationService.checkLocationPermission();
          if (currentStatus !== 'granted') {
            await GeolocationService.requestLocationPermission();
          }
        }
      } catch (error) {
        console.error('Error requesting location permission:', error);
      }
    };

    requestNotificationPermission();
    requestLocationPermission();
  }, [splashVisible]);

  useEffect(() => {
    if (!bootReady || !navReady) {
      return;
    }
    const handle = InteractionManager.runAfterInteractions(() => {
      setSplashVisible(false);
    });
    return () => handle.cancel();
  }, [bootReady, navReady]);

  useEffect(() => {
    if (!currentUser) return;
    NotificationService.initializeAndSaveToken().catch(error => {
      console.error('Error initializing notifications:', error);
    });
  }, [currentUser]);

  // Initialize WebSocket connection for real-time booking notifications
  useEffect(() => {
    const userRole = (currentUser as any)?.role;
    if (!currentUser?.id) {
      // Disconnect WebSocket when user logs out
      console.log('Disconnecting WebSocket - user logged out');
      WebSocketService.disconnect();
    } else if (userRole !== 'provider') {
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

  return (
    <SafeAreaProvider>
      <AppThemeProvider colors={appThemeColors}>
        <ToastProvider>
          <View style={styles.root}>
            <StatusBar
              barStyle={isDarkMode && !splashVisible ? 'light-content' : 'dark-content'}
              backgroundColor={splashVisible ? SPLASH_SKY : theme.background}
            />
            <AppNavigator onReady={handleNavReady} />
            {splashVisible ? (
              <View style={styles.splashLayer} pointerEvents="auto" collapsable={false}>
                <BootSplash onPainted={handleSplashPainted} />
              </View>
            ) : null}
          </View>
        </ToastProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SPLASH_SKY,
  },
  splashLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
});

export default App;

