/**
 * WebSocket Service for HomeServicesProvider
 * Listens for real-time booking notifications and plays hooter sound
 */

import io, { Socket } from 'socket.io-client';
import soundService from './soundService';
import firestore from '@react-native-firebase/firestore';

// WebSocket URL - Set this to your actual server URL
// For development: Use your local IP address (e.g., 'http://192.168.1.100:3000')
// For production: Use your production server URL
const SOCKET_URL = __DEV__
  ? 'http://10.0.2.2:3001' // Android emulator localhost (using port 3001 to avoid conflicts)
  : process.env.SOCKET_URL || 'https://your-production-server.com'; // Set via environment variable

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private currentProviderId: string | null = null;
  private bookingCallbacks: Array<(bookingData: any) => void> = [];

  constructor() {
    // Sound is now handled by soundService
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

    // Store provider ID before connecting
    const providerIdToConnect = providerId;
    this.currentProviderId = providerIdToConnect;

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
          providerId: providerIdToConnect,
          clientType: 'provider-app',
        },
      });

      // Connection events
      this.socket.on('connect', () => {
        const transport = (this.socket as any)?.io?.engine?.transport?.name || 'unknown';
        console.log('✅ WebSocket connected successfully:', {
          socketId: this.socket?.id,
          providerId: providerIdToConnect,
          url: SOCKET_URL,
          transport: transport,
        });
        this.isConnected = true;

        // Join provider-specific room - use the stored providerId
        const providerIdForRoom = providerIdToConnect || this.currentProviderId;
        if (providerIdForRoom) {
          console.log(`📤 Emitting join-provider-room for provider: ${providerIdForRoom}`);
          this.socket?.emit('join-provider-room', providerIdForRoom);
          console.log(`✅ Join request sent for provider room: provider-${providerIdForRoom}`);
          console.log(`📋 Provider ID for notifications: ${providerIdForRoom}`);
        } else {
          console.warn('WebSocket connected but no provider ID available');
        }
      });

      // Listen for room-joined confirmation
      this.socket.on('room-joined', (data: any) => {
        console.log('✅ Room join confirmed:', data);
        console.log(`✅ Provider ${this.currentProviderId} is now in room: ${data.room}`);
        console.log(`📊 Room size: ${data.roomSize || 'unknown'}`);
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
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
    }
  }

  /**
   * Test hooter sound (public method for testing)
   * @deprecated Use soundService.playHooterSound() directly instead
   */
  testHooterSound(): void {
    console.log('🔊 Testing hooter sound via WebSocketService (deprecated, use soundService instead)');
    soundService.playHooterSound();
  }

  /**
   * Handle incoming booking notification
   * Plays sound and notifies UI components via callbacks
   * The modal UI will handle displaying the booking details
   */
  private async handleNewBooking(bookingData: any): Promise<void> {
    console.log('🔔 Processing new booking:', bookingData);
    console.log('📋 Number of registered callbacks:', this.bookingCallbacks.length);

    // Start continuous hooter sound (will play until accepted or dismissed)
    soundService.startContinuousPlay();

    // Notify all registered callbacks (for UI components)
    // This will trigger the BookingAlertModal to appear in the dashboard
    this.bookingCallbacks.forEach((callback, index) => {
      try {
        console.log(`📞 Calling callback ${index + 1}/${this.bookingCallbacks.length}`);
        callback(bookingData);
        console.log(`✅ Callback ${index + 1} executed successfully`);
      } catch (error) {
        console.error(`❌ Error in booking callback ${index + 1}:`, error);
      }
    });
  }

  /**
   * Stop continuous sound (called when booking is accepted or dismissed)
   */
  stopSound(): void {
    soundService.stopContinuousPlay();
  }

  /**
   * Accept a booking/consultation
   * Updates the status to 'accepted' and assigns provider with provider details
   */
  async acceptBooking(bookingData: any, providerId: string, providerProfile?: any): Promise<void> {
    try {
      const consultationId = bookingData.consultationId || bookingData.id || bookingData.bookingId;
      
      if (!consultationId) {
        throw new Error('Consultation ID not found in booking data');
      }

      // Prepare provider details to store
      const providerDetails: any = {
        status: 'accepted',
        doctorId: providerId, // Assign provider
        providerId: providerId, // Also set providerId for compatibility
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      // Add provider details if available
      if (providerProfile) {
        providerDetails.providerName = providerProfile.name || providerProfile.providerName || '';
        providerDetails.providerPhone = providerProfile.phoneNumber || providerProfile.phone || '';
        providerDetails.providerEmail = providerProfile.email || '';
        providerDetails.providerSpecialization = providerProfile.specialization || providerProfile.specialty || '';
        providerDetails.providerRating = providerProfile.rating || 0;
        providerDetails.providerImage = providerProfile.profileImage || '';
        providerDetails.providerAddress = providerProfile.address || null;
      }

      // Update consultation/service request status to accepted with provider details
      await firestore()
        .collection('consultations')
        .doc(consultationId)
        .update(providerDetails);
      
      console.log('Booking accepted with provider details:', consultationId);
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

    // Sound is managed by soundService, not here
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
