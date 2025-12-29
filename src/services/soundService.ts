/**
 * Sound Service for HomeServicesProvider
 * Handles playing notification sounds (hooter sound)
 * Independent of WebSocket service
 */

import Sound from 'react-native-sound';
import { Platform, Vibration } from 'react-native';

class SoundService {
  private hooterSound: Sound | null = null;
  private hooterSoundLoaded: boolean = false;
  private continuousPlayInterval: NodeJS.Timeout | null = null;
  private isPlayingContinuously: boolean = false;

  constructor() {
    // Enable playback in silence mode (iOS) and use speaker for Android
    try {
        Sound.setCategory('Playback', true);
      console.log('✅ Sound category set to Playback');
    } catch (error) {
      console.warn('⚠️ Failed to set sound category:', error);
    }

    // Load hooter sound on initialization
    // Use setTimeout to ensure Sound is fully initialized
    setTimeout(() => {
    this.loadHooterSound();
    }, 100);
  }

  /**
   * Load the hooter sound file
   */
  private loadHooterSound(): void {
    // Only load sound if not already loaded
    if (this.hooterSoundLoaded && this.hooterSound) {
      console.log('✅ Hooter sound already loaded');
      return;
    }

    if (this.hooterSound && !this.hooterSoundLoaded) {
      // Sound object exists but not marked as loaded - verify it's ready
      try {
        const duration = this.hooterSound.getDuration();
        if (duration > 0) {
          console.log('✅ Hooter sound object exists and is ready, marking as loaded');
          this.hooterSoundLoaded = true;
          return;
        }
      } catch (e) {
        // Sound exists but not ready, continue to reload
        console.warn('⚠️ Sound object exists but not ready, reloading...');
        this.hooterSound = null;
      }
    }

    try {
      console.log('🔊 Loading hooter sound from assets...');
      console.log('📁 Platform:', Platform.OS);
      
      // Release existing sound if any
      if (this.hooterSound) {
        try {
          this.hooterSound.stop();
          this.hooterSound.release();
        } catch (e) {
          // Ignore errors when releasing
        }
        this.hooterSound = null;
      }
      
      this.hooterSoundLoaded = false;
      
      // For Android: Use undefined for res/raw files
      // For iOS: Use Sound.MAIN_BUNDLE
      const basePath = Platform.OS === 'android' ? undefined : Sound.MAIN_BUNDLE;
      
      console.log('📦 Creating Sound instance with:', {
        file: 'hooter.wav',
        basePath: basePath === undefined ? 'undefined (Android res/raw)' : 'Sound.MAIN_BUNDLE',
        platform: Platform.OS,
      });
      
      const soundInstance = new Sound(
        'hooter.wav',
        basePath,
        (error) => {
        if (error) {
            console.error('❌ Failed to load hooter sound:', {
              error,
              message: (error as any)?.message || String(error),
              platform: Platform.OS,
            });
          this.hooterSound = null;
          this.hooterSoundLoaded = false;
          return;
        }

          // Success callback - sound is loaded
          console.log('✅ Hooter sound loaded successfully (callback fired)');
          this.hooterSound = soundInstance;
          this.hooterSoundLoaded = true;
          
          // Verify duration
          try {
            const duration = soundInstance.getDuration();
            console.log('✅ Sound duration:', duration, 'seconds');
            if (duration <= 0) {
              console.warn('⚠️ Sound duration is 0 or negative, but callback succeeded');
            }
          } catch (e) {
            console.warn('⚠️ Could not get duration, but sound is loaded');
        }
        }
      );

      // Assign immediately - sound object is created synchronously
      // The callback will be called asynchronously when ready
      this.hooterSound = soundInstance;
      console.log('📦 Sound instance created, waiting for load callback...');
    } catch (error: any) {
      console.error('❌ Error creating sound instance:', {
        error,
        message: error?.message || String(error),
        platform: Platform.OS,
      });
      this.hooterSound = null;
      this.hooterSoundLoaded = false;
    }
  }

  /**
   * Play hooter sound (single play)
   */
  playHooterSound(): void {
    console.log('🔊 [PLAY] Attempting to play hooter sound...');

    // Ensure sound is loaded first
    if (!this.hooterSound) {
      console.log('⏳ [PLAY] Sound object not available, loading...');
      this.loadHooterSound();
      // Wait a bit for sound to load, then try again
      setTimeout(() => {
          this.playHooterSound();
      }, 1000);
      return;
    }

    // Try to play even if not marked as loaded - sometimes the callback doesn't fire
    // but the sound is still ready
    let isReady = this.hooterSoundLoaded;
    
    if (!isReady) {
    try {
        const duration = this.hooterSound.getDuration();
        if (duration > 0) {
          console.log('✅ [PLAY] Sound ready (duration check), duration:', duration);
          isReady = true;
          this.hooterSoundLoaded = true;
        } else {
          console.log('⏳ [PLAY] Sound duration is 0, waiting...');
          // Try again after a delay
          setTimeout(() => {
            this.playHooterSound();
          }, 500);
          return;
        }
      } catch (e) {
        console.log('⏳ [PLAY] Cannot check duration yet, trying to play anyway...');
        // Don't return - try to play anyway
      }
    }
  
    console.log('🔊 [PLAY] Playing hooter sound now (ready:', isReady, ')...');
  
    // Vibrate for haptic feedback
    try {
      Vibration.vibrate([0, 500, 200, 500]);
    } catch (vibError) {
      console.warn('⚠️ Vibration failed:', vibError);
    }
  
    try {
      // Stop any current playback
      this.hooterSound.stop();
      // Reset to beginning
      this.hooterSound.reset();
      // Set volume to maximum
      this.hooterSound.setVolume(1.0);

      console.log('🔊 [PLAY] Calling sound.play()...');

      // Play the sound - try even if not marked as loaded
      this.hooterSound.play((success) => {
        if (success) {
          console.log('✅ [PLAY] Sound played successfully');
          // Mark as loaded after successful play
          this.hooterSoundLoaded = true;
        } else {
          console.log('❌ [PLAY] Playback failed - success callback returned false');
          // If failed, try reloading
          if (!this.hooterSoundLoaded) {
            console.log('🔄 [PLAY] Reloading sound and retrying...');
            this.hooterSoundLoaded = false;
            this.hooterSound = null;
            setTimeout(() => {
              this.loadHooterSound();
              setTimeout(() => this.playHooterSound(), 1000);
            }, 500);
          }
        }
      });
    } catch (error) {
      console.error('❌ [PLAY] Error playing sound:', error);
      // If error, try reloading
      if (!this.hooterSoundLoaded) {
        console.log('🔄 [PLAY] Error occurred, reloading sound...');
        this.hooterSoundLoaded = false;
      this.hooterSound = null;
        setTimeout(() => {
          this.loadHooterSound();
          setTimeout(() => this.playHooterSound(), 1000);
        }, 500);
      }
    }
  }

