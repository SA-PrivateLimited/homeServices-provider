import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Button, Icon, ConfirmDialog, SearchBar} from 'sapvt-ltd-app-packages';
import useTranslation from '../hooks/useTranslation';
import {
  addMyProviderService,
  getMyProviderProfile,
  updateProviderServiceAvailability,
  type ProviderProfile,
} from '../services/api/jobsApi';
import {getServiceCategories, type ServiceCategory} from '../services/api/serviceCategoriesApi';
import {getUserFacingErrorMessage} from '../utils/userFacingError';
import {
  allPartnerServices,
  canReceiveJobs,
  isPartnerServiceActive,
  verificationOf,
  verificationStatusLabelKey,
} from '../utils/partnerServices';
import {serviceCategoryIcon} from '../utils/serviceIcons';
import {useResolvedTheme} from '../hooks/useResolvedTheme';
import {useStore} from '../store';
import {CrystalSurface} from '../components/CrystalSurface';

export default function MyServicesScreen({navigation}: any) {
  const {t, i18n} = useTranslation();
  const theme = useResolvedTheme();
  const {isDarkMode} = useStore();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmOff, setConfirmOff] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProfile(await getMyProviderProfile());
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void getServiceCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [load]);

  const services = useMemo(() => allPartnerServices(profile), [profile]);
  const existing = useMemo(
    () => new Set(services.map(s => s.toLowerCase())),
    [services],
  );
  const addable = useMemo(() => {
    const q = addQuery.trim().toLowerCase();
    return categories.filter(c => {
      if (!c.name || existing.has(c.name.toLowerCase())) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        String((c as {nameHi?: string}).nameHi || '')
          .toLowerCase()
          .includes(q)
      );
    });
  }, [categories, existing, addQuery]);

  const toggle = async (name: string, active: boolean) => {
    setBusy(name);
    try {
      setProfile(await updateProviderServiceAvailability(name, active));
    } catch (err) {
      getUserFacingErrorMessage(err, 'generic');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, {backgroundColor: theme.background}]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{backgroundColor: theme.background}}
      contentContainerStyle={styles.pad}>
      <Text style={[styles.lead, {color: theme.textSecondary}]}>
        {String(t('settings.myServicesLead'))}
      </Text>
      <Text style={[styles.hint, {color: theme.textSecondary}]}>
        {String(t('settings.myServicesOnlineHint'))}
      </Text>
      {services.map(name => {
        const status = verificationOf(profile, name);
        const active = isPartnerServiceActive(profile, name);
        const statusLabel = String(t(verificationStatusLabelKey(status)));
        return (
          <CrystalSurface
            key={name}
            primary={theme.primary}
            card={theme.card}
            isDark={isDarkMode}
            style={styles.cardWrap}>
            <View style={styles.card}>
              <Pressable
                style={styles.cardMain}
                onPress={() =>
                  navigation.navigate('ServiceDetails', {serviceName: name})
                }
                accessibilityRole="button"
                accessibilityLabel={`${name}. ${statusLabel}. ${String(
                  t('settings.openServiceDetails'),
                )}`}>
                <Icon
                  name={serviceCategoryIcon(undefined, name)}
                  size={22}
                  color={theme.text}
                />
                <View style={styles.copy}>
                  <Text style={[styles.title, {color: theme.text}]}>{name}</Text>
                  <Text style={[styles.sub, {color: theme.textSecondary}]}>
                    {statusLabel}
                    {' · '}
                    {active
                      ? String(t('settings.acceptJobsOn'))
                      : String(t('settings.acceptJobsOff'))}
                  </Text>
                {!canReceiveJobs(profile, name) && status !== 'approved' ? (
                  <Text style={[styles.warn, {color: theme.warning}]}>
                    {String(t('settings.serviceNeedsReview'))}
                  </Text>
                ) : null}
                </View>
                <Icon
                  name="chevron_right"
                  size={20}
                  color={theme.textSecondary}
                />
              </Pressable>
              <View style={[styles.toggleWrap, {borderLeftColor: theme.border}]}>
                <Button
                  size="sm"
                  variant={active ? 'secondary' : 'primary'}
                  loading={busy === name}
                  onPress={() => {
                    if (active) setConfirmOff(name);
                    else void toggle(name, true);
                  }}>
                  {active
                    ? String(t('settings.acceptJobsShortOff'))
                    : String(t('settings.acceptJobsShortOn'))}
                </Button>
              </View>
            </View>
          </CrystalSurface>
        );
      })}
      <Button variant="secondary" onPress={() => setAddOpen(true)}>
        {String(t('settings.addService'))}
      </Button>
      <ConfirmDialog
        visible={Boolean(confirmOff)}
        title={String(t('settings.turnOffServiceTitle'))}
        message={String(t('settings.turnOffServiceMessage'))}
        confirmText={String(t('common.confirm'))}
        cancelText={String(t('common.cancel'))}
        onConfirm={() => {
          const name = confirmOff;
          setConfirmOff(null);
          if (name) void toggle(name, false);
        }}
        onCancel={() => setConfirmOff(null)}
      />
      {addOpen ? (
        <View
          style={[
            styles.add,
            {borderColor: theme.border, backgroundColor: theme.card},
          ]}>
          <SearchBar
            value={addQuery}
            onChange={setAddQuery}
            placeholder={String(t('browse.searchPlaceholder'))}
          />
          {addable.slice(0, 20).map(c => (
            <Pressable
              key={c._id || c.name}
              style={[styles.addRow, {borderColor: theme.border}]}
              onPress={() => {
                void addMyProviderService(c.name).then(setProfile);
                setAddOpen(false);
              }}>
              <Text style={{color: theme.text}}>
                {i18n.language?.startsWith('hi')
                  ? (c as any).nameHi || c.name
                  : c.name}
              </Text>
            </Pressable>
          ))}
          <Button variant="ghost" onPress={() => setAddOpen(false)}>
            {String(t('common.close'))}
          </Button>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: {padding: 16, gap: 10, paddingBottom: 40},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  lead: {fontSize: 14, lineHeight: 20, fontWeight: '600'},
  hint: {fontSize: 13, lineHeight: 18, marginBottom: 4},
  cardWrap: {},
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    minWidth: 0,
  },
  toggleWrap: {
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  copy: {flex: 1, minWidth: 0},
  title: {fontSize: 15, fontWeight: '700'},
  sub: {fontSize: 12, marginTop: 2},
  warn: {fontSize: 12, marginTop: 4},
  add: {marginTop: 12, gap: 8, padding: 12, borderRadius: 12, borderWidth: 1},
  addRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
