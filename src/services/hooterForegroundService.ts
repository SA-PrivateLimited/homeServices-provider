/**
 * Hooter Foreground Service
 * Wrapper for native Android foreground service that plays hooter sound
 * This service can play sounds even when the app is in the background
 */

import { NativeModules, Platform } from 'react-native';

const { HooterServiceModule } = NativeModules;

class HooterForegroundService {
  /**
   * Start playing hooter sound via foreground service
   * This will play continuously until stopped
   */
  async startHooter(): Promise<void> {
    if (Platform.OS !== 'android') {
      console.warn('⚠️ HooterForegroundService is Android-only');
      return;
    }

    if (!HooterServiceModule) {
      console.error('❌ HooterServiceModule not available');
      return;
    }

    try {
      console.log('🔊 Starting hooter via foreground service...');
      await HooterServiceModule.startHooter();
      console.log('✅ Hooter foreground service started');
    } catch (error: any) {
      console.error('❌ Failed to start hooter foreground service:', error);
      throw error;
    }
  }

  /**
   * Stop playing hooter sound and stop foreground service
   */
  async stopHooter(): Promise<void> {
    if (Platform.OS !== 'android') {
      console.warn('⚠️ HooterForegroundService is Android-only');
      return;
    }

    if (!HooterServiceModule) {
      console.error('❌ HooterServiceModule not available');
      return;
    }

    try {
      console.log('🔇 Stopping hooter foreground service...');
      await HooterServiceModule.stopHooter();
      console.log('✅ Hooter foreground service stopped');
    } catch (error: any) {
      console.error('❌ Failed to stop hooter foreground service:', error);
      throw error;
    }
  }

  /**
   * Check if foreground service is available
   */
  isAvailable(): boolean {
    return Platform.OS === 'android' && HooterServiceModule !== null;
  }
}

export default new HooterForegroundService();

