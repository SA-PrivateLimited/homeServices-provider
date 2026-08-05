/**
 * Push notifications — provider app.
 *
 * Client-side Firestore token lookups are disabled (permission-denied spam).
 * Accept / job status pushes are sent by the backend using MongoDB fcmToken
 * via Firebase Admin. Realtime updates use Socket.IO.
 *
 * These helpers remain as no-ops so existing call sites stay safe.
 */

export interface PushNotificationData {
  title: string;
  body: string;
  type: 'consultation' | 'prescription' | 'reminder' | 'admin' | 'chat' | 'service';
  consultationId?: string;
  prescriptionId?: string;
  status?: string;
  [key: string]: any;
}

class FCMNotificationService {
  /** @deprecated Prefer backend notifyUser — no Firestore from the app. */
  async sendToUser(
    _userId: string,
    _notification: PushNotificationData,
  ): Promise<void> {
    // Backend handles customer push after accept / job updates.
  }

  /** @deprecated Prefer backend notifyProvider */
  async sendToProvider(
    _providerId: string,
    _notification: PushNotificationData,
  ): Promise<void> {
    // no-op
  }

  /** @deprecated Prefer backend notifyAdmins */
  async sendToAdmins(_notification: PushNotificationData): Promise<void> {
    // no-op
  }

  async notifyCustomerServiceAccepted(
    _customerId: string,
    _providerName: string,
    _serviceType: string,
    _consultationId: string,
    _customerPhone?: string,
    _problem?: string,
  ): Promise<void> {
    // Backend accept endpoint sends this push.
  }

  async notifyCustomerServiceStarted(
    _customerId: string,
    _providerName: string,
    _serviceType: string,
    _consultationId: string,
    _jobCardId?: string,
    _pin?: string,
    _customerPhone?: string,
    _problem?: string,
  ): Promise<void> {
    // Backend job-card status update sends this push.
  }

  async notifyCustomerServiceCompleted(
    _customerId: string,
    _providerName: string,
    _serviceType: string,
    _consultationId: string,
  ): Promise<void> {
    // no-op — use backend when wired
  }

  async notifyCustomerServiceCancelled(
    _customerId: string,
    _providerName: string,
    _serviceType: string,
    _consultationId: string,
    _reason?: string,
  ): Promise<void> {
    // no-op — use backend when wired
  }
}

export default new FCMNotificationService();
