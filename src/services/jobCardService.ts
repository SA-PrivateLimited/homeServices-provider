/**
 * Job Card Service (Provider App)
 * Uses backend API for CRUD operations
 * Uses Firebase Realtime Database for real-time subscriptions (intentional)
 */

import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import fcmNotificationService from './fcmNotificationService';
import {generatePIN} from '../utils/pinGenerator';
import {jobCardsApi, CreateJobCardData} from './api/jobCardsApi';
import {providersApi} from './api/providersApi';
import {usersApi} from './api/usersApi';

export interface JobCard {
  id?: string;
  _id?: string;
  providerId: string;
  providerName: string;
  providerAddress: {
    type: 'home' | 'office';
    address: string;
    city?: string;
    state?: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  };
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: {
    address: string;
    city?: string;
    state?: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  };
  serviceType: string;
  problem?: string;
  questionnaireAnswers?: Record<string, any>;
  consultationId?: string;
  bookingId?: string;
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
  taskPIN?: string;
  pinGeneratedAt?: Date | string;
  scheduledTime?: Date | string;
  cancellationReason?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Create a job card when provider accepts a booking
 * Uses backend API for data operations
 */
export const createJobCard = async (
  bookingData: any,
  providerAddress: {
    type: 'home' | 'office';
    address: string;
    city?: string;
    state?: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  },
): Promise<string> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Get provider details via API - support both phone auth (UID) and Google auth (email)
    let provider: any = null;
    let providerId: string = '';

    // Try to find by email first (Google auth)
    if (currentUser.email) {
      provider = await providersApi.getByEmail(currentUser.email);
      if (provider) {
        providerId = provider._id || provider.id || '';
      }
    }

    // If not found by email, try by UID (phone auth)
    if (!provider) {
      provider = await providersApi.getByUid(currentUser.uid);
      if (provider) {
        providerId = provider._id || provider.id || currentUser.uid;
      }
    }

    if (!provider || !providerId) {
      throw new Error('Provider profile not found. Please complete your profile setup.');
    }

    // Get customer address from booking data or user profile via API
    let customerAddress: any = {
      address: '',
      pincode: '',
    };

    if (bookingData.customerAddress) {
      customerAddress = bookingData.customerAddress;
    } else if (bookingData.patientAddress) {
      customerAddress = bookingData.patientAddress;
    } else if (bookingData.patientId || bookingData.customerId) {
      // Try to get from user profile via API
      const customerId = bookingData.patientId || bookingData.customerId;
      try {
        const customerData = await usersApi.getById(customerId);
        if (customerData?.location) {
          customerAddress = {
            address: customerData.location.address || '',
            city: customerData.location.city,
            state: customerData.location.state,
            pincode: customerData.location.pincode || '',
            latitude: customerData.location.latitude,
            longitude: customerData.location.longitude,
          };
        }
      } catch (error) {
        console.warn('Could not fetch customer data from API:', error);
      }
    }

    // Get customer name and phone
    const customerName = bookingData.patientName || bookingData.customerName || 'Customer';
    const customerPhone = bookingData.patientPhone || bookingData.customerPhone || '';

    // Get problem description
    const problem = bookingData.problem ||
                    bookingData.symptoms ||
                    bookingData.notes ||
                    bookingData.description ||
                    bookingData.issue ||
                    '';

    // Get questionnaire answers if available
    let questionnaireAnswers = bookingData.questionnaireAnswers || undefined;

    // Get customerId - try multiple sources
    let customerId = bookingData.patientId || bookingData.customerId || '';

    // Note: Consultation-related code removed - consultations are no longer used
    // customerId should be provided in bookingData

    // Validate customerId is present
    if (!customerId) {
      console.error('Cannot create job card: customerId is missing');
      console.error('Booking data keys:', Object.keys(bookingData));
      throw new Error('Customer ID is required to create job card');
    }

    // Create job card via API
    const jobCardData: CreateJobCardData = {
      providerId,
      providerName: provider.name || currentUser.displayName || 'Provider',
      providerAddress,
      customerId,
      customerName,
      customerPhone,
      customerAddress: customerAddress as any,
      serviceType: provider.specialization || provider.specialty || 'Service',
      problem: problem || undefined,
      consultationId: bookingData.consultationId,
      bookingId: bookingData.bookingId || bookingData.id,
      scheduledTime: bookingData.scheduledTime
        ? (bookingData.scheduledTime instanceof Date
            ? bookingData.scheduledTime
            : new Date(bookingData.scheduledTime))
        : undefined,
      status: 'accepted',
    };

