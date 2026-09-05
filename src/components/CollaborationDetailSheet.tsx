import React, {useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {Button, toast} from 'sapvt-ltd-app-packages';
import {
  lookupPartnerProfession,
  requestPartnerContact,
  type PartnerCollaborationRequest,
} from '../services/api/partnerCollaborationApi';
import {
  collaborationPlace,
  collaborationStatusLabelKey,
} from '../utils/collaborationState';
import {partnerInitials} from '../utils/partnerPrivacy';
import {getUserFacingErrorMessage} from '../utils/userFacingError';
import {openCall} from '../services/contactActions';
import useTranslation from '../hooks/useTranslation';
import type {Theme} from '../utils/theme';

type Props = {
  theme: Theme;
  open: boolean;
  collab: PartnerCollaborationRequest | null;
  onClose: () => void;
};

export function CollaborationDetailSheet({theme, open, collab, onClose}: Props) {
  const {t} = useTranslation();
  const [calling, setCalling] = useState(false);
  const [profession, setProfession] = useState<string>();

  React.useEffect(() => {
    if (!open || !collab || collab.targetProviderProfession) {
      setProfession(collab?.targetProviderProfession);
      return;
    }
    let cancelled = false;
    void lookupPartnerProfession(
      collab.targetProviderId,
      collab.targetProviderName,
    ).then(value => {
      if (!cancelled && value) setProfession(value);
    });
    return () => {
      cancelled = true;
    };
  }, [open, collab]);

  if (!collab) return null;

  const place = collaborationPlace(collab);
  const initials = partnerInitials(collab.targetProviderName);
  const partnerMeta = [profession, place].filter(Boolean).join(' · ');
  const jobService = collab.jobServiceType || collab.neededServiceType;
  const customerName = collab.customerName || String(t('jobs.nameUnavailable'));

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, {backgroundColor: theme.card}]}>
        <Text style={[styles.title, {color: theme.text}]}>
          {t('collab.partnerDetailsTitle')}
        </Text>
        <View style={styles.head}>
          <View style={[styles.avatar, {backgroundColor: 'rgba(52,199,89,0.16)'}]}>
            <Text style={{color: theme.primary, fontWeight: '700'}}>{initials}</Text>
          </View>
          <View style={{flex: 1}}>
            <Text style={[styles.name, {color: theme.text}]}>
              {collab.targetProviderName}
            </Text>
            {partnerMeta ? (
              <Text style={{color: theme.textSecondary}}>{partnerMeta}</Text>
            ) : null}
          </View>
        </View>
        <Text style={[styles.kicker, {color: theme.textSecondary}]}>
          {t('collab.coopSection')}
        </Text>
        <Text style={[styles.status, {color: theme.primary}]}>
          {t(collaborationStatusLabelKey(collab.status))}
        </Text>
        <Text style={[styles.kicker, {color: theme.textSecondary}]}>
          {t('collab.customerJob')}
        </Text>
        <Text style={{color: theme.text, marginBottom: 8}}>
          {jobService} · {customerName}
        </Text>
        {collab.problem ? (
          <Text style={{color: theme.text, marginBottom: 8}}>{collab.problem}</Text>
        ) : null}
        <Button
          variant="secondary"
          block
          title={String(t('collab.contact'))}
          loading={calling}
          onPress={() => {
            setCalling(true);
            void requestPartnerContact(collab.targetProviderId)
              .then(phone => openCall(phone))
              .catch(err => toast.info(getUserFacingErrorMessage(err)))
              .finally(() => setCalling(false));
          }}
        />
        <Button
          variant="ghost"
          block
          title={String(t('common.close') || 'Close')}
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
    borderTopRightRadius: 16,
    paddingBottom: 28,
  },
  title: {fontSize: 17, fontWeight: '700', marginBottom: 12},
  head: {flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 12},
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {fontSize: 16, fontWeight: '700'},
  kicker: {fontSize: 12, fontWeight: '700', marginTop: 8, marginBottom: 4},
  status: {fontSize: 14, fontWeight: '600'},
});
