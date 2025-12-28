/**
 * Booking Alert Modal Component
 * Shows incoming booking requests as a modal with card UI design
 * Replaces native Alert with custom card-based UI
 */

import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {lightTheme, darkTheme} from '../utils/theme';
import {useStore} from '../store';
import {getProviderStatus, getDistanceToCustomer} from '../services/providerLocationService';
import auth from '@react-native-firebase/auth';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const BUTTON_WIDTH = SCREEN_WIDTH * 0.9 - 40; // Account for modal padding
const SWIPE_THRESHOLD = BUTTON_WIDTH * 0.7; // 70% of button width to accept

interface BookingAlertModalProps {
  visible: boolean;
  bookingData: any;
  onAccept: () => void;
  onReject: () => void;
  onDismiss: () => void;
}

export default function BookingAlertModal({
  visible,
  bookingData,
  onAccept,
  onReject,
  onDismiss,
}: BookingAlertModalProps) {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  
  const [distanceInfo, setDistanceInfo] = useState<{
    distanceFormatted: string;
    etaMinutes: number;
  } | null>(null);
  const [loadingDistance, setLoadingDistance] = useState(false);
  
  // Swipeable button animation
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [isAccepted, setIsAccepted] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [buttonText, setButtonText] = useState('Swipe Right to Accept');

  const customerName = bookingData?.customerName || bookingData?.patientName || 'Customer';
  const customerPhone = bookingData?.customerPhone || bookingData?.patientPhone || '';
  const serviceType = bookingData?.serviceType || 'Service';
  const problem = bookingData?.problem || bookingData?.symptoms || 'No description';
  const customerAddress = bookingData?.customerAddress || bookingData?.patientAddress;
  const scheduledTime = bookingData?.scheduledTime
    ? new Date(bookingData.scheduledTime).toLocaleString()
    : 'Not specified';
  const consultationFee = bookingData?.consultationFee || bookingData?.serviceFee;

  // Calculate distance when modal opens
  useEffect(() => {
    if (visible && customerAddress && customerAddress.latitude && customerAddress.longitude) {
      calculateDistance();
    }
    // Reset button when modal opens or closes
    if (visible) {
      slideAnim.setValue(0);
      setIsAccepted(false);
      setIsRejected(false);
      setButtonText('Swipe Right to Accept');
      console.log('✅ Modal opened, resetting state');
    } else {
      // Reset when modal closes
      slideAnim.setValue(0);
      setIsAccepted(false);
      setIsRejected(false);
      setButtonText('Swipe Right to Accept');
      console.log('✅ Modal closed, resetting state');
    }
  }, [visible]);

  // Pan responder for swipeable button
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        slideAnim.setOffset((slideAnim as any)._value);
        slideAnim.setValue(0);
      },
      onPanResponderMove: (evt, gestureState) => {
        const dx = gestureState.dx;
        // Only allow horizontal movement
        if (Math.abs(dx) > Math.abs(gestureState.dy)) {
          // Clamp the value between 0 and BUTTON_WIDTH - THUMB_SIZE
          const maxSlide = BUTTON_WIDTH - 60; // 60 is thumb size
          const clampedDx = Math.max(0, Math.min(maxSlide, dx));
          slideAnim.setValue(clampedDx);
          
          // Update button text based on progress
          if (clampedDx > SWIPE_THRESHOLD) {
            setButtonText('Release to Accept');
          } else {
            setButtonText('Swipe Right to Accept');
          }
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        slideAnim.flattenOffset();
        const dx = gestureState.dx;

        if (dx > SWIPE_THRESHOLD) {
          // Swipe right past threshold - Accept
          console.log('✅ Swipe threshold reached, accepting booking');
          setIsAccepted(true);
          setButtonText('Accepted!');
          
          // Call onAccept immediately - it will handle closing the modal and stopping sound
          console.log('✅ Calling onAccept to close modal');
          onAccept();
          
          // Animate for visual feedback (but modal should already be closing)
          Animated.spring(slideAnim, {
            toValue: BUTTON_WIDTH - 60,
            useNativeDriver: false,
            tension: 50,
            friction: 7,
          }).start();
        } else {
          // Not swiped far enough or swiped left - Return to start
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: false,
            tension: 50,
            friction: 7,
          }).start(() => {
            setButtonText('Swipe Right to Accept');
          });
        }
      },
    }),
  ).current;

  // Calculate progress for background color
  const progress = slideAnim.interpolate({
    inputRange: [0, SWIPE_THRESHOLD, BUTTON_WIDTH - 60],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  const backgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['#000000', '#34C759'], // Black to green
    extrapolate: 'clamp',
  });

  const calculateDistance = async () => {
    try {
      setLoadingDistance(true);
      const currentUser = auth().currentUser;
      if (!currentUser) return;

      const providerStatus = await getProviderStatus(currentUser.uid);
      if (
        providerStatus?.currentLocation &&
        customerAddress.latitude &&
        customerAddress.longitude
      ) {
        const info = getDistanceToCustomer(
          providerStatus.currentLocation,
          {
            latitude: customerAddress.latitude,
            longitude: customerAddress.longitude,
          },
        );
        setDistanceInfo(info);
      }
    } catch (error) {
      console.log('Could not calculate distance:', error);
    } finally {
      setLoadingDistance(false);
    }
  };

  // Don't render if not visible
  if (!visible) {
    console.log('🚫 BookingAlertModal: Not visible, returning null');
    return null;
  }

  // Don't render if no booking data
  if (!bookingData) {
    console.log('🚫 BookingAlertModal: No booking data, returning null');
    return null;
  }
  
  console.log('✅ BookingAlertModal: Rendering modal with booking:', {
    id: bookingData?.consultationId || bookingData?.id || bookingData?.bookingId,
    customerName: bookingData?.customerName || bookingData?.patientName,
    visible: visible,
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, {backgroundColor: theme.card}]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconContainer, {backgroundColor: theme.primary + '20'}]}>
                <Icon name="notifications-active" size={24} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.title, {color: theme.text}]}>New Service Request</Text>
                <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
                  Swipe right to accept • Swipe left to reject
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onDismiss}>
              <Icon name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Customer Info */}
            <View style={styles.customerInfo}>
              <View style={styles.customerRow}>
                <Icon name="person" size={20} color={theme.primary} />
                <Text style={[styles.customerName, {color: theme.text}]}>{customerName}</Text>
              </View>
              {customerPhone && (
                <View style={styles.customerRow}>
                  <Icon name="phone" size={20} color={theme.textSecondary} />
                  <Text style={[styles.customerDetail, {color: theme.textSecondary}]}>
                    {customerPhone}
                  </Text>
                </View>
              )}
            </View>

            {/* Service Details */}
            <View style={styles.detailsSection}>
              <View style={styles.detailRow}>
                <Icon name="build" size={18} color={theme.textSecondary} />
                <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>Service:</Text>
                <Text style={[styles.detailValue, {color: theme.text}]}>{serviceType}</Text>
              </View>
              <View style={styles.detailRow}>
                <Icon name="description" size={18} color={theme.textSecondary} />
                <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>Problem:</Text>
                <Text style={[styles.detailValue, {color: theme.text}]} numberOfLines={3}>
                  {problem}
                </Text>
              </View>
              {customerAddress && (
                <View style={styles.detailRow}>
                  <Icon name="location-on" size={18} color={theme.textSecondary} />
                  <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>Address:</Text>
                  <Text style={[styles.detailValue, {color: theme.text}]} numberOfLines={3}>
                    {customerAddress.address || ''}
                    {customerAddress.pincode ? `, ${customerAddress.pincode}` : ''}
                    {customerAddress.city || customerAddress.state
                      ? `\n${[customerAddress.city, customerAddress.state]
                          .filter(Boolean)
                          .join(', ')}`
                      : ''}
                  </Text>
                </View>
              )}
              {scheduledTime && scheduledTime !== 'Not specified' && (
                <View style={styles.detailRow}>
                  <Icon name="schedule" size={18} color={theme.textSecondary} />
                  <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                    Scheduled Time:
                  </Text>
                  <Text style={[styles.detailValue, {color: theme.text}]}>{scheduledTime}</Text>
                </View>
              )}
              {consultationFee && (
                <View style={styles.detailRow}>
                  <Icon name="attach-money" size={18} color={theme.textSecondary} />
                  <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                    Service Fee:
                  </Text>
                  <Text style={[styles.detailValue, {color: theme.text}]}>
                    ₹{consultationFee}
                  </Text>
                </View>
              )}
              {distanceInfo && (
                <>
                  <View style={styles.detailRow}>
                    <Icon name="straighten" size={18} color={theme.textSecondary} />
                    <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                      Distance:
                    </Text>
                    <Text style={[styles.detailValue, {color: theme.text}]}>
                      {distanceInfo.distanceFormatted}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Icon name="timer" size={18} color={theme.textSecondary} />
                    <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>ETA:</Text>
                    <Text style={[styles.detailValue, {color: theme.text}]}>
                      ~{distanceInfo.etaMinutes} min
                    </Text>
                  </View>
                </>
              )}
            </View>
          </ScrollView>

          {/* Swipeable Action Button */}
          <View style={styles.swipeableButtonContainer}>
            <Animated.View
              style={[
                styles.swipeableButtonBackground,
                {backgroundColor: backgroundColor},
              ]}>
              <Animated.View
                style={[
                  styles.swipeableButtonThumb,
                  {
                    transform: [{translateX: slideAnim}],
                  },
                ]}
                {...panResponder.panHandlers}>
                <Icon name="arrow-forward" size={24} color="#fff" />
              </Animated.View>
              <View style={styles.swipeableButtonTextContainer}>
                <Text style={styles.swipeableButtonText}>
                  {isAccepted ? 'Accepted!' : isRejected ? 'Rejected!' : buttonText}
                </Text>
              </View>
            </Animated.View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: SCREEN_WIDTH * 0.9,
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    maxHeight: 400,
  },
  customerInfo: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  customerName: {
    fontSize: 20,
    fontWeight: '600',
  },
  customerDetail: {
    fontSize: 14,
  },
  detailsSection: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    minWidth: 100,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  swipeableButtonContainer: {
    marginTop: 16,
    width: '100%',
  },
  swipeableButtonBackground: {
    width: BUTTON_WIDTH,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#000000',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeableButtonThumb: {
    position: 'absolute',
    left: 4,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 10,
  },
  swipeableButtonTextContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  swipeableButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

