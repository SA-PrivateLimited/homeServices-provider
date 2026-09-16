import React, {useState} from 'react';
import {Linking, Pressable, StyleSheet, Text, View} from 'react-native';
import {Button, Icon} from 'sapvt-ltd-app-packages';
import {useTranslation} from 'react-i18next';
import {
  SUPPORT_PHONE,
  SUPPORT_PHONE_TEL,
  WHATSAPP_SUPPORT_URL,
} from '../../config/support';
import {useResolvedTheme} from '../../hooks/useResolvedTheme';

import {HelpFeedbackForm} from './HelpFeedbackForm';
import {HELP_GROUPS, HELP_TOPICS, type HelpTopicId} from './helpTopics';

export function PartnerHelpSupportPanel({
  showPhoneCard = true,
}: {
  showPhoneCard?: boolean;
}) {
  const {t, i18n} = useTranslation();
  const theme = useResolvedTheme();
  const [topic, setTopic] = useState<HelpTopicId | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const selected = HELP_TOPICS.find(x => x.id === topic) || null;
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
      <View style={styles.stack}>
        <Pressable style={styles.back} onPress={() => setFeedbackOpen(false)}>
          <Icon name="arrow_back" size={18} color={theme.text} />
          <Text style={{color: theme.text}}>{t('common.back')}</Text>
        </Pressable>
        <HelpFeedbackForm onClose={() => setFeedbackOpen(false)} />
      </View>
    );
  }

  if (selected) {
    return (
      <View style={styles.stack}>
        <Pressable style={styles.back} onPress={() => setTopic(null)}>
          <Icon name="arrow_back" size={18} color={theme.text} />
          <Text style={{color: theme.text}}>{t('common.back')}</Text>
        </Pressable>
        <View style={styles.detailHead}>
          <View style={styles.iconBadge}>
            <Icon name={selected.icon} size={20} color={theme.primary} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.h3}>{t(selected.titleKey)}</Text>
            <Text style={styles.body}>{t(selected.bodyKey)}</Text>
          </View>
        </View>
        {tipList.map(line => (
          <Text key={line} style={styles.tip}>
            {`• ${line}`}
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
              openWhatsApp(
                `${t(selected.titleKey)} — ${t('help.whatsappPrefill')}`,
              )
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
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      {showPhoneCard ? (
        <Pressable
          style={styles.phone}
          onPress={() => void Linking.openURL(SUPPORT_PHONE_TEL)}
          accessibilityRole="button"
          accessibilityLabel={`${String(t('shell.emergency'))} ${SUPPORT_PHONE}`}>
          <View style={styles.copy}>
            <Text style={styles.phoneLabel}>{t('shell.emergency')}</Text>
            <Text style={styles.phoneNum}>{SUPPORT_PHONE}</Text>
          </View>
          <Text style={styles.em}>
            {i18n.language?.startsWith('hi')
              ? t('shell.hoursHi')
              : t('shell.hoursEn')}
          </Text>
        </Pressable>
      ) : null}

      {HELP_GROUPS.map(group => (
        <View key={group.titleKey} style={styles.group}>
          <Text style={styles.groupTitle}>{t(group.titleKey)}</Text>
          <View style={styles.topics}>
            {group.ids.map(id => {
              const item = HELP_TOPICS.find(topicItem => topicItem.id === id);
              if (!item) {
                return null;
              }
              return (
                <Pressable
                  key={item.id}
                  style={styles.row}
                  onPress={() => {
                    if (item.id === 'feedback') {
                      setFeedbackOpen(true);
                      return;
                    }
                    setTopic(item.id);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={String(t(item.titleKey))}>
                  <View style={styles.iconBadgeSm}>
                    <Icon name={item.icon} size={18} color={theme.primary} />
                  </View>
                  <View style={styles.copy}>
                    <Text style={styles.strong}>{t(item.titleKey)}</Text>
                    <Text style={styles.em} numberOfLines={1}>
                      {t(item.listKey)}
                    </Text>
                  </View>
                  <Icon
                    name="chevron_right"
                    size={16}
                    color={theme.textSecondary}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
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
    stack: {gap: 12},
    back: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      minHeight: 44,
    },
    detailHead: {flexDirection: 'row', alignItems: 'flex-start', gap: 10},
    h3: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      lineHeight: 22,
      marginBottom: 2,
    },
    body: {fontSize: 13, lineHeight: 18, color: theme.textSecondary},
    tip: {
      fontSize: 13,
      lineHeight: 19,
      color: theme.textSecondary,
      paddingLeft: 4,
    },
    gap: {gap: 8, marginTop: 4},
    phone: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: `${theme.primary}3D`,
      backgroundColor: `${theme.primary}0F`,
    },
    phoneLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: theme.textSecondary,
    },
    phoneNum: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.text,
      lineHeight: 20,
    },
    group: {gap: 6},
    groupTitle: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: theme.textSecondary,
      paddingHorizontal: 2,
    },
    topics: {gap: 6},
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 10,
      minHeight: 48,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      backgroundColor: theme.card,
    },
    iconBadge: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${theme.primary}1F`,
    },
    iconBadgeSm: {
      width: 32,
      height: 32,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${theme.primary}1F`,
    },
    copy: {flex: 1, minWidth: 0, gap: 2},
    strong: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
      lineHeight: 18,
    },
    em: {
      fontSize: 12,
      lineHeight: 16,
      color: theme.textSecondary,
    },
  });
}
