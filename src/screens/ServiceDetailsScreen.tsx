import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {Button, Input, toast} from 'sapvt-ltd-app-packages';
import useTranslation from '../hooks/useTranslation';
import {
  getMyServiceDetails,
  submitMyServiceForReview,
  updateMyServiceDetails,
  type PartnerServiceDetails,
  type ServiceQualificationDocument,
  type ServiceVerificationStatus,
} from '../services/api/jobsApi';
import {uploadAssetFromUri} from '../services/api/assetsApi';
import {getUserFacingErrorMessage} from '../utils/userFacingError';
import {useResolvedTheme} from '../hooks/useResolvedTheme';
import {
  normalizeVerificationStatus,
  verificationStatusLabelKey,
} from '../utils/partnerServices';

export default function ServiceDetailsScreen({route}: any) {
  const serviceName = String(route?.params?.serviceName || '');
  const {t} = useTranslation();
  const theme = useResolvedTheme();
  const [details, setDetails] = useState<PartnerServiceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [experience, setExperience] = useState('');
  const [notes, setNotes] = useState('');
  const [docs, setDocs] = useState<ServiceQualificationDocument[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const reload = () => {
    if (!serviceName) return;
    setLoading(true);
    void getMyServiceDetails(serviceName)
      .then(d => {
        setDetails(d);
        setExperience(String(d.qualification?.experience ?? ''));
        setNotes(String(d.qualification?.notes ?? ''));
        setDocs(d.qualification?.documents || []);
      })
      .catch(() => setDetails(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
  }, [serviceName]);

  const saveDraft = (nextDocs = docs) => {
    setSaving(true);
    void updateMyServiceDetails(serviceName, {
      experience: Number(experience) || undefined,
      notes,
      documents: nextDocs,
    })
      .then(() => toast.success(String(t('common.saved') || t('common.save'))))
      .catch(err => toast.info(getUserFacingErrorMessage(err)))
      .finally(() => setSaving(false));
  };

  const pickDoc = (reqKey: string, label?: string) => {
    launchImageLibrary({mediaType: 'mixed', quality: 0.75}, async response => {
      const asset = response.assets?.[0];
      if (!asset?.uri) return;
      setUploadingKey(reqKey);
      try {
        const ref = await uploadAssetFromUri(asset.uri, {
          purpose: 'provider-request-document',
          contentType: asset.type || 'image/jpeg',
          fileName: asset.fileName || `${reqKey}.jpg`,
          docKey: reqKey,
        });
        const next = [
          ...docs.filter(d => d.key !== reqKey),
          {
            key: reqKey,
            label: label || reqKey,
            url: ref.url,
            fileName: ref.fileName,
            uploadedAt: new Date().toISOString(),
          },
        ];
        setDocs(next);
        saveDraft(next);
      } catch (err) {
        toast.info(getUserFacingErrorMessage(err));
      } finally {
        setUploadingKey(null);
      }
    });
  };

  if (loading) {
    return (
      <View style={[styles.center, {backgroundColor: theme.background}]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  const required = details?.requiredDocuments || [];
  const status: ServiceVerificationStatus = normalizeVerificationStatus(
    details?.qualification?.verificationStatus,
  );
  const statusLabel = String(t(verificationStatusLabelKey(status)));
  const canSubmit = status === 'required' || status === 'rejected';

  return (
    <ScrollView
      style={{backgroundColor: theme.background}}
      contentContainerStyle={styles.pad}>
      <Text style={[styles.h, {color: theme.text}]}>{serviceName}</Text>
      <Text style={[styles.status, {color: theme.text}]}>
        {statusLabel}
      </Text>
      {status === 'pending' ? (
        <Text style={[styles.muted, {color: theme.textSecondary}]}>
          {String(t('settings.verification.underReviewHint'))}
        </Text>
      ) : null}
      {status === 'rejected' && details?.qualification?.rejectionReason ? (
        <Text style={[styles.warn, {color: theme.warning}]}>
          {details.qualification.rejectionReason}
        </Text>
      ) : null}
      {status === 'approved' ? (
        <Text style={[styles.muted, {color: theme.textSecondary}]}>
          {String(t('settings.verification.approvedHint'))}
        </Text>
      ) : null}
      {status === 'required' ? (
        <Text style={[styles.muted, {color: theme.textSecondary}]}>
          {String(t('settings.verification.needsDocumentsHint'))}
        </Text>
      ) : null}

      <Input
        label={String(t('settings.experienceYears'))}
        keyboardType="number-pad"
        value={experience}
        onChangeText={setExperience}
        editable={status !== 'pending'}
      />
      <Input
        label={String(t('settings.serviceNotes'))}
        multiline
        value={notes}
        onChangeText={setNotes}
        editable={status !== 'pending'}
      />
      {required.map(req => {
        const existing = docs.find(d => d.key === req.key);
        return (
          <View key={req.key} style={styles.docRow}>
            <Text style={[styles.docLabel, {color: theme.text}]}>
              {req.labelHi || req.label || req.key}
              {req.required ? ' *' : ''}
            </Text>
            {existing?.url ? (
              <Image source={{uri: existing.url}} style={styles.thumb} />
            ) : null}
            {status !== 'pending' ? (
              <Button
                variant="secondary"
                size="sm"
                loading={uploadingKey === req.key}
                title={String(
                  existing
                    ? t('common.replace') || 'Replace'
                    : t('common.upload') || 'Upload',
                )}
                onPress={() => pickDoc(req.key, req.label)}
              />
            ) : null}
            {existing && status !== 'pending' ? (
              <Button
                variant="ghost"
                size="sm"
                title={String(t('common.remove') || 'Remove')}
                onPress={() => {
                  const next = docs.filter(d => d.key !== req.key);
                  setDocs(next);
                  saveDraft(next);
                }}
              />
            ) : null}
          </View>
        );
      })}

      {canSubmit ? (
        <Button
          variant="primary"
          loading={submitting}
          title={String(t('settings.submitForReview'))}
          onPress={() => {
            setSubmitting(true);
            void submitMyServiceForReview(serviceName)
              .then(() => {
                toast.success(String(t('settings.submitForReviewDone')));
                reload();
              })
              .catch(err => toast.info(getUserFacingErrorMessage(err)))
              .finally(() => setSubmitting(false));
          }}
        />
      ) : null}
      {status === 'required' || status === 'rejected' ? (
        <Button
          variant="secondary"
          loading={saving}
          title={String(t('settings.saveDraft'))}
          onPress={() => saveDraft()}
        />
      ) : null}
      {status === 'approved' ? (
        <Button
          variant="secondary"
          loading={saving}
          title={String(t('common.save'))}
          onPress={() => saveDraft()}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: {padding: 16, gap: 12, paddingBottom: 40},
  center: {flex: 1, justifyContent: 'center'},
  h: {fontSize: 20, fontWeight: '700'},
  status: {fontSize: 15, fontWeight: '700'},
  muted: {fontSize: 13, lineHeight: 18},
  warn: {fontSize: 13, lineHeight: 18},
  docRow: {gap: 8, paddingVertical: 8},
  docLabel: {fontSize: 14, fontWeight: '600'},
  thumb: {width: 72, height: 72, borderRadius: 8},
});
