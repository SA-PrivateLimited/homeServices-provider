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
    } catch (error) {
      console.warn('Failed to set sound category:', error);
    }

    // Load hooter sound on initialization
    this.loadHooterSound();
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
      // Load sound from assets
      // For Android: Place sound file in android/app/src/main/res/raw/
      // For iOS: Add sound file to Xcode project
      // Note: Sound file exists at android/app/src/main/res/raw/hooter.wav

      // Create sound instance - the object is available immediately
      // ✅ CORRECT: Use undefined for Android res/raw files
      const soundInstance = new Sound(
        'hooter.wav',
        undefined, // ✅ IMPORTANT for Android res/raw
        (error) => {
          if (error) {
            console.log('❌ Failed to load hooter:', error);
            this.hooterSound = null;
            this.hooterSoundLoaded = false;
            return;
          }

          // Success - sound is ready
          this.hooterSound = soundInstance;
          this.hooterSoundLoaded = true;

          console.log('✅ Hooter loaded, duration:', soundInstance.getDuration());
        }
      );

      // Assign immediately - sound object is created synchronously
      // The callback will be called asynchronously when ready
      this.hooterSound = soundInstance;
      console.log('📦 Sound instance created, waiting for callback...');
    } catch (error) {
      console.warn('❌ Error creating sound instance:', error);
      this.hooterSound = null;
      this.hooterSoundLoaded = false;
    }
  }

  /**
   * Play hooter sound (single play)
   */
  playHooterSound(): void {
    if (!this.hooterSound) {
      console.log('⏳ Sound object not available');
      return;
    }

    // Check if sound is loaded
    if (!this.hooterSoundLoaded) {
      try {
        const duration = this.hooterSound.getDuration();
        if (duration > 0) {
          this.hooterSoundLoaded = true;
          console.log('✅ Sound ready, duration:', duration);
        } else {
          console.log('⏳ Sound not loaded yet, duration:', duration);
          return;
        }
      } catch (e) {
        console.log('⏳ Sound not ready yet');
        return;
      }
    }
  
    console.log('🔊 Playing hooter sound');
  
    // Vibrate for haptic feedback
    Vibration.vibrate([0, 500, 200, 500]);
  
    try {
      // Stop any current playback
      this.hooterSound.stop();
      // Reset to beginning
      this.hooterSound.reset();
      // Set volume to maximum
      this.hooterSound.setVolume(1.0);
      
      // Play the sound
      this.hooterSound.play((success) => {
        if (success) {
          console.log('✅ Sound played successfully');
        } else {
          console.log('❌ Playback failed');
        }
      });
    } catch (error) {
      console.error('❌ Error playing sound:', error);
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
}

// Export singleton instance
export default new SoundService();
