#!/bin/bash

echo "🔍 Verifying Google Sign-In Configuration..."
echo ""

# Check webClientId in authService.ts
echo "1. Checking webClientId in authService.ts..."
WEB_CLIENT_ID=$(grep -A 2 "GoogleSignin.configure" src/services/authService.ts | grep "webClientId" | sed "s/.*webClientId: '\(.*\)'.*/\1/")
EXPECTED_WEB_CLIENT_ID="425944993130-342d2o2ao3is7ljq3bi52m6q55279bh9.apps.googleusercontent.com"

if [ "$WEB_CLIENT_ID" == "$EXPECTED_WEB_CLIENT_ID" ]; then
    echo "   ✅ webClientId is correct: $WEB_CLIENT_ID"
else
    echo "   ❌ webClientId mismatch!"
    echo "      Found: $WEB_CLIENT_ID"
    echo "      Expected: $EXPECTED_WEB_CLIENT_ID"
fi
echo ""

# Check package name
echo "2. Checking package name..."
PACKAGE_NAME=$(grep "applicationId" android/app/build.gradle | head -1 | sed "s/.*applicationId \"\(.*\)\".*/\1/")
EXPECTED_PACKAGE="com.homeservices.provider"

if [ "$PACKAGE_NAME" == "$EXPECTED_PACKAGE" ]; then
    echo "   ✅ Package name is correct: $PACKAGE_NAME"
else
    echo "   ❌ Package name mismatch!"
    echo "      Found: $PACKAGE_NAME"
    echo "      Expected: $EXPECTED_PACKAGE"
fi
echo ""

# Check google-services.json exists
echo "3. Checking google-services.json..."
if [ -f "android/app/google-services.json" ]; then
    echo "   ✅ google-services.json exists"
    
    # Check if package name matches in google-services.json
    JSON_PACKAGE=$(grep -A 2 "com.homeservices.provider" android/app/google-services.json | grep "package_name" | head -1 | sed 's/.*"package_name": "\(.*\)".*/\1/')
    if [ "$JSON_PACKAGE" == "$EXPECTED_PACKAGE" ]; then
        echo "   ✅ Package name matches in google-services.json"
    else
        echo "   ⚠️  Package name in google-services.json: $JSON_PACKAGE"
    fi
    
    # Check web client ID in google-services.json
    JSON_WEB_CLIENT=$(grep "425944993130-342d2o2ao3is7ljq3bi52m6q55279bh9.apps.googleusercontent.com" android/app/google-services.json | head -1)
    if [ -n "$JSON_WEB_CLIENT" ]; then
        echo "   ✅ Web client ID found in google-services.json"
    else
        echo "   ❌ Web client ID NOT found in google-services.json"
    fi
else
    echo "   ❌ google-services.json NOT found!"
fi
echo ""

# Get current SHA-1
echo "4. Current SHA-1 Fingerprints:"
cd android
./gradlew signingReport 2>&1 | grep -A 2 "Variant: debug" | grep "SHA1:" | head -1 | sed 's/.*SHA1: \(.*\)/\1/' | while read sha1; do
    echo "   Debug SHA-1: $sha1"
done
./gradlew signingReport 2>&1 | grep -A 2 "Variant: release" | grep "SHA1:" | head -1 | sed 's/.*SHA1: \(.*\)/\1/' | while read sha1; do
    echo "   Release SHA-1: $sha1"
done
cd ..
echo ""

echo "📋 Next Steps:"
echo "   1. Add the Debug SHA-1 above to Firebase Console"
echo "   2. Download updated google-services.json"
echo "   3. Replace android/app/google-services.json"
echo "   4. Enable Play Integrity API in Google Cloud Console"
echo "   5. Rebuild: cd android && ./gradlew clean && cd .. && npx react-native run-android"
echo ""
