/**
 * Job Details Screen
 * Provider app - View and manage job card details
 * Replaces DoctorConsultationDetailScreen
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import auth from '@react-native-firebase/auth';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {getJobCardById, updateJobCardStatus, verifyPINAndCompleteTask, cancelTaskWithReason, subscribeToJobCardStatus, JobCard} from '../services/jobCardService';
import {getServiceCategoryByName} from '../services/api/serviceCategoriesApi';
import PINVerificationModal from '../components/PINVerificationModal';
import CancelTaskModal from '../components/CancelTaskModal';
import {
  openCall,
  openWhatsApp,
  openNavigate,
} from '../services/contactActions';
import {speakNavigateToCustomer} from '../services/voicePromptService';
import StartTaskModal from '../components/StartTaskModal';
import AlertModal from '../components/AlertModal';
import Toast from '../components/Toast';
import JobCardComments from '../components/JobCardComments';
import {jobCardsApi} from '../services/api/jobCardsApi';
import useTranslation from '../hooks/useTranslation';

export default function JobDetailsScreen({navigation, route}: any) {
  const {jobCardId} = route.params;
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const currentUser = auth().currentUser;
  const {t} = useTranslation();

  const [jobCard, setJobCard] = useState<JobCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showPINModal, setShowPINModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [questionnaireQuestions, setQuestionnaireQuestions] = useState<Record<string, string>>({});
  const [timeStarted, setTimeStarted] = useState<Date | undefined>(undefined);

  // Alert modal state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({title: '', message: '', type: 'info'});

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setAlertConfig({title, message, type});
    setAlertVisible(true);
  };

  useEffect(() => {
    loadJobCard();
    
    // Subscribe to real-time status updates
    const unsubscribe = subscribeToJobCardStatus(
      jobCardId,
      (status, updatedAt) => {
        setJobCard(prev => prev ? {...prev, status} : null);
      }
    );
    
    return () => unsubscribe();
  }, [jobCardId]);

  const loadJobCard = async () => {
    try {
      setLoading(true);
      const job = await getJobCardById(jobCardId);
      setJobCard(job);
      
      // Fetch questionnaire questions if available
      if (job?.questionnaireAnswers && job?.serviceType) {
        await loadQuestionnaireQuestions(job.serviceType);
      }
    } catch (error) {
      console.error('Error loading job card:', error);
      showAlert(t('common.error'), t('jobDetails.failedToLoad'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadQuestionnaireQuestions = async (serviceType: string) => {
    try {
      // Fetch service category to get questionnaire questions via API
      const category = await getServiceCategoryByName(serviceType);

      if (category && category.questionnaire) {
        // Create a map of questionId -> question text
        const questionsMap: Record<string, string> = {};
        category.questionnaire.forEach((q: any) => {
          if (q.id && q.question) {
            questionsMap[q.id] = q.question;
          }
        });

        setQuestionnaireQuestions(questionsMap);
      }
    } catch (error) {
      console.error('Error loading questionnaire questions:', error);
      // Continue without questions - not critical
    }
  };

  const handleStartTask = async () => {
    if (!jobCard) return;

    try {
      setUpdating(true);
      setShowStartModal(false);
      const startTime = new Date();
      setTimeStarted(startTime);
      await updateJobCardStatus(jobCardId, 'in-progress');
      // Reload job card to get updated data (including PIN if generated)
      const updatedJob = await getJobCardById(jobCardId);
      if (updatedJob) {
        setJobCard(updatedJob);
      }
      setToastMessage(t('jobDetails.serviceStarted'));
      setShowToast(true);
    } catch (error: any) {
      setToastMessage(error.message || t('jobDetails.failedToStart'));
      setShowToast(true);
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
    timeStarted?: Date,
    timeCompleted?: Date,
  ) => {
    try {
      await verifyPINAndCompleteTask(jobCardId, pin, amount, materials, timeStarted, timeCompleted);
      // Reload job card
      const updatedJob = await getJobCardById(jobCardId);
      if (updatedJob) {
        setJobCard(updatedJob);
      }
      setShowPINModal(false);
      setTimeStarted(undefined);
      setToastMessage(t('jobDetails.taskCompleted'));
      setShowToast(true);
    } catch (error: any) {
      throw error; // Let the modal handle the error
    }
  };

  const handleCancelTask = async (reason: string) => {
    try {
      await cancelTaskWithReason(jobCardId, reason);
      // Reload job card
      const updatedJob = await getJobCardById(jobCardId);
      if (updatedJob) {
        setJobCard(updatedJob);
      }
      setShowCancelModal(false);
      setToastMessage(t('jobDetails.taskCancelled'));
      setShowToast(true);
    } catch (error: any) {
      throw error; // Let the modal handle the error
    }
  };

  const handleCallCustomer = () => {
    openCall(jobCard?.customerPhone).catch(() => {
      showAlert(t('common.error'), t('jobDetails.phoneNotAvailable'), 'warning');
    });
  };

  const handleWhatsAppCustomer = () => {
    openWhatsApp(jobCard?.customerPhone).catch(() => {
      showAlert(t('common.error'), t('jobDetails.phoneNotAvailable'), 'warning');
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
        t('common.error'),
        t('jobDetails.navigateUnavailable') || 'Location not available',
        'warning',
      );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FF9500';
      case 'accepted':
        return '#007AFF';
      case 'in-progress':
        return '#34C759';
      case 'completed':
        return '#34C759';
      case 'cancelled':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const formatDate = (date: Date | any) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : date.toDate();
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loaderContainer, {backgroundColor: theme.background}]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, {color: theme.textSecondary, marginTop: 16}]}>
          {t('jobDetails.loadingJobDetails')}
        </Text>
      </View>
    );
  }

  if (!jobCard) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <Text style={[styles.errorText, {color: theme.text}]}>
          {t('jobDetails.jobNotFound')}
        </Text>
      </View>
    );
  }

  return (
    <>
      {/* Custom Alert Modal */}
      <AlertModal
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertVisible(false)}
      />

      <ScrollView
        style={[styles.container, {backgroundColor: theme.background}]}
        showsVerticalScrollIndicator={false}>
        {/* Status Card */}
      <View style={[styles.statusCard, {backgroundColor: theme.card}]}>
        <View style={styles.statusHeader}>
          <View
            style={[
              styles.statusIndicator,
              {backgroundColor: getStatusColor(jobCard.status)},
            ]}
          />
          <View style={styles.statusTextContainer}>
            <Text style={[styles.statusText, {color: theme.text}]}>
              {jobCard.status.charAt(0).toUpperCase() + jobCard.status.slice(1)}
            </Text>
            <Text style={[styles.statusSubtext, {color: theme.textSecondary}]}>
              {jobCard.status === 'pending'
                ? t('jobDetails.waitingForAction')
                : jobCard.status === 'accepted'
                ? t('jobDetails.jobAccepted')
                : jobCard.status === 'in-progress'
                ? t('jobDetails.serviceInProgress')
                : jobCard.status === 'completed'
                ? t('jobDetails.serviceCompleted')
                : t('jobDetails.jobCancelled')}
            </Text>
          </View>
        </View>
      </View>

      {/* Customer Details */}
      <View style={[styles.card, {backgroundColor: theme.card}]}>
        <Text style={[styles.cardTitle, {color: theme.text}]}>
          {t('jobDetails.customerDetails')}
        </Text>
        <View style={styles.customerInfo}>
          <View style={styles.customerAvatar}>
            <Text style={styles.customerInitial}>
              {jobCard.customerName?.charAt(0).toUpperCase() || 'C'}
            </Text>
          </View>
          <View style={styles.customerDetails}>
            <Text style={[styles.customerName, {color: theme.text}]}>
              {jobCard.customerName}
            </Text>
            {jobCard.customerPhone && (
              <TouchableOpacity
                style={styles.phoneButton}
                onPress={handleCallCustomer}>
                <Icon name="phone" size={16} color={theme.primary} />
                <Text style={[styles.phoneText, {color: theme.primary}]}>
                  {jobCard.customerPhone}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Service Details */}
      <View style={[styles.card, {backgroundColor: theme.card}]}>
        <Text style={[styles.cardTitle, {color: theme.text}]}>
          {t('jobDetails.serviceDetails')}
        </Text>
        <View style={styles.detailRow}>
          <Icon name="build" size={20} color={theme.primary} />
          <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
            {t('jobDetails.serviceType')}
          </Text>
          <Text style={[styles.detailValue, {color: theme.text}]}>
            {jobCard.serviceType}
          </Text>
        </View>
        {jobCard.problem && (
          <View style={styles.detailRow}>
            <Icon name="description" size={20} color={theme.primary} />
            <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
              {t('jobDetails.problem')}
            </Text>
            <Text style={[styles.detailValue, {color: theme.text}]}>
              {jobCard.problem}
            </Text>
          </View>
        )}
        {jobCard.scheduledTime && (
          <View style={styles.detailRow}>
            <Icon name="schedule" size={20} color={theme.primary} />
            <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
              {t('jobDetails.scheduled')}
            </Text>
            <Text style={[styles.detailValue, {color: theme.text}]}>
              {formatDate(jobCard.scheduledTime)}
            </Text>
          </View>
        )}
      </View>

      {/* Questionnaire Answers */}
      {jobCard.questionnaireAnswers && Object.keys(jobCard.questionnaireAnswers).length > 0 && (
        <View style={[styles.card, {backgroundColor: theme.card}]}>
          <View style={styles.questionnaireHeader}>
            <Icon name="quiz" size={24} color={theme.primary} />
            <Text style={[styles.cardTitle, {color: theme.text, marginLeft: 8}]}>
              {t('jobDetails.serviceRequirements')}
            </Text>
          </View>
          <View style={styles.questionnaireContainer}>
            {Object.entries(jobCard.questionnaireAnswers).map(([questionId, answer], index) => {
              const questionNumber = index + 1;
              const questionText = questionnaireQuestions[questionId] || `${t('jobDetails.question')} ${questionNumber}`;
              
              // Format answer based on type
              let formattedAnswer: string;
              if (typeof answer === 'boolean') {
                formattedAnswer = answer ? t('jobDetails.yes') : t('jobDetails.no');
              } else if (Array.isArray(answer)) {
                formattedAnswer = answer.join(', ');
              } else if (answer === null || answer === undefined || answer === '') {
                formattedAnswer = t('jobDetails.notProvided');
              } else {
                formattedAnswer = String(answer);
              }
              
              return (
                <View key={questionId} style={styles.questionnaireItem}>
                  <View style={styles.questionNumberBadge}>
                    <Text style={[styles.questionNumber, {color: theme.primary}]}>
                      {questionNumber}
                    </Text>
                  </View>
                  <View style={styles.questionnaireContent}>
                    <Text style={[styles.questionnaireQuestion, {color: theme.text}]}>
                      {questionText}
                    </Text>
                    <Text style={[styles.questionnaireAnswer, {color: theme.textSecondary}]}>
                      {formattedAnswer}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
          <View style={[styles.questionnaireNote, {backgroundColor: theme.primary + '10'}]}>
            <Icon name="info-outline" size={16} color={theme.primary} />
            <Text style={[styles.questionnaireNoteText, {color: theme.primary}]}>
              {t('jobDetails.customerProvidedDetails', {
                count: Object.keys(jobCard.questionnaireAnswers).length,
                plural: Object.keys(jobCard.questionnaireAnswers).length !== 1 ? 's' : ''
              })}
            </Text>
          </View>
        </View>
      )}

      {/* Customer Address */}
      {jobCard.customerAddress && (
        <View style={[styles.card, {backgroundColor: theme.card}]}>
          <Text style={[styles.cardTitle, {color: theme.text}]}>
            {t('jobDetails.serviceAddress')}
          </Text>
          <View style={styles.addressContainer}>
            <Icon name="location-on" size={20} color={theme.primary} />
            <View style={styles.addressText}>
              <Text style={[styles.addressLine, {color: theme.text}]}>
                {jobCard.customerAddress.address}
              </Text>
              {jobCard.customerAddress.pincode && (
                <Text style={[styles.addressDetails, {color: theme.textSecondary}]}>
                  {t('jobDetails.pincode')} {jobCard.customerAddress.pincode}
                </Text>
              )}
              {jobCard.customerAddress.city && (
                <Text style={[styles.addressDetails, {color: theme.textSecondary}]}>
                  {jobCard.customerAddress.city}
                  {jobCard.customerAddress.state && `, ${jobCard.customerAddress.state}`}
                </Text>
              )}
            </View>
          </View>
        </View>
      )}

      <JobCardComments
        comments={(jobCard as any).comments || []}
        theme={theme}
        canComment={
          jobCard.status === 'accepted' ||
          jobCard.status === 'in-progress' ||
          jobCard.status === 'completed'
        }
        title={String(t('jobDetails.comments') || 'Comments')}
        placeholder={String(
          t('jobDetails.commentPlaceholder') || 'Write a comment…',
        )}
        emptyText={String(t('jobDetails.noComments') || 'No comments yet')}
        postLabel={String(t('jobDetails.postComment') || 'Post')}
        onSubmit={async text => {
          const updated = await jobCardsApi.addComment(jobCardId, text);
          setJobCard(prev =>
            prev
              ? {...prev, comments: (updated as any).comments || []}
              : prev,
          );
        }}
      />

      {/* One-handed contact / navigate */}
      {(jobCard.status === 'accepted' ||
        jobCard.status === 'in-progress' ||
        jobCard.status === 'pending') && (
        <View style={[styles.thumbActions, {backgroundColor: theme.card}]}>
          <TouchableOpacity
            style={styles.thumbBtn}
            onPress={handleCallCustomer}>
            <View style={[styles.thumbIcon, {backgroundColor: '#34C75920'}]}>
              <Icon name="call" size={26} color="#34C759" />
            </View>
            <Text style={[styles.thumbLabel, {color: theme.text}]}>
              {t('dashboard.call')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.thumbBtn}
            onPress={handleWhatsAppCustomer}>
            <View style={[styles.thumbIcon, {backgroundColor: '#25D36620'}]}>
              <Icon name="chat" size={26} color="#25D366" />
            </View>
            <Text style={[styles.thumbLabel, {color: theme.text}]}>
              {t('dashboard.whatsapp')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.thumbBtn}
            onPress={() => void handleNavigateCustomer()}>
            <View style={[styles.thumbIcon, {backgroundColor: '#007AFF20'}]}>
              <Icon name="navigation" size={26} color="#007AFF" />
            </View>
            <Text style={[styles.thumbLabel, {color: theme.text}]}>
              {t('dashboard.navigate')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Actions */}
      {jobCard.status !== 'completed' && jobCard.status !== 'cancelled' && (
        <View style={styles.actionsContainer}>
          {jobCard.status === 'accepted' && (
            <TouchableOpacity
              style={[styles.actionButton, {backgroundColor: theme.primary}]}
              onPress={() => setShowStartModal(true)}
              disabled={updating}>
              <Icon name="play-arrow" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>{t('jobDetails.startService')}</Text>
            </TouchableOpacity>
          )}

          {jobCard.status === 'in-progress' && (
            <TouchableOpacity
              style={[styles.actionButton, {backgroundColor: '#34C759'}]}
              onPress={() => setShowPINModal(true)}
              disabled={updating}>
              <Icon name="check-circle" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>{t('jobDetails.markAsCompleted')}</Text>
            </TouchableOpacity>
          )}

          {/* Cancel Task Button */}
          {(jobCard.status === 'pending' || jobCard.status === 'accepted' || jobCard.status === 'in-progress') && (
            <TouchableOpacity
              style={[styles.actionButton, {backgroundColor: '#FF3B30'}]}
              onPress={() => setShowCancelModal(true)}
              disabled={updating}>
              <Icon name="cancel" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>{t('jobDetails.cancelTask')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Start Task Modal */}
      <StartTaskModal
        visible={showStartModal}
        onConfirm={handleStartTask}
        onCancel={() => setShowStartModal(false)}
        loading={updating}
      />

      {/* PIN Verification Modal */}
      <PINVerificationModal
        visible={showPINModal}
        onVerify={handleCompleteTask}
        onCancel={() => {
          setShowPINModal(false);
          setTimeStarted(undefined);
        }}
        timeStarted={timeStarted}
      />

      {/* Cancel Task Modal */}
      <CancelTaskModal
        visible={showCancelModal}
        onCancel={handleCancelTask}
        onClose={() => setShowCancelModal(false)}
      />

        {/* Toast Notification */}
        <Toast
          visible={showToast}
          message={toastMessage}
          type="success"
          duration={3000}
          onHide={() => setShowToast(false)}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  statusCard: {
    padding: 16,
    margin: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerInitial: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  phoneText: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
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
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  addressText: {
    flex: 1,
  },
  addressLine: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  addressDetails: {
    fontSize: 14,
  },
  actionsContainer: {
    padding: 16,
    gap: 12,
  },
  thumbActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  thumbBtn: {
    alignItems: 'center',
    gap: 6,
    minWidth: 88,
  },
  thumbIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  questionnaireHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionnaireContainer: {
    gap: 12,
  },
  questionnaireItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
  },
  questionNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  questionnaireContent: {
    flex: 1,
  },
  questionnaireQuestion: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  questionnaireAnswer: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  questionnaireNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  questionnaireNoteText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
});

