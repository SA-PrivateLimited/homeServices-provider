import React from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useHeaderHeight} from '@react-navigation/elements';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Icon} from 'sapvt-ltd-app-packages';
import {PartnerHelpSupportPanel} from '../components/help/PartnerHelpSupportPanel';
import {useResolvedTheme} from '../hooks/useResolvedTheme';
import useTranslation from '../hooks/useTranslation';

export default function HelpSupportScreen() {
  const theme = useResolvedTheme();
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const showInPageBack = headerHeight <= 0 && navigation.canGoBack();
  const topPad = showInPageBack ? insets.top + 8 : headerHeight > 0 ? 8 : insets.top + 8;

  return (
    <ScrollView
      style={[styles.root, {backgroundColor: theme.background}]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topPad,
          paddingBottom: Math.max(28, 16 + insets.bottom),
        },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      {showInPageBack ? (
        <Pressable
          style={styles.back}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={String(t('common.back'))}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Icon name="arrow_back" size={20} color={theme.text} />
          <Text style={[styles.backText, {color: theme.text}]}>
            {t('common.back')}
          </Text>
        </Pressable>
      ) : null}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  content: {
    paddingHorizontal: 16,
    gap: 12,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingRight: 8,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  logo: {width: 36, height: 36, marginTop: 2},
  lead: {flex: 1, fontSize: 14, lineHeight: 20},
});
