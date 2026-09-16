import {StyleSheet} from 'react-native';
import {PROVIDER_WEB as W} from 'sapvt-ltd-app-packages';

/** Mapped from HistoryPage.css + list-card compact (global.css). */
export const historyFromWeb = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: W.background,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  pageSub: {
    marginBottom: 10,
    fontSize: 13,
    lineHeight: 18,
    color: W.textSecondary,
  },
  filters: {
    marginBottom: 12,
    gap: 8,
  },
  chipOn: {
    borderWidth: 0,
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
    paddingBottom: 24,
    paddingTop: 2,
  },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(26, 32, 44, 0.08)',
    marginBottom: 8,
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  cardCompleted: {
    borderLeftWidth: 4,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cardCancelled: {
    borderLeftWidth: 4,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    color: W.text,
  },
  customer: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: W.textSecondary,
  },
  reason: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    color: W.error,
  },
  meta: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: W.textSecondary,
  },
  chevron: {
    marginTop: 2,
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
