import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {RtcTokenBuilder, RtcRole} from "agora-access-token";
import nodemailer from "nodemailer";

// Initialize Firebase Admin
admin.initializeApp();

// Email transporter configuration
// Uses Gmail SMTP or custom SMTP from environment variables
const getEmailTransporter = () => {
  const emailConfig = functions.config().email || {};
  
  // Use Gmail SMTP if configured, otherwise use custom SMTP
  if (emailConfig.gmail_user && emailConfig.gmail_password) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailConfig.gmail_user,
        pass: emailConfig.gmail_password,
      },
    });
  } else if (emailConfig.smtp_host) {
    return nodemailer.createTransport({
      host: emailConfig.smtp_host,
      port: emailConfig.smtp_port || 587,
      secure: emailConfig.smtp_secure === 'true',
      auth: {
        user: emailConfig.smtp_user,
        pass: emailConfig.smtp_password,
      },
    });
  }
  
  // Fallback: Use Firebase project email (requires Firebase project email to be configured)
  throw new Error("Email configuration not found. Please configure email settings in Firebase Functions config.");
};

/**
 * Generate Agora RTC Token for video calls
 *
 * Call this function when starting a video consultation
 *
 * Request: { channelName: string, uid: string }
 * Response: { token: string, appId: string }
 */
export const generateAgoraToken = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated to generate Agora token"
    );
  }

  const {channelName, uid} = data;

  if (!channelName || !uid) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing required parameters: channelName and uid"
    );
  }

  try {
    // Get Agora credentials from environment
    const appId = functions.config().agora?.app_id;
    const appCertificate = functions.config().agora?.app_certificate;

    if (!appId || !appCertificate) {
      throw new Error("Agora credentials not configured");
    }

    // Token expires in 1 hour
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Generate token
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      parseInt(uid),
      RtcRole.PUBLISHER,
      privilegeExpiredTs
    );

    console.log(`Generated Agora token for channel: ${channelName}, uid: ${uid}`);

    return {
      token,
      appId,
    };
  } catch (error) {
    console.error("Error generating Agora token:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to generate Agora token"
    );
  }
});

/**
 * Send FCM notification when consultation is booked
 *
 * Triggered when a new document is created in 'consultations' collection
 */
export const onConsultationBooked = functions.firestore
  .document("consultations/{consultationId}")
  .onCreate(async (snap, context) => {
    const consultation = snap.data();
    const {patientId, doctorName, scheduledTime} = consultation;

    try {
      // Get patient's FCM token
      const userDoc = await admin.firestore()
        .collection("users")
        .doc(patientId)
        .get();

      const fcmToken = userDoc.data()?.fcmToken;

      if (!fcmToken) {
        console.log(`No FCM token for user ${patientId}`);
        return null;
      }

      // Send booking confirmation notification
      const message = {
        notification: {
          title: "Booking Confirmed",
          body: `Your consultation with Dr. ${doctorName} is confirmed for ${new Date(scheduledTime.toDate()).toLocaleString()}`,
        },
        data: {
          consultationId: context.params.consultationId,
          type: "booking-confirmed",
        },
        token: fcmToken,
      };

      await admin.messaging().send(message);
      console.log(`Sent booking confirmation to user ${patientId}`);

      return null;
    } catch (error) {
      console.error("Error sending booking notification:", error);
      return null;
    }
  });

/**
 * Schedule appointment reminder
 *
 * Triggered 1 hour before consultation
 * Uses Firebase Cloud Tasks or Pub/Sub for scheduling
 */
export const sendConsultationReminder = functions.pubsub
  .schedule("every 10 minutes")
  .onRun(async (context) => {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    try {
      // Find consultations starting in the next 10 minutes
      const consultationsSnapshot = await admin.firestore()
        .collection("consultations")
        .where("status", "==", "scheduled")
        .where("scheduledTime", ">=", now)
        .where("scheduledTime", "<=", oneHourLater)
        .get();

      const promises = consultationsSnapshot.docs.map(async (doc) => {
        const consultation = doc.data();
        const {patientId, doctorName} = consultation;

        // Check if reminder already sent
        const reminderSent = consultation.reminderSent || false;
        if (reminderSent) {
          return;
        }

        // Get patient's FCM token
        const userDoc = await admin.firestore()
          .collection("users")
          .doc(patientId)
          .get();

        const fcmToken = userDoc.data()?.fcmToken;

        if (!fcmToken) {
          console.log(`No FCM token for user ${patientId}`);
          return;
        }

        // Send reminder
        const message = {
          notification: {
            title: "Consultation Reminder",
            body: `Your consultation with Dr. ${doctorName} starts soon`,
          },
          data: {
            consultationId: doc.id,
            type: "reminder",
          },
          token: fcmToken,
        };

        await admin.messaging().send(message);

        // Mark reminder as sent
        await doc.ref.update({reminderSent: true});

        console.log(`Sent reminder for consultation ${doc.id}`);
      });

      await Promise.all(promises);
      return null;
    } catch (error) {
      console.error("Error sending reminders:", error);
      return null;
    }
  });

