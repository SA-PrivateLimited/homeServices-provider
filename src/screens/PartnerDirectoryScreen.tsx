import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Button, Chip, Chips, EmptyState, SearchBar, toE164, toast} from 'sapvt-ltd-app-packages';
import useTranslation from '../hooks/useTranslation';
import {getMyProviderProfile, getJobCardById} from '../services/api/jobsApi';
import {
  listCollaborationPartners,
  listOutgoingPartnerRequests,
  requestPartnerContact,
  type PartnerCollaborationRequest,
} from '../services/api/partnerCollaborationApi';
import type {PublicPartner} from '../utils/partnerPrivacy';
import {partnerInitials, partnerPlaceLabel} from '../utils/partnerPrivacy';
import {
  applyLocationFilter,
  rankPartners,
  type LocationFilter,
} from '../utils/rankPartners';
import {blockedPartnerIdsForJob} from '../utils/collaborationState';
import {getUserFacingErrorMessage} from '../utils/userFacingError';
import {PartnerRequestFlow} from '../components/PartnerRequestFlow';
import {SuggestPartnerModal} from '../components/SuggestPartnerModal';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';

const FILTERS: {key: LocationFilter; labelKey: string}[] = [
  {key: 'nearby', labelKey: 'collab.place.nearby'},
  {key: 'my-district', labelKey: 'collab.place.myDistrict'},
  {key: 'my-state', labelKey: 'collab.place.myState'},
  {key: 'all-states', labelKey: 'collab.place.allStates'},
];

export default function PartnerDirectoryScreen({route}: any) {
  const jobId = String(route?.params?.jobId || route?.params?.id || '');
  const {t} = useTranslation();
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<PublicPartner[]>([]);
  const [outgoing, setOutgoing] = useState<PartnerCollaborationRequest[]>([]);
  const [job, setJob] = useState<{
    serviceType?: string;
    customerAddress?: any;
  } | null>(null);
  const [q, setQ] = useState('');
  const [place, setPlace] = useState<LocationFilter>('nearby');
  const [target, setTarget] = useState<PublicPartner | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [origin, setOrigin] = useState<{
    district?: string;
    city?: string;
    state?: string;
    stateId?: string;
    districtId?: string;
    latitude?: number;
    longitude?: number;
  }>({});

  const reloadOutgoing = () => {
    if (!jobId) return;
    void listOutgoingPartnerRequests()
      .then(setOutgoing)
      .catch(() => setOutgoing([]));
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      try {
        const [me, jobCard] = await Promise.all([
          getMyProviderProfile().catch(() => null),
          jobId ? getJobCardById(jobId).catch(() => null) : Promise.resolve(null),
        ]);
        const a = jobCard?.customerAddress;
        const loc = (me as any)?.location || {};
        if (active) {
          setJob(jobCard);
          setOrigin({
            district: a?.district || a?.city || loc.district || loc.city,
            city: a?.city || loc.city,
            state: a?.state || loc.state,
            stateId: loc.stateId,
            districtId: a?.districtId || loc.districtId,
            latitude: a?.latitude,
            longitude: a?.longitude,
          });
        }
        const [list, out] = await Promise.all([
          listCollaborationPartners({
            serviceType: jobCard?.serviceType,
            limit: 80,
          }),
          listOutgoingPartnerRequests().catch(() => [] as PartnerCollaborationRequest[]),
        ]);
        if (active) {
          setPartners(list);
          setOutgoing(out);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [jobId]);

  const blockedIds = useMemo(
    () => (jobId ? blockedPartnerIdsForJob(outgoing, jobId) : new Set<string>()),
    [outgoing, jobId],
  );

  const visible = useMemo(() => {
    const located = applyLocationFilter(partners, place, origin).filter(
      p => !blockedIds.has(p.id),
    );
    const ranked = rankPartners(located, {origin});
    const needle = q.trim().toLowerCase();
    if (!needle) return ranked;
    return ranked.filter(p =>
      [p.name, p.profession, partnerPlaceLabel(p.location)]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [partners, place, origin, q, blockedIds]);

  if (loading) {
    return (
      <View style={[styles.center, {backgroundColor: theme.background}]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, {backgroundColor: theme.background}]}>
      <SearchBar value={q} onChange={setQ} placeholder={t('collab.searchPartners')} />
      <Chips wrap style={{marginVertical: 8}}>
        {FILTERS.map(f => (
          <Chip
            key={f.key}
            label={t(f.labelKey)}
            selected={place === f.key}
            onPress={() => setPlace(f.key)}
          />
        ))}
      </Chips>
      <Button
        size="sm"
        variant="secondary"
        onPress={() => setSuggestOpen(true)}
        style={{marginBottom: 10}}>
        {t('collab.suggestCta')}
      </Button>
      {visible.length === 0 ? (
        <EmptyState
          icon="search"
          title={String(t('collab.emptyTitle'))}
          message={String(t('collab.emptyBody'))}
        />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={item => item.id}
          renderItem={({item}) => (
            <View
              style={[
                styles.card,
                {borderColor: theme.border, backgroundColor: theme.card},
              ]}>
              <Text style={[styles.name, {color: theme.text}]}>
                {partnerInitials(item.name)} · {item.name}
              </Text>
              <Text style={[styles.meta, {color: theme.textSecondary}]}>
                {item.profession} · {partnerPlaceLabel(item.location)}
              </Text>
              <View style={styles.row}>
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => {
                    void requestPartnerContact(item.id)
                      .then(phone => Linking.openURL(`tel:${toE164(phone)}`))
                      .catch(err =>
                        toast.info(getUserFacingErrorMessage(err, 'generic')),
                      );
                  }}>
                  {t('collab.contact')}
                </Button>
                {jobId ? (
                  <Button size="sm" onPress={() => setTarget(item)}>
                    {t('collab.requestForJob')}
                  </Button>
                ) : null}
              </View>
            </View>
          )}
        />
      )}
      <PartnerRequestFlow
        theme={theme}
        open={Boolean(target)}
        jobId={jobId}
        jobServiceType={job?.serviceType}
        partner={target}
        neededServiceType={job?.serviceType || ''}
        onClose={() => setTarget(null)}
        onSent={() => {
          setTarget(null);
          reloadOutgoing();
        }}
      />
      <SuggestPartnerModal
        theme={theme}
        open={suggestOpen}
        defaultServiceType={job?.serviceType}
        onClose={() => setSuggestOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, padding: 16},
  center: {flex: 1, justifyContent: 'center'},
  card: {
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 10,
    gap: 6,
  },
  name: {fontWeight: '700', fontSize: 16},
  meta: {fontSize: 13},
  row: {flexDirection: 'row', gap: 8, marginTop: 6},
});
