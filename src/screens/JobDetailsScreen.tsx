/**
 * Job details — mapped from partner-web JobDetailPage + JobDetailPage.css.
 */

import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Button, toast} from 'sapvt-ltd-app-packages';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {
  getJobCardById,
  updateJobCardStatus,
  verifyPINAndCompleteTask,
  cancelTaskWithReason,
  subscribeToJobCardStatus,
  type JobCard,
} from '../services/jobCardService';
import {getServiceCategoryByName} from '../services/api/serviceCategoriesApi';
import PINVerificationModal from '../components/PINVerificationModal';
import CancelTaskModal from '../components/CancelTaskModal';
import StartTaskModal from '../components/StartTaskModal';
import AlertModal from '../components/AlertModal';
import JobCardComments from '../components/JobCardComments';
import {JobHelpSection} from '../components/JobHelpSection';
import RequestPhotoGallery from '../components/RequestPhotoGallery';
import {jobCardsApi} from '../services/api/jobCardsApi';
import {getProductFeatures} from '../services/api/productFeaturesApi';
import {serviceRequestsApi} from '../services/api/serviceRequestsApi';
import useTranslation from '../hooks/useTranslation';
import {
  formatJobStatusDate,
  normalizeJobStatusKey,
} from '../utils/jobStatus';
import {jobCustomerDisplayName} from '../utils/partnerDisplayName';
import {
  formatFullAddressLine,
  hasAnyAddress,
} from '../utils/addressDisplay';
import {formatJobRequirements} from '../utils/formatJobRequirements';
import type {QuestionnaireItem} from '../services/api/serviceCategoriesApi';
import {canCallCustomerOnJob} from '../utils/customerContact';
import {getUserFacingErrorMessage} from '../utils/userFacingError';
import {serviceCategoryIcon} from '../utils/serviceIcons';
import type {RequestPhotoInput} from '../utils/requestPhotos';
import {
  openCall,
  openWhatsApp,
  openNavigate,
} from '../services/contactActions';
import {speakNavigateToCustomer} from '../services/voicePromptService';
import {jobDetailFromWeb as s} from '../fromWebCss/jobDetailFromWeb.styles';

function statusLabelKey(status: string): string {
  switch (normalizeJobStatusKey(status)) {
    case 'pending':
      return 'status.pending';
    case 'accepted':
      return 'status.accepted';
    case 'in-progress':
      return 'status.inProgress';
    case 'completed':
      return 'status.completed';
    case 'cancelled':
      return 'status.cancelled';
    case 'rejected':
      return 'status.rejected';
    case 'expired':
      return 'status.expired';
    default:
      return 'status.unknown';
  }
}

function statusExplainKey(status: string): string {
  switch (normalizeJobStatusKey(status)) {
    case 'pending':
      return 'status.explain.pending';
    case 'accepted':
      return 'status.explain.accepted';
    case 'in-progress':
      return 'status.explain.inProgress';
    case 'completed':
      return 'status.explain.completed';
    case 'cancelled':
      return 'status.explain.customerCancelled';
    default:
      return '';
  }
}

