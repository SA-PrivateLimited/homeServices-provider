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
} from '../services/providerLocationService';
import {getMyProfile, setShowRequestService} from '../services/api/providersApi';
import websocketService from '../services/websocketService';
import {getProviderJobCards} from '../services/jobCardService';
import AlertModal from '../components/AlertModal';
import {toast, ConfirmDialog} from 'sapvt-ltd-app-packages';
import useTranslation from '../hooks/useTranslation';
import {useIncomingBooking} from '../components/IncomingBookingContext';
import {formatDistanceKm} from '../utils/distance';
import {ReceiveRequestsCard} from '../components/ReceiveRequestsCard';
import {AvailabilityCard} from '../components/AvailabilityCard';
import {CrystalSurface} from '../components/CrystalSurface';
import {IncomingRequestCard} from '../components/IncomingRequestCard';
import {IncomingWaitingList} from '../components/IncomingWaitingList';
import {PartnerIncomingCard} from '../components/PartnerIncomingCard';
import {AssistingCollaborationCard} from '../components/AssistingCollaborationCard';
import {ProfileCta, EmptyRequest} from '../components/ProfileCta';
import {NotificationsSettingsCard} from '../components/NotificationsSettingsCard';
import {isProfileIncomplete} from '../utils/partnerProfile';
import {AppHeader} from '../components/account/AppHeader';
import {
  dismissReceiveRequestsPrompt,
  isReceiveRequestsPromptDismissed,
} from '../utils/receiveRequestsPrompt';
import {getUserFacingErrorMessage} from '../utils/userFacingError';
import {
  acceptPartnerRequest,
  listAssistingCollaborations,
  listIncomingPartnerRequests,
  rejectPartnerRequest,
  type PartnerCollaborationRequest,
} from '../services/api/partnerCollaborationApi';

