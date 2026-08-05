/**
 * Help & Support — contact only (no AI chat)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import useTranslation from '../hooks/useTranslation';
import AlertModal from '../components/AlertModal';

const SUPPORT_EMAIL = 'support@sa-privatelimited.com';
const SUPPORT_PHONE = '1800000000';

export default function HelpSupportScreen({navigation}: any) {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  const [alertVisible, setAlertVisible] = React.useState(false);
  const [alertMessage, setAlertMessage] = React.useState('');

  const openEmail = async () => {
    const subject = encodeURIComponent('HomeServices Provider Support');
    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}`;
    try {
      const can = await Linking.canOpenURL(url);
      if (can) await Linking.openURL(url);
      else {
        setAlertMessage(
          String(
            t('help.emailNotAvailableMessage', {email: SUPPORT_EMAIL}) ||
              `Please email ${SUPPORT_EMAIL}`,
          ),
        );
        setAlertVisible(true);
      }
    } catch {
      setAlertMessage(`Please email ${SUPPORT_EMAIL}`);
      setAlertVisible(true);
    }
  };

  const openCall = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() => {
      setAlertMessage('Unable to open phone dialer');
      setAlertVisible(true);
    });
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <AlertModal
        visible={alertVisible}
        title={String(t('help.contactSupport') || 'Contact Support')}
        message={alertMessage}
        type="info"
        onClose={() => setAlertVisible(false)}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.iconWrap, {backgroundColor: theme.primary + '20'}]}>
          <Icon name="support-agent" size={56} color={theme.primary} />
        </View>

        <Text style={[styles.title, {color: theme.text}]}>
          {String(t('help.title') || 'Help & Support')}
        </Text>
        <Text style={[styles.lead, {color: theme.textSecondary}]}>
          Need help with jobs, profile, or going online? Reach our support team
          directly — no chat bot.
        </Text>

        <View style={[styles.card, {backgroundColor: theme.card}]}>
          <Text style={[styles.cardTitle, {color: theme.textSecondary}]}>
            We can help with
          </Text>
          {[
            'Going online / offline and receiving jobs',
            'Profile setup and approval',
            'Job accept, navigation, and completion PIN',
            'Account or app technical issues',
          ].map(item => (
            <View key={item} style={styles.topicRow}>
              <Icon name="check-circle" size={18} color="#34C759" />
              <Text style={[styles.topicText, {color: theme.text}]}>{item}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, {backgroundColor: theme.primary}]}
          onPress={() => void openEmail()}
          activeOpacity={0.85}>
          <Icon name="email" size={22} color="#fff" />
          <Text style={styles.primaryBtnText}>Email support</Text>
        </TouchableOpacity>
        <Text style={[styles.hint, {color: theme.textSecondary}]}>
          {SUPPORT_EMAIL}
        </Text>

        <TouchableOpacity
          style={[styles.secondaryBtn, {borderColor: theme.border || '#ccc'}]}
          onPress={openCall}
          activeOpacity={0.85}>
          <Icon name="call" size={22} color={theme.primary} />
          <Text style={[styles.secondaryBtnText, {color: theme.primary}]}>
            Call support
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backLink}
          onPress={() => navigation.goBack()}>
          <Text style={[styles.backText, {color: theme.textSecondary}]}>
            {String(t('common.back') || 'Back')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: 24, paddingBottom: 40},
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  topicText: {flex: 1, fontSize: 15, lineHeight: 21},
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryBtnText: {color: '#fff', fontSize: 17, fontWeight: '700'},
  hint: {textAlign: 'center', marginTop: 8, marginBottom: 16, fontSize: 13},
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  secondaryBtnText: {fontSize: 16, fontWeight: '700'},
  backLink: {alignItems: 'center', marginTop: 28},
  backText: {fontSize: 15},
});
