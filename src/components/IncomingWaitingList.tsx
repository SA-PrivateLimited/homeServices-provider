import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Button} from 'sapvt-ltd-app-packages';
import type {Theme} from '../utils/theme';

type Row = {
  id: string;
  serviceType: string;
  customerName: string;
};

type Props = {
  theme: Theme;
  title: string;
  hint: string;
  acceptLabel: string;
  declineLabel: string;
  busy?: boolean;
  requests: Row[];
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
};

export function IncomingWaitingList({
  theme,
  title,
  hint,
  acceptLabel,
  declineLabel,
  busy,
  requests,
  onAccept,
  onDecline,
}: Props) {
  if (!requests.length) return null;

  return (
    <View style={[styles.wrap, {backgroundColor: theme.card}]}>
      <Text style={[styles.title, {color: theme.text}]}>{title}</Text>
      <Text style={[styles.hint, {color: theme.textSecondary}]}>{hint}</Text>
      {requests.map(row => (
        <View
          key={row.id}
          style={[styles.row, {borderColor: theme.border}]}>
          <View style={{flex: 1, minWidth: 0}}>
            <Text style={[styles.service, {color: theme.text}]}>
              {row.serviceType}
            </Text>
            <Text style={[styles.name, {color: theme.textSecondary}]}>
              {row.customerName}
            </Text>
          </View>
          <Button
            variant="secondary"
            size="sm"
            title={declineLabel}
            disabled={busy}
            onPress={() => onDecline(row.id)}
          />
          <Button
            variant="primary"
            size="sm"
            title={acceptLabel}
            disabled={busy}
            onPress={() => onAccept(row.id)}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {padding: 14, borderRadius: 14, gap: 8},
  title: {fontSize: 16, fontWeight: '700'},
  hint: {fontSize: 13, lineHeight: 18, marginBottom: 4},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  service: {fontSize: 14, fontWeight: '700'},
  name: {fontSize: 13, marginTop: 2},
});
