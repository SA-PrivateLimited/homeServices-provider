/**
 * Provider Home — Urban Company / Uber-style field dashboard
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
import {useFocusEffect} from '@react-navigation/native';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {getUserId} from '../services/session';
import {
  setProviderOnline,
  getProviderStatus,
  startLocationTracking,
  stopLocationTracking,
  getDistanceToCustomer,
} from '../services/providerLocationService';
import {getMyProfile} from '../services/api/providersApi';
import websocketService from '../services/websocketService';
import {getProviderJobCards} from '../services/jobCardService';
import AlertModal from '../components/AlertModal';
import Toast from '../components/Toast';
import useTranslation from '../hooks/useTranslation';
import {useIncomingBooking} from '../components/IncomingBookingContext';
import {
  openCall,
  openWhatsApp,
  openNavigate,
} from '../services/contactActions';
import {speakNavigateToCustomer} from '../services/voicePromptService';

export default function ProviderDashboardScreen({navigation}: any) {
  const {isDarkMode, currentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const userId = getUserId(currentUser);
  const {t} = useTranslation();
  const tx = (key: string, opts?: any) => String(t(key, opts));
  const {
    incomingBooking,
    secondsLeft,
    acceptBooking,
    rejectBooking,
    setPreferInlineCard,
  } = useIncomingBooking();

  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeJobsCount, setActiveJobsCount] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [distanceLabel, setDistanceLabel] = useState<string | null>(null);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({title: '', message: '', type: 'info'});

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
  ) => {
    setAlertConfig({title, message, type});
    setAlertVisible(true);
  };

  const isInitialMount = useRef(true);
  const isTogglingStatus = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setPreferInlineCard(true);
      return () => setPreferInlineCard(false);
    }, [setPreferInlineCard]),
  );

  const loadProviderStatus = useCallback(async () => {
    if (!userId) return;
    try {
      const provider = await getMyProfile();
      if (provider) {
        setIsOnline(provider.isOnline || false);
      }
    } catch (error) {
      console.error('Error loading provider status:', error);
    }
  }, [userId]);

  const loadDashboardData = useCallback(async () => {
    try {
      if (!userId) return;

      const status = await getProviderStatus(userId);
      if (status) setIsOnline(status.isOnline);

      let jobCards: any[] = [];
      try {
        jobCards = await getProviderJobCards(userId);
      } catch {
        jobCards = [];
      }

      const activeJobs = jobCards.filter(
        j => j.status === 'accepted' || j.status === 'in-progress',
      );

      setActiveJobsCount(activeJobs.length);
      setLoading(false);
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      showAlert(
        tx('common.error'),
        error.message || tx('dashboard.loadDashboardError'),
        'error',
      );
      setLoading(false);
    }
  }, [userId, t]);

  useEffect(() => {
    if (!userId) return;
    if (isInitialMount.current) {
      void loadDashboardData();
      void loadProviderStatus();
      isInitialMount.current = false;
    }
    if (isOnline) websocketService.connect(userId);
    return () => {
      stopLocationTracking();
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || isInitialMount.current) return;
    if (isTogglingStatus.current) isTogglingStatus.current = false;

    if (isOnline) {
      websocketService.connect(userId);
      startLocationTracking();
    } else {
      stopLocationTracking();
      websocketService.disconnect();
    }
  }, [isOnline, userId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!incomingBooking?.customerAddress) {
        setDistanceLabel(null);
        return;
      }
      try {
        const addr = incomingBooking.customerAddress;
        if (addr.latitude == null || addr.longitude == null) {
          setDistanceLabel(null);
          return;
        }
        const status = await getProviderStatus(userId || '');
        if (cancelled || !status?.currentLocation) return;
        const info = getDistanceToCustomer(status.currentLocation, {
          latitude: addr.latitude,
          longitude: addr.longitude,
        });
        if (!cancelled) setDistanceLabel(info?.distanceFormatted || null);
      } catch {
        if (!cancelled) setDistanceLabel(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [incomingBooking, userId]);

  const handleToggleOnline = async () => {
    try {
      isTogglingStatus.current = true;
      const newStatus = !isOnline;
      await setProviderOnline(newStatus);
      setIsOnline(newStatus);
      setToastMessage(
        newStatus ? tx('dashboard.youreNowOnline') : tx('dashboard.youreNowOffline'),
      );
      setShowToast(true);
    } catch (error: any) {
      showAlert(
        tx('common.error'),
        error.message || tx('dashboard.updateStatusError'),
        'error',
      );
      isTogglingStatus.current = false;
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([loadDashboardData(), loadProviderStatus()]);
    } finally {
      setRefreshing(false);
    }
  };

  const fee =
    incomingBooking?.consultationFee ??
    incomingBooking?.serviceFee ??
    null;
  const serviceType = incomingBooking?.serviceType || 'Service';

  if (loading && !refreshing) {
    return (
      <View
        style={[
          styles.container,
          styles.loaderContainer,
          {backgroundColor: theme.background},
        ]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text
          style={[
            styles.loadingText,
            {color: theme.textSecondary, marginTop: 16},
          ]}>
          {tx('dashboard.loadingDashboard')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <AlertModal
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertVisible(false)}
      />
      <Toast
        visible={showToast}
        message={toastMessage}
        type="success"
        duration={3000}
        onHide={() => setShowToast(false)}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* AVAILABLE toggle */}
        <TouchableOpacity
          style={[
            styles.onlineToggle,
            {backgroundColor: isOnline ? '#34C759' : '#8E8E93'},
          ]}
          onPress={handleToggleOnline}
          activeOpacity={0.9}>
          <Icon
            name={isOnline ? 'check-circle' : 'cancel'}
            size={44}
            color="#fff"
          />
          <Text style={styles.toggleText}>
            {isOnline
              ? tx('dashboard.available')
              : tx('dashboard.offline')}
          </Text>
          <Text style={styles.toggleSubtext}>
            {isOnline
              ? tx('dashboard.tapToGoOffline')
              : tx('dashboard.tapToGoOnline')}
          </Text>
        </TouchableOpacity>

        {/* NEW JOB card */}
        {incomingBooking ? (
          <View style={[styles.newJobCard, {backgroundColor: theme.card}]}>
            <View style={styles.newJobHeader}>
              <Text style={[styles.newJobBadge, {color: theme.primary}]}>
                {tx('dashboard.newJob')}
              </Text>
              <Text style={[styles.countdown, {color: '#FF3B30'}]}>
                {secondsLeft}s
              </Text>
            </View>
            <Text style={[styles.newJobService, {color: theme.text}]}>
              {serviceType}
            </Text>
            {fee != null && fee !== '' ? (
              <Text style={[styles.newJobFee, {color: theme.text}]}>
                ₹{fee}
              </Text>
            ) : null}
            {distanceLabel ? (
              <Text style={[styles.newJobDist, {color: theme.textSecondary}]}>
                📍 {distanceLabel}
              </Text>
            ) : null}
            {incomingBooking.problem ? (
              <Text
                style={[styles.newJobProblem, {color: theme.textSecondary}]}
                numberOfLines={2}>
                {incomingBooking.problem}
              </Text>
            ) : null}

            <View style={styles.newJobActions}>
              <TouchableOpacity
                style={styles.declineBtn}
                onPress={() => void rejectBooking()}>
                <Text style={styles.declineBtnText}>
                  {tx('dashboard.decline')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => void acceptBooking()}>
                <Text style={styles.acceptBtnText}>
                  {tx('dashboard.accept')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.newJobQuickRow}>
              <TouchableOpacity
                style={styles.miniAction}
                onPress={() =>
                  openCall(
                    incomingBooking.customerPhone ||
                      incomingBooking.patientPhone,
                  ).catch(() => {})
                }>
                <Icon name="call" size={20} color="#34C759" />
                <Text style={styles.miniActionText}>{tx('dashboard.call')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.miniAction}
                onPress={() =>
                  openWhatsApp(
                    incomingBooking.customerPhone ||
                      incomingBooking.patientPhone,
                  ).catch(() => {})
                }>
                <Icon name="chat" size={20} color="#25D366" />
                <Text style={styles.miniActionText}>
                  {tx('dashboard.whatsapp')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.miniAction}
                onPress={async () => {
                  const addr =
                    incomingBooking.customerAddress ||
                    incomingBooking.patientAddress;
                  try {
                    await speakNavigateToCustomer();
                    await openNavigate({
                      latitude: addr?.latitude,
                      longitude: addr?.longitude,
                      address: addr?.address,
                    });
                  } catch {
                    /* ignore */
                  }
                }}>
                <Icon name="navigation" size={20} color="#007AFF" />
                <Text style={styles.miniActionText}>
                  {tx('dashboard.navigate')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Active Jobs */}
        <TouchableOpacity
          style={[styles.activeJobsCard, {backgroundColor: theme.card}]}
          onPress={() => navigation.navigate('Jobs')}
          activeOpacity={0.85}>
          <View>
            <Text style={[styles.activeJobsLabel, {color: theme.textSecondary}]}>
              {tx('dashboard.activeJobs')}
            </Text>
            <Text style={[styles.activeJobsValue, {color: theme.text}]}>
              {activeJobsCount}
            </Text>
          </View>
          <Icon name="chevron-right" size={28} color={theme.textSecondary} />
        </TouchableOpacity>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, {color: theme.text}]}>
          {tx('dashboard.quickActions')}
        </Text>

        <TouchableOpacity
          style={[styles.actionButton, {backgroundColor: theme.card}]}
          onPress={() => navigation.navigate('Jobs')}>
          <Icon name="list-alt" size={24} color="#FF3B30" />
          <Text style={[styles.actionButtonText, {color: theme.text}]}>
            {tx('dashboard.viewActiveJobs')}
          </Text>
          <Icon name="chevron-right" size={24} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, {backgroundColor: theme.card}]}
          onPress={() => navigation.navigate('History')}>
          <Icon name="history" size={24} color={theme.primary} />
          <Text style={[styles.actionButtonText, {color: theme.text}]}>
            {tx('dashboard.viewJobHistory')}
          </Text>
          <Icon name="chevron-right" size={24} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, {backgroundColor: theme.card}]}
          onPress={() => {
            const parent = navigation.getParent();
            if (parent) parent.navigate('HelpSupport');
            else navigation.navigate('HelpSupport');
          }}>
          <Icon name="support-agent" size={24} color="#007AFF" />
          <Text style={[styles.actionButtonText, {color: theme.text}]}>
            {tx('dashboard.helpCenter')}
          </Text>
          <Icon name="chevron-right" size={24} color={theme.textSecondary} />
        </TouchableOpacity>

        {!isOnline ? (
          <View style={[styles.infoBanner, {backgroundColor: '#FFF3CD'}]}>
            <Icon name="info" size={20} color="#856404" />
            <Text style={[styles.infoText, {color: '#856404'}]}>
              {tx('dashboard.goOnlineMessage')}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  loaderContainer: {justifyContent: 'center', alignItems: 'center'},
  loadingText: {fontSize: 16},
  scrollView: {flex: 1},
  scrollContent: {padding: 16, paddingBottom: 32},
  onlineToggle: {
    width: '100%',
    paddingVertical: 28,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  toggleText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginTop: 10,
    letterSpacing: 1,
  },
  toggleSubtext: {fontSize: 14, color: '#fff', marginTop: 6, opacity: 0.95},
  newJobCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#34C759',
    elevation: 2,
  },
  newJobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  newJobBadge: {fontSize: 13, fontWeight: '800', letterSpacing: 1},
  countdown: {fontSize: 16, fontWeight: '700'},
  newJobService: {fontSize: 22, fontWeight: '700', marginBottom: 4},
  newJobFee: {fontSize: 28, fontWeight: '800', marginBottom: 4},
  newJobDist: {fontSize: 15, marginBottom: 6},
  newJobProblem: {fontSize: 14, marginBottom: 12},
  newJobActions: {flexDirection: 'row', gap: 12, marginBottom: 12},
  declineBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
  },
  declineBtnText: {color: '#fff', fontSize: 17, fontWeight: '700'},
  acceptBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#34C759',
    alignItems: 'center',
  },
  acceptBtnText: {color: '#fff', fontSize: 17, fontWeight: '700'},
  newJobQuickRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 4,
  },
  miniAction: {alignItems: 'center', gap: 4, padding: 8},
  miniActionText: {fontSize: 12, fontWeight: '600', color: '#555'},
  activeJobsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 1,
  },
  activeJobsLabel: {fontSize: 14, fontWeight: '600'},
  activeJobsValue: {fontSize: 32, fontWeight: '800', marginTop: 4},
  sectionTitle: {fontSize: 18, fontWeight: '700', marginBottom: 12},
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
  actionButtonText: {flex: 1, fontSize: 16, fontWeight: '600'},
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 10,
    marginTop: 8,
  },
  infoText: {flex: 1, fontSize: 14},
});
