import React, {useState} from 'react';
import {Linking, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Button, Icon} from 'sapvt-ltd-app-packages';
import {useTranslation} from 'react-i18next';
import {
  SUPPORT_PHONE,
  SUPPORT_PHONE_TEL,
  WHATSAPP_SUPPORT_URL,
} from '../../config/support';
import {useResolvedTheme} from '../../hooks/useResolvedTheme';

import {HelpFeedbackForm} from './HelpFeedbackForm';

type HelpTopicId =
  | 'newRequests'
  | 'onlineReceive'
  | 'serviceOnOff'
  | 'myServices'
  | 'documents'
  | 'jobWorkflow'
  | 'customerContact'
  | 'loginOtp'
  | 'pin'
  | 'account'
  | 'feedback'
  | 'other';

const TOPICS: {
  id: HelpTopicId;
  icon: string;
  titleKey: string;
  bodyKey: string;
  tipsKey: string;
}[] = [
  {
    id: 'newRequests',
    icon: 'notifications',
    titleKey: 'help.topic.newRequestsTitle',
    bodyKey: 'help.topic.newRequestsBody',
    tipsKey: 'help.topic.newRequestsTips',
  },
  {
    id: 'onlineReceive',
    icon: 'toggle_on',
    titleKey: 'help.topic.onlineReceiveTitle',
    bodyKey: 'help.topic.onlineReceiveBody',
    tipsKey: 'help.topic.onlineReceiveTips',
  },
  {
    id: 'serviceOnOff',
    icon: 'handyman',
    titleKey: 'help.topic.serviceOnOffTitle',
    bodyKey: 'help.topic.serviceOnOffBody',
    tipsKey: 'help.topic.serviceOnOffTips',
  },
  {
    id: 'myServices',
    icon: 'list',
    titleKey: 'help.topic.myServicesTitle',
    bodyKey: 'help.topic.myServicesBody',
    tipsKey: 'help.topic.myServicesTips',
  },
  {
    id: 'documents',
    icon: 'description',
    titleKey: 'help.topic.documentsTitle',
    bodyKey: 'help.topic.documentsBody',
    tipsKey: 'help.topic.documentsTips',
  },
  {
    id: 'jobWorkflow',
    icon: 'work',
    titleKey: 'help.topic.jobWorkflowTitle',
    bodyKey: 'help.topic.jobWorkflowBody',
    tipsKey: 'help.topic.jobWorkflowTips',
  },
  {
    id: 'customerContact',
    icon: 'call',
    titleKey: 'help.topic.customerContactTitle',
    bodyKey: 'help.topic.customerContactBody',
    tipsKey: 'help.topic.customerContactTips',
  },
  {
    id: 'loginOtp',
    icon: 'lock',
    titleKey: 'help.topic.loginOtpTitle',
    bodyKey: 'help.topic.loginOtpBody',
    tipsKey: 'help.topic.loginOtpTips',
  },
  {
    id: 'pin',
    icon: 'password',
    titleKey: 'help.topic.pinTitle',
    bodyKey: 'help.topic.pinBody',
    tipsKey: 'help.topic.pinTips',
  },
  {
    id: 'account',
    icon: 'person',
    titleKey: 'help.topic.accountTitle',
    bodyKey: 'help.topic.accountBody',
    tipsKey: 'help.topic.accountTips',
  },
  {
    id: 'feedback',
    icon: 'rate_review',
    titleKey: 'help.topic.feedbackTitle',
    bodyKey: 'help.topic.feedbackBody',
    tipsKey: 'help.topic.feedbackTips',
  },
  {
    id: 'other',
    icon: 'help',
    titleKey: 'help.topic.otherTitle',
    bodyKey: 'help.topic.otherBody',
    tipsKey: 'help.topic.otherTips',
  },
];