/**
 * Update doctor statistics when consultation is completed
 */
export const updateDoctorStats = functions.firestore
  .document("consultations/{consultationId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Check if status changed to 'completed'
    if (before.status !== "completed" && after.status === "completed") {
      const {doctorId} = after;

      try {
        const doctorRef = admin.firestore()
          .collection("doctors")
          .doc(doctorId);

        // Increment total consultations
        await doctorRef.update({
          totalConsultations: admin.firestore.FieldValue.increment(1),
        });

        console.log(`Updated stats for doctor ${doctorId}`);
        return null;
      } catch (error) {
        console.error("Error updating doctor stats:", error);
        return null;
      }
    }

    return null;
  });

/**
 * Send notification when doctor joins the call
 */
export const notifyDoctorJoined = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const {consultationId} = data;

  try {
    // Get consultation
    const consultationDoc = await admin.firestore()
      .collection("consultations")
      .doc(consultationId)
      .get();

    if (!consultationDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Consultation not found"
      );
    }

    const consultation = consultationDoc.data();
    const {patientId, doctorName} = consultation!;

    // Get patient's FCM token
    const userDoc = await admin.firestore()
      .collection("users")
      .doc(patientId)
      .get();

    const fcmToken = userDoc.data()?.fcmToken;

    if (!fcmToken) {
      console.log(`No FCM token for user ${patientId}`);
      return {success: false};
    }

    // Send notification
    const message = {
      notification: {
        title: "Doctor Joined",
        body: `Dr. ${doctorName} has joined the consultation`,
      },
      data: {
        consultationId,
        type: "doctor-joined",
      },
      token: fcmToken,
    };

    await admin.messaging().send(message);
    console.log(`Sent doctor joined notification for consultation ${consultationId}`);

    return {success: true};
  } catch (error) {
    console.error("Error sending doctor joined notification:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to send notification"
    );
  }
});

/**
 * Send notification when prescription is added
 */
export const onPrescriptionCreated = functions.firestore
  .document("prescriptions/{prescriptionId}")
  .onCreate(async (snap, context) => {
    const prescription = snap.data();
    const {patientId, doctorName, consultationId} = prescription;

    try {
      // Get patient's FCM token
      const userDoc = await admin.firestore()
        .collection("users")
        .doc(patientId)
        .get();

      const fcmToken = userDoc.data()?.fcmToken;

      if (!fcmToken) {
        console.log(`No FCM token for user ${patientId}`);
        return null;
      }

      // Send prescription notification
      const message = {
        notification: {
          title: "Prescription Received",
          body: `You have received a new prescription from Dr. ${doctorName}`,
        },
        data: {
          consultationId,
          prescriptionId: context.params.prescriptionId,
          type: "prescription-received",
        },
        token: fcmToken,
      };

      await admin.messaging().send(message);
      console.log(`Sent prescription notification to user ${patientId}`);

      return null;
    } catch (error) {
      console.error("Error sending prescription notification:", error);
      return null;
    }
  });

/**
 * Send push notification via FCM (Callable Function)
 * 
 * ⚠️ RECOMMENDED: Use Firestore triggers instead (onServiceRequestUpdate, etc.)
 * This callable function requires auth and won't work when app is killed.
 * 
 * Call this function from your React Native app:
 * const sendNotification = functions().httpsCallable('sendPushNotification');
 * await sendNotification({
 *   token: 'FCM_TOKEN',
 *   notification: { title: 'Title', body: 'Body' },
 *   data: { type: 'consultation', consultationId: '123' }
 * });
 */
