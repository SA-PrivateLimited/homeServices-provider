/**
 * WebSocket Service for HomeServicesProvider
 * Listens for real-time booking notifications and plays hooter sound
 */

import io, { Socket } from 'socket.io-client';
import Sound from 'react-native-sound';
import { Alert, Platform } from 'react-native';
import { createJobCard } from './jobCardService';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { getProviderStatus, getDistanceToCustomer, formatDistance } from './providerLocationService';

// WebSocket URL - Set this to your actual server URL
// For development: Use your local IP address (e.g., 'http://192.168.1.100:3000')
// For production: Use your production server URL
const SOCKET_URL = __DEV__
  ? 'http://10.0.2.2:3001' // Android emulator localhost (using port 3001 to avoid conflicts)
  : process.env.SOCKET_URL || 'https://your-production-server.com'; // Set via environment variable

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private hooterSound: Sound | null = null;
  private currentProviderId: string | null = null;
  private hooterSoundLoaded: boolean = false;
  private bookingCallbacks: Array<(bookingData: any) => void> = [];

  constructor() {
    // Enable playback in silence mode (iOS)
    try {
    Sound.setCategory('Playback', true);
    } catch (error) {
      console.warn('Failed to set sound category:', error);
    }
  }

  /**
   * Register callback for new bookings (used by UI components)
   */
  onNewBooking(callback: (bookingData: any) => void): () => void {
    this.bookingCallbacks.push(callback);
    // Return unsubscribe function
    return () => {
      this.bookingCallbacks = this.bookingCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Initialize WebSocket connection and setup event listeners
   */
  connect(providerId: string): void {
    if (!providerId || providerId.trim() === '') {
      console.warn('Cannot connect WebSocket: Invalid provider ID');
      return;
    }

    // Disconnect existing connection if connecting to different provider
    if (this.socket?.connected) {
      if (this.currentProviderId === providerId) {
        console.log('WebSocket already connected for this provider');
        return;
      } else {
        console.log('Disconnecting existing WebSocket connection');
        this.disconnect();
      }
    }

    this.currentProviderId = providerId;

    // Check if SOCKET_URL is configured
    if (!SOCKET_URL || SOCKET_URL.includes('your-production-server.com')) {
      console.log('WebSocket URL not configured. WebSocket features will be disabled.');
      console.log('To enable: Set SOCKET_URL environment variable or update websocketService.ts');
      return;
    }

    try {
      // Initialize socket connection
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: true,
        autoConnect: true,
        // Add path if your server uses a custom path (default is '/socket.io/')
        path: '/socket.io/',
        // Additional options for better compatibility
        upgrade: true,
        rememberUpgrade: false,
        // Add query parameters for debugging
        query: {
          providerId: this.currentProviderId,
          clientType: 'provider-app',
        },
      });

      // Connection events
      this.socket.on('connect', () => {
        const transport = (this.socket as any)?.io?.engine?.transport?.name || 'unknown';
        console.log('✅ WebSocket connected successfully:', {
          socketId: this.socket?.id,
          providerId: this.currentProviderId,
          url: SOCKET_URL,
          transport: transport,
        });
        this.isConnected = true;

        // Join provider-specific room
        if (this.currentProviderId) {
          this.socket?.emit('join-provider-room', this.currentProviderId);
          console.log(`✅ Joined provider room: provider-${this.currentProviderId}`);
          console.log(`📋 Provider ID for notifications: ${this.currentProviderId}`);
        } else {
          console.warn('WebSocket connected but no provider ID available');
        }
      });

      // Listen for room-joined confirmation
      this.socket.on('room-joined', (data: any) => {
        console.log('✅ Room join confirmed:', data);
      });

      this.socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error: any) => {
        // Only log error if server URL is configured (not a placeholder)
        if (SOCKET_URL && !SOCKET_URL.includes('your-production-server.com')) {
          const errorMessage = error?.message || error?.toString() || 'Unknown error';
          console.warn('WebSocket connection error (will retry):', errorMessage);
          console.warn('Connection details:', {
            url: SOCKET_URL,
            providerId: this.currentProviderId,
            error: errorMessage,
            description: error?.description || 'No description',
            type: error?.type || 'Unknown',
          });
          
          // Check if it's a network error vs server error
          if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Network')) {
            console.warn('⚠️ Server might not be running. Start server with: cd HomeServices/server && npm start');
          }
        } else {
          // Server URL not configured - silently skip connection
          console.log('WebSocket server not configured. Skipping connection.');
        }
        this.isConnected = false;
        // Don't show alert for connection errors - they're handled by reconnection
      });

      this.socket.on('reconnect_error', (error) => {
        // Only log if server URL is configured
        if (SOCKET_URL && !SOCKET_URL.includes('your-production-server.com')) {
          console.warn('WebSocket reconnection error (will retry):', error.message || error);
        }
      });

      this.socket.on('reconnect_failed', () => {
        // Only show alert if server URL is configured
        if (SOCKET_URL && !SOCKET_URL.includes('your-production-server.com')) {
          console.warn('WebSocket reconnection failed after all attempts');
          // Don't show alert - WebSocket is optional for app functionality
          // Alert.alert(
          //   'Connection Failed',
          //   'Unable to connect to the server. Please check your internet connection.',
          //   [{text: 'OK'}]
          // );
        }
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log(`WebSocket reconnected after ${attemptNumber} attempts`);
        // Rejoin room after reconnection
        if (this.currentProviderId) {
          this.socket?.emit('join-provider-room', this.currentProviderId);
        }
      });

      // Listen for new booking events
      this.socket.on('new-booking', (bookingData: any) => {
        console.log('🔔 New booking received via WebSocket:', {
          bookingId: bookingData.consultationId || bookingData.id || bookingData.bookingId,
          customerName: bookingData.customerName || bookingData.patientName,
          providerId: this.currentProviderId,
          bookingData: bookingData,
        });
        this.handleNewBooking(bookingData);
      });

      // Add error handler for socket errors
      this.socket.on('error', (error: any) => {
        console.error('❌ WebSocket error:', error);
      });

      // Load hooter sound
      this.loadHooterSound();
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
    }
  }

  /**
   * Load the hooter sound file
   */
  private loadHooterSound(): void {
    // Only load sound if not already loaded
    if (this.hooterSoundLoaded) {
      console.log('✅ Hooter sound already loaded');
      return;
    }

    if (this.hooterSound) {
      // Sound object exists but not marked as loaded - mark it now
      console.log('✅ Hooter sound object exists, marking as loaded');
      this.hooterSoundLoaded = true;
      return;
    }

    try {
      console.log('🔊 Loading hooter sound from assets...');
      // Load sound from assets
      // For Android: Place sound file in android/app/src/main/res/raw/
      // For iOS: Add sound file to Xcode project
      // Note: Sound file exists at android/app/src/main/res/raw/hooter.wav
      const soundInstance = new Sound('hooter.wav', Sound.MAIN_BUNDLE, (error) => {
        if (error) {
          console.warn('❌ Hooter sound file not found or failed to load:', error);
          console.warn('File should be at: android/app/src/main/res/raw/hooter.wav');
          this.hooterSound = null;
          this.hooterSoundLoaded = false;
          return;
        }
        
        // Use the soundInstance from closure, not this.hooterSound (which might be null in callback)
        if (soundInstance) {
          try {
            const duration = soundInstance.getDuration();
            console.log('✅ Hooter sound loaded successfully, duration:', duration, 'seconds');
            // Update instance reference
            this.hooterSound = soundInstance;
            this.hooterSoundLoaded = true;
          } catch (durationError) {
            console.warn('⚠️ Sound loaded but duration check failed:', durationError);
            // Still mark as loaded if sound object exists
            this.hooterSound = soundInstance;
            this.hooterSoundLoaded = true;
          }
        } else {
          console.warn('⚠️ Sound callback succeeded but sound instance is null');
          this.hooterSoundLoaded = false;
        }
      });
      
      // Assign immediately (before callback)
      this.hooterSound = soundInstance;
    } catch (error) {
      console.warn('❌ Error loading hooter sound:', error);
      this.hooterSound = null;
      this.hooterSoundLoaded = false;
    }
  }

  /**
   * Test hooter sound (public method for testing)
   */
  testHooterSound(): void {
    console.log('🔊 Testing hooter sound...');
    console.log('Sound object:', this.hooterSound ? 'exists' : 'null');
    console.log('Sound loaded flag:', this.hooterSoundLoaded);
    this.playHooterSound();
  }

  /**
   * Play hooter sound when new booking is received
   */
  private playHooterSound(): void {
    // Check if sound is loaded
    if (!this.hooterSound) {
      console.warn('⚠️ Hooter sound not loaded yet, attempting to load...');
      this.loadHooterSound();
      // Wait a bit for async loading, then try again
      setTimeout(() => {
        if (this.hooterSound && this.hooterSoundLoaded) {
          console.log('🔄 Retrying hooter sound playback after load...');
          this.playHooterSound();
        } else {
          console.warn('⚠️ Hooter sound still not loaded after retry');
        }
      }, 1000);
      return;
    }

    if (!this.hooterSoundLoaded) {
      console.warn('⚠️ Hooter sound object exists but not marked as loaded, attempting to play anyway...');
    }

    try {
      console.log('🔊 Attempting to play hooter sound...');
      // Store reference to avoid issues with 'this' context
      const soundRef = this.hooterSound;
      
      // Reset sound to beginning before playing
      soundRef.reset();
      soundRef.setVolume(1.0);
      
      soundRef.play((success) => {
        if (success) {
          console.log('✅ Hooter sound played successfully');
        } else {
          console.error('❌ Failed to play hooter sound - callback returned false');
          // Reset the sound for next play
          try {
            soundRef.reset();
          } catch (resetError) {
            console.error('Error resetting sound:', resetError);
          }
        }
      });
    } catch (error) {
      console.error('❌ Error playing hooter sound:', error);
      // Try to reload sound on error
      this.hooterSound = null;
      this.hooterSoundLoaded = false;
      this.loadHooterSound();
    }
  }

  /**
   * Handle incoming booking notification
   */
  private async handleNewBooking(bookingData: any): Promise<void> {
    console.log('Processing new booking:', bookingData);

    // Play hooter sound
    this.playHooterSound();

    // Notify all registered callbacks (for UI components)
    this.bookingCallbacks.forEach(callback => {
      try {
        callback(bookingData);
      } catch (error) {
        console.error('Error in booking callback:', error);
      }
    });

    // Check if provider is authenticated
    const currentUser = auth().currentUser;
    if (!currentUser) {
      Alert.alert('Error', 'Please login to accept bookings');
      return;
    }

    // Show alert notification with accept/reject options
    const scheduledTime = bookingData.scheduledTime instanceof Date
      ? bookingData.scheduledTime.toLocaleString()
      : bookingData.scheduledTime
      ? new Date(bookingData.scheduledTime).toLocaleString()
      : 'Not specified';

    let message = `New service request from ${bookingData.patientName || bookingData.customerName || 'Customer'}`;
    if (bookingData.patientPhone || bookingData.customerPhone) {
      message += `\n\nContact: ${bookingData.patientPhone || bookingData.customerPhone}`;
    }
    if (bookingData.patientAge) {
      message += `\nAge: ${bookingData.patientAge} years`;
    }
    if (bookingData.scheduledTime) {
      message += `\nScheduled Time: ${scheduledTime}`;
    }
    if (bookingData.consultationFee) {
      message += `\nService Fee: ₹${bookingData.consultationFee}`;
    }
    
    // Get customer address
    const customerAddress = bookingData.customerAddress || bookingData.patientAddress;
    
    // Add customer address if available
    if (customerAddress) {
      message += `\n\n📍 Customer Address:`;
      if (customerAddress.address) {
        message += `\n${customerAddress.address}`;
      }
      if (customerAddress.pincode) {
        message += `\nPincode: ${customerAddress.pincode}`;
      }
      if (customerAddress.city || customerAddress.state) {
        const locationParts = [];
        if (customerAddress.city) locationParts.push(customerAddress.city);
        if (customerAddress.state) locationParts.push(customerAddress.state);
        message += `\n${locationParts.join(', ')}`;
      }

      // Calculate and show distance if both provider and customer locations are available
      try {
        const providerStatus = await getProviderStatus(currentUser.uid);
        if (
          providerStatus?.currentLocation &&
          customerAddress.latitude &&
          customerAddress.longitude
        ) {
          const distanceInfo = getDistanceToCustomer(
            providerStatus.currentLocation,
            {
              latitude: customerAddress.latitude,
              longitude: customerAddress.longitude,
            },
          );
          message += `\n\n📏 Distance: ${distanceInfo.distanceFormatted}`;
          message += `\n⏱️ ETA: ~${distanceInfo.etaMinutes} min`;
        }
      } catch (error) {
        console.log('Could not calculate distance:', error);
      }
    }

    // Get provider document - support both phone auth (UID) and Google auth (email)
    let provider: any = null;
    
    if (currentUser.email) {
      const emailQuery = await firestore()
        .collection('providers')
        .where('email', '==', currentUser.email)
        .limit(1)
        .get();
      
      if (!emailQuery.empty) {
        provider = emailQuery.docs[0].data();
      }
    }
    
    // If not found by email, try by UID (phone auth)
    if (!provider) {
      const uidDoc = await firestore()
        .collection('providers')
        .doc(currentUser.uid)
        .get();
      
      if (uidDoc.exists) {
        provider = uidDoc.data();
      }
    }

    if (!provider) {
      Alert.alert('Error', 'Provider profile not found. Please complete your profile setup.');
      return;
    }
    const providerAddress = provider.address;

    if (!providerAddress || !providerAddress.pincode) {
      Alert.alert(
        '🔔 New Service Request!',
        message + '\n\n⚠️ Please set up your address in profile settings to accept this request.',
        [
          {
            text: 'OK',
            style: 'default',
          },
        ],
        { cancelable: true }
      );
      return;
    }

    Alert.alert(
      '🔔 New Service Request!',
      message,
      [
        {
          text: 'Reject',
          style: 'cancel',
          onPress: async () => {
            try {
              await this.rejectBooking(bookingData);
              Alert.alert('Success', 'Service request rejected successfully.');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to reject service request. Please try again.');
            }
          },
        },
        {
          text: 'Accept',
          style: 'default',
          onPress: async () => {
            try {
              // Update booking/consultation status to accepted
              await this.acceptBooking(bookingData, currentUser.uid);
              
              // Create job card with customer details
              const jobCardId = await createJobCard(bookingData, providerAddress);
              Alert.alert(
                'Success',
                'Service request accepted! Job card created successfully.',
                [{text: 'OK'}]
              );
              console.log('Job card created:', jobCardId);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to accept service request. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  }

  /**
   * Accept a booking/consultation
   * Updates the status to 'accepted' and assigns provider
   */
  async acceptBooking(bookingData: any, providerId: string): Promise<void> {
    try {
      const consultationId = bookingData.consultationId || bookingData.id || bookingData.bookingId;
      
      if (!consultationId) {
        throw new Error('Consultation ID not found in booking data');
      }

      // Update consultation/service request status to accepted
      await firestore()
        .collection('consultations')
        .doc(consultationId)
        .update({
          status: 'accepted',
          doctorId: providerId, // Assign provider
          providerId: providerId, // Also set providerId for compatibility
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      
      console.log('Booking accepted:', consultationId);
    } catch (error: any) {
      console.error('Error accepting booking:', error);
      throw new Error(`Failed to accept booking: ${error.message}`);
    }
  }

  /**
   * Reject a booking/consultation
   * Updates the status to 'rejected'
   */
  async rejectBooking(bookingData: any): Promise<void> {
    try {
      const consultationId = bookingData.consultationId || bookingData.id || bookingData.bookingId;
      
      if (!consultationId) {
        throw new Error('Consultation ID not found in booking data');
      }

      // Update consultation/service request status to rejected
      await firestore()
        .collection('consultations')
        .doc(consultationId)
        .update({
          status: 'rejected',
          rejectionReason: 'Provider rejected the service request',
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      
      console.log('Booking rejected:', consultationId);
    } catch (error: any) {
      console.error('Error rejecting booking:', error);
      throw new Error(`Failed to reject booking: ${error.message}`);
    }
  }

  /**
   * Remove booking callback (deprecated - use unsubscribe function from onNewBooking)
   */
  offNewBooking(callback?: (bookingData: any) => void): void {
    if (callback) {
      this.bookingCallbacks = this.bookingCallbacks.filter(cb => cb !== callback);
    } else {
      this.bookingCallbacks = [];
    }
  }

  /**
   * Disconnect WebSocket and release resources
   */
  disconnect(): void {
    if (this.socket) {
      // Remove all event listeners before disconnecting
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentProviderId = null;
      console.log('WebSocket disconnected');
    }

    // Release sound resources
    if (this.hooterSound) {
      try {
        this.hooterSound.stop();
      this.hooterSound.release();
      } catch (error) {
        console.warn('Error releasing sound:', error);
      }
      this.hooterSound = null;
      console.log('Hooter sound resources released');
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get socket instance (for advanced use cases)
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if WebSocket URL is configured
   */
  isConfigured(): boolean {
    return !!(SOCKET_URL && !SOCKET_URL.includes('your-production-server.com'));
  }

  /**
   * Reconnect WebSocket (useful for manual reconnection)
   */
  reconnect(): void {
    if (this.currentProviderId) {
      this.disconnect();
      setTimeout(() => {
        this.connect(this.currentProviderId!);
      }, 1000);
    }
  }
}

// Export singleton instance
export default new WebSocketService();
