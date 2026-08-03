/**
 * Ad Slot component - Banner ad for monetization.
 * Uses Google AdMob test IDs by default. Replace with your ad unit IDs for production.
 */
import React, {useState} from 'react';
import {View, Text, StyleSheet, Platform} from 'react-native';

let BannerAd: any = null;
let BannerAdSize: any = null;
try {
  const ads = require('react-native-google-mobile-ads');
  BannerAd = ads.BannerAd;
  BannerAdSize = ads.BannerAdSize;
} catch (_) {}

const BANNER_TEST_ID = Platform.OS === 'android'
  ? 'ca-app-pub-3940256099942544/6300978111'
  : 'ca-app-pub-3940256099942544/2934735716';

type AdSlotProps = {
  adUnitId?: string;
  size?: 'banner' | 'large';
  style?: any;
};

export default function AdSlot({adUnitId, size = 'banner', style}: AdSlotProps) {
  const [adError, setAdError] = useState(false);
  const unitId = adUnitId || BANNER_TEST_ID;

  if (adError || !BannerAd) {
    return (
      <View style={[styles.placeholder, size === 'large' && styles.placeholderLarge, style]}>
        <Text style={styles.placeholderText}>Ad</Text>
      </View>
    );
  }

  const adSize = size === 'large' ? BannerAdSize.LARGE_BANNER : BannerAdSize.BANNER;

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={unitId}
        size={adSize}
        requestOptions={{requestNonPersonalizedAdsOnly: false}}
        onAdFailedToLoad={(error: any) => {
          console.warn('Ad failed to load:', error?.message);
          setAdError(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {alignItems: 'center', justifyContent: 'center', minHeight: 50},
  placeholder: {
    height: 50,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  placeholderLarge: {height: 100},
  placeholderText: {fontSize: 12, color: 'rgba(0,0,0,0.3)'},
});
