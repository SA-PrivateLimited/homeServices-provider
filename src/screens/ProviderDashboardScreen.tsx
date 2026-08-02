/**
 * Provider Dashboard Screen
 * Main screen for service providers - Ola/Uber driver style
 * Features:
 * - Online/Offline toggle (big button)
 * - Today's earnings
 * - Active jobs count
 * - Quick stats
 */

import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {getUserId} from '../services/session';
import {
  setProviderOnline,
  getProviderStatus,
  startLocationTracking,
} from '../services/providerLocationService';
import {getMyProfile} from '../services/api/providersApi';
import websocketService from '../services/websocketService';
import soundService from '../services/soundService';
import {getProviderJobCards} from '../services/jobCardService';
import BookingAlertModal from '../components/BookingAlertModal';
import AlertModal from '../components/AlertModal';
import Toast from '../components/Toast';
import {createJobCard} from '../services/jobCardService';
import useTranslation from '../hooks/useTranslation';

export default function ProviderDashboardScreen({navigation}: any) {
  const {isDarkMode, currentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const userId = getUserId(currentUser);
  const {t} = useTranslation();

  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeJobsCount, setActiveJobsCount] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [pendingJobs, setPendingJobs] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [rating, setRating] = useState(0);
  const [locationTracking, setLocationTracking] = useState<(() => void) | null>(null);
  const [incomingBooking, setIncomingBooking] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Alert modal state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({title: '', message: '', type: 'info'});

  // Helper function to show alert
  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setAlertConfig({title, message, type});
    setAlertVisible(true);
  };

  // Use ref to track if this is initial mount and prevent unnecessary reloads
  const isInitialMount = useRef(true);
  const isTogglingStatus = useRef(false);

  // Load provider status from API
  const loadProviderStatus = useCallback(async () => {
    if (!userId) return;

    try {
      const provider = await getMyProfile();
      if (provider) {
        setIsOnline(provider.isOnline || false);
        setRating(provider.rating || 0);
        setTotalReviews(provider.totalReviews || 0);
      }
    } catch (error) {
      console.error('Error loading provider status:', error);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    // Only load dashboard data on initial mount
    if (isInitialMount.current) {
      loadDashboardData();
      loadProviderStatus();
      isInitialMount.current = false;
    }

    // Subscribe to incoming bookings
    // CRITICAL: Register callback FIRST, before WebSocket connects
    // This ensures callback is ready when booking events arrive
    console.log('📝 [DASHBOARD] Registering booking callback BEFORE WebSocket connection...');
    const unsubscribeBooking = websocketService.onNewBooking((bookingData) => {
      console.log('📱 [DASHBOARD] ===== BOOKING CALLBACK FIRED =====');
      console.log('📱 [DASHBOARD] Booking callback received:', {
        consultationId: bookingData?.consultationId || bookingData?.id || bookingData?.bookingId,
        customerName: bookingData?.customerName || bookingData?.patientName,
        serviceType: bookingData?.serviceType,
        fullData: bookingData,
      });

      // Set incoming booking state - this will trigger modal to show
      setIncomingBooking(bookingData);

      console.log('✅ [DASHBOARD] incomingBooking state set, modal should render');
      console.log('📱 [DASHBOARD] ===== END BOOKING CALLBACK =====');
    });

    const callbackCount = websocketService.getBookingCallbacksCount?.() || 0;
    console.log('✅ [DASHBOARD] Booking callback registered. Callbacks count:', callbackCount);

    // If provider is already online, connect WebSocket now (callback is registered)
    // This handles the case where provider was already online when component mounted
    if (isOnline) {
      console.log('🟢 [DASHBOARD] Provider already online, connecting WebSocket after callback registration');
      console.log('📋 [DASHBOARD] Callbacks count before connect:', callbackCount);
      websocketService.connect(userId);
    }

    return () => {
      unsubscribeBooking();
      if (locationTracking) {
        locationTracking();
      }
    };
  }, [userId]);

  // Start/stop location tracking and WebSocket based on online status
  // Only run when isOnline changes, not on initial mount if status hasn't changed
  useEffect(() => {
    if (!userId) {
      return;
    }

    // Skip WebSocket connection on initial mount (handled in first useEffect)
    if (isInitialMount.current) {
      return;
    }

    // Reset toggle flag after handling the toggle
    const wasToggling = isTogglingStatus.current;
    if (wasToggling) {
      isTogglingStatus.current = false;
    }

    if (isOnline) {
      console.log('🟢 [DASHBOARD] Provider going online, connecting WebSocket with UID:', userId);
      
      // Verify callback is registered before connecting
      const callbackCount = websocketService.getBookingCallbacksCount?.() || 0;
      console.log('📋 [DASHBOARD] Callbacks count before connect:', callbackCount);
      
      if (callbackCount === 0) {
        console.warn('⚠️ [DASHBOARD] WARNING: No callbacks registered! Waiting for callback registration...');
        // Wait a bit for callback to be registered (shouldn't happen, but safety check)
        setTimeout(() => {
          const newCallbackCount = websocketService.getBookingCallbacksCount?.() || 0;
          if (newCallbackCount > 0) {
            console.log('✅ [DASHBOARD] Callback registered, connecting WebSocket now');
            websocketService.connect(userId);
          } else {
            console.error('❌ [DASHBOARD] Still no callbacks after wait! WebSocket may not receive bookings!');
            // Connect anyway - callback might register later
            websocketService.connect(userId);
          }
        }, 500);
      } else {
        // Callback is registered, safe to connect
        console.log('✅ [DASHBOARD] Callback registered, connecting WebSocket...');
        websocketService.connect(userId);
      }
      
      // Start location tracking when going online
      const stopTracking = startLocationTracking();
      setLocationTracking(() => stopTracking);
      
      // Verify callback is still registered after connection
      setTimeout(() => {
        const finalCallbackCount = websocketService.getBookingCallbacksCount?.() || 0;
        console.log('📋 [DASHBOARD] Callbacks count after connect:', finalCallbackCount);
        if (finalCallbackCount === 0) {
          console.error('❌ [DASHBOARD] WARNING: No callbacks registered! Modal will not show!');
        }
      }, 1000);
    } else {
      console.log('🔴 [DASHBOARD] Provider going offline, disconnecting WebSocket');
      // Stop location tracking when going offline
      if (locationTracking) {
        locationTracking();
        setLocationTracking(null);
      }
      
      // Disconnect WebSocket
      websocketService.disconnect();
    }

    return () => {
      if (locationTracking) {
        locationTracking();
      }
      // Don't disconnect WebSocket on cleanup - let it stay connected while online
      // websocketService.disconnect();
    };
  }, [isOnline, userId]);

  // Debug: Log modal visibility (must be before any conditional returns)
  useEffect(() => {
    if (incomingBooking) {
      console.log('🔍 Dashboard - incomingBooking set:', {
        id: incomingBooking?.consultationId || incomingBooking?.id || incomingBooking?.bookingId,
        customerName: incomingBooking?.customerName || incomingBooking?.patientName,
      });
      console.log('🔍 Dashboard - modal should be visible:', true);
    } else {
      console.log('🔍 Dashboard - incomingBooking is null, modal should be hidden');
    }
  }, [incomingBooking]);

  const loadDashboardData = async () => {
    try {
      if (!userId) return;

      // Load provider status
      const status = await getProviderStatus(userId);
      if (status) {
        setIsOnline(status.isOnline);
      }

      // Load today's earnings and stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get completed job cards for today
      // Wrap in try-catch to handle gracefully if no job cards exist yet
      let jobCards: any[] = [];
      try {
        jobCards = await getProviderJobCards(userId);
      } catch (error: any) {
        console.warn('Could not fetch job cards (may need index or no cards yet):', error.message);
        // Continue with empty array - provider might not have any job cards yet
        jobCards = [];
      }

      const todayJobs = jobCards.filter(job => {
        const jobDate = job.createdAt instanceof Date
          ? job.createdAt
          : new Date(job.createdAt);
        return jobDate >= today && job.status === 'completed';
      });

      // Calculate all stats
      const completedJobs = jobCards.filter(j => j.status === 'completed');
      const activeJobs = jobCards.filter(j => j.status === 'accepted' || j.status === 'in-progress');
      const pending = jobCards.filter(j => j.status === 'pending');

      setCompletedToday(todayJobs.length);
      setTotalCompleted(completedJobs.length);
      setActiveJobsCount(activeJobs.length);
      setPendingJobs(pending.length);

      setLoading(false);
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      showAlert(
        t('common.error'),
        error.message || t('dashboard.loadDashboardError'),
        'error'
      );
      setLoading(false);
    }
  };

  const handleToggleOnline = async () => {
    try {
      // Mark that we're toggling status to prevent unnecessary reloads
      isTogglingStatus.current = true;

      const newStatus = !isOnline;
      await setProviderOnline(newStatus);

      // Update state without triggering full reload
      setIsOnline(newStatus);

      // Show toast for status change
      setToastMessage(newStatus ? t('dashboard.youreNowOnline') : t('dashboard.youreNowOffline'));
      setShowToast(true);
    } catch (error: any) {
      showAlert(t('common.error'), error.message || t('dashboard.updateStatusError'), 'error');
      // Reset toggle flag on error
      isTogglingStatus.current = false;
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([loadDashboardData(), loadProviderStatus()]);
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAcceptBooking = async () => {
    if (!incomingBooking || !userId) return;

    // Store booking data before clearing state
    const bookingData = incomingBooking;

    // Stop continuous sound immediately
    websocketService.stopSound();

    // Close modal immediately - this will unmount the BookingAlertModal component
    setIncomingBooking(null);

    console.log('✅ Modal closed, booking accepted');

    try {
      setLoading(true);

      // Get provider profile from API
      const provider = await getMyProfile();

      if (!provider || !(provider as any).address || !(provider as any).address.pincode) {
        showAlert(t('common.error'), t('dashboard.addressRequired'), 'error');
        return;
      }

      // Accept booking with provider profile details
      await websocketService.acceptBooking(
        bookingData,
        provider._id || provider.id || userId,
        provider,
      );

      // Create job card
      const jobCardId = await createJobCard(bookingData, (provider as any).address);

      // Refresh dashboard data
      loadDashboardData();

      // Show toast notification
      setToastMessage(t('dashboard.requestAccepted'));
      setShowToast(true);
    } catch (error: any) {
      showAlert(t('common.error'), error.message || t('dashboard.acceptRequestError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectBooking = async () => {
    if (!incomingBooking) return;

    // Stop continuous sound
    websocketService.stopSound();

    try {
      setLoading(true);
      await websocketService.rejectBooking(incomingBooking);
      setToastMessage(t('dashboard.requestRejected'));
      setShowToast(true);
      setIncomingBooking(null);
    } catch (error: any) {
      showAlert(t('common.error'), error.message || t('dashboard.rejectRequestError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDismissBooking = () => {
    // Stop continuous sound when modal is dismissed
    websocketService.stopSound();
    setIncomingBooking(null);
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.loaderContainer, {backgroundColor: theme.background}]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, {color: theme.textSecondary, marginTop: 16}]}>
          {t('dashboard.loadingDashboard')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      {/* Custom Alert Modal */}
      <AlertModal
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertVisible(false)}
      />

      {/* Booking Alert Modal */}
      {incomingBooking && (
        <BookingAlertModal
          key={incomingBooking?.consultationId || incomingBooking?.id || incomingBooking?.bookingId || 'booking-modal'}
          visible={!!incomingBooking}
          bookingData={incomingBooking}
          onAccept={handleAcceptBooking}
          onReject={handleRejectBooking}
          onDismiss={handleDismissBooking}
        />
      )}

      {/* Toast Notification */}
      <Toast
        visible={showToast}
        message={toastMessage}
        type="success"
        duration={3000}
        onHide={() => setShowToast(false)}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Online/Offline Toggle - Big Button */}
        <View style={styles.toggleSection}>
          <TouchableOpacity
            style={[
              styles.onlineToggle,
              {
                backgroundColor: isOnline ? '#34C759' : '#8E8E93',
              },
            ]}
            onPress={handleToggleOnline}
            disabled={loading}>
            <Icon
              name={isOnline ? 'check-circle' : 'cancel'}
              size={48}
              color="#fff"
            />
            <Text style={styles.toggleText}>
              {isOnline ? t('dashboard.online') : t('dashboard.offline')}
            </Text>
            <Text style={styles.toggleSubtext}>
              {isOnline
                ? t('dashboard.tapToGoOffline')
                : t('dashboard.tapToGoOnline')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main Stats Cards - 2x2 Grid */}
        <View style={styles.statsGrid}>
          {/* Active Jobs */}
          <TouchableOpacity
            style={[styles.gridStatCard, {backgroundColor: theme.card}]}
            onPress={() => navigation.navigate('Jobs')}>
            <View style={[styles.statIconContainer, {backgroundColor: '#007AFF15'}]}>
              <Icon name="work" size={28} color="#007AFF" />
            </View>
            <Text style={[styles.gridStatValue, {color: theme.text}]}>
              {activeJobsCount}
            </Text>
            <Text style={[styles.gridStatLabel, {color: theme.textSecondary}]}>
              {t('dashboard.activeJobs')}
            </Text>
          </TouchableOpacity>

          {/* Total Completed */}
          <TouchableOpacity
            style={[styles.gridStatCard, {backgroundColor: theme.card}]}
            onPress={() => navigation.navigate('History')}>
            <View style={[styles.statIconContainer, {backgroundColor: '#34C75915'}]}>
              <Icon name="verified" size={28} color="#34C759" />
            </View>
            <Text style={[styles.gridStatValue, {color: theme.text}]}>
              {totalCompleted}
            </Text>
            <Text style={[styles.gridStatLabel, {color: theme.textSecondary}]}>
              {t('dashboard.totalCompleted') || 'Total Completed'}
            </Text>
          </TouchableOpacity>

          {/* Pending Jobs */}
          <TouchableOpacity
            style={[styles.gridStatCard, {backgroundColor: theme.card}]}
            onPress={() => navigation.navigate('Jobs')}>
            <View style={[styles.statIconContainer, {backgroundColor: '#FF950015'}]}>
              <Icon name="hourglass-empty" size={28} color="#FF9500" />
            </View>
            <Text style={[styles.gridStatValue, {color: theme.text}]}>
              {pendingJobs}
            </Text>
            <Text style={[styles.gridStatLabel, {color: theme.textSecondary}]}>
              {t('dashboard.pendingJobs') || 'Pending'}
            </Text>
          </TouchableOpacity>

          {/* Rating */}
          <TouchableOpacity
            style={[styles.gridStatCard, {backgroundColor: theme.card}]}
            onPress={() => navigation.navigate('Profile')}>
            <View style={[styles.statIconContainer, {backgroundColor: '#FFD70015'}]}>
              <Icon name="star" size={28} color="#FFD700" />
            </View>
            <Text style={[styles.gridStatValue, {color: theme.text}]}>
              {rating.toFixed(1)}
            </Text>
            <Text style={[styles.gridStatLabel, {color: theme.textSecondary}]}>
              {t('dashboard.rating')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Additional Stats Row */}
        <View style={styles.quickStatsContainer}>
          <View style={[styles.quickStat, {backgroundColor: theme.card}]}>
            <Icon name="check-circle" size={24} color="#34C759" />
            <View style={styles.quickStatText}>
              <Text style={[styles.quickStatValue, {color: theme.text}]}>
                {completedToday}
              </Text>
              <Text style={[styles.quickStatLabel, {color: theme.textSecondary}]}>
                {t('dashboard.completedToday')}
              </Text>
            </View>
          </View>

          <View style={[styles.quickStat, {backgroundColor: theme.card}]}>
            <Icon name="rate-review" size={24} color="#007AFF" />
            <View style={styles.quickStatText}>
              <Text style={[styles.quickStatValue, {color: theme.text}]}>
                {totalReviews}
              </Text>
              <Text style={[styles.quickStatLabel, {color: theme.textSecondary}]}>
                {t('dashboard.totalReviews') || 'Reviews'}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={[styles.sectionTitle, {color: theme.text}]}>
            {t('dashboard.quickActions')}
          </Text>

          <TouchableOpacity
            style={[styles.actionButton, {backgroundColor: theme.card}]}
            onPress={() => navigation.navigate('Jobs', {filter: 'all'})}>
            <Icon name="list" size={24} color={theme.primary} />
            <Text style={[styles.actionButtonText, {color: theme.text}]}>
              {t('dashboard.viewActiveJobs')}
            </Text>
            <Icon name="chevron-right" size={24} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, {backgroundColor: theme.card}]}
            onPress={() => navigation.navigate('History')}>
            <Icon name="history" size={24} color={theme.primary} />
            <Text style={[styles.actionButtonText, {color: theme.text}]}>
              {t('dashboard.viewJobHistory') || 'View Job History'}
            </Text>
            <Icon name="chevron-right" size={24} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, {backgroundColor: theme.card}]}
            onPress={() => navigation.navigate('Profile')}>
            <Icon name="person" size={24} color={theme.primary} />
            <Text style={[styles.actionButtonText, {color: theme.text}]}>
              {t('dashboard.profileAndSettings')}
            </Text>
            <Icon name="chevron-right" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Info Banner */}
        {!isOnline && (
          <View style={[styles.infoBanner, {backgroundColor: '#FFF3CD'}]}>
            <Icon name="info" size={20} color="#856404" />
            <Text style={[styles.infoText, {color: '#856404'}]}>
              {t('dashboard.goOnlineMessage') || 'Go online to start receiving service requests'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  toggleSection: {
    padding: 20,
    alignItems: 'center',
  },
  onlineToggle: {
    width: '100%',
    paddingVertical: 30,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  toggleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  toggleSubtext: {
    fontSize: 14,
    color: '#fff',
    marginTop: 8,
    opacity: 0.9,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 8,
  },
  gridStatCard: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridStatValue: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  gridStatLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  quickStatsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  quickStat: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickStatText: {
    flex: 1,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  quickStatLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  quickActionsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
  },
});

