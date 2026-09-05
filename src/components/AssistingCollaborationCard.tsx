import React, {useState} from 'react';
import {Linking, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Button, toast} from 'sapvt-ltd-app-packages';
import {
  completePartnerCollaboration,
  requestPartnerContact,
  type PartnerCollaborationRequest,
} from '../services/api/partnerCollaborationApi';
import {collaborationPlace} from '../utils/collaborationState';
import {getUserFacingErrorMessage} from '../utils/userFacingError';
import {openCall, openNavigate} from '../services/contactActions';
import type {Theme} from '../utils/theme';

type Props = {
  theme: Theme;
  collab: PartnerCollaborationRequest;
  busy?: boolean;
  title: string;
  lead: string;
  customerLabel: string;
  primaryLabel: string;
  contactLabel: string;
  directionsLabel: string;
  completeLabel: string;
  onComplete?: () => void;
};

export function AssistingCollaborationCard({
  theme,
  collab,
  busy = false,
  title,
  lead,
  customerLabel,
  primaryLabel,
  contactLabel,
  directionsLabel,
  completeLabel,
  onComplete,
}: Props) {
  const [calling, setCalling] = useState(false);
  const [completing, setCompleting] = useState(false);
  const place = collaborationPlace(collab);
  const notes = collab.extraNotes || collab.problem;

  const onContactPrimary = async () => {
    setCalling(true);
    try {
      const phone = await requestPartnerContact(collab.requestingProviderId);
      await openCall(phone);
    } catch (err) {
      toast.info(getUserFacingErrorMessage(err));
    } finally {
      setCalling(false);
    }
  };

  const onDirections = async () => {
    const loc = collab.location;
    try {
      await openNavigate({
        latitude: loc?.latitude,
        longitude: loc?.longitude,
        address: loc?.address || place,
      });
    } catch {
      if (place) {
        await Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place)}`,
        );
      }
    }
  };

  const onMarkComplete = async () => {
    setCompleting(true);
    try {
      await completePartnerCollaboration(collab.id);
      toast.success(completeLabel);
      onComplete?.();
    } catch (err) {
      toast.info(getUserFacingErrorMessage(err));
    } finally {
      setCompleting(false);
    }
  };

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
        {collab.neededServiceType || collab.jobServiceType}
      </Text>
      {collab.customerName ? (
        <Text style={[styles.field, {color: theme.text}]}>
          {customerLabel}: {collab.customerName}
        </Text>
      ) : null}
      {place ? (
        <Text style={[styles.field, {color: theme.text}]}>{place}</Text>
      ) : null}
      {notes ? (
        <Text style={[styles.field, {color: theme.text}]} numberOfLines={3}>
          {notes}
        </Text>
      ) : null}
      <Text style={[styles.muted, {color: theme.textSecondary}]}>
        {primaryLabel}: {collab.requestingProviderName}
      </Text>
      <View style={styles.actions}>
        <Button
          variant="secondary"
          title={contactLabel}
          onPress={() => void onContactPrimary()}
          loading={calling}
          disabled={busy || calling}
          block
          style={styles.actionBtn}
        />
        {place || collab.location?.latitude != null ? (
          <Button
            variant="secondary"
            title={directionsLabel}
            onPress={() => void onDirections()}
            disabled={busy}
            block
            style={styles.actionBtn}
          />
        ) : null}
        <Button
          variant="primary"
          title={completeLabel}
          onPress={() => void onMarkComplete()}
          loading={completing}
          disabled={busy || completing}
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