function statusHeroIcon(statusKey: string): string {
  switch (statusKey) {
    case 'pending':
      return 'schedule';
    case 'accepted':
      return 'check-circle';
    case 'in-progress':
      return 'build';
    case 'completed':
      return 'task-alt';
    case 'cancelled':
    case 'rejected':
      return 'cancel';
    default:
      return 'info';
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function JobDetailsScreen({navigation, route}: any) {
  const {jobCardId} = route.params;
  const {isDarkMode, colorTheme} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  const tx = (key: string, opts?: any) => String(t(key, opts));
  void colorTheme;

  const [jobCard, setJobCard] = useState<JobCard | null>(null);
  const [requestContact, setRequestContact] = useState<{
    canCallCustomer?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showPINModal, setShowPINModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireItem[]>([]);
  const [timeStarted, setTimeStarted] = useState<Date | undefined>(undefined);
  const [requestPhotos, setRequestPhotos] = useState<RequestPhotoInput[] | null>(
    null,
  );
  const [allowComments, setAllowComments] = useState(true);
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

  const loadJobCard = async (opts?: {silent?: boolean}) => {
    try {
      if (opts?.silent) setRefreshing(true);
      else setLoading(true);
      const job = await getJobCardById(jobCardId);
      setJobCard(job);

      const requestId = job?.consultationId || job?.bookingId;
      if (requestId) {
        try {
          const request = await serviceRequestsApi.getById(requestId);
          setRequestPhotos(request?.photos || null);
          setRequestContact((request as any)?.contact || null);
        } catch {
          setRequestPhotos(null);
        }
      } else {
        setRequestPhotos(null);
      }

      if (job?.serviceType) {
        try {
          const category = await getServiceCategoryByName(job.serviceType);
          setQuestionnaire(category?.questionnaire || []);
        } catch {
          setQuestionnaire([]);
        }
      }
    } catch (error) {
      console.error('Error loading job card:', error);
      showAlert(tx('common.error'), tx('jobDetail.loading'), 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadJobCard();
    void getProductFeatures().then(features => {
      setAllowComments(features.allowJobCardComments);
    });
    const unsubscribe = subscribeToJobCardStatus(jobCardId, status => {
      setJobCard(prev => (prev ? {...prev, status} : null));
    });
    return () => unsubscribe();
  }, [jobCardId]);

  const handleStartTask = async () => {
    if (!jobCard) return;
    try {
      setUpdating(true);
      setShowStartModal(false);
      setTimeStarted(new Date());
      await updateJobCardStatus(jobCardId, 'in-progress');
      const updatedJob = await getJobCardById(jobCardId);
      if (updatedJob) setJobCard(updatedJob);
      toast.success(tx('jobDetail.startedToast'));
    } catch (error: any) {
      toast.error(
        getUserFacingErrorMessage(error) || tx('jobDetail.startedToast'),
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleCompleteTask = async (
    pin: string,
    amount?: number,
    materials?: Array<{
      description: string;
      quantity?: number;
      unitPrice?: number;
      total?: number;
    }>,
    started?: Date,
    completed?: Date,
    completionPhotos?: Array<{key: string; url: string}>,
  ) => {
    await verifyPINAndCompleteTask(
      jobCardId,
      pin,
      amount,
      materials,
      started,
      completed,
      completionPhotos,
    );
    const updatedJob = await getJobCardById(jobCardId);
    if (updatedJob) setJobCard(updatedJob);
    setShowPINModal(false);
    setTimeStarted(undefined);
    toast.success(tx('jobDetail.completedToast'));
  };

  const handleCancelTask = async (reason: string) => {
    await cancelTaskWithReason(jobCardId, reason);
    const updatedJob = await getJobCardById(jobCardId);
    if (updatedJob) setJobCard(updatedJob);
    setShowCancelModal(false);
    toast.success(tx('jobDetail.cancelledToast'));
  };

  const handleCallCustomer = () => {
    openCall(jobCard?.customerPhone).catch(() => {
      showAlert(tx('common.error'), tx('jobDetail.addressUnavailable'), 'warning');
    });
  };

  const handleWhatsAppCustomer = () => {
    openWhatsApp(jobCard?.customerPhone).catch(() => {
      showAlert(tx('common.error'), tx('jobDetail.addressUnavailable'), 'warning');
    });
  };

  const handleNavigateCustomer = async () => {
    const addr = jobCard?.customerAddress;
    try {
      await speakNavigateToCustomer();
      await openNavigate({
        latitude: addr?.latitude,
        longitude: addr?.longitude,
        address: addr?.address,
      });
    } catch {
      showAlert(
        tx('common.error'),
        tx('jobDetail.addressUnavailable'),
        'warning',
      );
    }
  };

  const statusKey = normalizeJobStatusKey(jobCard?.status);
  const requirements = useMemo(
    () =>
      formatJobRequirements(
        jobCard?.questionnaireAnswers,
        questionnaire,
        jobCard?.serviceType,
      ),
    [jobCard?.questionnaireAnswers, jobCard?.serviceType, questionnaire],
  );

  if (loading) {
    return (
      <View style={[s.page, s.center, {backgroundColor: theme.background}]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[s.loadingText, {color: theme.textSecondary}]}>
          {tx('jobDetail.loading')}
        </Text>
      </View>
    );
  }

  if (!jobCard) {
    return (
      <View style={[s.page, s.center, {backgroundColor: theme.background}]}>
        <Text style={{color: theme.text}}>{tx('jobs.emptyTitle')}</Text>
        <Button
          variant="ghost"
          title={tx('jobDetail.backToJobs')}
          onPress={() => navigation.goBack()}
        />
      </View>
    );
  }

  const customerName = jobCustomerDisplayName(
    jobCard.customerName,
    tx('jobs.unnamedCustomer'),
  );
  const photoUrl = String(
    (jobCard as {customerProfileImage?: string}).customerProfileImage || '',
  ).trim();
  const addressLine = formatFullAddressLine(jobCard.customerAddress);
  const hasAddress = hasAnyAddress(jobCard.customerAddress);
  const problemText = String(jobCard.problem || '').trim();
  const dateLine = formatJobStatusDate(
    jobCard.status,
    jobCard.updatedAt || jobCard.createdAt,
  );
  const canCall = canCallCustomerOnJob({
    status: jobCard.status,
    customerPhone: jobCard.customerPhone,
    contact: requestContact || jobCard.contact || undefined,
  });
  const actionable = ['pending', 'accepted', 'in-progress'].includes(statusKey);
  const showHelp = actionable;
  const explainKey = statusExplainKey(jobCard.status);
  const serviceIconName = serviceCategoryIcon(
    null,
    jobCard.serviceType,
  ).replace(/_/g, '-');

  const heroTint =
    statusKey === 'in-progress'
      ? theme.secondary
      : statusKey === 'pending'
        ? theme.warning
        : statusKey === 'cancelled' || statusKey === 'rejected'
          ? theme.error
          : theme.primary;
  const heroBg = `${heroTint}12`;
  const heroBorder = `${heroTint}47`;

  return (
    <>
      <AlertModal
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertVisible(false)}
      />

      <ScrollView
        style={[s.page, {backgroundColor: theme.background}]}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}>
        {/* Status hero */}
        <View
          style={[
            s.hero,
            {
              backgroundColor: isDarkMode ? theme.card : heroBg,
              borderColor: heroBorder,
            },
          ]}>
          <View style={[s.heroIcon, {backgroundColor: `${heroTint}24`}]}>
            <Icon
              name={statusHeroIcon(statusKey)}
              size={22}
              color={heroTint}
            />
          </View>
          <View style={s.heroCopy}>
            <View style={s.heroTitleRow}>
              <Text style={[s.heroTitle, {color: theme.text}]}>
                {tx(statusLabelKey(jobCard.status))}
              </Text>
              <TouchableOpacity
                style={[
                  s.heroRefresh,
                  {backgroundColor: `${theme.primary}1A`},
                ]}
                disabled={refreshing}
                onPress={() => void loadJobCard({silent: true})}
                accessibilityLabel={tx('jobDetail.refreshStatus')}>
                {refreshing ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Icon name="refresh" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            </View>
            {statusKey === 'pending' && explainKey ? (
              <Text style={[s.heroMessage, {color: theme.textSecondary}]}>
                {tx(explainKey)}
              </Text>
            ) : null}
            {dateLine ? (
              <Text style={[s.heroDate, {color: theme.text}]}>{dateLine}</Text>
            ) : null}
            {statusKey === 'cancelled' && jobCard.cancellationReason ? (
              <Text style={[s.heroReason, {color: theme.textSecondary}]}>
                {tx('jobDetail.reason', {reason: jobCard.cancellationReason})}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Customer information */}
        <View
          style={[
            s.card,
            {backgroundColor: theme.card, borderColor: theme.border},
          ]}>
          <Text style={[s.sectionTitle, {color: theme.text}]}>
            {tx('jobDetail.customerInfo')}
          </Text>
          <View style={s.customerRow}>
            <View style={[s.avatar, {backgroundColor: theme.primary}]}>
              {photoUrl ? (
                <Image source={{uri: photoUrl}} style={s.avatar} />
              ) : (
                <Text style={s.avatarText}>{initials(customerName)}</Text>
              )}
            </View>
            <Text style={[s.customerName, {color: theme.text}]}>
              {customerName}
            </Text>
          </View>
          {statusKey === 'pending' && !canCall ? (
            <Text style={[s.hint, {color: theme.textSecondary}]}>
              {tx('contact.afterAcceptCustomer')}
            </Text>
          ) : null}
        </View>

        {/* This work */}
        <View
          style={[
            s.card,
            {backgroundColor: theme.card, borderColor: theme.border},
          ]}>
          <Text style={[s.sectionTitle, {color: theme.text}]}>
            {tx('jobDetail.jobInfo')}
          </Text>

          <View style={[s.field, {marginTop: 0}]}>
            <Text style={[s.fieldLabel, {color: theme.textSecondary}]}>
              {tx('jobDetail.service')}
            </Text>
            <View style={s.serviceRow}>
              <View
                style={[
                  s.serviceIcon,
                  {backgroundColor: `${theme.primary}1F`},
                ]}>
                <Icon
                  name={serviceIconName || 'handyman'}
                  size={20}
                  color={theme.primaryDark}
                />
              </View>
              <Text style={[s.serviceName, {color: theme.text}]}>
                {jobCard.serviceType || tx('jobs.service')}
              </Text>
            </View>
          </View>

          <View style={s.field}>
            <Text style={[s.fieldLabel, {color: theme.textSecondary}]}>
              {tx('jobs.problemLabel')}
            </Text>
            <Text
              style={[
                s.fieldValue,
                {
                  color: problemText ? theme.text : theme.textSecondary,
                  fontWeight: problemText ? '600' : '500',
                },
              ]}>
              {problemText || tx('jobs.problemMissing')}
            </Text>
          </View>

          <View style={s.field}>
            <View style={s.fieldLabelRow}>
              <Icon name="location-on" size={14} color={theme.textSecondary} />
              <Text style={[s.fieldLabel, {color: theme.textSecondary, marginBottom: 0}]}>
                {tx('jobs.serviceAddressLabel')}
              </Text>
            </View>
            <Text
              style={[
                s.fieldValue,
                {
                  color: hasAddress ? theme.text : theme.textSecondary,
                  fontWeight: hasAddress ? '600' : '500',
                },
              ]}>
              {hasAddress ? addressLine : tx('jobs.addressMissing')}
            </Text>
            {actionable && hasAddress ? (
              <Button
                variant="secondary"
                block
                title={tx('jobDetail.viewDirections')}
                onPress={() => void handleNavigateCustomer()}
                style={s.directionsBtn}
              />
            ) : null}
          </View>

          <RequestPhotoGallery
            photos={requestPhotos}
            theme={theme}
            title={tx('request.photos')}
          />
          <RequestPhotoGallery
            photos={jobCard.completionPhotos}
            theme={theme}
            title={tx('jobDetail.completionPhotosOptional')}
          />

          {allowComments ? (
          <JobCardComments
            comments={jobCard.comments || []}
            theme={{...theme, background: theme.background}}
            canComment={
              statusKey === 'accepted' ||
              statusKey === 'in-progress' ||
              statusKey === 'completed'
            }
            title={tx('comments.title')}
            placeholder={tx('comments.placeholder')}
            emptyText={tx('comments.empty')}
            postLabel={tx('comments.send')}
            onSubmit={async text => {
              const updated = await jobCardsApi.addComment(jobCardId, text);
              setJobCard(prev =>
                prev
                  ? {...prev, comments: (updated as any).comments || []}
                  : prev,
              );
            }}
          />
          ) : null}
        </View>

        {requirements.length ? (
          <View
            style={[
              s.card,
              {backgroundColor: theme.card, borderColor: theme.border},
            ]}>
            <Text style={[s.sectionTitle, {color: theme.text}]}>
              {tx('jobDetail.requirements')}
            </Text>
            <View style={s.reqList}>
              {requirements.map(row => (
                <View key={`${row.label}-${row.value}`} style={s.reqRow}>
                  <Text style={[s.reqLabel, {color: theme.textSecondary}]}>
                    {row.label}
                  </Text>
                  <Text style={[s.reqValue, {color: theme.text}]}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Actions rail */}
        <View style={s.rail}>
          {canCall && jobCard.customerPhone ? (
            <View style={s.railRow}>
              <View style={{flex: 1}}>
                <Button
                  variant="primary"
                  block
                  title={tx('contact.callCustomer')}
                  onPress={handleCallCustomer}
                />
              </View>
              {actionable ? (
                <View style={{flex: 1}}>
                  <Button
                    variant="secondary"
                    block
                    title={tx('jobDetail.whatsapp')}
                    onPress={handleWhatsAppCustomer}
                  />
                </View>
              ) : null}
            </View>
          ) : statusKey === 'pending' ? (
            <Text style={[s.hint, {color: theme.textSecondary, marginTop: 0}]}>
              {tx('contact.afterAcceptCustomer')}
            </Text>
          ) : null}

          {statusKey === 'accepted' ? (
            <Button
              variant="primary"
              block
              title={tx('jobDetail.startService')}
              onPress={() => setShowStartModal(true)}
              disabled={updating}
              loading={updating}
            />
          ) : null}

          {statusKey === 'in-progress' ? (
            <Button
              variant="primary"
              block
              title={tx('jobDetail.markCompleted')}
              onPress={() => setShowPINModal(true)}
              disabled={updating}
            />
          ) : null}

          {showHelp ? (
            <JobHelpSection theme={theme} job={jobCard} canHelp />
          ) : null}

          {actionable ? (
            <Button
              variant="danger"
              block
              title={tx('jobDetail.cancelTask')}
              onPress={() => setShowCancelModal(true)}
              disabled={updating}
            />
          ) : (
            <Button
              variant="ghost"
              block
              title={tx('jobDetail.backToJobs')}
              onPress={() => navigation.goBack()}
            />
          )}
        </View>
      </ScrollView>

      <StartTaskModal
        visible={showStartModal}
        onConfirm={handleStartTask}
        onCancel={() => setShowStartModal(false)}
        loading={updating}
      />
      <PINVerificationModal
        visible={showPINModal}
        jobCardId={jobCardId}
        onVerify={handleCompleteTask}
        onCancel={() => {
          setShowPINModal(false);
          setTimeStarted(undefined);
        }}
        timeStarted={timeStarted}
      />
      <CancelTaskModal
        visible={showCancelModal}
        onCancel={handleCancelTask}
        onClose={() => setShowCancelModal(false)}
      />
    </>
  );
}
