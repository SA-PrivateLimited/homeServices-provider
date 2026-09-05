import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Button} from 'sapvt-ltd-app-packages';
import type {Theme} from '../utils/theme';

export function ProfileCta({
  theme,
  title,
  body,
  action,
  onPress,
}: {
  theme: Theme;
  title: string;
  body: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <View style={[styles.cta, {backgroundColor: theme.card}]}>
      <Icon name="engineering" size={40} color={theme.primary} />
      <Text style={[styles.h3, {color: theme.text}]}>{title}</Text>
      <Text style={[styles.p, {color: theme.textSecondary}]}>{body}</Text>
      <Button variant="primary" title={action} onPress={onPress} block />
    </View>
  );
}

export function EmptyRequest({
  theme,
  online,
  title,
  body,
}: {
  theme: Theme;
  online: boolean;
  title: string;
  body: string;
}) {
  if (!online) return null;
  return (
    <View style={[styles.empty, {backgroundColor: theme.card}]}>
      <Icon name="notifications-none" size={18} color={theme.textSecondary} />
      <View style={{flex: 1}}>
        <Text style={[styles.emptyTitle, {color: theme.text}]}>{title}</Text>
        <Text style={[styles.p, {color: theme.textSecondary}]}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cta: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'flex-start',
    gap: 8,
  },
  h3: {fontSize: 16, fontWeight: '700'},
  p: {fontSize: 13, lineHeight: 18},
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
  },
  emptyTitle: {fontSize: 14, fontWeight: '700', marginBottom: 2},
});
