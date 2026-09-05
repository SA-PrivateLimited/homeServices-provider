import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {PartnerHelpSupportPanel} from '../components/help/PartnerHelpSupportPanel';
import {useResolvedTheme} from '../hooks/useResolvedTheme';
import useTranslation from '../hooks/useTranslation';

export default function HelpSupportScreen() {
  const theme = useResolvedTheme();
  const {t} = useTranslation();

  return (
    <View style={[styles.root, {backgroundColor: theme.background}]}>
      <View style={styles.brand}>
        <Image
          source={require('../assets/fromWeb/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.lead, {color: theme.textSecondary}]}>
          {t('ecosystem.helpLead')}
        </Text>
      </View>
      <PartnerHelpSupportPanel />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, paddingHorizontal: 16, paddingTop: 8},
  brand: {flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12},
  logo: {width: 40, height: 40},
  lead: {flex: 1, fontSize: 14, lineHeight: 20},
});