export default function ProviderDashboardScreen({navigation}: any) {
  const {isDarkMode, currentUser, colorTheme} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const userId = getUserId(currentUser);
  const {t} = useTranslation();
  const tx = (key: string, opts?: any) => String(t(key, opts));
  void colorTheme;
  const {
    incomingBooking,
    waitingNearby,
    secondsLeft,
    acceptBooking,
    rejectBooking,
    setPreferInlineCard,
  } = useIncomingBooking();

  const [isOnline, setIsOnline] = useState(false);
  const [showRequestService, setShowRequest] = useState(true);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [togglingRequests, setTogglingRequests] = useState(false);
  const [partnerIncoming, setPartnerIncoming] =
    useState<PartnerCollaborationRequest | null>(null);
  const [assisting, setAssisting] = useState<PartnerCollaborationRequest | null>(
    null,
  );
  const [collabBusy, setCollabBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeJobsCount, setActiveJobsCount] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [receivePromptOpen, setReceivePromptOpen] = useState(false);

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
        setProfile(provider);
        setIsOnline(provider.isOnline || false);
        setShowRequest(provider.showRequestService !== false);
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

      try {
        const [incomingCollab, assistingRows] = await Promise.all([
          listIncomingPartnerRequests('pending'),
          listAssistingCollaborations('accepted'),
        ]);
        setPartnerIncoming(incomingCollab[0] || null);
        setAssisting(assistingRows[0] || null);
      } catch {
        setPartnerIncoming(null);
        setAssisting(null);
      }

      setLoading(false);
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      showAlert(
        tx('common.error'),
        getUserFacingErrorMessage(error) || tx('dashboard.loadDashboardError'),
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

  const handleToggleOnline = async () => {
    try {
      isTogglingStatus.current = true;
      setTogglingOnline(true);
      const newStatus = !isOnline;
      await setProviderOnline(newStatus);
      setIsOnline(newStatus);
      toast.success(
        newStatus ? tx('dashboard.youreNowOnline') : tx('dashboard.youreNowOffline'),
      );
    } catch (error: any) {
      showAlert(
        tx('common.error'),
        getUserFacingErrorMessage(error) || tx('dashboard.updateStatusError'),
        'error',
      );
    } finally {
      isTogglingStatus.current = false;
      setTogglingOnline(false);
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

  const serviceType =
    incomingBooking?.serviceType || tx('dashboard.serviceFallback');
  const distanceLabel = formatDistanceKm(incomingBooking?.distanceKm);
  const showCta = isProfileIncomplete(profile);
  const showEmpty =
    !incomingBooking &&
    !partnerIncoming &&
    showRequestService &&
    activeJobsCount === 0 &&
    !assisting;

  useEffect(() => {
    if (!profile) return;
    const approved =
      String(profile.approvalStatus || '').toLowerCase() === 'approved' ||
      profile.verified === true;
    if (!approved || profile.showRequestService !== false) {
      setReceivePromptOpen(false);
      return;
    }
    void isReceiveRequestsPromptDismissed().then(dismissed => {
      if (!dismissed) setReceivePromptOpen(true);
    });
  }, [profile]);

  if (loading && !refreshing) {
    return (
      <View
        style={[
          styles.container,
          {backgroundColor: theme.background},
        ]}>
        <AppHeader navigation={navigation} />
        <View style={[styles.loaderContainer, {flex: 1}]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text
          style={[
            styles.loadingText,
            {color: theme.textSecondary, marginTop: 16},
          ]}>
          {tx('dashboard.loadingDashboard')}
        </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <AppHeader navigation={navigation} />
      <AlertModal
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertVisible(false)}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <AvailabilityCard
          online={isOnline}
          toggling={togglingOnline}
          onToggle={() => void handleToggleOnline()}
        />

        <ReceiveRequestsCard
          enabled={showRequestService}
          toggling={togglingRequests}
          onToggle={() => {
            const next = !showRequestService;
            setTogglingRequests(true);
            void setShowRequestService(next)
              .then(updated => {
                setShowRequest(updated.showRequestService !== false);
                toast.success(
                  next
                    ? tx('dashboard.receiveRequestsNowOn')
                    : tx('dashboard.receiveRequestsNowOff'),
                );
              })
              .catch(err => {
                showAlert(
                  tx('common.error'),
                  getUserFacingErrorMessage(err),
                  'error',
                );
              })
              .finally(() => setTogglingRequests(false));
          }}
        />

        <NotificationsSettingsCard
          theme={theme}
          prompt
          title={tx('notifications.settingsTitle') || tx('notifications.title')}
          body={tx('notifications.settingsBody') || tx('notifications.enableHint')}
          enableLabel={
            tx('notifications.settingsEnable') ||
            tx('notifications.enable') ||
            'Turn on notifications'
          }
          onLabel={tx('notifications.settingsOn')}
          offLabel={tx('notifications.settingsOff')}
          blockedLabel={tx('notifications.settingsBlocked')}
        />

        {incomingBooking ? (
          <IncomingRequestCard
            theme={theme}
            request={incomingBooking}
            secondsLeft={secondsLeft}
            serviceType={serviceType}
            distanceLabel={distanceLabel || undefined}
            onAccept={() => void acceptBooking()}
            onDecline={() => void rejectBooking()}
            acceptLabel={tx('dashboard.accept')}
            declineLabel={tx('dashboard.decline')}
            newRequestLabel={tx('home.newRequest') || tx('dashboard.newJob')}
            photosTitle={tx('dashboard.customerPhotos')}
          />
        ) : null}

        <IncomingWaitingList
          theme={theme}
          title={tx('home.moreNearbyTitle')}
          hint={tx('home.moreNearbyHint')}
          acceptLabel={tx('dashboard.accept')}
          declineLabel={tx('dashboard.decline')}
          busy={false}
          requests={waitingNearby.map((row: any) => ({
            id: String(
              row.serviceRequestId || row.id || row._id || row.consultationId || '',
            ),
            serviceType: row.serviceType || tx('dashboard.serviceFallback'),
            customerName: row.customerName || row.patientName || '',
          }))}
          onAccept={id => {
            const row = waitingNearby.find(
              (item: any) =>
                String(
                  item.serviceRequestId ||
                    item.id ||
                    item._id ||
                    item.consultationId ||
                    '',
                ) === id,
            );
            if (row) void acceptBooking(row);
          }}
          onDecline={id => {
            const row = waitingNearby.find(
              (item: any) =>
                String(
                  item.serviceRequestId ||
                    item.id ||
                    item._id ||
                    item.consultationId ||
                    '',
                ) === id,
            );
            if (row) void rejectBooking(row);
          }}
        />

        {partnerIncoming ? (
          <PartnerIncomingCard
            theme={theme}
            request={partnerIncoming}
            busy={collabBusy}
            title={tx('collab.incomingTitle')}
            lead={tx('collab.incomingLead', {
              name:
                partnerIncoming.requestingProviderName ||
                tx('collab.partnerFallback'),
            })}
            customerLabel={tx('jobDetail.customer')}
            acceptLabel={tx('collab.acceptRequest')}
            declineLabel={tx('collab.declineRequest')}
            onAccept={() => {
              setCollabBusy(true);
              void acceptPartnerRequest(partnerIncoming.id)
                .then(() => loadDashboardData())
                .catch(err =>
                  showAlert(
                    tx('common.error'),
                    getUserFacingErrorMessage(err),
                    'error',
                  ),
                )
                .finally(() => setCollabBusy(false));
            }}
            onDecline={() => {
              setCollabBusy(true);
              void rejectPartnerRequest(partnerIncoming.id)
                .then(() => loadDashboardData())
                .catch(err =>
                  showAlert(
                    tx('common.error'),
                    getUserFacingErrorMessage(err),
                    'error',
                  ),
                )
                .finally(() => setCollabBusy(false));
            }}
          />
        ) : null}

        {assisting ? (
          <AssistingCollaborationCard
            theme={theme}
            collab={assisting}
            title={tx('collab.assistingTitle')}
            lead={tx('collab.assistingLead', {
              name:
                assisting.requestingProviderName || tx('collab.partnerFallback'),
            })}
            customerLabel={tx('jobDetail.customer')}
            primaryLabel={tx('collab.primaryPartner')}
            contactLabel={tx('collab.contactPrimary')}
            directionsLabel={tx('jobDetail.directions')}
            completeLabel={tx('collab.completePortion')}
            onComplete={() => void loadDashboardData()}
          />
        ) : null}

        {/* Active Jobs — matches web ActiveServicesSection */}
        {activeJobsCount > 0 ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('Jobs')}
            activeOpacity={0.85}>
            <CrystalSurface
              primary={theme.primary}
              card={theme.card}
              isDark={isDarkMode}
              accent
              style={styles.activeJobsCard}
              contentStyle={styles.activeJobsInner}>
              <View style={{flex: 1, minWidth: 0}}>
                <Text style={[styles.activeJobsLabel, {color: theme.text}]}>
                  {tx('home.activeJobsRow', {count: activeJobsCount})}
                </Text>
                <Text
                  style={[
                    styles.activeJobsValue,
                    {color: theme.textSecondary},
                  ]}>
                  {tx('home.activeJobsHint')}
                </Text>
              </View>
              <Text
                style={{
                  color: theme.primary,
                  fontWeight: '700',
                  fontSize: 13,
                }}>
                {tx('home.openActive')}
              </Text>
            </CrystalSurface>
          </TouchableOpacity>
        ) : null}

        {showEmpty ? (
          <EmptyRequest
            theme={theme}
            online={isOnline}
            title={tx('home.emptyTitle')}
            body={tx('home.emptyOnline')}
          />
        ) : null}

        {showCta ? (
          <ProfileCta
            theme={theme}
            title={tx('home.ctaTitle')}
            body={tx('home.ctaBody')}
            action={tx('home.ctaAction')}
            onPress={() =>
              navigation.navigate('Settings', {screen: 'SettingsProfile'})
            }
          />
        ) : null}

        {!isOnline ? (
          <View
            style={[
              styles.infoBanner,
              {
                backgroundColor: isDarkMode
                  ? `${theme.warning}33`
                  : '#FFF3CD',
              },
            ]}>
            <Icon name="info" size={20} color={theme.warning} />
            <Text
              style={[
                styles.infoText,
                {color: isDarkMode ? theme.text : '#856404'},
              ]}>
              {tx('dashboard.goOnlineMessage')}
            </Text>
          </View>
        ) : null}
      </ScrollView>
      <ConfirmDialog
        visible={receivePromptOpen}
        type="info"
        title={tx('home.receiveRequestsPromptTitle')}
        message={tx('home.receiveRequestsPromptBody')}
        confirmText={tx('home.receiveRequestsStart')}
        cancelText={tx('home.receiveRequestsLater')}
        onConfirm={() => {
          setReceivePromptOpen(false);
          setTogglingRequests(true);
          void setShowRequestService(true)
            .then(updated => {
              setShowRequest(updated.showRequestService !== false);
              setProfile((prev: any) =>
                prev
                  ? {
                      ...prev,
                      showRequestService: updated.showRequestService !== false,
                    }
                  : prev,
              );
            })
            .catch(err =>
              showAlert(
                tx('common.error'),
                getUserFacingErrorMessage(err),
                'error',
              ),
            )
            .finally(() => setTogglingRequests(false));
        }}
        onCancel={() => {
          void dismissReceiveRequestsPrompt();
          setReceivePromptOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  loaderContainer: {justifyContent: 'center', alignItems: 'center'},
  loadingText: {fontSize: 16},
  scrollView: {flex: 1},
  scrollContent: {padding: 14, paddingBottom: 32, gap: 12},
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
  },
  acceptBtn: {
    flex: 1,
  },
  newJobQuickRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 4,
  },
  miniAction: {alignItems: 'center', gap: 4, padding: 8},
  miniActionText: {fontSize: 12, fontWeight: '600', color: '#555'},
  activeJobsCard: {
    marginBottom: 12,
  },
  activeJobsInner: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  activeJobsLabel: {fontSize: 15, fontWeight: '700'},
  activeJobsValue: {fontSize: 13, marginTop: 4, lineHeight: 18},
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
