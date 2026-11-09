import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {launchImageLibrary} from 'react-native-image-picker';
import {uploadAssetFromUri} from '../services/api/assetsApi';
import {
  saveProviderKycNumber,
  saveProviderKycUpload,
  type Provider,
  type ProviderDocKey,
  type ProviderDocuments,
} from '../services/api/providersApi';
import useTranslation from '../hooks/useTranslation';
import type {Theme} from '../utils/theme';
import {
  formatIdNumber,
  genericDocNumberIssue,
  idProofNumberIssue,
  type AddressProofKind,
  type CertificateKind,
  type IdProofKind,
} from '../utils/kycFormat';

const ID_TYPES: IdProofKind[] = ['aadhaar', 'pan', 'dl', 'voter', 'passport'];
const ADDRESS_TYPES: AddressProofKind[] = ['utility', 'rent', 'aadhaar', 'other'];
const CERT_TYPES: CertificateKind[] = ['trade', 'licence', 'other'];

const ROWS: {
  key: ProviderDocKey;
  required: boolean;
  icon: string;
  types: readonly string[];
  labelKey: string;
  hintKey: string;
  typeLabelKey: string;
  numberLabelKey: string;
  uploadKey: string;
  replaceKey: string;
}[] = [
  {
    key: 'idProof',
    required: true,
    icon: 'badge',
    types: ID_TYPES,
    labelKey: 'kyc.idProof',
    hintKey: 'kyc.idProofHint',
    typeLabelKey: 'kyc.idTypeLabel',
    numberLabelKey: 'kyc.idProofNumberLabel',
    uploadKey: 'kyc.uploadIdProof',
    replaceKey: 'kyc.replaceDocument',
  },
  {
    key: 'addressProof',
    required: false,
    icon: 'home',
    types: ADDRESS_TYPES,
    labelKey: 'kyc.addressProof',
    hintKey: 'kyc.addressProofHint',
    typeLabelKey: 'kyc.docTypeLabel',
    numberLabelKey: 'kyc.addressProofNumberLabel',
    uploadKey: 'kyc.uploadAddressProof',
    replaceKey: 'kyc.replaceDocument',
  },
  {
    key: 'certificate',
    required: false,
    icon: 'card-membership',
    types: CERT_TYPES,
    labelKey: 'kyc.certificate',
    hintKey: 'kyc.certificateHint',
    typeLabelKey: 'kyc.docTypeLabel',
    numberLabelKey: 'kyc.certificateNumberLabel',
    uploadKey: 'kyc.uploadCertificate',
    replaceKey: 'kyc.replaceDocument',
  },
];

type Props = {
  theme: Theme;
  documents?: Provider['documents'];
  onUpdated: (docs: NonNullable<Provider['documents']>) => void;
  embedded?: boolean;
};

function docNumber(docs: ProviderDocuments | undefined, key: ProviderDocKey) {
  return String(docs?.[`${key}Number` as keyof ProviderDocuments] || '').trim();
}

function docType(docs: ProviderDocuments | undefined, key: ProviderDocKey) {
  return String(docs?.[`${key}Type` as keyof ProviderDocuments] || '').trim();
}

function isFilled(docs: ProviderDocuments | undefined, key: ProviderDocKey) {
  return Boolean(docs?.[key] || docNumber(docs, key));
}

function typeLabelKey(key: ProviderDocKey, kind: string) {
  if (key === 'idProof') return `kyc.idType.${kind}`;
  if (key === 'addressProof') return `kyc.addressType.${kind}`;
  return `kyc.certType.${kind}`;
}

function numberPlaceholderKey(key: ProviderDocKey, kind: string) {
  if (key === 'idProof' && kind) return `kyc.idNumberPlaceholder.${kind}`;
  if (key === 'idProof') return 'kyc.idProofNumberPlaceholder';
  if (key === 'addressProof') return 'kyc.addressProofNumberPlaceholder';
  return 'kyc.certificateNumberPlaceholder';
}

