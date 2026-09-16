import {StyleSheet} from 'react-native';

/** Mapped from `layouts/AppShell.css` + `components/AccountMenu.css` (mobile). */
export const HEADER = {
  text: '#1A202C',
  textSecondary: '#718096',
  primary: '#34C759',
  primaryDark: '#28A745',
  border: '#E2E8F0',
  card: '#FFFFFF',
  error: '#FF3B30',
  avatarBg: 'rgba(52, 199, 89, 0.18)',
  hover: 'rgba(52, 199, 89, 0.08)',
};

export const appHeaderStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FBFCFD',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.55)',
  },
  leading: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  greetTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
    color: HEADER.text,
  },
  greetSub: {
    marginTop: 2,
    fontSize: 13,
    color: HEADER.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const accountMenuStyles = StyleSheet.create({
  triggerWrap: {
    minWidth: 48,
    minHeight: 44,
    justifyContent: 'center',
    overflow: 'visible',
  },
  triggerWrapCompact: {
    width: 40,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    paddingVertical: 2,
    paddingLeft: 2,
    paddingRight: 2,
    borderRadius: 999,
    gap: 2,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 35, 55, 0.52)',
  },
  panelWrap: {
    position: 'absolute',
    right: 12,
    width: 280,
    maxWidth: 320,
  },
  /**
   * Opaque crystal panel — mapped from crystal-glass.css `.account-menu-panel`
   * (card + primary mix, inset highlight, soft elevated shadow; no hard border).
   */
  panel: {
    borderRadius: 16,
    borderWidth: 0,
    overflow: 'hidden',
    padding: 8,
    shadowColor: '#1E3C5A',
    shadowOffset: {width: 0, height: 16},
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 14,
    maxHeight: 520,
  },
  crystalTint: {
    ...StyleSheet.absoluteFillObject,
  },
  crystalHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  crystalHighlightDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  panelBody: {
    position: 'relative',
    zIndex: 1,
  },
  identity: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    marginBottom: 4,
    gap: 2,
  },
  identityName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A202C',
  },
  identityMeta: {
    fontSize: 12,
    color: '#718096',
  },
  modeBlock: {
    paddingVertical: 4,
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  modeCurrent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  modeCurrentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  itemLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1A202C',
  },
  itemLabelStrong: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A202C',
  },
  itemHint: {
    fontSize: 12,
    fontWeight: '400',
    color: '#718096',
    marginTop: 2,
    lineHeight: 16,
  },
  modeUnavailable: {
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  modeUnavailableTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  modeCreate: {
    alignSelf: 'stretch',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
  },
  modeCreateText: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemDanger: {
    color: '#FF3B30',
  },
  themes: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
    marginBottom: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  themesLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  themesLabelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A202C',
  },
  themesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  themeSwatch: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  /** Web: box-shadow 0 0 0 2px card, 0 0 0 4px swatch */
  themeDotRing: {
    padding: 2,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  themeName: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    color: '#718096',
    textAlign: 'center',
  },
  themeNameOn: {
    color: '#1A202C',
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  toggleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: 10,
    gap: 6,
  },
  langPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  langPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#718096',
  },
  langSep: {
    fontSize: 13,
    color: '#CBD5E0',
    marginHorizontal: 2,
  },
});
