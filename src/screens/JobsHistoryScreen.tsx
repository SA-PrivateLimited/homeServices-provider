/**
 * Job history — mapped from partner-web HistoryPage + HistoryPage.css.
 */

import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Button, Chip, Chips, EmptyState, Icon} from 'sapvt-ltd-app-packages';
import {glassTabOverlayPad} from '../navigation/GlassTabBar';
import useTranslation from '../hooks/useTranslation';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {
  getMyJobCards,
  type ProviderJobCard,
} from '../services/api/jobsApi';
import {formatJobDate, normalizeJobStatusKey} from '../utils/jobStatus';
import {jobCustomerDisplayName} from '../utils/partnerDisplayName';
import {historyFromWeb as s} from '../fromWebCss/historyFromWeb.styles';
import {CrystalSurface, mixColor} from '../components/CrystalSurface';
import {navigationRef} from '../navigation/rootNavigation';

const PAGE_SIZE = 50;
const FILTERS = ['completed', 'cancelled'] as const;

function jobId(job: ProviderJobCard): string {
  const row = job as ProviderJobCard & {jobCardId?: string};
  return String(row._id || row.id || row.jobCardId || '').trim();
}

/** Compact history meta — scanning, not Active-job status lines. */
function historyDateLine(
  status: string | undefined,
  date: string | undefined,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const formatted = formatJobDate(date);
  if (!formatted) return '';
  const key = normalizeJobStatusKey(status);
  if (key === 'completed') {
    return String(t('history.completedMeta', {date: formatted}));
  }
  if (key === 'cancelled' || key === 'rejected') {
    return String(t('history.cancelledMeta', {date: formatted}));
  }
  return formatted;
}

function matchesHistoryFilter(
  job: ProviderJobCard,
  filter: (typeof FILTERS)[number],
): boolean {
  const key = normalizeJobStatusKey(job.status);
  if (filter === 'completed') return key === 'completed';
  return key === 'cancelled' || key === 'rejected';
}

function sortByUpdatedDesc(a: ProviderJobCard, b: ProviderJobCard): number {
  const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
  const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
  return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
}

/** Open root-stack JobDetails (same destination Active jobs use). */
function openJobDetails(navigation: any, id: string) {
  const jobCardId = String(id || '').trim();
  if (!jobCardId) return;

  const params = {jobCardId};
  let root = navigation;
  while (root?.getParent?.()) {
    root = root.getParent();
  }
  if (root?.navigate) {
    root.navigate('JobDetails', params);
    return;
  }
  if (navigationRef.isReady()) {
    navigationRef.navigate('JobDetails', params);
  }
}

/**
 * Prefer status query (web parity); fall back to full list + client filter
 * — same source Active tab uses when the filtered call fails.
 */
async function fetchHistoryRows(
  filter: (typeof FILTERS)[number],
): Promise<ProviderJobCard[]> {
  try {
    const filtered = await getMyJobCards({
      status: filter,
      limit: PAGE_SIZE,
      offset: 0,
    });
    if (Array.isArray(filtered)) {
      return filtered;
    }
  } catch (err) {
    console.warn('[JobsHistory] status filter fetch failed, falling back', err);
  }

  const all = await getMyJobCards({limit: 100, offset: 0});
  const list = Array.isArray(all) ? all : [];
  return list
    .filter(job => matchesHistoryFilter(job, filter))
    .sort(sortByUpdatedDesc)
    .slice(0, PAGE_SIZE);
}

