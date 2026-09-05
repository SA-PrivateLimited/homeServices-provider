import React, {useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {uploadAssetFromUri} from '../services/api/assetsApi';
import {updateMyProfile, type Provider} from '../services/api/providersApi';
import useTranslation from '../hooks/useTranslation';
import type {Theme} from '../utils/theme';

const ROWS = [
  {key: 'idProof' as const, labelKey: 'kyc.idProof', hintKey: 'kyc.idProofHint'},
  {
    key: 'addressProof' as const,
    labelKey: 'kyc.addressProof',
    hintKey: 'kyc.addressProofHint',
  },
  {
    key: 'certificate' as const,
    labelKey: 'kyc.certificate',
    hintKey: 'kyc.certificateHint',
  },
];

type Props = {
  theme: Theme;
  documents?: Provider['documents'];
  onUpdated: (docs: NonNullable<Provider['documents']>) => void;
};

export function KycDocumentsCard({theme, documents, onUpdated}: Props) {
  const {t} = useTranslation();
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const pick = (key: 'idProof' | 'addressProof' | 'certificate') => {
    const verified = Boolean(
      documents?.[`${key}Verified` as keyof NonNullable<Provider['documents']>],
    );
    if (verified) return;
    launchImageLibrary({mediaType: 'photo', quality: 0.8}, async response => {
      const asset = response.assets?.[0];
      if (!asset?.uri) return;
      setBusy(key);
      try {
        const ref = await uploadAssetFromUri(asset.uri, {
          purpose: 'provider-document',
          contentType: asset.type || 'image/jpeg',
          fileName: asset.fileName || `${key}.jpg`,
          docKey: key,
        });
        const next = {
          ...(documents || {}),
          [key]: ref.url,
          [`${key}Verified`]: false,
        };
        await updateMyProfile({documents: next});
        onUpdated(next);
      } finally {
        setBusy(null);
      }
    });
  };

  return (
    <View style={[styles.wrap, {backgroundColor: theme.card, borderColor: theme.border}]}>
      <TouchableOpacity onPress={() => setOpen(v => !v)} style={styles.toggle}>
        <Text style={[styles.title, {color: theme.text}]}>
          {String(t('kyc.title') || 'Identity documents')}
        </Text>
        <Text style={{color: theme.primary}}>{open ? '−' : '+'}</Text>
      </TouchableOpacity>
      {open
        ? ROWS.map(row => (
            <View key={row.key} style={styles.row}>
              <View style={{flex: 1}}>
                <Text style={[styles.label, {color: theme.text}]}>
                  {String(t(row.labelKey) || row.key)}
                </Text>
                <Text style={[styles.hint, {color: theme.textSecondary}]}>
                  {documents?.[row.key]
                    ? String(t('kyc.uploaded') || 'Uploaded')
                    : String(t(row.hintKey) || '')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => pick(row.key)}
                disabled={busy === row.key}
                style={[styles.btn, {borderColor: theme.primary}]}>
                {busy === row.key ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Text style={{color: theme.primary, fontWeight: '600', fontSize: 12}}>
                    {String(t('actions.upload') || 'Upload')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  toggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {fontSize: 16, fontWeight: '700'},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  label: {fontSize: 14, fontWeight: '600'},
  hint: {fontSize: 12, marginTop: 2},
  btn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    minHeight: 32,
    justifyContent: 'center',
  },
});
