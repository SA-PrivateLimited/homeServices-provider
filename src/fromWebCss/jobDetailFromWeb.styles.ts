import {StyleSheet} from 'react-native';

/** Mapped from partner-web JobDetailPage.css (mobile). */
export const jobDetailFromWeb = StyleSheet.create({
  page: {
    flex: 1,
  },
  pageFlex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 48,
    gap: 12,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  heroIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  heroRefresh: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMessage: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
  },
  heroDate: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  heroReason: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  sectionTitle: {
    marginBottom: 10,
    fontSize: 13,
    fontWeight: '700',
  },
  customerRow: {
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
    overflow: 'hidden',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  customerName: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
  },
  hint: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
  },
  field: {
    marginTop: 12,
  },
  fieldLabel: {
    marginBottom: 4,
    fontSize: 11,
    fontWeight: '600',
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  serviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  directionsBtn: {
    marginTop: 10,
  },
  reqList: {
    gap: 10,
  },
  reqRow: {
    gap: 2,
  },
  reqLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  reqValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  rail: {
    gap: 10,
    marginTop: 4,
    paddingBottom: 8,
  },
  railLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  railRow: {
    flexDirection: 'row',
    gap: 8,
  },
  railStack: {
    gap: 8,
  },
  actionBtn: {
    minHeight: 48,
    paddingVertical: 12,
    overflow: 'visible',
  },
  actionBtnText: {
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'center',
  },
  cancelBtn: {
    minHeight: 48,
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 8,
    overflow: 'visible',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
});
