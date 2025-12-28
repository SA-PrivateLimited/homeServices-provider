/**
 * Provider Dashboard Screen
 * Main screen for service providers - Ola/Uber driver style
 * Features:
 * - Online/Offline toggle (big button)
 * - Today's earnings
 * - Active jobs count
 * - Quick stats
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {
  setProviderOnline,
  getProviderStatus,
  startLocationTracking,
} from '../services/providerLocationService';
import websocketService from '../services/websocketService';
import soundService from '../services/soundService';
import {getProviderJobCards} from '../services/jobCardService';
import BookingAlertModal from '../components/BookingAlertModal';
import SuccessModal from '../components/SuccessModal';
import {createJobCard} from '../services/jobCardService';

export default function ProviderDashboardScreen({navigation}: any) {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const currentUser = auth().currentUser;

  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [activeJobsCount, setActiveJobsCount] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [rating, setRating] = useState(0);
  const [locationTracking, setLocationTracking] = useState<(() => void) | null>(null);
  const [incomingBooking, setIncomingBooking] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    loadDashboardData();
    
    // Subscribe to provider status changes
    const unsubscribe = firestore()
      .collection('providers')
      .doc(currentUser?.uid)
      .onSnapshot(
        doc => {
          if (doc.exists) {
            const data = doc.data();
            setIsOnline(data?.isOnline || false);
            setRating(data?.rating || 0);
          }
        },
        error => {
          console.error('Error listening to provider status:', error);
        }
      );

    // Subscribe to incoming bookings
    const unsubscribeBooking = websocketService.onNewBooking((bookingData) => {
      console.log('📱 Dashboard received booking callback:', bookingData);
      console.log('📱 Setting incomingBooking state with:', {
        id: bookingData?.consultationId || bookingData?.id || bookingData?.bookingId,
        customerName: bookingData?.customerName || bookingData?.patientName,
      });
      setIncomingBooking(bookingData);
      console.log('✅ Incoming booking state updated, modal should show now');
    });
    
    console.log('✅ Booking callback registered in dashboard');

    return () => {
      unsubscribe();
      unsubscribeBooking();
      if (locationTracking) {
        locationTracking();
      }
    };
  }, [currentUser]);

  // Start/stop location tracking based on online status
  useEffect(() => {
    if (isOnline && currentUser?.uid) {
      console.log('🟢 Provider going online, connecting WebSocket with UID:', currentUser.uid);
      // Start location tracking when going online
      const stopTracking = startLocationTracking();
      setLocationTracking(() => stopTracking);
      
      // Connect WebSocket for real-time job notifications
      // Use UID as provider document ID matches user UID
      websocketService.connect(currentUser.uid);
    } else {
      console.log('🔴 Provider going offline, disconnecting WebSocket');
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
      websocketService.disconnect();
    };
  }, [isOnline, currentUser?.uid]);

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
      if (!currentUser?.uid) return;

      // Load provider status
      const status = await getProviderStatus(currentUser.uid);
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
        jobCards = await getProviderJobCards(currentUser.uid);
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

      setCompletedToday(todayJobs.length);
      setActiveJobsCount(jobCards.filter(j => 
        j.status === 'accepted' || j.status === 'in-progress'
      ).length);

      // Calculate today's earnings (assuming each job has a serviceFee)
      // This is a placeholder - adjust based on your payment structure
      const earnings = todayJobs.reduce((sum, job) => {
        // Assuming job has serviceFee field
        return sum + ((job as any).serviceFee || 0);
      }, 0);
      setTodayEarnings(earnings);

      setLoading(false);
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to load dashboard data. Please try again.',
        [{text: 'OK'}]
      );
      setLoading(false);
    }
  };

  const handleToggleOnline = async () => {
    try {
      setLoading(true);
      const newStatus = !isOnline;
      await setProviderOnline(newStatus);
      setIsOnline(newStatus);
      
      Alert.alert(
        newStatus ? 'You\'re Now Online' : 'You\'re Now Offline',
        newStatus
          ? 'You will receive service requests. Make sure location is enabled.'
          : 'You will not receive new service requests.',
        [{text: 'OK'}]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update online status');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleAcceptBooking = async () => {
    if (!incomingBooking || !currentUser) return;

    // Store booking data before clearing state
    const bookingData = incomingBooking;
    
    // Stop continuous sound immediately
    websocketService.stopSound();
    
    // Close modal immediately - this will unmount the BookingAlertModal component
    setIncomingBooking(null);
    
    console.log('✅ Modal closed, booking accepted');

    try {
      setLoading(true);
      
      // Get provider profile
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
      if (!provider) {
        const uidDoc = await firestore()
          .collection('providers')
          .doc(currentUser.uid)
          .get();
        if (uidDoc.exists) {
          provider = uidDoc.data();
        }
      }

      if (!provider || !provider.address || !provider.address.pincode) {
        Alert.alert('Error', 'Please set up your address in profile settings to accept requests.');
        return;
      }

      // Accept booking
      await websocketService.acceptBooking(bookingData, currentUser.uid);
      
      // Create job card
      const jobCardId = await createJobCard(bookingData, provider.address);
      
      // Refresh dashboard data
      loadDashboardData();
      
      // Show success modal after a short delay
      setTimeout(() => {
        setShowSuccessModal(true);
      }, 300);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept service request.');
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
      Alert.alert('Success', 'Service request rejected successfully.');
      setIncomingBooking(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reject service request.');
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
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
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

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        title="Success"
        message="Service request accepted! Job card created successfully."
        icon="checkmark-circle"
        iconColor="#34C759"
        buttonText="OK"
        onClose={() => {
          setShowSuccessModal(false);
        }}
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
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
          <Text style={styles.toggleSubtext}>
            {isOnline
              ? 'Tap to go offline'
              : 'Tap to go online and receive requests'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        {/* Today's Earnings */}
        <View style={[styles.statCard, {backgroundColor: theme.card}]}>
          <Icon name="attach-money" size={32} color="#34C759" />
          <Text style={[styles.statValue, {color: theme.text}]}>
            ₹{todayEarnings.toFixed(0)}
          </Text>
          <Text style={[styles.statLabel, {color: theme.textSecondary}]}>
            Today's Earnings
          </Text>
        </View>

        {/* Active Jobs */}
        <TouchableOpacity
          style={[styles.statCard, {backgroundColor: theme.card}]}
          onPress={() => navigation.navigate('Jobs')}>
          <Icon name="work" size={32} color="#007AFF" />
          <Text style={[styles.statValue, {color: theme.text}]}>
            {activeJobsCount}
          </Text>
          <Text style={[styles.statLabel, {color: theme.textSecondary}]}>
            Active Jobs
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStatsContainer}>
        <View style={[styles.quickStat, {backgroundColor: theme.card}]}>
          <Icon name="check-circle" size={24} color="#34C759" />
          <View style={styles.quickStatText}>
            <Text style={[styles.quickStatValue, {color: theme.text}]}>
              {completedToday}
            </Text>
            <Text style={[styles.quickStatLabel, {color: theme.textSecondary}]}>
              Completed Today
            </Text>
          </View>
        </View>

        <View style={[styles.quickStat, {backgroundColor: theme.card}]}>
          <Icon name="star" size={24} color="#FFD700" />
          <View style={styles.quickStatText}>
            <Text style={[styles.quickStatValue, {color: theme.text}]}>
              {rating.toFixed(1)}
            </Text>
            <Text style={[styles.quickStatLabel, {color: theme.textSecondary}]}>
              Rating
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <Text style={[styles.sectionTitle, {color: theme.text}]}>
          Quick Actions
        </Text>

        <TouchableOpacity
          style={[styles.actionButton, {backgroundColor: theme.card}]}
          onPress={() => navigation.navigate('Jobs')}>
          <Icon name="list" size={24} color={theme.primary} />
          <Text style={[styles.actionButtonText, {color: theme.text}]}>
            View Active Jobs
          </Text>
          <Icon name="chevron-right" size={24} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, {backgroundColor: theme.card}]}
          onPress={() => navigation.navigate('History')}>
          <Icon name="account-balance-wallet" size={24} color={theme.primary} />
          <Text style={[styles.actionButtonText, {color: theme.text}]}>
            View Earnings History
          </Text>
          <Icon name="chevron-right" size={24} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, {backgroundColor: theme.card}]}
          onPress={() => navigation.navigate('Profile')}>
          <Icon name="person" size={24} color={theme.primary} />
          <Text style={[styles.actionButtonText, {color: theme.text}]}>
            Profile & Settings
          </Text>
          <Icon name="chevron-right" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      {!isOnline && (
        <View style={[styles.infoBanner, {backgroundColor: '#FFF3CD'}]}>
          <Icon name="info" size={20} color="#856404" />
          <Text style={[styles.infoText, {color: '#856404'}]}>
            Go online to start receiving service requests
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
    paddingBottom: 20,
    gap: 12,
  },
  quickStat: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
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
    margin: 20,
    borderRadius: 8,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
  },
});

