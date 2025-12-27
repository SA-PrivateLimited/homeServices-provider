/**
 * Simple Express Server for Push Notifications
 * 
 * This server can be hosted for FREE on:
 * - Railway.app (railway.app)
 * - Render.com (render.com)
 * - Fly.io (fly.io)
 * 
 * No Firebase Blaze plan needed!
 * 
 * Setup:
 * 1. npm install express firebase-admin cors
 * 2. Deploy to Railway/Render/Fly.io
 * 3. Update pushNotificationService.ts to call this server instead of Cloud Functions
 */

const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
// You'll need to download serviceAccountKey.json from Firebase Console
// Go to: Project Settings > Service Accounts > Generate New Private Key
if (!admin.apps.length) {
  try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    console.log('Make sure serviceAccountKey.json is in the server directory');
  }
}

// Health check endpoint
app.get('/', (req, res) => {
  res.json({status: 'ok', message: 'Push Notification Server is running'});
});

/**
 * Send push notification
 * POST /send-notification
 * Body: {
 *   token: 'FCM_TOKEN',
 *   notification: { title: 'Title', body: 'Body' },
 *   data: { type: 'consultation', consultationId: '123' }
 * }
 */
app.post('/send-notification', async (req, res) => {
  try {
    const {token, notification, data} = req.body;

    if (!token || !notification) {
      return res.status(400).json({
        success: false,
        error: 'Token and notification are required',
      });
    }

    const message = {
      token: token,
      notification: {
        title: notification.title || 'HomeServices',
        body: notification.body || '',
      },
      data: {
        ...data,
        // Convert all data values to strings (FCM requirement)
        ...Object.keys(data || {}).reduce((acc, key) => {
          acc[key] = String(data[key] || '');
          return acc;
        }, {}),
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'consultation-updates',
          sound: 'default',
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    
    res.json({
      success: true,
      messageId: response,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send notification',
    });
  }
});

/**
 * Send notification to multiple tokens
 * POST /send-notification-multiple
 */
app.post('/send-notification-multiple', async (req, res) => {
  try {
    const {tokens, notification, data} = req.body;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Tokens array is required',
      });
    }

    const message = {
      notification: {
        title: notification.title || 'HomeServices',
        body: notification.body || '',
      },
      data: {
        ...data,
        ...Object.keys(data || {}).reduce((acc, key) => {
          acc[key] = String(data[key] || '');
          return acc;
        }, {}),
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'consultation-updates',
          sound: 'default',
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
      tokens: tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    res.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send notifications',
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Push Notification Server running on port ${PORT}`);
});

module.exports = app;


