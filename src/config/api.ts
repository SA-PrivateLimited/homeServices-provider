/**
 * API Configuration
 * Centralized configuration for backend API base URL
 * Same backend as HomeServices (Customer) and Partner web.
 */

import {Platform} from 'react-native';

/** Same production host as Partner / Customer web (`runtime.ts`). */
const PRODUCTION_URL = 'https://api.akansho.com/api';

// Local backend: Android emulator must use 10.0.2.2 (emulator's alias for host), not localhost
const getApiBaseUrl = (): string => {
  if (__DEV__) {
    return Platform.OS === 'android'
      ? 'http://10.0.2.2:3001/api'
      : 'http://localhost:3001/api';
  }
  return PRODUCTION_URL;
};

export const API_BASE_URL = getApiBaseUrl();

/** Socket.IO / emit HTTP host — same as API without `/api` */
export const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '');

// Default timeout for API requests (in milliseconds)
export const API_TIMEOUT = 30000; // 30 seconds
