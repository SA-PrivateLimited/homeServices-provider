import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {lightTheme, darkTheme} from '../utils/theme';
import {useStore} from '../store';
import useTranslation from '../hooks/useTranslation';
import {CrystalSurface} from './CrystalSurface';

type Props = {
  navigation: any;
};

const ACTIONS = [
  {
    route: 'Jobs',
    icon: 'work',
    titleKey: 'home.qa.activeTitle',
    subKey: 'home.qa.activeSub',
  },
  {
    route: 'History',
    icon: 'history',
    titleKey: 'home.qa.historyTitle',
    subKey: 'home.qa.historySub',
  },
  {
    route: 'Settings',
    icon: 'settings',
    titleKey: 'home.qa.settingsTitle',
    subKey: 'home.qa.settingsSub',
  },
  {
    route: 'HelpSupport',
    icon: 'help',
    titleKey: 'home.qa.helpTitle',
    subKey: 'home.qa.helpSub',
  },
] as const;

export function QuickActions({navigation}: Props) {
  const {isDarkMode, colorTheme} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  const tx = (key: string) => String(t(key));
  void colorTheme;
  const primary = theme.primary;

  return (
    <View style={styles.wrap} accessibilityLabel={tx('home.quickActions')}>
      <Text style={[styles.heading, {color: theme.text}]}>
        {tx('home.quickActions')}
      </Text>
      <View style={styles.grid}>
        {ACTIONS.map(item => (
          <CrystalSurface
            key={item.titleKey}
            primary={primary}
            card={theme.card}
            isDark={isDarkMode}
            radius={16}
            style={styles.card}>
            <TouchableOpacity
              style={styles.press}
              activeOpacity={0.85}
              onPress={() => {
                if (item.route === 'HelpSupport') {
                  const parent = navigation.getParent();
                  if (parent) parent.navigate('HelpSupport');
                  else navigation.navigate('HelpSupport');
                  return;
                }
                navigation.navigate(item.route);
              }}>
              <View
                style={[styles.icon, {backgroundColor: `${primary}1F`}]}>
                <Icon name={item.icon} size={22} color={primary} />
              </View>
              <Text style={[styles.title, {color: theme.text}]}>
                {tx(item.titleKey)}
              </Text>
              <Text style={[styles.sub, {color: theme.textSecondary}]}>
                {tx(item.subKey)}
              </Text>
            </TouchableOpacity>
          </CrystalSurface>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {gap: 10},
  heading: {fontSize: 15, fontWeight: '700'},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  card: {
    width: '48%',
    flexGrow: 1,
  },
  press: {
    padding: 14,
    gap: 6,
    alignItems: 'flex-start',
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  title: {fontSize: 14, fontWeight: '700'},
  sub: {fontSize: 12, lineHeight: 16},
});
