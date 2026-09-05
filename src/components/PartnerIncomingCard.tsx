import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Button} from 'sapvt-ltd-app-packages';
import type {PartnerCollaborationRequest} from '../services/api/partnerCollaborationApi';
import type {Theme} from '../utils/theme';

function place(request: PartnerCollaborationRequest): string {
  const loc = request.location;
  if (!loc) return '';
  return [loc.district || loc.city, loc.state].filter(Boolean).join(', ');
}

type Props = {
  theme: Theme;
  request: PartnerCollaborationRequest;
  busy: boolean;
  title: string;
  lead: string;
  customerLabel: string;
  acceptLabel: string;
  declineLabel: string;
  onAccept: () => void;
  onDecline: () => void;
};

export function PartnerIncomingCard({
  theme,
  request,
  busy,
  title,
  lead,
  customerLabel,
  acceptLabel,
  declineLabel,
  onAccept,
  onDecline,
}: Props) {
  const where = place(request);
  const notes = request.extraNotes || request.problem;

  return (
    <View
      style={[
        styles.card,
        {backgroundColor: theme.card, borderColor: 'rgba(52, 199, 89, 0.55)'},
      ]}
      accessibilityLabel={title}>
      <View style={styles.head}>
        <View style={styles.bell}>
          <Icon name="handshake" size={20} color={theme.primary} />
        </View>
        <Text style={[styles.h2, {color: theme.text}]}>{title}</Text>
      </View>
      <Text style={[styles.muted, {color: theme.textSecondary}]}>{lead}</Text>
      <Text style={[styles.service, {color: theme.text}]}>
        {request.neededServiceType || request.jobServiceType}
      </Text>
      {request.customerName ? (
        <Text style={[styles.field, {color: theme.text}]}>
          {customerLabel}: {request.customerName}
        </Text>
      ) : null}
      {where ? (
        <Text style={[styles.field, {color: theme.text}]}>{where}</Text>
      ) : null}
      {notes ? (
        <Text style={[styles.field, {color: theme.text}]} numberOfLines={3}>
          {notes}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button
          variant="danger"
          title={declineLabel}
          onPress={onDecline}
          disabled={busy}
          block
          style={styles.actionBtn}
        />
        <Button
          variant="primary"
          title={acceptLabel}
          onPress={onAccept}
          disabled={busy}
          loading={busy}
          block
          style={styles.actionBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {padding: 16, borderRadius: 14, borderWidth: 1.5},
  head: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10},
  bell: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.16)',
  },
  h2: {fontSize: 17, fontWeight: '700', flex: 1},
  muted: {fontSize: 13, marginBottom: 6},
  service: {fontSize: 16, fontWeight: '700', marginBottom: 8},
  field: {fontSize: 14, lineHeight: 20, marginBottom: 6, fontWeight: '500'},
  actions: {flexDirection: 'column', gap: 10, marginTop: 12},
  actionBtn: {minHeight: 52, width: '100%'},
});