    const createdJobCard = await jobCardsApi.create(jobCardData);
    const jobCardId = createdJobCard._id || createdJobCard.id || '';

    // Also create status entry in Realtime Database for real-time updates
    await database()
      .ref(`jobCards/${jobCardId}`)
      .set({
        providerId: providerId,
        customerId: customerId,
        status: 'accepted',
        updatedAt: Date.now(),
      });

    // Send notification to customer
    try {
      console.log('Sending acceptance notification to customer:', {
        customerId,
        providerName: jobCardData.providerName,
        serviceType: jobCardData.serviceType,
        consultationId: jobCardData.consultationId || 'N/A',
      });

      await fcmNotificationService.notifyCustomerServiceAccepted(
        customerId,
        jobCardData.providerName,
        jobCardData.serviceType,
        jobCardData.consultationId || '',
        customerPhone,
        problem,
      );
      console.log('Notification sent to customer from createJobCard');
    } catch (notificationError: any) {
      console.error('Failed to send notification from createJobCard:', {
        error: notificationError.message,
        customerId,
      });
    }

    // Send notification to admins
    try {
      await fcmNotificationService.sendToAdmins({
        title: 'Service Request Accepted',
        body: `${jobCardData.providerName} has accepted a ${jobCardData.serviceType} service request from ${customerName}`,
        type: 'service',
        jobCardId: jobCardId,
        consultationId: jobCardData.consultationId || '',
        status: 'accepted',
      });
      console.log('Notification sent to admins from createJobCard');
    } catch (adminNotificationError: any) {
      console.error('Failed to send admin notification from createJobCard:', {
        error: adminNotificationError.message,
      });
    }

    return jobCardId;
  } catch (error: any) {
    console.error('Error creating job card:', error);
    throw new Error(error.message || 'Failed to create job card');
  }
};

/**
 * Get job card by ID via API
 */
export const getJobCardById = async (jobCardId: string): Promise<JobCard | null> => {
  try {
    const jobCard = await jobCardsApi.getById(jobCardId);
    if (!jobCard) {
      return null;
    }
    return {
      id: jobCard._id || jobCard.id,
      ...jobCard,
      createdAt: jobCard.createdAt ? new Date(jobCard.createdAt as string) : new Date(),
      updatedAt: jobCard.updatedAt ? new Date(jobCard.updatedAt as string) : new Date(),
      scheduledTime: jobCard.scheduledTime ? new Date(jobCard.scheduledTime as string) : undefined,
    } as JobCard;
  } catch (error) {
    console.error('Error fetching job card:', error);
    return null;
  }
};

/**
 * Get all job cards for a provider via API
 */
export const fetchJobCardsByProvider = async (providerId: string): Promise<JobCard[]> => {
  return getProviderJobCards(providerId);
};

