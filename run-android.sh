#!/bin/bash

# Load environment variables
source ~/.zshrc 2>/dev/null || true

# Set Android SDK paths if not already set
export ANDROID_HOME=${ANDROID_HOME:-$HOME/Library/Android/sdk}
export PATH=$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH

# Partner uses Metro 8082 so it can run next to the customer app on 8081.
cd "$(dirname "$0")"
npx react-native run-android --port 8082 "$@"

