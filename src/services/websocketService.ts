/**
 * WebSocket Service for HomeServicesProvider
 * Listens for real-time booking notifications and plays hooter sound
 */

import io, { Socket } from 'socket.io-client';
import soundService from './soundService';
import hooterForegroundService from './hooterForegroundService';
import {serviceRequestsApi} from './api/serviceRequestsApi';
import {providersApi} from './api/providersApi';
import {SOCKET_URL} from '../config/api';

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private currentProviderId: string | null = null;
  private bookingCallbacks: Array<(bookingData: any) => void> = [];
  private _connectErrorLogged = false;

  constructor() {
    // Sound is now handled by soundService
  }

  /**
   * Register callback for new bookings (used by UI components)
   */
  onNewBooking(callback: (bookingData: any) => void): () => void {
    console.log('📝 [WEBSOCKET] Registering booking callback. Current callbacks:', this.bookingCallbacks.length);
    this.bookingCallbacks.push(callback);
    console.log('✅ [WEBSOCKET] Callback registered. Total callbacks:', this.bookingCallbacks.length);
    
    // Ensure listener is set up if socket is already connected
    if (this.socket?.connected) {
      console.log('📋 [WEBSOCKET] Socket already connected, ensuring listener is set up');
      this.setupBookingListener();
    }
    
    // Return unsubscribe function
    return () => {
      this.bookingCallbacks = this.bookingCallbacks.filter(cb => cb !== callback);
      console.log('🗑️ [WEBSOCKET] Callback unregistered. Remaining callbacks:', this.bookingCallbacks.length);
    };
  }

  /**
   * Get number of registered callbacks (for debugging)
   */
  getBookingCallbacksCount(): number {
    return this.bookingCallbacks.length;
  }

  /**
   * Initialize WebSocket connection and setup event listeners
   */
  connect(providerId: string): void {
    if (!providerId || providerId.trim() === '') {
      console.warn('Cannot connect WebSocket: Invalid provider ID');
      return;
    }

    // Prefer having UI callbacks, but still connect so rooms join even if
    // the booking host registers a moment later.
    if (this.bookingCallbacks.length === 0) {
      console.warn(
        '⚠️ [WEBSOCKET] Connecting with 0 booking callbacks — host should register soon',
      );
    }

    // Reuse existing socket if already connected or still connecting for same provider
    if (this.socket) {
      if (this.currentProviderId === providerId) {
        console.log('✅ [WEBSOCKET] Socket already active for this provider:', providerId, {
          connected: this.socket.connected,
        });
        if (this.socket.connected) {
          this.setupBookingListener();
          this.socket.emit('join-provider-room', providerId);
        }
        return;
      }
      console.log('🔄 [WEBSOCKET] Switching provider — disconnecting existing socket');
      this.disconnect();
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
      // Android emulator often fails raw websocket upgrade first; start with polling.
      const socket = io(SOCKET_URL, {
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: 1500,
        reconnectionAttempts: 15,
        reconnectionDelayMax: 10000,
        timeout: 20000,
        forceNew: true,
        autoConnect: true,
        path: '/socket.io/',
        upgrade: true,
        rememberUpgrade: false,
        query: {
          providerId: providerIdToConnect,
          clientType: 'provider-app',
        },
      });
      this.socket = socket;

      socket.on('connect', () => {
        if (this.socket !== socket) {
          return;
        }

        const transport = (socket as any)?.io?.engine?.transport?.name || 'unknown';
        console.log('✅ WebSocket connected successfully:', {
          socketId: socket.id,
          providerId: providerIdToConnect,
          url: SOCKET_URL,
          transport: transport,
        });
        this.isConnected = true;
        this._connectErrorLogged = false;

        console.log('📋 [WEBSOCKET] Setting up booking listener after connect...');
        this.setupBookingListener();

        const providerIdForRoom = providerIdToConnect || this.currentProviderId;
        if (providerIdForRoom) {
          console.log(`📤 Emitting join-provider-room for provider: ${providerIdForRoom}`);
          socket.emit('join-provider-room', providerIdForRoom);
          console.log(`✅ Join request sent for provider room: provider-${providerIdForRoom}`);
        } else {
          console.log('WebSocket connected but no provider ID available');
        }
      });

      socket.on('room-joined', (data: any) => {
        console.log('✅ Room join confirmed:', data);
        console.log(`✅ Provider ${this.currentProviderId} is now in room: ${data.room}`);
        console.log(`📊 Room size: ${data.roomSize || 'unknown'}`);
      });

      socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        this.isConnected = false;
      });

      socket.on('connect_error', (error: any) => {
        this.isConnected = false;
        // Log once — repeated console.warn becomes LogBox red screens during retries
        if (this._connectErrorLogged) {
          return;
        }
        this._connectErrorLogged = true;
        const errorMessage = error?.message || String(error) || 'Unknown error';
        console.log(
          `⚠️ [WEBSOCKET] Connecting to ${SOCKET_URL} failed (${errorMessage}); retrying…`,
        );
      });

      socket.on('reconnect_error', () => {
        // silent — reconnection continues
      });

      socket.on('reconnect_failed', () => {
        console.log(
          '⚠️ [WEBSOCKET] Reconnection failed; app will rely on API polling for bookings',
        );
      });

      socket.on('reconnect', (attemptNumber) => {
        if (this.socket !== socket) return;
        console.log(`✅ [WEBSOCKET] WebSocket reconnected after ${attemptNumber} attempts`);
        console.log('📋 [WEBSOCKET] Callbacks count after reconnect:', this.bookingCallbacks.length);
        this._connectErrorLogged = false;
        this.setupBookingListener();
        if (this.currentProviderId) {
          console.log(`📤 [WEBSOCKET] Rejoining room after reconnect: provider-${this.currentProviderId}`);
          socket.emit('join-provider-room', this.currentProviderId);
        }
      });

      socket.on('error', (error: any) => {
        console.log('❌ WebSocket error:', error?.message || error);
      });
    } catch (error) {
      console.log('Error initializing WebSocket:', error);
    }
  }

  /**
   * Setup booking event listener (called after socket connection)
   * This ensures the listener is always set up with current callbacks
   * IMPORTANT: Listener checks callbacks array at EVENT TIME, not setup time
   */
  private setupBookingListener(): void {
    if (!this.socket) {
      console.warn('⚠️ [WEBSOCKET] Cannot setup listener - socket is null');
      return;
    }

    // Remove any existing listeners first to avoid duplicates
    this.socket.off('new-booking');
    
    const currentCallbackCount = this.bookingCallbacks.length;
    console.log('📋 [WEBSOCKET] Setting up booking listener. Current callbacks at setup time:', currentCallbackCount);
    console.log('📋 [WEBSOCKET] Note: Listener will check callbacks at EVENT TIME, not setup time');
    
    this.socket.on('new-booking', (bookingData: any) => {
      // Check callbacks at EVENT TIME (when booking arrives), not at listener setup time
      const callbacksAtEventTime = this.bookingCallbacks.length;
      console.log('🔔 [WEBSOCKET] ===== NEW BOOKING EVENT RECEIVED =====');
      console.log('🔔 [WEBSOCKET] New booking received via WebSocket:', {
        bookingId: bookingData.consultationId || bookingData.id || bookingData.bookingId,
        customerName: bookingData.customerName || bookingData.patientName,
        providerId: this.currentProviderId,
        socketId: this.socket?.id,
        callbacksRegisteredAtSetup: currentCallbackCount,
        callbacksRegisteredAtEventTime: callbacksAtEventTime, // This is what matters!
        fullBookingData: bookingData,
      });
      
      if (callbacksAtEventTime === 0) {
        console.warn('⚠️ [WEBSOCKET] No callbacks registered when booking received');
        console.warn('⚠️ [WEBSOCKET] This should not happen - callback should be registered before WebSocket connects');
        console.warn('⚠️ [WEBSOCKET] Waiting for callback registration...');
        // Still try to handle it - maybe callback will be registered soon
        // This is a fallback for edge cases where callback registers slightly late
        // Try multiple times with increasing delays
        let attempts = 0;
        const maxAttempts = 5;
        const checkCallback = () => {
          attempts++;
          const currentCallbacks = this.bookingCallbacks.length;
          if (currentCallbacks > 0) {
            console.log(`✅ [WEBSOCKET] Callback registered after ${attempts} attempt(s) (${currentCallbacks} callback(s) found), processing booking now`);
            this.handleNewBooking(bookingData);
          } else if (attempts < maxAttempts) {
            console.log(`⏳ [WEBSOCKET] Still waiting for callback (attempt ${attempts}/${maxAttempts}, current callbacks: ${currentCallbacks})...`);
            setTimeout(checkCallback, 500);
          } else {
            console.error('❌ [WEBSOCKET] No callback registered after all attempts. Booking notification will be lost.');
            console.error('❌ [WEBSOCKET] Callbacks checked:', currentCallbacks);
            console.error('❌ [WEBSOCKET] Make sure ProviderDashboardScreen registers callback via onNewBooking()');
            console.error('❌ [WEBSOCKET] Check if component unmounted or useEffect cleanup ran unexpectedly');
            }
        };
        setTimeout(checkCallback, 500);
        return;
      }
      
      this.handleNewBooking(bookingData);
      console.log('🔔 [WEBSOCKET] ===== END NEW BOOKING EVENT =====');
    });
    
    console.log('✅ [WEBSOCKET] new-booking event listener registered');
    console.log('📋 [WEBSOCKET] Current callbacks count at setup:', this.bookingCallbacks.length);
    console.log('📋 [WEBSOCKET] Listener will check callbacks dynamically when events arrive');
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
    console.log('🔔 [WEBSOCKET] Processing new booking:', {
      consultationId: bookingData?.consultationId || bookingData?.id || bookingData?.bookingId,
      customerName: bookingData?.customerName || bookingData?.patientName,
      serviceType: bookingData?.serviceType,
    });
    console.log('📋 [WEBSOCKET] Number of registered callbacks:', this.bookingCallbacks.length);

    if (this.bookingCallbacks.length === 0) {
      console.error('❌ [WEBSOCKET] No callbacks registered! Modal will not show.');
      console.error('❌ [WEBSOCKET] Make sure ProviderDashboardScreen has registered a callback via onNewBooking()');
    }

    // Start hooter sound via foreground service (works even in background)
    // Fallback to regular soundService if foreground service not available
    if (hooterForegroundService.isAvailable()) {
      try {
        console.log('🔊 [WEBSOCKET] Starting hooter via foreground service...');
        await hooterForegroundService.startHooter();
      } catch (error) {
        console.warn('⚠️ [WEBSOCKET] Failed to start foreground service, falling back to regular sound:', error);
        soundService.startContinuousPlay();
      }
    } else {
      console.log('🔊 [WEBSOCKET] Using regular soundService (foreground service not available)');
      soundService.startContinuousPlay();
    }

    // Notify all registered callbacks (for UI components)
    // This will trigger the BookingAlertModal to appear in the dashboard
    console.log(`📞 [WEBSOCKET] Notifying ${this.bookingCallbacks.length} registered callback(s)...`);
    this.bookingCallbacks.forEach((callback, index) => {
      try {
        console.log(`📞 [WEBSOCKET] Calling callback ${index + 1}/${this.bookingCallbacks.length}`);
        callback(bookingData);
        console.log(`✅ [WEBSOCKET] Callback ${index + 1} executed successfully`);
      } catch (error) {
        console.error(`❌ [WEBSOCKET] Error in booking callback ${index + 1}:`, error);
      }
    });
  }

  /**
   * Stop continuous sound (called when booking is accepted or dismissed)
   */
  stopSound(): void {
    // Stop foreground service if available, otherwise stop regular sound
    if (hooterForegroundService.isAvailable()) {
      hooterForegroundService.stopHooter().catch((error) => {
        console.warn('⚠️ Failed to stop foreground service, falling back to regular sound:', error);
        soundService.stopContinuousPlay();
      });
    } else {
      soundService.stopContinuousPlay();
    }
  }

  /**
   * Accept a booking/service request
   * Updates the status to 'accepted' and assigns provider with provider details
   */
  async acceptBooking(bookingData: any, providerId: string, providerProfile?: any): Promise<void> {
    try {
      // Support both old (consultationId) and new (serviceRequestId/id) field names
      const serviceRequestId = bookingData.serviceRequestId || 
                               bookingData.id || 
                               bookingData.bookingId ||
                               bookingData.consultationId; // Backward compatibility
      
      if (!serviceRequestId) {
        console.error('❌ [ACCEPT] Service Request ID not found in booking data. Available keys:', Object.keys(bookingData));
        console.error('❌ [ACCEPT] Full booking data:', JSON.stringify(bookingData, null, 2));
        throw new Error('Service Request ID not found in booking data');
      }
      
      console.log('📋 [ACCEPT] Extracted serviceRequestId:', serviceRequestId, 'from bookingData keys:', Object.keys(bookingData));

      console.log('📋 [ACCEPT] Starting acceptBooking:', {
        serviceRequestId,
        providerId,
        hasProviderProfile: !!providerProfile,
      });

      // Get provider profile if not provided
      let providerInfo = providerProfile;
      if (!providerInfo) {
        try {
          providerInfo = await providersApi.getMyProfile();
          if (!providerInfo) {
            console.warn('⚠️ [ACCEPT] Provider profile not found, using defaults');
          }
        } catch (profileError) {
          console.warn('⚠️ [ACCEPT] Failed to fetch provider profile:', profileError);
        }
      }

      // Prepare provider details for API call
      const providerDetails: any = {};
      if (providerInfo) {
        providerDetails.providerName = providerInfo.name || providerInfo.providerName || 'Provider';
        providerDetails.providerPhone = providerInfo.phoneNumber || providerInfo.phone || '';
        providerDetails.providerEmail = providerInfo.email || '';
        providerDetails.providerSpecialization = providerInfo.specialization || providerInfo.specialty || '';
        providerDetails.providerRating = providerInfo.rating || 0;
        providerDetails.providerImage = providerInfo.profileImage || '';
        providerDetails.providerAddress = providerInfo.address || providerInfo.location || null;
      }

      console.log('📋 [ACCEPT] Calling backend API to accept service request:', {
        serviceRequestId,
        providerId,
        providerDetails: Object.keys(providerDetails),
      });

      // Accept via MongoDB API only (Firestore legacy often permission-denied / noisy)
      let acceptedServiceRequest: any = null;

      try {
        acceptedServiceRequest = await serviceRequestsApi.accept(
          serviceRequestId,
          providerDetails,
        );
        console.log(
          '✅ [ACCEPT] Service request accepted via API:',
          serviceRequestId,
        );
      } catch (apiError: any) {
        console.warn('⚠️ [ACCEPT] API accept failed:', apiError.message);
        throw new Error(
          apiError?.message ||
            `Service request not found: ${serviceRequestId}. Please try again.`,
        );
      }

      if (!acceptedServiceRequest) {
        console.error('❌ [ACCEPT] Empty accept response:', serviceRequestId);
        throw new Error(`Service request not found: ${serviceRequestId}. Please try again.`);
      }

      // Customer push + socket status are handled by the backend accept endpoint.
    } catch (error: any) {
      console.error('❌ [ACCEPT] Error accepting booking:', {
        error: error.message,
        code: error.code,
        serviceRequestId: bookingData.serviceRequestId || bookingData.id || bookingData.bookingId || bookingData.consultationId,
        providerId,
      });
      throw new Error(`Failed to accept booking: ${error.message}`);
    }
  }

  /**
   * Reject a booking/service request
   * Specific-provider: marks request rejected so customer sees provider is not ready.
   * Open (broadcast): API dismisses without cancelling for other providers.
   */
  async rejectBooking(bookingData: any): Promise<void> {
    try {
      const serviceRequestId = bookingData.serviceRequestId ||
                               bookingData.id ||
                               bookingData.bookingId ||
                               bookingData.consultationId;

      if (!serviceRequestId) {
        throw new Error('Service Request ID not found in booking data');
      }

      console.log('📋 [REJECT] Starting rejectBooking:', serviceRequestId);

      // Prefer MongoDB API (source of truth)
      try {
        await serviceRequestsApi.reject(
          serviceRequestId,
          'Provider is not ready to take this request',
        );
        console.log('✅ [REJECT] Service request rejected via MongoDB API:', serviceRequestId);
        return;
      } catch (apiError: any) {
        console.warn('⚠️ [REJECT] MongoDB API error:', apiError.message);
        throw new Error(
          apiError?.message || `Failed to reject booking: ${serviceRequestId}`,
        );
      }
    } catch (error: any) {
      console.error('❌ [REJECT] Error rejecting booking:', error);
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
