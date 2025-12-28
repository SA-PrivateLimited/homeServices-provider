/**
 * Swipeable Booking Card Component
 * Shows incoming booking requests with swipe gestures
 * Right swipe = Accept, Left swipe = Reject
 */

import React, {useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {lightTheme, darkTheme} from '../utils/theme';
import {useStore} from '../store';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3; // 30% of screen width
const CARD_WIDTH = SCREEN_WIDTH * 0.9;

interface SwipeableBookingCardProps {
  bookingData: any;
  onAccept: () => void;
  onReject: () => void;
  onDismiss: () => void;
}

export default function SwipeableBookingCard({
  bookingData,
  onAccept,
  onReject,
  onDismiss,
}: SwipeableBookingCardProps) {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  
  const [pan] = useState(new Animated.ValueXY());
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
      },
      onPanResponderMove: (evt, gestureState) => {
        // Only allow horizontal swiping
        const x = gestureState.dx;
        const y = gestureState.dy;
        
        // Determine swipe direction
        if (Math.abs(x) > Math.abs(y)) {
          if (x > 0) {
            setSwipeDirection('right');
          } else {
            setSwipeDirection('left');
          }
        }
        
        pan.setValue({x, y: 0});
      },
      onPanResponderRelease: (evt, gestureState) => {
        pan.flattenOffset();
        const {dx} = gestureState;

        if (Math.abs(dx) > SWIPE_THRESHOLD) {
          if (dx > 0) {
            // Swipe right - Accept
            Animated.spring(pan, {
              toValue: {x: SCREEN_WIDTH, y: 0},
              useNativeDriver: false,
            }).start(() => {
              onAccept();
            });
          } else {
            // Swipe left - Reject
            Animated.spring(pan, {
              toValue: {x: -SCREEN_WIDTH, y: 0},
              useNativeDriver: false,
            }).start(() => {
              onReject();
            });
          }
        } else {
          // Return to center
          Animated.spring(pan, {
            toValue: {x: 0, y: 0},
            useNativeDriver: false,
          }).start();
          setSwipeDirection(null);
        }
      },
    }),
  ).current;

  const customerName = bookingData.customerName || bookingData.patientName || 'Customer';
  const customerPhone = bookingData.customerPhone || bookingData.patientPhone || '';
  const serviceType = bookingData.serviceType || 'Service';
  const problem = bookingData.problem || bookingData.symptoms || 'No description';
  const customerAddress = bookingData.customerAddress || bookingData.patientAddress;

  const rotateZ = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  const rightOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const leftOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Background Actions */}
      <View style={styles.backgroundActions}>
        <Animated.View
          style={[
            styles.backgroundAction,
            styles.acceptBackground,
            {opacity: rightOpacity},
          ]}>
          <Icon name="check-circle" size={60} color="#fff" />
          <Text style={styles.backgroundActionText}>ACCEPT</Text>
        </Animated.View>
        <Animated.View
          style={[
            styles.backgroundAction,
            styles.rejectBackground,
            {opacity: leftOpacity},
          ]}>
          <Icon name="cancel" size={60} color="#fff" />
          <Text style={styles.backgroundActionText}>REJECT</Text>
        </Animated.View>
      </View>

      {/* Swipeable Card */}
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            transform: [
              {translateX: pan.x},
              {rotateZ},
            ],
          },
        ]}
        {...panResponder.panHandlers}>
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
            <Text style={[styles.detailValue, {color: theme.text}]} numberOfLines={2}>
              {problem}
            </Text>
          </View>
          {customerAddress && (
            <View style={styles.detailRow}>
              <Icon name="location-on" size={18} color={theme.textSecondary} />
              <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>Address:</Text>
              <Text style={[styles.detailValue, {color: theme.text}]} numberOfLines={2}>
                {customerAddress.address || ''}
                {customerAddress.pincode ? `, ${customerAddress.pincode}` : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons (Fallback) */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.rejectButton, {borderColor: theme.border}]}
            onPress={onReject}>
            <Icon name="cancel" size={20} color="#FF3B30" />
            <Text style={[styles.buttonText, {color: '#FF3B30'}]}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.acceptButton, {backgroundColor: theme.primary}]}
            onPress={onAccept}>
            <Icon name="check-circle" size={20} color="#fff" />
            <Text style={[styles.buttonText, {color: '#fff'}]}>Accept</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  backgroundActions: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backgroundAction: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  acceptBackground: {
    backgroundColor: '#34C759',
  },
  rejectBackground: {
    backgroundColor: '#FF3B30',
  },
  backgroundActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  card: {
    width: CARD_WIDTH,
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
    minWidth: 70,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

