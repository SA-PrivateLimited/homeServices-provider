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
import useTranslation from '../hooks/useTranslation';
import {formatDistanceKm} from '../utils/distance';
import RequestPhotoGallery from './RequestPhotoGallery';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const BUTTON_WIDTH = SCREEN_WIDTH * 0.9 - 40; // Account for modal padding
const SWIPE_THRESHOLD = BUTTON_WIDTH * 0.7; // 70% of button width to accept

interface BookingAlertModalProps {
  visible: boolean;
  bookingData: any;
  onAccept: () => void;
  onReject: () => void;
  onDismiss: () => void;
  /** Seconds remaining before auto-decline */
  secondsLeft?: number;
}

export default function BookingAlertModal({
  visible,
  bookingData,
  onAccept,
  onReject,
  onDismiss,
  secondsLeft,
}: BookingAlertModalProps) {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

  const [swipeHint, setSwipeHint] = useState<'idle' | 'release'>('idle');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [isAccepted, setIsAccepted] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const acceptOnceRef = useRef(false);

  const customerName =
    bookingData?.customerName ||
    bookingData?.patientName ||
    String(t('dashboard.customerFallback'));
  // customerPhone intentionally omitted until job is accepted (backend redacts)
  const serviceType =
    bookingData?.serviceType || String(t('dashboard.serviceFallback'));
  const problem =
    bookingData?.problem ||
    bookingData?.symptoms ||
    String(t('dashboard.noDescription'));
  const customerAddress = bookingData?.customerAddress || bookingData?.patientAddress;
  const scheduledTime = bookingData?.scheduledTime
    ? new Date(bookingData.scheduledTime).toLocaleString()
    : String(t('dashboard.notSpecified'));
  const requestedAt = bookingData?.createdAt
    ? new Date(bookingData.createdAt).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;
  const consultationFee = bookingData?.consultationFee || bookingData?.serviceFee;

  const distanceLabel = formatDistanceKm(bookingData?.distanceKm);

  // Reset swipe control when modal opens or closes
  useEffect(() => {
    slideAnim.setValue(0);
    setIsAccepted(false);
    setIsRejected(false);
    acceptOnceRef.current = false;
    setSwipeHint('idle');
  }, [visible, slideAnim]);

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

          if (clampedDx > SWIPE_THRESHOLD) {
            setSwipeHint('release');
          } else {
            setSwipeHint('idle');
          }
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        slideAnim.flattenOffset();
        const dx = gestureState.dx;

        if (dx > SWIPE_THRESHOLD) {
          // Swipe right past threshold - Accept (once)
          if (acceptOnceRef.current) return;
          acceptOnceRef.current = true;
          setIsAccepted(true);
          onAccept();

          Animated.spring(slideAnim, {
            toValue: BUTTON_WIDTH - 60,
            useNativeDriver: false,
            tension: 50,
            friction: 7,
          }).start();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: false,
            tension: 50,
            friction: 7,
          }).start(() => {
            setSwipeHint('idle');
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

  const swipeLabel = isAccepted
    ? String(t('dashboard.acceptedExclaim'))
    : isRejected
      ? String(t('dashboard.rejectedExclaim'))
      : swipeHint === 'release'
        ? String(t('dashboard.releaseToAccept'))
        : String(t('dashboard.swipeRightToAccept'));

  // Don't render if not visible
  if (!visible) {
    return null;
  }

  // Don't render if no booking data
  if (!bookingData) {
    return null;
  }

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
                <Text style={[styles.title, {color: theme.text}]}>
                  {String(t('dashboard.newJob'))}
                </Text>
                <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
                  {secondsLeft != null
                    ? String(
                        t('dashboard.respondInSeconds', {seconds: secondsLeft}),
                      )
                    : String(t('dashboard.acceptOrDecline'))}
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
              {/* Phone withheld until job is accepted */}
            </View>

            {/* Service Details */}
            <View style={styles.detailsSection}>
              <View style={styles.detailRow}>
                <Icon name="build" size={18} color={theme.textSecondary} />
                <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                  {String(t('dashboard.serviceLabel'))}
                </Text>
                <Text style={[styles.detailValue, {color: theme.text}]}>{serviceType}</Text>
              </View>
              <View style={styles.detailRow}>
                <Icon name="description" size={18} color={theme.textSecondary} />
                <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                  {String(t('dashboard.problemLabel'))}
                </Text>
                <Text style={[styles.detailValue, {color: theme.text}]} numberOfLines={3}>
                  {problem}
                </Text>
              </View>
              {customerAddress && (
                <View style={styles.detailRow}>
                  <Icon name="location-on" size={18} color={theme.textSecondary} />
                  <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                    {String(t('dashboard.addressLabel'))}
                  </Text>
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
              {requestedAt ? (
                <View style={styles.detailRow}>
                  <Icon name="access-time" size={18} color={theme.textSecondary} />
                  <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                    {String(t('dashboard.requestedLabel'))}
                  </Text>
                  <Text style={[styles.detailValue, {color: theme.text}]}>
                    {requestedAt}
                  </Text>
                </View>
              ) : null}
              {scheduledTime &&
                scheduledTime !== String(t('dashboard.notSpecified')) && (
                <View style={styles.detailRow}>
                  <Icon name="schedule" size={18} color={theme.textSecondary} />
                  <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                    {String(t('dashboard.scheduledLabel'))}
                  </Text>
                  <Text style={[styles.detailValue, {color: theme.text}]}>
                    {scheduledTime}
                  </Text>
                </View>
              )}
              {consultationFee ? (
                <View style={styles.detailRow}>
                  <Icon name="attach-money" size={18} color={theme.textSecondary} />
                  <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                    {String(t('dashboard.serviceFeeLabel'))}
                  </Text>
                  <Text style={[styles.detailValue, {color: theme.text}]}>
                    ₹{consultationFee}
                  </Text>
                </View>
              ) : null}
              {distanceLabel ? (
                <View style={styles.detailRow}>
                  <Icon name="straighten" size={18} color={theme.textSecondary} />
                  <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                    {String(t('dashboard.distanceLabel'))}
                  </Text>
                  <Text style={[styles.detailValue, {color: theme.text}]}>
                    {distanceLabel}
                  </Text>
                </View>
              ) : null}
              <RequestPhotoGallery
                photos={bookingData?.photos}
                theme={theme}
                title={String(t('dashboard.customerPhotos'))}
              />
            </View>
          </ScrollView>

          {/* Primary Accept / Decline — one-handed */}
          <View style={styles.primaryActions}>
            <TouchableOpacity
              style={[styles.declineBtn, {opacity: isAccepted ? 0.5 : 1}]}
              disabled={isAccepted || isRejected}
              onPress={() => {
                if (acceptOnceRef.current) return;
                acceptOnceRef.current = true;
                setIsRejected(true);
                onReject();
              }}>
              <Text style={styles.declineBtnText}>{String(t('dashboard.decline'))}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptBtn, {opacity: isRejected ? 0.5 : 1}]}
              disabled={isAccepted || isRejected}
              onPress={() => {
                if (acceptOnceRef.current) return;
                acceptOnceRef.current = true;
                setIsAccepted(true);
                onAccept();
              }}>
              <Text style={styles.acceptBtnText}>{String(t('dashboard.accept'))}</Text>
            </TouchableOpacity>
          </View>

          {/* Swipeable Action Button (secondary) */}
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
                <Text style={styles.swipeableButtonText}>{swipeLabel}</Text>
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
    marginTop: 8,
    width: '100%',
  },
  primaryActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
  },
  declineBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#34C759',
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
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

