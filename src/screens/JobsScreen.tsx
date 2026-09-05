/**
 * Active services — mapped from partner-web JobsPage + JobsPage.css.
 */

import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Chip, Chips, EmptyState, Icon} from 'sapvt-ltd-app-packages';
import useTranslation from '../hooks/useTranslation';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {
  getMyJobCards,
  type ProviderJobCard,
} from '../services/api/jobsApi';
import {
  formatJobStatusDate,
  getJobStatusTitle,
  normalizeJobStatusKey,
} from '../utils/jobStatus';
import {jobCustomerDisplayName} from '../utils/partnerDisplayName';
import {
  formatFullAddressLine,
  hasAnyAddress,
} from '../utils/addressDisplay';
import {canCallCustomerOnJob} from '../utils/customerContact';
import {jobsFromWeb as s} from '../fromWebCss/jobsFromWeb.styles';
import {CrystalSurface} from '../components/CrystalSurface';

const ACTIVE_STATUSES = new Set(['pending', 'accepted', 'in-progress']);
const FILTER_KEYS = ['all', 'pending', 'accepted', 'in-progress'] as const;

function jobId(job: ProviderJobCard): string {
  return String(job._id || job.id || '');
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function filterLabelKey(key: string): string {
  switch (key) {
    case 'pending':
      return 'status.filter.pending';
    case 'accepted':
      return 'status.filter.accepted';
    case 'in-progress':
      return 'status.filter.inProgress';
    default:
      return 'status.filter.all';
  }
}

function statusTint(
  statusKey: string,
  primary: string,
  success: string,
  warning: string,
): string {
  // Web JobsPage.css: accepted → --success, in-progress → --primary
  if (statusKey === 'accepted') return success;
  if (statusKey === 'in-progress') return primary;
  if (statusKey === 'pending') return warning;
  return primary;
}

function leftStripe(
  statusKey: string,
  primary: string,
  success: string,
  warning: string,
) {
  const color = statusTint(statusKey, primary, success, warning);
  return {borderLeftWidth: 4, borderLeftColor: color};
}

export default function JobsScreen({navigation}: any) {
  const {t} = useTranslation();
  const {isDarkMode, colorTheme} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const primary = theme.primary;
  // Keep mint success for accepted cards even if branding primary is blue
  const success = theme.success || '#34C759';
  const warning = theme.warning || '#FF9500';
  const [rows, setRows] = useState<ProviderJobCard[]>([]);
  const [filter, setFilter] = useState<(typeof FILTER_KEYS)[number]>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (opts?: {refresh?: boolean}) => {
    if (opts?.refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const jobs = await getMyJobCards();
      setRows(
        jobs.filter(j => ACTIVE_STATUSES.has(String(j.status || ''))),
      );
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {all: rows.length};
    for (const r of rows) {
      const status = String(r.status || '');
      c[status] = (c[status] || 0) + 1;
    }
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter(r => r.status === filter);
  }, [rows, filter]);

  const emptyTitle =
    filter === 'all'
      ? String(t('jobs.emptyTitle'))
      : String(t('jobs.emptyFilteredTitle'));
  const emptyMessage =
    filter === 'all'
      ? String(t('jobs.emptyMessage'))
      : String(t('jobs.emptyFilteredMessage'));

  return (
    <View style={[s.page, {backgroundColor: theme.background}]}>
      <View style={s.toolbarHead}>
        <Text style={[s.toolbarSub, {color: theme.textSecondary}]}>
          {t('jobs.pageSub')}
        </Text>
        <TouchableOpacity
          style={[s.refreshBtn, {backgroundColor: `${primary}1F`}]}
          disabled={refreshing || loading}
          onPress={() => void load({refresh: true})}
          accessibilityLabel={String(t('jobs.refresh'))}>
          <Icon name="refresh" size={20} color={primary} />
        </TouchableOpacity>
      </View>

      <Chips wrap style={s.filters}>
        {FILTER_KEYS.filter(key => {
          if (key === 'all') return true;
          const count = counts[key] || 0;
          return count > 0 || filter === key;
        }).map(key => {
          const count = counts[key] || 0;
          const active = filter === key;
          const label = String(t(filterLabelKey(key)));
          const shown =
            key === 'all' || count > 0 ? `${label} (${count})` : label;
          return (
            <Chip
              key={key}
              selected={active}
              variant={active ? 'success' : 'default'}
              style={
                active
                  ? [s.chipOn, {backgroundColor: primary}]
                  : [
                      s.chipOff,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      },
                    ]
              }
              label={
                <Text
                  style={
                    active
                      ? s.chipOnText
                      : [s.chipOffText, {color: theme.text}]
                  }>
                  {shown}
                </Text>
              }
              onPress={() => setFilter(key)}
            />
          );
        })}
      </Chips>

      {loading && rows.length === 0 ? (
        <View style={s.center}>
          <ActivityIndicator color={primary} />
          <Text style={s.muted}>{t('jobs.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          extraData={`${colorTheme}-${primary}-${success}-${isDarkMode}`}
          keyExtractor={item => jobId(item) || String(Math.random())}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load({refresh: true})}
              tintColor={primary}
            />
          }
          ListEmptyComponent={
            <EmptyState icon="work" title={emptyTitle} message={emptyMessage} />
          }
          renderItem={({item}) => {
            const id = jobId(item);
            const status = String(item.status || '');
            const statusKey = normalizeJobStatusKey(status);
            const dateLine = formatJobStatusDate(
              status,
              item.updatedAt || item.createdAt,
            );
            const customerName = jobCustomerDisplayName(
              item.customerName,
              String(t('jobs.unnamedCustomer')),
            );
            const serviceTitle =
              item.serviceType || String(t('jobs.service'));
            const problemText = String(item.problem || '').trim();
            const addressLine = formatFullAddressLine(item.customerAddress);
            const hasAddress = hasAnyAddress(item.customerAddress);
            const canCall =
              Boolean(item.customerPhone) && canCallCustomerOnJob(item);

            const tint = statusTint(statusKey, primary, success, warning);

            return (
              <CrystalSurface
                primary={primary}
                card={theme.card}
                isDark={isDarkMode}
                statusColor={tint}
                intensity="job"
                style={[s.card, leftStripe(statusKey, primary, success, warning)]}
                contentStyle={s.cardInner}>
                <View style={s.head}>
                  <View
                    style={[s.avatar, {backgroundColor: `${primary}2E`}]}>
                    <Text style={[s.avatarText, {color: theme.text}]}>
                      {initials(customerName)}
                    </Text>
                  </View>
                  <View style={s.copy}>
                    <View style={s.titleRow}>
                      <Text
                        style={[s.title, {color: theme.text}]}
                        numberOfLines={2}>
                        {serviceTitle}
                      </Text>
                      {/* Web StatusChip: accepted + in-progress both use active/primary */}
                      <View
                        style={[
                          s.status,
                          {
                            backgroundColor: `${primary}24`,
                            borderWidth: 1,
                            borderColor: `${primary}59`,
                          },
                        ]}>
                        <Text style={[s.statusText, {color: primary}]}>
                          {getJobStatusTitle(status)}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[s.customer, {color: theme.textSecondary}]}
                      numberOfLines={1}>
                      {customerName}
                    </Text>
                  </View>
                </View>

                <View style={s.fields}>
                  <View>
                    <Text style={[s.fieldLabel, {color: theme.textSecondary}]}>
                      {t('jobs.problemLabel')}
                    </Text>
                    <Text style={[s.fieldValue, {color: theme.text}]}>
                      {problemText || t('jobs.problemMissing')}
                    </Text>
                  </View>
                  <View>
                    <View style={s.fieldLabelRow}>
                      <Icon
                        name="location_on"
                        size={14}
                        color={theme.textSecondary}
                      />
                      <Text
                        style={[s.fieldLabel, {color: theme.textSecondary}]}>
                        {t('jobs.serviceAddressLabel')}
                      </Text>
                    </View>
                    <Text
                      style={[
                        s.fieldValue,
                        {color: theme.text},
                        !hasAddress ? s.fieldMuted : null,
                      ]}>
                      {hasAddress
                        ? addressLine
                        : t('jobs.addressMissing')}
                    </Text>
                  </View>
                  {dateLine ? (
                    <Text style={[s.date, {color: theme.textSecondary}]}>
                      {dateLine}
                    </Text>
                  ) : null}
                </View>

                <View style={s.actions}>
                  <TouchableOpacity
                    style={[s.openBtn, {backgroundColor: primary}]}
                    onPress={() =>
                      navigation.navigate('JobDetails', {jobCardId: id})
                    }
                    accessibilityRole="button">
                    <Text style={s.openBtnText}>{t('jobs.openJob')}</Text>
                    <Icon name="arrow_forward" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                  {canCall && item.customerPhone ? (
                    <TouchableOpacity
                      style={[
                        s.callBtn,
                        {
                          borderColor: theme.border,
                          backgroundColor: isDarkMode
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(255,255,255,0.92)',
                        },
                      ]}
                      onPress={() =>
                        void Linking.openURL(`tel:${item.customerPhone}`)
                      }
                      accessibilityRole="button">
                      <Icon name="call" size={18} color={theme.text} />
                      <Text style={[s.callBtnText, {color: theme.text}]}>
                        {t('contact.callCustomer')}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </CrystalSurface>
            );
          }}
        />
      )}
    </View>
  );
}
