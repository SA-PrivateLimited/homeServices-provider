import React, {useEffect, useMemo, useState} from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Button,
  Select,
  pickPhoneContact,
  toast,
  toE164,
  localTenDigits,
} from 'sapvt-ltd-app-packages';
import {contactRecommendationsApi} from '../services/api/contactRecommendationsApi';
import {getServiceCategories} from '../services/api/serviceCategoriesApi';
import {getGeographyMeta} from '../services/api/geographyApi';
import PhoneNumberInput from './PhoneNumberInput';
import {ApiError} from '../services/api/apiClient';
import {getUserFacingErrorMessage} from '../utils/userFacingError';
import useTranslation from '../hooks/useTranslation';
import type {Theme} from '../utils/theme';

type Props = {
  theme: Theme;
  open: boolean;
  defaultServiceType?: string;
  onClose: () => void;
};

const FALLBACK_SERVICES = [
  'Plumber',
  'Electrician',
  'Carpenter',
  'Painter',
  'AC Repair',
  'Driver',
  'Cleaning',
  'Other',
];

function bilingual(en: string, hi?: string) {
  const hindi = hi?.trim();
  if (!hindi || hindi === en) return en;
  return `${hindi} / ${en}`;
}

export function SuggestPartnerModal({
  theme,
  open,
  defaultServiceType,
  onClose,
}: Props) {
  const {t} = useTranslation();
  const [serviceType, setServiceType] = useState(defaultServiceType || '');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [stateId, setStateId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [serviceOptions, setServiceOptions] = useState<
    {value: string; label: string}[]
  >([]);
  const [states, setStates] = useState<{value: string; label: string}[]>([]);
  const [districts, setDistricts] = useState<
    {value: string; label: string; stateId: string}[]
  >([]);

  useEffect(() => {
    if (!open) return;
    setServiceType(defaultServiceType || '');
    setName('');
    setPhone('');
    setNotes('');
    setStateId('');
    setDistrictId('');
    setError(null);
    setBusy(false);
    setDone(false);
  }, [open, defaultServiceType]);

  useEffect(() => {
    if (!open) return;
    void Promise.all([
      getServiceCategories().catch(() => []),
      getGeographyMeta().catch(() => ({states: [], districts: []})),
    ]).then(([cats, geo]) => {
      const fromApi = cats.map(c => c.name).filter(Boolean);
      const merged = [...fromApi, ...FALLBACK_SERVICES];
      const unique: {value: string; label: string}[] = [];
      const seen = new Set<string>();
      for (const raw of merged) {
        const key = raw.trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const cat = cats.find(c => c.name === raw);
        unique.push({
          value: raw,
          label: bilingual(raw, cat?.nameHindi),
        });
      }
      setServiceOptions(unique);
      setStates((geo.states || []).map(s => ({value: s._id, label: s.name})));
      setDistricts(
        (geo.districts || []).map(d => ({
          value: d._id,
          label: d.name,
          stateId: d.stateId,
        })),
      );
    });
  }, [open]);

  const districtOptions = useMemo(
    () =>
      districts
        .filter(d => !stateId || d.stateId === stateId)
        .map(d => ({value: d.value, label: d.label})),
    [districts, stateId],
  );

  const buildAddress = () => {
    const stateLabel = states.find(s => s.value === stateId)?.label;
    const districtLabel = districtOptions.find(d => d.value === districtId)?.label;
    const parts = [districtLabel, stateLabel, notes.trim()].filter(Boolean);
    return parts.length ? parts.join(', ') : undefined;
  };

  const submit = async () => {
    setError(null);
    if (localTenDigits(phone).length !== 10) {
      setError(String(t('errors.enterPhone') || t('recommendations.invalidPhone')));
      return;
    }
    if (!serviceType) {
      setError(String(t('collab.serviceRequired')));
      return;
    }
    setBusy(true);
    try {
      await contactRecommendationsApi.create({
        recommendedProviderName:
          name.trim() || String(t('collab.partnerFallback')),
        recommendedProviderPhone: toE164(phone),
        serviceType,
        address: buildAddress(),
      });
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        if (/already registered as an Akan(?:so|sho) Partner/i.test(err.message)) {
          setError(String(t('collab.suggestAlreadyPartner')));
        } else if (/already been suggested/i.test(err.message)) {
          setError(String(t('collab.suggestAlreadySuggested')));
        } else if (/existing Akan(?:so|sho) customer/i.test(err.message)) {
          setError(String(t('collab.suggestAlreadyCustomer')));
        } else {
          setError(getUserFacingErrorMessage(err));
        }
      } else {
          setError(getUserFacingErrorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const firstName = name.trim().split(/\s+/).filter(Boolean)[0] || '';

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}>
        <View style={[styles.sheet, {backgroundColor: theme.card}]}>
          <Text style={[styles.title, {color: theme.text}]}>
            {done
              ? t('collab.suggestSuccessTitle')
              : t('collab.suggestNewTitle')}
          </Text>
          {done ? (
            <>
              <Text style={{color: theme.textSecondary, marginBottom: 12}}>
                {t('recommendations.successMessage')}
              </Text>
              <Button
                variant="primary"
                block
                title={String(t('common.close') || t('common.done'))}
                onPress={onClose}
              />
            </>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled">
              <Select
                label={String(t('common.serviceType') || t('collab.otherServices'))}
                value={serviceType}
                options={serviceOptions}
                onChange={setServiceType}
                placeholder={String(t('common.serviceType'))}
              />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={String(
                  t('recommendations.providerName') || t('collab.partnerFallback'),
                )}
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, {color: theme.text, borderColor: theme.border}]}
              />
              <PhoneNumberInput value={phone} onChangeText={setPhone} />
              <Button
                variant="ghost"
                block
                title={String(t('collab.suggestPickContact') || t('recommendations.pickContact') || 'Contacts')}
                loading={picking}
                onPress={() => {
                  setPicking(true);
                  void pickPhoneContact()
                    .then(picked => {
                      if (!picked) return;
                      if (picked.name) setName(picked.name);
                      if (picked.phone) setPhone(picked.phone);
                    })
                    .catch(() =>
                      toast.info(String(t('collab.suggestPickerUnavailable'))),
                    )
                    .finally(() => setPicking(false));
                }}
                style={{marginVertical: 8}}
              />
              {states.length ? (
                <Select
                  label={String(t('browse.state') || t('common.state') || 'State')}
                  value={stateId}
                  options={[{value: '', label: '—'}, ...states]}
                  onChange={value => {
                    setStateId(value);
                    setDistrictId('');
                  }}
                  placeholder={String(t('browse.state') || 'State')}
                />
              ) : null}
              {districtOptions.length ? (
                <Select
                  label={String(t('browse.district') || 'District')}
                  value={districtId}
                  options={[{value: '', label: '—'}, ...districtOptions]}
                  onChange={setDistrictId}
                  placeholder={String(t('browse.district') || 'District')}
                />
              ) : null}
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder={String(t('collab.notesLabel'))}
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, {color: theme.text, borderColor: theme.border}]}
              />
              {error ? (
                <Text style={{color: theme.error, marginBottom: 8}}>
                  {error}
                </Text>
              ) : null}
              <Button
                variant="primary"
                block
                title={
                  firstName
                    ? String(t('collab.suggestSubmitNamed', {name: firstName}))
                    : String(t('collab.suggestSubmitContact') || t('collab.suggestCta'))
                }
                loading={busy}
                onPress={() => void submit()}
              />
              <Button
                variant="ghost"
                block
                title={String(t('common.close') || 'Close')}
                onPress={onClose}
                style={{marginTop: 8}}
              />
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 28,
    gap: 10,
  },
  title: {fontSize: 17, fontWeight: '700', marginBottom: 8},
  input: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    marginTop: 8,
  },
});