export function KycDocumentsCard({
  theme,
  documents,
  onUpdated,
  embedded = false,
}: Props) {
  const {t} = useTranslation();
  const [busyKey, setBusyKey] = useState<ProviderDocKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<ProviderDocKey, string>>({
    idProof: '',
    addressProof: '',
    certificate: '',
  });
  const [types, setTypes] = useState<Record<ProviderDocKey, string>>({
    idProof: '',
    addressProof: '',
    certificate: '',
  });

  useEffect(() => {
    setDrafts({
      idProof: docNumber(documents, 'idProof'),
      addressProof: docNumber(documents, 'addressProof'),
      certificate: docNumber(documents, 'certificate'),
    });
    setTypes({
      idProof: docType(documents, 'idProof'),
      addressProof: docType(documents, 'addressProof'),
      certificate: docType(documents, 'certificate'),
    });
  }, [documents]);

  const idDone = isFilled(documents, 'idProof');
  const filledCount = useMemo(
    () => ROWS.filter(row => isFilled(documents, row.key)).length,
    [documents],
  );
  const hasRejected = useMemo(
    () =>
      ROWS.some(row =>
        Boolean(documents?.[`${row.key}Rejected` as keyof ProviderDocuments]),
      ),
    [documents],
  );
  const [open, setOpen] = useState(embedded || !idDone || hasRejected);
  const panelOpen = embedded || open;

  const issueMessage = (key: ProviderDocKey, value: string, kind: string) => {
    const issue =
      key === 'idProof'
        ? idProofNumberIssue(value, kind as IdProofKind)
        : genericDocNumberIssue(value);
    if (issue === 'aadhaar') return String(t('kyc.invalidAadhaar'));
    if (issue === 'pan') return String(t('kyc.invalidPan'));
    if (issue === 'short') return String(t('kyc.numberTooShort'));
    return '';
  };

  const persist = async (
    key: ProviderDocKey,
    number: string,
    kind: string,
    fileUri?: string,
    fileMeta?: {contentType?: string; fileName?: string},
  ) => {
    if (documents?.[`${key}Verified` as keyof ProviderDocuments]) {
      setError(String(t('kyc.verifiedLocked')));
      return;
    }
    if (key === 'idProof' && !kind) {
      setError(String(t('kyc.chooseIdType')));
      return;
    }
    if (key !== 'idProof' && (number || fileUri) && !kind) {
      setError(String(t('kyc.chooseDocType')));
      return;
    }
    const problem = issueMessage(key, number, kind);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setBusyKey(key);
    try {
      const updated = fileUri
        ? await saveProviderKycUpload(
            key,
            (
              await uploadAssetFromUri(fileUri, {
                purpose: 'provider-document',
                contentType: fileMeta?.contentType || 'image/jpeg',
                fileName: fileMeta?.fileName || `${key}.jpg`,
                docKey: key,
              })
            ).url,
            documents,
            number,
            kind,
          )
        : await saveProviderKycNumber(key, number, documents, kind);
      onUpdated(updated.documents || {});
    } catch (e: any) {
      setError(String(e?.message || t('errors.generic')));
    } finally {
      setBusyKey(null);
    }
  };

  const pick = (key: ProviderDocKey) => {
    if (documents?.[`${key}Verified` as keyof ProviderDocuments]) {
      setError(String(t('kyc.verifiedLocked')));
      return;
    }
    launchImageLibrary({mediaType: 'photo', quality: 0.75}, async response => {
      const asset = response.assets?.[0];
      if (!asset?.uri) return;
      await persist(key, drafts[key].trim(), types[key], asset.uri, {
        contentType: asset.type || 'image/jpeg',
        fileName: asset.fileName || `${key}.jpg`,
      });
    });
  };

  const body = (
    <View style={styles.panel}>
      <Text style={[styles.lead, {color: theme.textSecondary}]}>
        {String(t('kyc.leadRequiredId') || t('kyc.lead'))}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {ROWS.map(row => {
        const url = documents?.[row.key];
        const savedNumber = docNumber(documents, row.key);
        const kind = types[row.key];
        const verified = Boolean(
          documents?.[`${row.key}Verified` as keyof ProviderDocuments],
        );
        const rejected = Boolean(
          documents?.[`${row.key}Rejected` as keyof ProviderDocuments],
        );
        const reason = String(
          documents?.[
            `${row.key}RejectionReason` as keyof ProviderDocuments
          ] || '',
        );
        const filled = isFilled(documents, row.key);
        const status = verified
          ? 'approved'
          : rejected
            ? 'rejected'
            : filled
              ? 'uploaded'
              : 'empty';
        const statusLabel =
          status === 'approved'
            ? t('kyc.statusVerified')
            : status === 'rejected'
              ? t('kyc.rejected')
              : status === 'uploaded'
                ? t('kyc.statusAdded')
                : t('kyc.statusNotAdded');
        const statusColor =
          status === 'approved'
            ? theme.success
            : status === 'rejected'
              ? theme.error
              : status === 'uploaded'
                ? theme.primary
                : theme.textSecondary;

        return (
          <View
            key={row.key}
            style={[styles.doc, {borderColor: theme.border, backgroundColor: theme.card}]}>
            <View style={styles.docHead}>
              <View style={[styles.docIcon, {backgroundColor: `${theme.primary}14`}]}>
                <Icon name={row.icon} size={20} color={theme.primary} />
              </View>
              <View style={{flex: 1, minWidth: 0}}>
                <View style={styles.titleRow}>
                  <Text style={[styles.docTitle, {color: theme.text}]}>
                    {String(t(row.labelKey))}
                  </Text>
                  <Text
                    style={[
                      styles.badge,
                      {color: row.required ? theme.warning : theme.textSecondary},
                    ]}>
                    {row.required
                      ? String(t('profile.statusRequired') || 'Required')
                      : String(t('profile.statusOptional') || 'Optional')}
                  </Text>
                </View>
                <Text style={[styles.hint, {color: theme.textSecondary}]}>
                  {String(t(row.hintKey))}
                </Text>
              </View>
              <Text style={[styles.status, {color: statusColor}]}>
                {String(statusLabel)}
              </Text>
            </View>
            {rejected && reason ? (
              <Text style={[styles.error, {marginTop: 8}]}>{reason}</Text>
            ) : null}

            <Text style={[styles.fieldLabel, {color: theme.textSecondary}]}>
              {String(t(row.typeLabelKey))}
              {row.required ? ' *' : ''}
            </Text>
            <View style={styles.chipRow}>
              {row.types.map(item => {
                const selected = kind === item;
                return (
                  <TouchableOpacity
                    key={item}
                    disabled={verified || busyKey === row.key}
                    onPress={() => {
                      setTypes(current => ({...current, [row.key]: item}));
                      const nextNumber =
                        row.key === 'idProof'
                          ? formatIdNumber(item as IdProofKind, drafts[row.key])
                          : drafts[row.key];
                      setDrafts(current => ({...current, [row.key]: nextNumber}));
                      if (savedNumber || url) {
                        void persist(row.key, nextNumber.trim(), item);
                      }
                    }}
                    style={[
                      styles.chip,
                      {
                        borderColor: selected ? theme.primary : theme.border,
                        backgroundColor: selected
                          ? `${theme.primary}14`
                          : 'transparent',
                      },
                    ]}>
                    <Text
                      style={{
                        color: selected ? theme.primary : theme.text,
                        fontSize: 12,
                        fontWeight: '600',
                      }}>
                      {String(t(typeLabelKey(row.key, item)))}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.fieldLabel, {color: theme.textSecondary}]}>
              {String(t(row.numberLabelKey))}
              {row.required ? ` (${String(t('kyc.orUpload'))})` : ''}
            </Text>
            <TextInput
              value={drafts[row.key]}
              editable={!verified && busyKey !== row.key}
              placeholder={String(t(numberPlaceholderKey(row.key, kind)))}
              placeholderTextColor={theme.placeholder}
              autoCapitalize="characters"
              autoCorrect={false}
              keyboardType={kind === 'aadhaar' ? 'number-pad' : 'default'}
              onChangeText={value =>
                setDrafts(current => ({
                  ...current,
                  [row.key]:
                    row.key === 'idProof'
                      ? formatIdNumber(kind as IdProofKind, value)
                      : value.slice(0, 40),
                }))
              }
              onEndEditing={() => {
                const next = drafts[row.key].trim();
                if (next === savedNumber && kind === docType(documents, row.key)) {
                  return;
                }
                if (!next && !kind) return;
                void persist(row.key, next, kind);
              }}
              style={[
                styles.input,
                {color: theme.text, borderColor: theme.border},
              ]}
            />
            {savedNumber ? (
              <Text style={[styles.saved, {color: theme.textSecondary}]}>
                {kind
                  ? `${String(t(typeLabelKey(row.key, kind)))} ${savedNumber}`
                  : `${String(t(row.numberLabelKey))} ${savedNumber}`}
              </Text>
            ) : null}

            <TouchableOpacity
              onPress={() => pick(row.key)}
              disabled={verified || busyKey === row.key}
              style={[styles.upload, {borderColor: theme.primary}]}>
              {busyKey === row.key ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <>
                  <Icon name="cloud-upload" size={18} color={theme.primary} />
                  <Text style={{color: theme.primary, fontWeight: '700', fontSize: 13}}>
                    {url
                      ? String(t(row.replaceKey) || t('kyc.replace'))
                      : String(t(row.uploadKey) || t('kyc.upload'))}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {url ? (
              <TouchableOpacity onPress={() => void Linking.openURL(url)}>
                <Text style={{color: theme.primary, fontSize: 12, fontWeight: '600'}}>
                  {String(t('kyc.viewFile') || 'View file')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        );
      })}
    </View>
  );

  if (embedded) {
    return (
      <View style={styles.embedded}>
        <Text style={[styles.heading, {color: theme.text}]}>
          {String(t('profile.docsRowTitle') || t('kyc.title'))}
        </Text>
        <Text style={[styles.sub, {color: theme.textSecondary}]}>
          {idDone
            ? String(
                t('kyc.completedCount', {
                  done: filledCount,
                  total: ROWS.length,
                }),
              )
            : String(t('kyc.idRequiredShort') || t('kyc.lead'))}
        </Text>
        {body}
      </View>
    );
  }

  return (
    <View style={[styles.wrap, {backgroundColor: theme.card, borderColor: theme.border}]}>
      <TouchableOpacity onPress={() => setOpen(v => !v)} style={styles.toggle}>
        <View style={{flex: 1, minWidth: 0}}>
          <Text style={[styles.heading, {color: theme.text}]}>
            {String(t('profile.docsRowTitle') || t('kyc.title'))}
          </Text>
          <Text style={[styles.sub, {color: theme.textSecondary}]}>
            {idDone
              ? String(
                  t('kyc.completedCount', {
                    done: filledCount,
                    total: ROWS.length,
                  }),
                )
              : String(t('kyc.idRequiredShort'))}
          </Text>
        </View>
        <Icon
          name={panelOpen ? 'expand-less' : 'expand-more'}
          size={22}
          color={theme.textSecondary}
        />
      </TouchableOpacity>
      {panelOpen ? body : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12},
  embedded: {marginTop: 8, width: '100%'},
  toggle: {flexDirection: 'row', alignItems: 'center', gap: 8},
  heading: {fontSize: 16, fontWeight: '700'},
  sub: {fontSize: 12, marginTop: 2, lineHeight: 17},
  panel: {marginTop: 10, gap: 12, width: '100%'},
  lead: {fontSize: 13, lineHeight: 18, width: '100%'},
  error: {fontSize: 13, color: '#C53030', fontWeight: '600'},
  doc: {borderWidth: 1, borderRadius: 14, padding: 12, gap: 8},
  docHead: {flexDirection: 'row', alignItems: 'flex-start', gap: 8},
  docIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap'},
  docTitle: {fontSize: 15, fontWeight: '700'},
  badge: {fontSize: 11, fontWeight: '700'},
  hint: {fontSize: 12, lineHeight: 17, marginTop: 2},
  status: {fontSize: 11, fontWeight: '700'},
  fieldLabel: {fontSize: 12, fontWeight: '600', marginTop: 4},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 44,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  saved: {fontSize: 12},
  upload: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 44,
  },
});
