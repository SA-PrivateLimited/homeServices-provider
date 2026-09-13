import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Button, ConfirmDialog, SearchBar} from 'sapvt-ltd-app-packages';
import {
  cancelPartnerRequest,
  listCollaborationPartners,
  listOutgoingPartnerRequests,
  type PartnerCollaborationRequest,
} from '../services/api/partnerCollaborationApi';
import {getServiceCategories, type ServiceCategory} from '../services/api/serviceCategoriesApi';
import {
  blockedPartnerIdsForJob,
  collaborationsForJob,
  collaborationStatusLabelKey,
  joinedCollaborationCount,
} from '../utils/collaborationState';
import {
  professionMatches,
  rankPartners,
  type RankOrigin,
} from '../utils/rankPartners';
import {
  partnerInitials,
  partnerPlaceLabel,
  type PublicPartner,
} from '../utils/partnerPrivacy';
import {serviceCategoryIcon} from '../utils/serviceIcons';
import {getUserFacingErrorMessage} from '../utils/userFacingError';
import {useStore} from '../store';
import useTranslation from '../hooks/useTranslation';
import {SuggestPartnerModal} from './SuggestPartnerModal';
import {CollaborationDetailSheet} from './CollaborationDetailSheet';
import {PartnerRequestFlow} from './PartnerRequestFlow';
import type {Theme} from '../utils/theme';

type JobLike = {
  id?: string;
  _id?: string;
  serviceType?: string;
  customerAddress?: {
    district?: string;
    city?: string;
    state?: string;
    stateId?: string;
    districtId?: string;
    latitude?: number;
    longitude?: number;
  };
};

type Props = {
  theme: Theme;
  job: JobLike;
  canHelp?: boolean;
};

function originFromJob(job: JobLike): RankOrigin {
  const a = job.customerAddress;
  return {
    district: a?.district || a?.city,
    city: a?.city,
    state: a?.state,
    stateId: a?.stateId,
    districtId: a?.districtId,
    latitude: a?.latitude,
    longitude: a?.longitude,
  };
}