  /**
   * Start playing hooter sound continuously (every 2 seconds)
   */
  startContinuousPlay(): void {
    if (this.isPlayingContinuously) {
      console.log('🔊 Continuous play already running');
      return;
    }

    console.log('🔊 Starting continuous hooter sound playback');
    
    // Ensure sound is loaded
    if (!this.hooterSound) {
      console.log('⏳ Sound object not available, loading...');
      this.loadHooterSound();
      // Wait for sound to load, then start continuous play
      const checkInterval = setInterval(() => {
        if (this.hooterSound) {
          try {
            const duration = this.hooterSound.getDuration();
            if (duration > 0) {
              console.log('✅ Sound loaded, starting continuous play');
              this.hooterSoundLoaded = true;
              clearInterval(checkInterval);
              this.startContinuousPlay();
    }
          } catch (e) {
            // Still loading
          }
        }
      }, 200);
      
      // Stop checking after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!this.hooterSoundLoaded) {
          console.warn('⚠️ Sound did not load within timeout, trying anyway');
        }
      }, 5000);
      return;
    }

    // Check if sound is ready
    if (!this.hooterSoundLoaded) {
      try {
        const duration = this.hooterSound.getDuration();
        if (duration > 0) {
          this.hooterSoundLoaded = true;
          console.log('✅ Sound ready, duration:', duration);
        } else {
          console.log('⏳ Sound duration is 0, waiting...');
          setTimeout(() => {
            this.startContinuousPlay();
          }, 500);
          return;
        }
      } catch (e) {
        console.log('⏳ Sound not ready yet, waiting...');
        setTimeout(() => {
          this.startContinuousPlay();
        }, 500);
        return;
      }
    }

    this.isPlayingContinuously = true;
    console.log('🔊 Continuous play started, will play every 2 seconds');

    // Play immediately
    this.playHooterSound();

    // Then play every 2 seconds
    this.continuousPlayInterval = setInterval(() => {
      if (this.isPlayingContinuously) {
        console.log('🔊 Playing hooter (continuous loop)');
        this.playHooterSound();
      } else {
        console.log('🔇 Continuous play stopped, clearing interval');
        if (this.continuousPlayInterval) {
          clearInterval(this.continuousPlayInterval);
          this.continuousPlayInterval = null;
        }
      }
    }, 2000);
  }

  /**
   * Stop continuous hooter sound playback
   */
  stopContinuousPlay(): void {
    if (!this.isPlayingContinuously) {
      return;
    }

    console.log('🔇 Stopping continuous hooter sound');
    this.isPlayingContinuously = false;

    if (this.continuousPlayInterval) {
      clearInterval(this.continuousPlayInterval);
      this.continuousPlayInterval = null;
    }

    // Stop current playback
    if (this.hooterSound) {
      try {
        this.hooterSound.stop();
        this.hooterSound.reset();
      } catch (error) {
        console.warn('Error stopping sound:', error);
      }
    }
  }
  

  /**
   * Release sound resources
   */
  release(): void {
    // Stop continuous play first
    this.stopContinuousPlay();

    if (this.hooterSound) {
      try {
        this.hooterSound.stop();
        this.hooterSound.release();
      } catch (error) {
        console.warn('Error releasing sound:', error);
      }
      this.hooterSound = null;
      this.hooterSoundLoaded = false;
      console.log('Hooter sound resources released');
    }
  }

  /**
   * Check if sound is loaded and ready
   */
  isSoundReady(): boolean {
    return this.hooterSoundLoaded && this.hooterSound !== null;
  }

  /**
   * Force reload the sound (useful for debugging)
   */
  reloadSound(): void {
    console.log('🔄 Force reloading hooter sound...');
    this.hooterSoundLoaded = false;
    if (this.hooterSound) {
      try {
        this.hooterSound.stop();
        this.hooterSound.release();
      } catch (e) {
        // Ignore
      }
      this.hooterSound = null;
    }
    this.loadHooterSound();
  }
}

// Export singleton instance
export default new SoundService();
