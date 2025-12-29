# Fix Google Sign-In Error: [auth/missing-client-identifier]

## Problem
The error occurs because Play Integrity checks are failing. This happens when:
1. SHA-1 fingerprint is not registered in Firebase Console
2. Play Integrity API is not enabled
3. App needs to be rebuilt after configuration changes

## Current SHA-1 Fingerprints

### Debug (Current)
```
3F:B5:39:AD:69:0A:DC:A1:E5:9C:07:78:57:78:DD:B7:70:E9:34:4E
```

### Release
```
F1:51:2E:11:06:5F:F8:26:B4:EE:D6:B1:A2:9B:73:E9:4D:6C:68:AE
```

## Steps to Fix

### 1. Add SHA-1 Fingerprint to Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `home-services-1ea69`
3. Click the gear icon ⚙️ → **Project Settings**
4. Scroll down to **Your apps** section
5. Find the Android app: `com.homeservices.provider`
6. Click **Add fingerprint**
7. Add the debug SHA-1: `3F:B5:39:AD:69:0A:DC:A1:E5:9C:07:78:57:78:DD:B7:70:E9:34:4E`
8. Click **Save**
9. **Download the updated `google-services.json`** file
10. Replace `HomeServicesProvider/android/app/google-services.json` with the new file

### 2. Enable Play Integrity API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: `home-services-1ea69`
3. Go to **APIs & Services** → **Library**
4. Search for **"Play Integrity API"**
5. Click **Enable**
6. Wait 2-3 minutes for it to propagate

### 3. Rebuild the App

After updating `google-services.json`:

```bash
cd HomeServicesProvider/android
./gradlew clean
cd ../..
npx react-native run-android
```

### 4. Verify Configuration

- ✅ Package name: `com.homeservices.provider`
- ✅ Web Client ID: `425944993130-342d2o2ao3is7ljq3bi52m6q55279bh9.apps.googleusercontent.com`
- ✅ Debug SHA-1: `3F:B5:39:AD:69:0A:DC:A1:E5:9C:07:78:57:78:DD:B7:70:E9:34:4E`
- ✅ Release SHA-1: `F1:51:2E:11:06:5F:F8:26:B4:EE:D6:B1:A2:9B:73:E9:4D:6C:68:AE`

## Note for Emulators

If testing on an emulator:
- Use an emulator with **Google Play Services** (not AOSP)
- Play Integrity checks may fail on emulators - test on a real device for production

## Still Having Issues?

1. Check logcat for detailed errors: `adb logcat | grep -i "google\|auth\|play"`
2. Verify `google-services.json` is in the correct location: `android/app/google-services.json`
3. Ensure Google Services plugin is applied in `build.gradle`