export const sendPushNotification = functions.https.onCall(async (data, context) => {
  // Auth is optional - allow unauthenticated calls for background/killed app scenarios
  // For production, use Firestore triggers instead
  
  const {token, notification, data: notificationData, android} = data;

  if (!token || !notification) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Token and notification are required."
    );
  }

  try {
    // Determine channel and sound based on notification type
    const notificationType = notificationData?.type || 'consultation';
    const isServiceRequest = notificationType === 'service';
    const channelId = isServiceRequest ? 'service_requests' : 'consultation-updates';
    const soundName = isServiceRequest ? 'hooter.wav' : 'default';

    const message = {
      token: token,
      notification: {
        title: notification.title || "HomeServices",
        body: notification.body || "",
      },
      data: {
        ...notificationData,
        // Convert all data values to strings (FCM requirement)
        ...Object.keys(notificationData || {}).reduce((acc: any, key) => {
          acc[key] = String(notificationData[key] || "");
          return acc;
        }, {}),
      },
      android: {
        priority: "high" as const,
        notification: {
          channelId: android?.channelId || channelId,
          sound: android?.sound || soundName,
          priority: "high" as const,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: soundName,
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log("Successfully sent message:", response);
    return {success: true, messageId: response};
  } catch (error: any) {
    // Handle invalid token - should be cleaned up
    if (error.code === 'messaging/registration-token-not-registered' ||
        error.code === 'messaging/invalid-registration-token') {
      console.warn(`Invalid FCM token: ${token.substring(0, 20)}...`);
      // Note: Token cleanup should be handled separately
    }
    
    console.error("Error sending message:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to send notification.",
      error
    );
  }
});

/**
 * 🔥 RECOMMENDED: Firestore Trigger for Service Request Status Changes
 * 
 * Automatically sends FCM notifications when service request status changes.
 * Works even when app is killed/backgrounded.
 * 
 * Triggered when:
 * - Service request is accepted (status: 'accepted')
 * - Service request is started (status: 'in-progress')
 * - Service request is completed (status: 'completed')
 */
export const onServiceRequestUpdate = functions.firestore
  .document("consultations/{consultationId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // Only trigger on status changes
    if (before.status === after.status) {
      return null;
    }

    const consultationId = context.params.consultationId;
    const newStatus = after.status;
    const customerId = after.customerId || after.patientId;
    const providerId = after.providerId || after.doctorId;
    const serviceType = after.serviceType || 'service';
    const providerName = after.providerName || after.doctorName || 'Provider';

    try {
      // Get customer's FCM token
      const customerDoc = await admin.firestore()
        .collection("users")
        .doc(customerId)
        .get();

      if (!customerDoc.exists) {
        console.log(`Customer ${customerId} not found`);
        return null;
      }

      const fcmToken = customerDoc.data()?.fcmToken;
      if (!fcmToken) {
        console.log(`No FCM token for customer ${customerId}`);
        return null;
      }

      // Determine notification content based on status
      let notificationTitle = '';
      let notificationBody = '';
      
      switch (newStatus) {
        case 'accepted':
          notificationTitle = 'Service Request Accepted';
          notificationBody = `${providerName} has accepted your ${serviceType} service request`;
          break;
        case 'in-progress':
          notificationTitle = 'Service Started';
          notificationBody = `${providerName} has started your ${serviceType} service`;
          break;
        case 'completed':
          notificationTitle = 'Service Completed';
          notificationBody = `${providerName} has completed your ${serviceType} service`;
          break;
        default:
          // Don't send notification for other status changes
          return null;
      }

      // Send notification with hooter sound for service requests
      const message = {
        token: fcmToken,
        notification: {
          title: notificationTitle,
          body: notificationBody,
        },
        data: {
          type: 'service',
          consultationId: consultationId,
          status: newStatus,
          serviceType: serviceType,
        },
        android: {
          priority: "high" as const,
          notification: {
            channelId: "service_requests",
            sound: "hooter.wav", // Hooter sound for service notifications
            priority: "high" as const,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "hooter.wav",
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log(`Sent ${newStatus} notification to customer ${customerId}:`, response);
      
      return null;
    } catch (error: any) {
      // Handle invalid token - clean up
      if (error.code === 'messaging/registration-token-not-registered' ||
          error.code === 'messaging/invalid-registration-token') {
        console.warn(`Invalid FCM token for customer ${customerId}, cleaning up...`);
        // Clean up invalid token
        try {
          await admin.firestore()
            .collection("users")
            .doc(customerId)
            .update({
              fcmToken: admin.firestore.FieldValue.delete(),
            });
        } catch (cleanupError) {
          console.error("Error cleaning up invalid token:", cleanupError);
        }
      }
      
      console.error("Error sending service status notification:", error);
      return null;
    }
  });

/**
 * Send Email OTP for login
 * 
 * Generates a 6-digit OTP code and sends it via email
 * OTP expires in 10 minutes
 * 
 * Request: { email: string }
 * Response: { success: true, expiresAt: timestamp }
 */
export const sendEmailOTP = functions.https.onCall(async (data, context) => {
  const {email} = data;

  if (!email || typeof email !== 'string') {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Email is required"
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid email format"
    );
  }

  try {
    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP in Firestore with expiration
    const otpRef = admin.firestore()
      .collection("emailOTPs")
      .doc(email.toLowerCase());

    await otpRef.set({
      code: otpCode,
      email: email.toLowerCase(),
      expiresAt: admin.firestore.Timestamp.fromMillis(expiresAt),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      attempts: 0,
    });

    // Send email with OTP
    const transporter = getEmailTransporter();
    const mailOptions = {
      from: functions.config().email?.from || 'noreply@homeservices.com',
      to: email,
      subject: 'Your HomeServices Login Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4A90E2;">HomeServices Login Code</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h1 style="color: #4A90E2; margin: 0; font-size: 32px; letter-spacing: 4px;">${otpCode}</h1>
          </div>
          <p style="color: #666;">This code will expire in 10 minutes.</p>
          <p style="color: #666;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
      text: `Your HomeServices login code is: ${otpCode}. This code will expire in 10 minutes.`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email OTP sent to ${email}`);

    return {
      success: true,
      expiresAt: expiresAt,
    };
  } catch (error: any) {
    console.error("Error sending email OTP:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to send email OTP. Please try again."
    );
  }
});

/**
 * Verify Email OTP for login
 * 
 * Verifies the OTP code and creates/signs in the user
 * 
 * Request: { email: string, otpCode: string, name?: string }
 * Response: { success: true, customToken: string }
 */
export const verifyEmailOTP = functions.https.onCall(async (data, context) => {
  const {email, otpCode, name} = data;

  if (!email || !otpCode) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Email and OTP code are required"
    );
  }

  try {
    const emailLower = email.toLowerCase();
    
    // Get stored OTP
    const otpDoc = await admin.firestore()
      .collection("emailOTPs")
      .doc(emailLower)
      .get();

    if (!otpDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "OTP not found. Please request a new code."
      );
    }

    const otpData = otpDoc.data()!;
    const storedCode = otpData.code;
    const expiresAt = otpData.expiresAt.toMillis();
    const attempts = otpData.attempts || 0;

    // Check if OTP expired
    if (Date.now() > expiresAt) {
      await otpDoc.ref.delete();
      throw new functions.https.HttpsError(
        "deadline-exceeded",
        "OTP code has expired. Please request a new one."
      );
    }

    // Check attempts (max 5 attempts)
    if (attempts >= 5) {
      await otpDoc.ref.delete();
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "Too many failed attempts. Please request a new code."
      );
    }

    // Verify OTP code
    if (otpCode !== storedCode) {
      // Increment attempts
      await otpDoc.ref.update({
        attempts: admin.firestore.FieldValue.increment(1),
      });
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid OTP code. Please try again."
      );
    }

    // OTP verified - delete it
    await otpDoc.ref.delete();

    // Check if user exists
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(emailLower);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Create new user
        userRecord = await admin.auth().createUser({
          email: emailLower,
          emailVerified: true,
          displayName: name || 'User',
        });
      } else {
        throw error;
      }
    }

    // Create custom token for client-side sign-in
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    console.log(`Email OTP verified for ${email}`);

    return {
      success: true,
      customToken: customToken,
      uid: userRecord.uid,
    };
  } catch (error: any) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    console.error("Error verifying email OTP:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to verify email OTP. Please try again."
    );
  }
});

/**
 * 🔔 Notify provider when approval status changes
 *
 * Triggered when admin approves or rejects provider profile
 * Sends notification to provider with approval status
 */
export const onProviderApprovalStatusChange = functions.firestore
  .document("providers/{providerId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const providerId = context.params.providerId;

    // Check if approval status changed
    if (before.approvalStatus !== after.approvalStatus) {
      const fcmToken = after.fcmToken;

      if (!fcmToken) {
        console.log("No FCM token found for provider:", providerId);
        return null;
      }

      let notification;

      if (after.approvalStatus === "approved") {
        notification = {
          title: "🎉 Profile Approved!",
          body: "Your profile has been approved! You can now accept service requests.",
        };
      } else if (after.approvalStatus === "rejected") {
        const reason = after.rejectionReason || "Please contact support for details.";
        notification = {
          title: "Profile Update Required",
          body: `Your profile was not approved. Reason: ${reason}`,
        };
      } else {
        return null; // pending or other status
      }

      const message = {
        notification,
        data: {
          type: "provider_approval",
          approvalStatus: after.approvalStatus,
          providerId,
        },
        token: fcmToken,
        android: {
          priority: "high" as const,
          notification: {
            channelId: "consultation-updates",
            priority: "high" as const,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      };

      try {
        await admin.messaging().send(message);
        console.log(`Approval notification sent to provider ${providerId}`);
      } catch (error) {
        console.error("Error sending approval notification:", error);
      }
    }

    return null;
  });

/**
 * 🔔 Notify provider when service is cancelled by customer
 *
 * Triggered when customer cancels service after assignment
 * Sends notification to provider with cancellation reason
 */
export const onServiceCancellation = functions.firestore
  .document("consultations/{consultationId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const consultationId = context.params.consultationId;

    // Check if status changed to cancelled
    if (before.status !== "cancelled" && after.status === "cancelled") {
      const providerId = after.providerId || after.doctorId;
      const customerName = after.customerName || "Customer";
      const serviceType = after.serviceType || "Service";
      const cancellationReason = after.cancellationReason || "No reason provided";
      const cancelledBy = after.cancelledBy || "customer";

      if (!providerId) {
        console.log("No provider assigned to consultation:", consultationId);
        return null;
      }

      // Get provider's FCM token
      const providerDoc = await admin.firestore().collection("providers").doc(providerId).get();
      const providerData = providerDoc.data();

      if (!providerData || !providerData.fcmToken) {
        console.log("No FCM token found for provider:", providerId);
        return null;
      }

      const notification = {
        title: "❌ Service Cancelled",
        body: `${customerName} cancelled ${serviceType} request. Reason: ${cancellationReason}`,
      };

      const message = {
        notification,
        data: {
          type: "service_cancelled",
          consultationId,
          cancellationReason,
          cancelledBy,
          serviceType,
          customerName,
        },
        token: providerData.fcmToken,
        android: {
          priority: "high" as const,
          notification: {
            channelId: "consultation-updates",
            priority: "high" as const,
            sound: "default",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      };

      try {
        await admin.messaging().send(message);
        console.log(`Cancellation notification sent to provider ${providerId}`);
      } catch (error) {
        console.error("Error sending cancellation notification:", error);
      }
    }

    return null;
  });

/**
 * 🔔 Notify admins when new provider registers
 *
 * Triggered when new provider submits profile for approval
 * Sends notification to all admin users
 */
export const onProviderRegistration = functions.firestore
  .document("providers/{providerId}")
  .onCreate(async (snapshot, context) => {
    const providerData = snapshot.data();
    const providerId = context.params.providerId;

    const providerName = providerData.name || "New Provider";
    const serviceType = providerData.specialization || providerData.specialty || "Unknown";
    const email = providerData.email || "";
    const phone = providerData.phone || "";

    // Get all admin users
    const adminsSnapshot = await admin.firestore()
      .collection("users")
      .where("role", "==", "admin")
      .get();

    if (adminsSnapshot.empty) {
      console.log("No admin users found");
      return null;
    }

    const notification = {
      title: "🔔 New Provider Registration",
      body: `${providerName} (${serviceType}) has submitted profile for approval`,
    };

    const sendPromises: Promise<any>[] = [];

    adminsSnapshot.forEach((adminDoc) => {
      const adminData = adminDoc.data();
      const fcmToken = adminData.fcmToken;

      if (fcmToken) {
        const message = {
          notification,
          data: {
            type: "provider_registration",
            providerId,
            providerName,
            serviceType,
            email,
            phone,
          },
          token: fcmToken,
          android: {
            priority: "high" as const,
            notification: {
              channelId: "consultation-updates",
              priority: "high" as const,
              sound: "default",
            },
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
                badge: 1,
              },
            },
          },
        };

        sendPromises.push(
          admin.messaging().send(message)
            .then(() => console.log(`Registration notification sent to admin ${adminDoc.id}`))
            .catch((error) => console.error(`Error sending to admin ${adminDoc.id}:`, error))
        );
      }
    });

    await Promise.all(sendPromises);
    return null;
  });
