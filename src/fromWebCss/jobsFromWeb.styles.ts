import {StyleSheet} from 'react-native';
import {PROVIDER_WEB as W} from 'sapvt-ltd-app-packages';

/** Mapped from partner-web JobsPage.css (mobile). */
export const jobsFromWeb = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: W.background,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  toolbarHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  toolbarSub: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: W.textSecondary,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: {
    marginBottom: 8,
  },
  chipOn: {
    borderWidth: 0,
    backgroundColor: '#2D3748',
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  chipOff: {
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  chipOnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  chipOffText: {
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    paddingBottom: 28,
    gap: 12,
    paddingTop: 4,
  },
  card: {
    borderRadius: 18,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardInner: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  cardAccepted: {
    borderLeftWidth: 4,
  },
  cardInProgress: {
    borderLeftWidth: 4,
  },
  cardPending: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: W.text,
  },
  status: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  customer: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: W.textSecondary,
  },
  fields: {
    marginTop: 12,
    gap: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: W.textSecondary,
    marginBottom: 2,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '700',
    color: W.text,
    lineHeight: 20,
  },
  fieldMuted: {
    color: W.textSecondary,
    fontWeight: '500',
  },
  date: {
    marginTop: 2,
    fontSize: 12,
    color: W.textSecondary,
  },
  actions: {
    marginTop: 12,
    gap: 8,
  },
  openBtn: {
    minHeight: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  openBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  callBtn: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  callBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  center: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  muted: {
    marginTop: 8,
    fontSize: 13,
    color: W.textSecondary,
  },
});