function matchesLocalQuery(partner: PublicPartner, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const digits = needle.replace(/\D/g, '');
  const hay = [
    partner.name,
    partner.profession,
    ...(partner.serviceCategories || []),
    partner.location?.city,
    partner.location?.district,
    partner.location?.state,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (hay.includes(needle)) return true;
  return digits.length >= 4 && hay.includes(digits);
}

function toIcon(name: string) {
  return name.replace(/_/g, '-');
}

export function JobHelpSection({theme, job, canHelp = true}: Props) {
  const {t, currentLanguage} = useTranslation();
  const isHindi = String(currentLanguage || '').startsWith('hi');
  const myId = String(useStore(s => s.currentUser?.id || (s.currentUser as any)?._id || ''));
  const jobId = String(job._id || job.id || '');

  const [outgoing, setOutgoing] = useState<PartnerCollaborationRequest[]>([]);
  const collabs = useMemo(
    () => collaborationsForJob(outgoing, jobId),
    [outgoing, jobId],
  );
  const joined = joinedCollaborationCount(outgoing, jobId);
  const pending = collabs.filter(c => c.status === 'pending');
  const accepted = collabs.filter(c => c.status === 'accepted');

  const [open, setOpen] = useState(false);
  const [neededService, setNeededService] = useState(job.serviceType || '');
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [svcQuery, setSvcQuery] = useState('');
  const [addAnother, setAddAnother] = useState(false);
  const prevJoined = useRef(joined);
  const [partners, setPartners] = useState<PublicPartner[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [target, setTarget] = useState<PublicPartner | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [detailCollab, setDetailCollab] =
    useState<PartnerCollaborationRequest | null>(null);
  const [removeCollab, setRemoveCollab] =
    useState<PartnerCollaborationRequest | null>(null);
  const [busy, setBusy] = useState(false);

  const reloadOutgoing = useCallback(async () => {
    if (!jobId) return;
    const all = await listOutgoingPartnerRequests(jobId);
    setOutgoing(all);
  }, [jobId]);

  useEffect(() => {
    void reloadOutgoing();
  }, [reloadOutgoing]);

  useEffect(() => {
    if (prevJoined.current === 0 && joined > 0) {
      setAddAnother(false);
    }
    prevJoined.current = joined;
  }, [joined]);

  useEffect(() => {
    void getServiceCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setNeededService(job.serviceType || '');
  }, [job.serviceType]);

  useEffect(() => {
    const handle = setTimeout(() => setSearchQ(searchInput.trim()), 280);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    if (!open || !jobId) return;
    const blocked = blockedPartnerIdsForJob(outgoing, jobId);
    const origin = originFromJob(job);
    const q = searchQ.trim();
    const service = neededService || job.serviceType || '';
    let cancelled = false;
    setListLoading(true);
    setListError(null);
    void listCollaborationPartners({
      serviceType: q ? undefined : service || undefined,
      q: q || undefined,
      limit: 100,
    })
      .then(rows => {
        if (cancelled) return;
        let ranked = rankPartners(
          rows.filter(p => !blocked.has(p.id)),
          {
            serviceType: service,
            origin,
            excludeId: myId,
          },
        );
        if (q) {
          ranked = ranked.filter(p => matchesLocalQuery(p, q));
        } else if (service) {
          const matching = ranked.filter(p => professionMatches(p, service));
          ranked = matching.length ? matching : ranked;
        }
        setPartners(ranked);
      })
      .catch(err => {
        if (cancelled) return;
        setListError(getUserFacingErrorMessage(err));
        setPartners([]);
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, job, jobId, neededService, searchQ, outgoing, myId]);

  const catalog = useMemo(() => {
    const names = categories.map(c => c.name).filter(Boolean);
    if (
      job.serviceType &&
      !names.some(n => n.toLowerCase() === job.serviceType!.toLowerCase())
    ) {
      return [
        {_id: job.serviceType, name: job.serviceType, nameHindi: job.serviceType},
        ...categories,
      ];
    }
    return categories;
  }, [categories, job.serviceType]);

  const recommended = useMemo(() => {
    const current = job.serviceType?.toLowerCase() || '';
    const needle = svcQuery.trim().toLowerCase();
    const filtered = needle
      ? catalog.filter(c => {
          const label = [c.name, c.nameHindi, c.description, c.descriptionHindi]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return label.includes(needle);
        })
      : catalog;
    const currentCat = filtered.filter(
      c => current && c.name.toLowerCase() === current,
    );
    const others = filtered.filter(
      c => !current || c.name.toLowerCase() !== current,
    );
    return {currentCat, others, isFiltering: Boolean(needle)};
  }, [catalog, job.serviceType, svcQuery]);

  const isSearching = Boolean(searchQ.trim());
  const showSearch = joined === 0 || addAnother;

  const headerTitle = accepted.length
    ? t('collab.helpingTitle')
    : pending.length
      ? t('collab.helpPendingTitle')
      : t('collab.helpTitle');
  const collapsedHint = accepted.length
    ? t('collab.helpingCollapsed', {
        name: accepted[0].targetProviderName,
        service: accepted[0].neededServiceType,
      })
    : pending.length
      ? t('collab.helpPendingCollapsed', {
          name: pending[0].targetProviderName,
        })
      : t('collab.helpSub');

  if (!canHelp || !jobId) return null;

  const renderPartnerSearch = () => (
    <View>
      <SearchBar
        value={searchInput}
        onChange={setSearchInput}
        placeholder={String(t('collab.searchPartnerPlaceholder'))}
      />
      <Text style={[styles.sectionLabel, {color: theme.textSecondary}]}>
        {isSearching ? t('collab.searchResults') : t('collab.recommendedForJob')}
      </Text>
      {listError ? (
        <Text style={{color: theme.error}}>{listError}</Text>
      ) : null}
      {listLoading ? (
        <ActivityIndicator color={theme.primary} style={{marginVertical: 12}} />
      ) : partners.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{color: theme.text, fontWeight: '600'}}>
            {isSearching ? t('collab.searchEmptyTitle') : t('collab.emptyTitle')}
          </Text>
          <Text style={{color: theme.textSecondary, marginTop: 4}}>
            {isSearching ? t('collab.searchEmptyBody') : t('collab.emptyBody')}
          </Text>
        </View>
      ) : (
        partners.slice(0, 20).map(p => {
          const place = partnerPlaceLabel(p.location);
          return (
            <View key={p.id} style={[styles.partnerRow, {borderColor: theme.border}]}>
              <View style={[styles.avatar, {backgroundColor: 'rgba(52,199,89,0.16)'}]}>
                <Text style={{color: theme.primary, fontWeight: '700'}}>
                  {partnerInitials(p.name)}
                </Text>
              </View>
              <View style={{flex: 1, minWidth: 0}}>
                <Text style={[styles.name, {color: theme.text}]} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={[styles.meta, {color: theme.textSecondary}]} numberOfLines={1}>
                  {[p.profession, place].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Button
                variant="primary"
                size="sm"
                title={String(t('collab.requestForJob'))}
                onPress={() => setTarget(p)}
              />
            </View>
          );
        })
      )}
    </View>
  );

  const renderServicePicker = () => {
    const others = recommended.isFiltering
      ? recommended.others
      : recommended.others.slice(0, 12);
    return (
      <View>
        <Text style={[styles.sectionLabel, {color: theme.textSecondary}]}>
          {String(t('collab.otherServices'))}
        </Text>
        <SearchBar
          value={svcQuery}
          onChange={setSvcQuery}
          placeholder={String(t('collab.searchServicePlaceholder'))}
        />
        {recommended.currentCat.length && !recommended.isFiltering
          ? recommended.currentCat.map(cat => (
              <TouchableOpacity
                key={cat._id || cat.name}
                style={[
                  styles.svcRow,
                  neededService.toLowerCase() === cat.name.toLowerCase()
                    ? {backgroundColor: 'rgba(52,199,89,0.12)'}
                    : null,
                ]}
                onPress={() => setNeededService(cat.name)}>
                <Icon
                  name={toIcon(serviceCategoryIcon(cat.icon, cat.name))}
                  size={18}
                  color={theme.primary}
                />
                <View style={{flex: 1}}>
                  <Text style={{color: theme.text, fontWeight: '700'}}>
                    {isHindi && cat.nameHindi ? cat.nameHindi : cat.name}
                  </Text>
                  <Text style={{color: theme.primary, fontSize: 12}}>
                    {String(t('collab.suggestedShort'))}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          : null}
        {others.map(cat => (
          <TouchableOpacity
            key={cat._id || cat.name}
            style={[
              styles.svcRow,
              neededService.toLowerCase() === cat.name.toLowerCase()
                ? {backgroundColor: 'rgba(52,199,89,0.12)'}
                : null,
            ]}
            onPress={() => setNeededService(cat.name)}>
            <Icon
              name={toIcon(serviceCategoryIcon(cat.icon, cat.name))}
              size={18}
              color={theme.primary}
            />
            <Text style={{color: theme.text, fontWeight: '600', flex: 1}}>
              {isHindi && cat.nameHindi ? cat.nameHindi : cat.name}
            </Text>
          </TouchableOpacity>
        ))}
        <Button
          variant="ghost"
          block
          title={String(t('collab.suggestCta'))}
          onPress={() => setSuggestOpen(true)}
          style={{marginTop: 8}}
        />
      </View>
    );
  };

  return (
    <View
      style={[styles.card, {backgroundColor: 'rgba(52, 199, 89, 0.08)'}]}
      accessibilityLabel={String(t('collab.coopSection'))}>
      <TouchableOpacity
        style={styles.toggle}
        onPress={() => setOpen(v => !v)}
        accessibilityRole="button"
        accessibilityState={{expanded: open}}>
        <View style={{flex: 1}}>
          <View style={styles.toggleTitle}>
            <Icon name="group" size={18} color={theme.primary} />
            <Text style={[styles.title, {color: theme.text}]}>{headerTitle}</Text>
          </View>
          {!open ? (
            <Text style={[styles.hint, {color: theme.textSecondary}]}>
              {collapsedHint}
            </Text>
          ) : null}
        </View>
        <Icon
          name={open ? 'expand-less' : 'expand-more'}
          size={22}
          color={theme.textSecondary}
        />
      </TouchableOpacity>

      {open ? (
        <View style={styles.body}>
          {joined === 0 ? (
            <>
              <Text style={[styles.lead, {color: theme.textSecondary}]}>
                {String(t('collab.helpSub'))}
              </Text>
              {renderPartnerSearch()}
            </>
          ) : (
            <>
              {collabs.map(c => (
                <View
                  key={c.id}
                  style={[styles.collabRow, {borderColor: theme.border}]}>
                  <View style={{flex: 1, minWidth: 0}}>
                    <Text style={[styles.name, {color: theme.text}]}>
                      {c.targetProviderName || t('collab.partnerFallback')}
                    </Text>
                    <Text style={[styles.meta, {color: theme.textSecondary}]}>
                      {c.neededServiceType} · {String(t(collaborationStatusLabelKey(c.status)))}
                    </Text>
                  </View>
                  <Button
                    variant="ghost"
                    size="sm"
                    title={String(t('collab.viewRequest') || t('collab.contact'))}
                    onPress={() => setDetailCollab(c)}
                  />
                  {c.status === 'pending' || c.status === 'accepted' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      title={String(t('common.cancel'))}
                      onPress={() => setRemoveCollab(c)}
                    />
                  ) : null}
                </View>
              ))}
              {!addAnother ? (
                <Button
                  variant="secondary"
                  block
                  title={String(t('collab.addAnotherPartnerQ'))}
                  onPress={() => setAddAnother(true)}
                />
              ) : (
                renderPartnerSearch()
              )}
            </>
          )}
          {showSearch ? renderServicePicker() : null}
        </View>
      ) : null}

      <SuggestPartnerModal
        theme={theme}
        open={suggestOpen}
        defaultServiceType={job.serviceType}
        onClose={() => setSuggestOpen(false)}
      />
      <PartnerRequestFlow
        theme={theme}
        open={Boolean(target)}
        jobId={jobId}
        jobServiceType={job.serviceType}
        partner={target}
        neededServiceType={neededService || job.serviceType || ''}
        onClose={() => setTarget(null)}
        onSent={() => {
          setTarget(null);
          void reloadOutgoing();
        }}
      />
      <CollaborationDetailSheet
        theme={theme}
        open={Boolean(detailCollab)}
        collab={detailCollab}
        onClose={() => setDetailCollab(null)}
      />
      <ConfirmDialog
        visible={Boolean(removeCollab)}
        type="danger"
        title={String(t('collab.replaceTitle'))}
        message={
          removeCollab?.status === 'accepted'
            ? String(t('collab.replaceConfirmAccepted'))
            : String(
                t('collab.replaceConfirm', {
                  name: removeCollab?.targetProviderName || '',
                }),
              )
        }
        confirmText={String(t('collab.replaceYesAction'))}
        cancelText={String(t('collab.replaceNoKeep'))}
        onCancel={() => setRemoveCollab(null)}
        onConfirm={() => {
          if (!removeCollab || busy) return;
          setBusy(true);
          void cancelPartnerRequest(removeCollab.id)
            .then(() => {
              setRemoveCollab(null);
              void reloadOutgoing();
            })
            .finally(() => setBusy(false));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  toggle: {flexDirection: 'row', alignItems: 'center', gap: 8},
  toggleTitle: {flexDirection: 'row', alignItems: 'center', gap: 8},
  title: {fontSize: 16, fontWeight: '700'},
  hint: {fontSize: 13, marginTop: 4, lineHeight: 18},
  body: {marginTop: 12, gap: 10},
  lead: {fontSize: 13, lineHeight: 18},
  sectionLabel: {fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 6},
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  collabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {fontSize: 14, fontWeight: '600'},
  meta: {fontSize: 12, marginTop: 2},
  empty: {paddingVertical: 12},
  svcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
});
