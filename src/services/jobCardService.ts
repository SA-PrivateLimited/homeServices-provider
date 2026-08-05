/**
 * Job Card Service (Provider App)
 * Uses backend API for CRUD operations
 * Uses Firebase Realtime Database for real-time subscriptions (intentional)
 */

import database from '@react-native-firebase/database';
import storage from '@react-native-firebase/storage';
import RNFS from 'react-native-fs';
import fcmNotificationService from './fcmNotificationService';
import {generatePIN} from '../utils/pinGenerator';
import {jobCardsApi, CreateJobCardData} from './api/jobCardsApi';
import {providersApi} from './api/providersApi';
import {usersApi} from './api/usersApi';
import {PDFService} from './pdfService';
import {SOCKET_URL} from '../config/api';

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
  comments?: Array<{
    _id: string;
    role: 'admin' | 'provider' | 'customer';
    authorId?: string;
    authorName?: string;
    text: string;
    createdAt?: string | Date;
  }>;
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
    const {requireSessionUser, getUserId} = await import('./session');
    const sessionUser = await requireSessionUser();

    // Get provider details via JWT-backed API
    const provider = await providersApi.getMyProfile();
    const providerId = getUserId(provider) || '';

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
      providerName: provider.name || sessionUser.displayName || sessionUser.name || 'Provider',
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

    if (!jobCardId) {
      throw new Error('Job card created but no id returned');
    }

    // Side effects must not fail accept — API is source of truth.
    // Customer/admin push is sent by the backend accept endpoint (Mongo FCM tokens).
    void (async () => {
      try {
        await database()
          .ref(`jobCards/${jobCardId}`)
          .set({
            providerId: providerId,
            customerId: customerId,
            status: 'accepted',
            updatedAt: Date.now(),
          });
      } catch (rtdbError: any) {
        console.warn(
          'RTDB jobCards mirror skipped:',
          rtdbError?.message || rtdbError,
        );
      }
    })();

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
  const {requireSessionUser, getUserId} = await import('./session');
  const sessionUser = await requireSessionUser();

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
  const providerId = jobCardData.providerId || getUserId(sessionUser) || '';

  let taskPIN: string | undefined;
  if (status === 'in-progress') {
    taskPIN = generatePIN();
  }

  // API first — this is the source of truth
  try {
    const updateData: any = {status};
    if (taskPIN) {
      updateData.taskPIN = taskPIN;
      updateData.pinGeneratedAt = new Date();
    }
    await jobCardsApi.updateStatus(jobCardId, status, updateData);
  } catch (apiError: any) {
    console.error('Error updating job card status via API:', apiError);
    throw new Error(
      apiError?.message || 'Failed to update job card status',
    );
  }

  // Best-effort RTDB mirror (Firebase rules often deny provider writes)
  try {
    await database()
      .ref(`jobCards/${jobCardId}`)
      .update({
        status: status,
        updatedAt: Date.now(),
        providerId: providerId,
      });
  } catch (rtdbError: any) {
    console.warn(
      'RTDB jobCards status mirror skipped:',
      rtdbError?.message || rtdbError,
    );
  }

  // Best-effort customer notification
  if (customerId) {
    try {
      if (status === 'in-progress') {
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
        await fcmNotificationService.notifyCustomerServiceCompleted(
          customerId,
          providerName,
          serviceType,
          consultationId || '',
          customerPhone,
          problem,
        );
        try {
          const payload = {
            customerId,
            jobCardId,
            consultationId,
            providerName,
            serviceType,
          };
          const response = await fetch(`${SOCKET_URL}/emit-service-completed`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            console.warn('[PROVIDER] emit-service-completed non-OK');
          }
        } catch (websocketError: any) {
          console.warn(
            '[PROVIDER] emit-service-completed skipped:',
            websocketError?.message,
          );
        }
      }
    } catch (notificationError: any) {
      console.warn(
        '[PROVIDER] Status notification skipped:',
        notificationError?.message || notificationError,
      );
    }
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
 * Upload PDF to Firebase Storage and return URL
 */
const uploadPDFToStorage = async (pdfPath: string, jobCardId: string): Promise<string> => {
  try {
    const filename = `jobCards/${jobCardId}/jobCard_${Date.now()}.pdf`;
    const reference = storage().ref(filename);

    // Upload file
    await reference.putFile(pdfPath);

    // Get download URL
    const url = await reference.getDownloadURL();
    return url;
  } catch (error: any) {
    console.error('Error uploading PDF to storage:', error);
    throw new Error('Failed to upload job card PDF');
  }
};

/**
 * Verify PIN and complete task via API
 * Generates job card PDF and stores it
 */
export const verifyPINAndCompleteTask = async (
  jobCardId: string,
  enteredPIN: string,
  amount?: number,
  materials?: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    total?: number;
  }>,
  timeStarted?: Date,
  timeCompleted?: Date,
): Promise<void> => {
  try {
    const {requireSessionUser} = await import('./session');
    await requireSessionUser();

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

    // PIN is correct, generate job card PDF
    let pdfUrl: string | undefined;
    try {
      const jobCard: JobCard = {
        id: jobCardData._id || jobCardData.id,
        _id: jobCardData._id,
        ...jobCardData,
        createdAt: jobCardData.createdAt ? new Date(jobCardData.createdAt as string) : new Date(),
        updatedAt: jobCardData.updatedAt ? new Date(jobCardData.updatedAt as string) : new Date(),
      } as JobCard;

      const pdfPath = await PDFService.generateJobCardPDF(
        jobCard,
        amount,
        materials,
        timeStarted,
        timeCompleted,
      );

      if (pdfPath) {
        // Upload PDF to Firebase Storage
        pdfUrl = await uploadPDFToStorage(pdfPath, jobCardId);
        
        // Clean up local PDF file
        try {
          await RNFS.unlink(pdfPath);
        } catch (cleanupError) {
          console.warn('Failed to cleanup local PDF:', cleanupError);
        }
      }
    } catch (pdfError: any) {
      console.error('Error generating/uploading PDF:', pdfError);
      // Don't fail the completion if PDF generation fails
      // Just log the error and continue
    }

    // Complete the task via API with PDF URL
    await jobCardsApi.updateStatus(jobCardId, 'completed', {
      completedAt: timeCompleted || new Date(),
      serviceAmount: amount,
      materialsUsed: materials,
      jobCardPdfUrl: pdfUrl,
    });

    // Best-effort RTDB mirror
    try {
      await database()
        .ref(`jobCards/${jobCardId}`)
        .update({
          status: 'completed',
          updatedAt: Date.now(),
          completedAt: timeCompleted ? timeCompleted.getTime() : Date.now(),
        });
    } catch (rtdbError: any) {
      console.warn(
        'RTDB jobCards complete mirror skipped:',
        rtdbError?.message || rtdbError,
      );
    }

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
    const {requireSessionUser} = await import('./session');
    await requireSessionUser();

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

    // Best-effort RTDB mirror
    try {
      await database()
        .ref(`jobCards/${jobCardId}`)
        .update({
          status: 'cancelled',
          updatedAt: Date.now(),
        });
    } catch (rtdbError: any) {
      console.warn(
        'RTDB jobCards cancel mirror skipped:',
        rtdbError?.message || rtdbError,
      );
    }

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
        console.warn('Cancellation notification skipped:', notificationError);
      }
    }
  } catch (error: any) {
    console.error('Error cancelling task:', error);
    throw new Error(error.message || 'Failed to cancel task');
  }
};