export const getProviderJobCards = async (providerId: string): Promise<JobCard[]> => {
  try {
    const jobCards = await jobCardsApi.getProviderJobCards();
    return jobCards.map(jobCard => ({
      id: jobCard._id || jobCard.id,
      ...jobCard,
      createdAt: jobCard.createdAt ? new Date(jobCard.createdAt as string) : new Date(),
      updatedAt: jobCard.updatedAt ? new Date(jobCard.updatedAt as string) : new Date(),
      scheduledTime: jobCard.scheduledTime ? new Date(jobCard.scheduledTime as string) : undefined,
    })) as JobCard[];
  } catch (error: any) {
    console.error('Error fetching job cards:', error);
    throw new Error(`Failed to fetch job cards: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Update job card status via API
 * Also updates Realtime Database for real-time sync
 */
export const updateJobCardStatus = async (
  jobCardId: string,
  status: JobCard['status'],
): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Get job card data via API to get customer info
    const jobCardData = await jobCardsApi.getById(jobCardId);

    if (!jobCardData) {
      throw new Error('Job card not found');
    }

    let customerId = jobCardData.customerId;
    const consultationId = jobCardData.consultationId || jobCardData.bookingId;
    const providerName = jobCardData.providerName || 'Provider';
    const serviceType = jobCardData.serviceType || 'service';
    const customerPhone = jobCardData.customerPhone;
    const problem = jobCardData.problem;
    const providerId = jobCardData.providerId || currentUser.uid;

    // Note: Consultation-related code removed - consultationId is kept for backward compatibility only

    // Generate PIN when starting task (status changes to 'in-progress')
    let taskPIN: string | undefined;
    if (status === 'in-progress') {
      taskPIN = generatePIN();
      console.log('Generated PIN for task:', taskPIN);
    }

    // Update via API
    const updateData: any = {status};
    if (taskPIN) {
      updateData.taskPIN = taskPIN;
    }

    await jobCardsApi.updateStatus(jobCardId, status, updateData);

    // Note: Consultation status updates removed - consultations are no longer used

    // Update in Realtime Database for real-time synchronization
    await database()
      .ref(`jobCards/${jobCardId}`)
      .update({
        status: status,
        updatedAt: Date.now(),
        providerId: providerId,
      });

    // Send notification to customer based on status
    console.log('updateJobCardStatus - Status update:', {
      status,
      customerId,
      consultationId,
      jobCardId,
      providerName,
      serviceType,
    });

    if (customerId) {
      try {
        if (status === 'in-progress') {
          console.log('Status is in-progress, sending FCM notification with PIN');
          await fcmNotificationService.notifyCustomerServiceStarted(
            customerId,
            providerName,
            serviceType,
            consultationId || '',
            jobCardId,
            taskPIN,
            customerPhone,
            problem,
          );
        } else if (status === 'completed') {
          console.log('Status is completed, sending FCM notification');
          await fcmNotificationService.notifyCustomerServiceCompleted(
            customerId,
            providerName,
            serviceType,
            consultationId || '',
            customerPhone,
            problem,
          );

          // Emit WebSocket event to customer room for real-time review prompt
          try {
            const SOCKET_URL = __DEV__
              ? 'http://10.0.2.2:3001'
              : process.env.SOCKET_URL || 'https://your-production-server.com';

            const payload = {
              customerId,
              jobCardId,
              consultationId,
              providerName,
              serviceType,
            };

            console.log('[PROVIDER] Emitting WebSocket service-completed event:', {
              ...payload,
              socketUrl: SOCKET_URL,
            });

            const response = await fetch(`${SOCKET_URL}/emit-service-completed`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (response.ok && result.success) {
              console.log('[PROVIDER] WebSocket service-completed event emitted successfully');
            } else {
              console.error('[PROVIDER] Failed to emit WebSocket event:', result.error);
            }
          } catch (websocketError: any) {
            console.error('[PROVIDER] Error emitting WebSocket event:', websocketError.message);
          }
        }
      } catch (notificationError: any) {
        console.error('[PROVIDER] Error sending status notification:', notificationError.message);
      }
    } else {
      console.warn('[PROVIDER] Cannot send notification - missing customerId');
    }
  } catch (error) {
    console.error('Error updating job card status:', error);
    throw new Error('Failed to update job card status');
  }
};

/**
 * Subscribe to real-time job card status updates
 * Uses Firebase Realtime Database for real-time sync (intentional)
 * Returns unsubscribe function
 */
export const subscribeToJobCardStatus = (
  jobCardId: string,
  callback: (status: JobCard['status'], updatedAt: number) => void,
): (() => void) => {
  const jobCardRef = database().ref(`jobCards/${jobCardId}`);

  const onStatusChange = jobCardRef.on('value', (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      if (data && data.status) {
        callback(data.status, data.updatedAt || Date.now());
      }
    }
  });

  return () => {
    jobCardRef.off('value', onStatusChange);
  };
};

/**
 * Subscribe to all job card status updates for a provider
 * Uses Firebase Realtime Database for real-time sync (intentional)
 * Returns unsubscribe function
 */
export const subscribeToProviderJobCardStatuses = (
  providerId: string,
  callback: (jobCardId: string, status: JobCard['status'], updatedAt: number) => void,
): (() => void) => {
  const providerJobCardsRef = database().ref('jobCards');

  const onStatusChange = providerJobCardsRef.on('child_changed', (snapshot) => {
    const jobCardId = snapshot.key;
    const jobCardData = snapshot.val();

    if (jobCardData && jobCardData.providerId === providerId) {
      const status = jobCardData.status;
      const updatedAt = jobCardData.updatedAt || Date.now();
      callback(jobCardId || '', status, updatedAt);
    }
  });

  const onJobCardAdded = providerJobCardsRef.on('child_added', (snapshot) => {
    const jobCardId = snapshot.key;
    const jobCardData = snapshot.val();

    if (jobCardData && jobCardData.providerId === providerId) {
      const status = jobCardData.status;
      const updatedAt = jobCardData.updatedAt || Date.now();
      callback(jobCardId || '', status, updatedAt);
    }
  });

  return () => {
    providerJobCardsRef.off('child_changed', onStatusChange);
    providerJobCardsRef.off('child_added', onJobCardAdded);
  };
};

/**
 * Subscribe to all job card status updates for a customer
 * Uses Firebase Realtime Database for real-time sync (intentional)
 * Returns unsubscribe function
 */
export const subscribeToCustomerJobCardStatuses = (
  customerId: string,
  callback: (jobCardId: string, status: JobCard['status'], updatedAt: number) => void,
): (() => void) => {
  const customerJobCardsRef = database().ref('jobCards');

  const onStatusChange = customerJobCardsRef.on('child_changed', (snapshot) => {
    const jobCardId = snapshot.key;
    const statusData = snapshot.child('status').val();

    if (statusData && statusData.customerId === customerId) {
      callback(jobCardId || '', statusData.status, statusData.updatedAt);
    }
  });

  const onJobCardAdded = customerJobCardsRef.on('child_added', (snapshot) => {
    const jobCardId = snapshot.key;
    const statusData = snapshot.child('status').val();

    if (statusData && statusData.customerId === customerId) {
      callback(jobCardId || '', statusData.status, statusData.updatedAt);
    }
  });

  return () => {
    customerJobCardsRef.off('child_changed', onStatusChange);
    customerJobCardsRef.off('child_added', onJobCardAdded);
  };
};

/**
 * Verify PIN and complete task via API
 */
export const verifyPINAndCompleteTask = async (
  jobCardId: string,
  enteredPIN: string,
): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Get job card to verify PIN via API
    const jobCardData = await jobCardsApi.getById(jobCardId);

    if (!jobCardData) {
      throw new Error('Job card not found');
    }

    const storedPIN = jobCardData.taskPIN;

    if (!storedPIN) {
      throw new Error('No PIN found for this task. Please start the task first.');
    }

    // Verify PIN
    if (enteredPIN !== storedPIN) {
      throw new Error('Invalid PIN. Please enter the correct PIN sent to the customer.');
    }

    // PIN is correct, complete the task via API
    await updateJobCardStatus(jobCardId, 'completed');

    // Clear PIN by updating via API (PIN will be cleared by backend)
    // The backend should handle clearing the PIN after successful completion
  } catch (error: any) {
    console.error('Error verifying PIN and completing task:', error);
    throw new Error(error.message || 'Failed to verify PIN and complete task');
  }
};

/**
 * Cancel task with reason via API
 */
export const cancelTaskWithReason = async (
  jobCardId: string,
  cancellationReason: string,
): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Get job card data via API
    const jobCardData = await jobCardsApi.getById(jobCardId);

    if (!jobCardData) {
      throw new Error('Job card not found');
    }

    const customerId = jobCardData.customerId;
    const consultationId = jobCardData.consultationId || jobCardData.bookingId;
    const providerName = jobCardData.providerName || 'Provider';
    const serviceType = jobCardData.serviceType || 'service';
    const customerPhone = jobCardData.customerPhone;
    const problem = jobCardData.problem;

    // Update job card status to cancelled via API
    await jobCardsApi.updateStatus(jobCardId, 'cancelled', {
      cancellationReason: cancellationReason.trim(),
    });

    // Note: Consultation status updates removed - consultations are no longer used

    // Update in Realtime Database
    await database()
      .ref(`jobCards/${jobCardId}`)
      .update({
        status: 'cancelled',
        updatedAt: Date.now(),
      });

    // Send notification to customer
    if (customerId) {
      try {
        await fcmNotificationService.notifyCustomerServiceCancelled(
          customerId,
          providerName,
          serviceType,
          consultationId || '',
          cancellationReason.trim(),
          customerPhone,
          problem,
        );
      } catch (notificationError) {
        console.error('Error sending cancellation notification:', notificationError);
      }
    }
  } catch (error: any) {
    console.error('Error cancelling task:', error);
    throw new Error(error.message || 'Failed to cancel task');
  }
};