export function PartnerHelpSupportPanel({showPhoneCard = true}: {showPhoneCard?: boolean}) {
  const {t, i18n} = useTranslation();
  const theme = useResolvedTheme();
  const [topic, setTopic] = useState<HelpTopicId | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const selected = TOPICS.find(x => x.id === topic) || null;
  const tipList = selected
    ? String(t(selected.tipsKey))
        .split('|')
        .map(s => s.trim())
        .filter(Boolean)
    : [];

  const openWhatsApp = (prefill?: string) => {
    const text = prefill ? `?text=${encodeURIComponent(prefill)}` : '';
    void Linking.openURL(`${WHATSAPP_SUPPORT_URL}${text}`);
  };

  const styles = makeStyles(theme);

  if (feedbackOpen) {
    return (
      <ScrollView contentContainerStyle={styles.pad}>
        <Pressable style={styles.back} onPress={() => setFeedbackOpen(false)}>
          <Icon name="arrow_back" size={18} color={theme.text} />
          <Text style={{color: theme.text}}>{t('common.back')}</Text>
        </Pressable>
        <HelpFeedbackForm onClose={() => setFeedbackOpen(false)} />
      </ScrollView>
    );
  }

  if (selected) {
    return (
      <ScrollView contentContainerStyle={styles.pad}>
        <Pressable style={styles.back} onPress={() => setTopic(null)}>
          <Icon name="arrow_back" size={18} color={theme.text} />
          <Text style={{color: theme.text}}>{t('common.back')}</Text>
        </Pressable>
        <Text style={styles.h3}>{t(selected.titleKey)}</Text>
        <Text style={styles.body}>{t(selected.bodyKey)}</Text>
        {tipList.map(line => (
          <Text key={line} style={styles.tip}>
            {line}
          </Text>
        ))}
        <View style={styles.gap}>
          {selected.id === 'feedback' ? (
            <Button
              variant="primary"
              block
              title={String(t('help.topic.openFeedback'))}
              onPress={() => setFeedbackOpen(true)}
            />
          ) : null}
          <Button
            variant="primary"
            block
            onPress={() =>
              openWhatsApp(`${t(selected.titleKey)} — ${t('help.whatsappPrefill')}`)
            }>
            {t('help.chatWhatsApp')}
          </Button>
          <Button
            variant="secondary"
            block
            onPress={() => void Linking.openURL(SUPPORT_PHONE_TEL)}>
            {t('help.callSupport')}
          </Button>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.lead}>{t('help.panelLead')}</Text>
      {showPhoneCard ? (
        <View style={styles.phone}>
          <Text style={styles.strong}>{t('shell.emergency')}</Text>
          <Text style={styles.phoneNum}>{SUPPORT_PHONE}</Text>
          <Text style={styles.em}>
            {i18n.language?.startsWith('hi') ? t('shell.hoursHi') : t('shell.hoursEn')}
          </Text>
        </View>
      ) : null}
      {TOPICS.map(item => (
        <Pressable key={item.id} style={styles.row} onPress={() => setTopic(item.id)}>
          <Icon name={item.icon} size={20} color={theme.text} />
          <View style={styles.copy}>
            <Text style={styles.strong}>{t(item.titleKey)}</Text>
            <Text style={styles.em}>{t(item.bodyKey)}</Text>
          </View>
          <Icon name="chevron_right" size={18} color={theme.textSecondary} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

function makeStyles(theme: {
  text: string;
  textSecondary: string;
  card: string;
  border: string;
  primary: string;
}) {
  return StyleSheet.create({
    pad: {paddingBottom: 24, gap: 8},
    lead: {fontSize: 14, color: theme.textSecondary, marginBottom: 8},
    back: {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8},
    h3: {fontSize: 16, fontWeight: '700', color: theme.text},
    body: {fontSize: 14, color: theme.textSecondary, marginBottom: 8},
    tip: {fontSize: 14, color: theme.text, lineHeight: 20},
    gap: {gap: 8, marginTop: 12},
    phone: {
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      marginBottom: 8,
    },
    phoneNum: {fontSize: 18, fontWeight: '700', color: theme.primary, marginTop: 4},
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      backgroundColor: theme.card,
    },
    copy: {flex: 1},
    strong: {fontSize: 14, fontWeight: '700', color: theme.text},
    em: {fontSize: 12, color: theme.textSecondary, marginTop: 2},
  });
}
