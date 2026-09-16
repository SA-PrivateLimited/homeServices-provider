import React from 'react';
import {Image, StatusBar, StyleSheet, View} from 'react-native';

const splashArt = require('../assets/images/splash.webp') as number;

/** Full-screen launch poster while the Partner app hydrates. */
export function BootSplash() {
  return (
    <View style={styles.fill}>
      <StatusBar barStyle="dark-content" backgroundColor="#9DD2FE" />
      <Image
        source={splashArt}
        style={styles.art}
        resizeMode="cover"
        accessibilityLabel="Akansho Partner"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: '#9DD2FE',
  },
  art: {
    width: '100%',
    height: '100%',
  },
});
