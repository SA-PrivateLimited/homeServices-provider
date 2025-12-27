#!/bin/bash

# Fix Realtime Database Native Module Error
# This script rebuilds the app to properly link Firebase Realtime Database

echo "🔧 Fixing Realtime Database Native Module..."
echo ""

cd "$(dirname "$0")"

echo "📦 Step 1: Cleaning node_modules..."
rm -rf node_modules
echo "✅ Cleaned node_modules"
echo ""

echo "📦 Step 2: Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

echo "🧹 Step 3: Cleaning Android build..."
cd android
./gradlew clean
cd ..
echo "✅ Android build cleaned"
echo ""

echo "🗑️  Step 4: Clearing Metro cache..."
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*
echo "✅ Metro cache cleared"
echo ""

echo "🚀 Step 5: Rebuilding app..."
echo "⚠️  This will take a few minutes..."
echo ""
echo "Run this command to start the app:"
echo "  npm run android"
echo ""
echo "Or if you have a device connected:"
echo "  ./run-android.sh"
echo ""