export default function JobsHistoryScreen({navigation}: any) {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const {isDarkMode, colorTheme} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const primary = theme.primary;
  const success = theme.success;
  const errorColor = theme.error;
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('completed');
  const [rows, setRows] = useState<ProviderJobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(
    async (nextFilter: (typeof FILTERS)[number], silent?: boolean) => {
      if (!silent) setLoading(true);
      setError(false);
      try {
        const batch = await fetchHistoryRows(nextFilter);
        setRows(batch);
      } catch (err) {
        console.warn('[JobsHistory] load failed', err);
        setRows([]);
        setError(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void load(filter);
    }, [filter, load]),
  );

  const emptyTitle = error
    ? String(t('history.loadFailedTitle'))
    : filter === 'cancelled'
      ? String(t('history.emptyCancelledTitle'))
      : String(t('history.emptyCompletedTitle'));
  const emptyMessage = error
    ? String(t('history.loadFailedMessage'))
    : filter === 'cancelled'
      ? String(t('history.emptyCancelledMessage'))
      : String(t('history.emptyCompletedMessage'));

  return (
    <View style={[s.page, {backgroundColor: theme.background}]}>
      <Text style={[s.pageSub, {color: theme.textSecondary}]}>
        {String(t('history.pageSub'))}
      </Text>
      <Chips wrap={false} style={s.filters}>
        {FILTERS.map(key => {
          const active = filter === key;
          const label =
            key === 'completed'
              ? String(t('status.filter.completed'))
              : String(t('history.cancelledChip'));
          return (
            <Chip
              key={key}
              selected={active}
              variant="default"
              style={
                active
                  ? [s.chipOn, {backgroundColor: primary, borderColor: primary}]
                  : [
                      s.chipOff,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      },
                    ]
              }
              label={
                <Text style={active ? s.chipOnText : [s.chipOffText, {color: theme.text}]}>
                  {label}
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
          <Text style={[s.muted, {color: theme.textSecondary}]}>
            {String(t('history.loading'))}
          </Text>
        </View>
      ) : (
        <FlatList
          style={{flex: 1}}
          data={rows}
          extraData={`${colorTheme}-${primary}-${success}-${isDarkMode}-${error}`}
          keyExtractor={(item, index) => jobId(item) || `row-${index}`}
          contentContainerStyle={
            rows.length === 0
              ? {flexGrow: 1}
              : [s.list, {paddingBottom: glassTabOverlayPad(insets.bottom)}]
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load(filter, true);
              }}
              tintColor={primary}
            />
          }
          ListEmptyComponent={
            <View style={{paddingHorizontal: 16, paddingTop: 24}}>
              <EmptyState
                iconGlyph="📋"
                title={emptyTitle}
                message={emptyMessage}
                colors={{
                  text: theme.text,
                  textSecondary: theme.textSecondary,
                  primary,
                }}
              />
              {error ? (
                <Button
                  variant="secondary"
                  block
                  title={String(t('actions.tryAgain') || 'Try again')}
                  onPress={() => void load(filter)}
                  style={{marginTop: 16}}
                />
              ) : null}
            </View>
          }
          renderItem={({item}) => {
            const id = jobId(item);
            const status = String(item.status || '');
            const statusKey = normalizeJobStatusKey(status);
            const dateLine = historyDateLine(
              status,
              item.updatedAt || item.createdAt,
              t,
            );
            const customerName = jobCustomerDisplayName(
              item.customerName ||
                (item as {patientName?: string}).patientName,
              String(t('jobs.unnamedCustomer')),
            );
            const serviceType = item.serviceType || String(t('jobs.service'));
            const cancelReason = String(item.cancellationReason || '').trim();
            const cancelled =
              statusKey === 'cancelled' || statusKey === 'rejected';

            return (
              <CrystalSurface
                primary={primary}
                card={theme.card}
                isDark={isDarkMode}
                statusColor={
                  cancelled
                    ? mixColor(errorColor, '#64748B', 0.7)
                    : success
                }
                intensity="history"
                compact
                interactive
                style={[
                  s.card,
                  {
                    borderLeftWidth: 4,
                    borderLeftColor: cancelled ? errorColor : success,
                  },
                ]}>
                <TouchableOpacity
                  onPress={() => openJobDetails(navigation, id)}
                  accessibilityLabel={String(t('jobs.viewJobDetails'))}
                  accessibilityRole="button"
                  activeOpacity={0.88}
                  style={s.row}>
                  <View style={s.main}>
                    <Text style={[s.title, {color: theme.text}]}>
                      {serviceType}
                    </Text>
                    <Text style={[s.customer, {color: theme.textSecondary}]}>
                      {customerName}
                    </Text>
                    {cancelled && cancelReason ? (
                      <Text style={[s.reason, {color: errorColor}]}>
                        {String(
                          t('jobDetail.reason', {reason: cancelReason}),
                        )}
                      </Text>
                    ) : null}
                    {dateLine ? (
                      <Text style={[s.meta, {color: theme.textSecondary}]}>
                        {dateLine}
                      </Text>
                    ) : null}
                  </View>
                  <Icon
                    name="chevron_right"
                    size={22}
                    color={theme.textSecondary}
                    style={s.chevron}
                  />
                </TouchableOpacity>
              </CrystalSurface>
            );
          }}
        />
      )}
    </View>
  );
}
