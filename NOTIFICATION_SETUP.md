# FCM Notification Setup Guide

## ✅ Current Status

- ✅ FCM service code is ready (`fcmNotificationService.ts`)
- ✅ Cloud Function code exists (`firebase/functions/src/index.ts`)
- ⚠️ Need to verify deployment

## 📋 Step-by-Step Instructions

### Step 1: Deploy Cloud Function

```bash
cd HomeServicesProvider
firebase login
firebase deploy --only functions:sendPushNotification
```

**Expected output:**
```
✔  functions[sendPushNotification(us-central1)] Successful create operation.
```

### Step 2: Verify Function is Deployed

```bash
firebase functions:list
```

You should see `sendPushNotification` in the list.

### Step 3: Test Notifications

1. **Open Provider App** (HomeServicesProvider)
2. **Login as Provider**
3. **Go Online** (toggle online status)
4. **Request a service** from Customer app
5. **Accept the booking** in Provider app
6. **Check Customer app** - should receive notification

### Step 4: Check Logs

If notifications don't work, check logs:

```bash
# Check Cloud Function logs
firebase functions:log --only sendPushNotification

# Check app logs (React Native)
# Look for these in Metro bundler console:
# - "📤 FCM: Sending notification via Cloud Function"
# - "✅ FCM notification sent successfully"
# - "⚠️ FCM: Cloud Function not found" (if not deployed)
```

## 🔍 Troubleshooting

### Issue: "Cloud Function not found"
**Solution:** Deploy the function:
```bash
firebase deploy --only functions
```

### Issue: "Permission denied"
**Solution:** Make sure user is authenticated when calling the function.

### Issue: "No FCM token"
**Solution:** 
- Check if user has notification permission granted
- Check Firestore: `users/{userId}/fcmToken` should exist
- FCM tokens are saved automatically when user logs in

### Issue: Function deployed but notifications not working
**Check:**
1. User has FCM token in Firestore
2. User has notification permission
3. Check Cloud Function logs for errors
4. Check app console logs

## 📱 Testing Checklist

- [ ] Cloud Function deployed
- [ ] Provider logged in and online
- [ ] Customer has FCM token in Firestore
- [ ] Customer has notification permission
- [ ] Accept booking → Customer receives notification
- [ ] Start service → Customer receives notification  
- [ ] Complete service → Customer receives notification

## 🎯 Quick Test Command

```bash
# Deploy function
cd HomeServicesProvider
firebase deploy --only functions:sendPushNotification

# Check if deployed
firebase functions:list | grep sendPushNotification
```

