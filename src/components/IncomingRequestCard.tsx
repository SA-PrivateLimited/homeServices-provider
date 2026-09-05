import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Button} from 'sapvt-ltd-app-packages';
import RequestPhotoGallery from './RequestPhotoGallery';
import type {Theme} from '../utils/theme';

function formatCountdown(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

type Incoming = {
  serviceType?: string;
  createdAt?: string;
  problem?: string;
  photos?: unknown;
  customerName?: string;
  customerAddress?: {address?: string};
  patientAddress?: {address?: string};
};

type Props = {
  theme: Theme;
  request: Incoming;
  secondsLeft: number;
  busy?: boolean;
  serviceType: string;
  customerName?: string;
  distanceLabel?: string;
  onAccept: () => void;
  onDecline: () => void;
  acceptLabel: string;
  declineLabel: string;
  newRequestLabel: string;
  photosTitle: string;
};

export function IncomingRequestCard({
  theme,
  request,
  secondsLeft,
  busy,
  serviceType,
  customerName,
  distanceLabel,
  onAccept,
  onDecline,
  acceptLabel,
  declineLabel,
  newRequestLabel,
  photosTitle,
}: Props) {
  const address =
    request.customerAddress?.address || request.patientAddress?.address;

  return (
    <View
      style={[
        styles.card,
        {backgroundColor: theme.card, borderColor: 'rgba(52, 199, 89, 0.55)'},
      ]}>
      <View style={styles.head}>
        <View style={styles.titleRow}>
          <View style={styles.bell}>
            <Icon name="notifications-active" size={20} color={theme.primary} />
          </View>
          <View style={{flex: 1, minWidth: 0}}>
            <Text style={[styles.h2, {color: theme.text}]}>{newRequestLabel}</Text>
            <Text style={[styles.service, {color: theme.text}]}>{serviceType}</Text>
          </View>
        </View>
        <View style={styles.timer}>
          <Text style={styles.timerStrong}>
            <Icon name="timer" size={16} color="#FF3B30" />{' '}
            {formatCountdown(secondsLeft)}
          </Text>
        </View>
      </View>

      {customerName ? (
        <Text style={[styles.customer, {color: theme.text}]}>{customerName}</Text>
      ) : null}
      {address ? (
        <Text style={[styles.field, {color: theme.text}]}>{address}</Text>
      ) : null}
      {distanceLabel ? (
        <Text style={[styles.muted, {color: theme.textSecondary}]}>
          {distanceLabel}
        </Text>
      ) : null}
      {request.problem ? (
        <Text style={[styles.field, {color: theme.text}]} numberOfLines={3}>
          {request.problem}
        </Text>
      ) : null}

      <RequestPhotoGallery
        photos={request.photos as any}
        theme={theme}
        title={photosTitle}
      />

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
          block
          style={styles.actionBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1},
  bell: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.16)',
  },
  h2: {fontSize: 17, fontWeight: '700'},
  service: {marginTop: 2, fontSize: 13, fontWeight: '600'},
  timer: {alignItems: 'flex-end'},
  timerStrong: {color: '#FF3B30', fontSize: 16, fontWeight: '700'},
  customer: {fontSize: 17, fontWeight: '700', marginBottom: 8},
  field: {fontSize: 14, lineHeight: 20, marginBottom: 8, fontWeight: '500'},
  muted: {fontSize: 13, marginBottom: 8},
  actions: {flexDirection: 'column', gap: 10, marginTop: 16},
  actionBtn: {minHeight: 52, width: '100%'},
});
