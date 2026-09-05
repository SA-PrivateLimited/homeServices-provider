import React, {useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {Button, toast} from 'sapvt-ltd-app-packages';
import {createPartnerJobRequest} from '../services/api/partnerCollaborationApi';
import {partnerInitials, partnerPlaceLabel, type PublicPartner} from '../utils/partnerPrivacy';
import {getUserFacingErrorMessage} from '../utils/userFacingError';
import useTranslation from '../hooks/useTranslation';
import type {Theme} from '../utils/theme';

type Props = {
  theme: Theme;
  open: boolean;
  jobId: string;
  jobServiceType?: string;
  partner: PublicPartner | null;
  neededServiceType: string;
  onClose: () => void;
  onSent?: () => void;
};

export function PartnerRequestFlow({
  theme,
  open,
  jobId,
  jobServiceType,
  partner,
  neededServiceType,
  onClose,
  onSent,
}: Props) {
  const {t} = useTranslation();
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const service = neededServiceType || jobServiceType || '';
  const initials = partner
    ? partnerInitials(partner.name || String(t('collab.partnerFallback')))
    : 'P';
  const place = partner ? partnerPlaceLabel(partner.location) : '';

  if (!partner) return null;

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, {backgroundColor: theme.card}]}>
        <Text style={[styles.title, {color: theme.text}]}>
          {t('collab.reviewTitle')}
        </Text>
        <View style={styles.head}>
          <View style={[styles.avatar, {backgroundColor: 'rgba(52,199,89,0.16)'}]}>
            <Text style={{fontWeight: '700', color: theme.primary}}>{initials}</Text>
          </View>
          <View style={{flex: 1}}>
            <Text style={[styles.name, {color: theme.text}]}>{partner.name}</Text>
            <Text style={{color: theme.textSecondary}}>
              {[partner.profession || service, place].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={String(t('collab.extraNotesPlaceholder') || t('collab.extraNotes'))}
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, {color: theme.text, borderColor: theme.border}]}
        />
        <Button
          variant="primary"
          block
          title={String(t('collab.sendRequest') || t('collab.findPartner'))}
          loading={busy}
          onPress={() => {
            setBusy(true);
            void createPartnerJobRequest({
              jobCardId: jobId,
              targetProviderId: partner.id,
              neededServiceType: service,
              extraNotes: notes.trim() || undefined,
            })
              .then(() => {
                toast.success(String(t('collab.requestSent')));
                onSent?.();
                onClose();
              })
              .catch(err => toast.info(getUserFacingErrorMessage(err)))
              .finally(() => setBusy(false));
          }}
        />
        <Button
          variant="ghost"
          block
          title={String(t('common.cancel'))}
          onPress={onClose}
          style={{marginTop: 8}}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    borderTopLeftRadius: 16,
    paddingBottom: 28,
    gap: 10,
  },
  title: {fontSize: 17, fontWeight: '700'},
  head: {flexDirection: 'row', gap: 10, alignItems: 'center'},
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {fontSize: 16, fontWeight: '700'},
  input: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
});
