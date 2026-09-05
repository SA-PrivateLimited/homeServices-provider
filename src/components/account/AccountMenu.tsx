import React, {createContext, useContext, useMemo, useState} from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {CommonActions} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useStore} from '../../store';
import useTranslation from '../../hooks/useTranslation';
import {
  accountMenuStyles as s,
  HEADER,
} from '../../fromWebCss/accountMenu.styles';
import {createCustomerContextHandoff} from '../../services/api/contextHandoffApi';
import {customerHandoffUrl, getCustomerWebUrl} from '../../utils/customerWebUrl';
import authService from '../../services/authService';
import LogoutConfirmationModal from '../LogoutConfirmationModal';
import {SuggestPartnerModal} from '../SuggestPartnerModal';
import {
  PARTNER_COLOR_THEMES,
  type PartnerColorThemeId,
} from '../../utils/partnerColorTheme';
import {getBrandThemeSwatch, lightTheme, darkTheme} from '../../utils/theme';

type MenuCtx = {
  openMenu: (navigation: any) => void;
};

const AccountMenuContext = createContext<MenuCtx | null>(null);

function rootNav(navigation: any) {
  let nav = navigation;
  while (nav?.getParent?.()) {
    nav = nav.getParent();
  }
  return nav;
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'A';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function useDisplayName(fallback: string) {
  const {currentUser} = useStore();
  return useMemo(() => {
    const u = currentUser as {
      name?: string;
      fullName?: string;
      displayName?: string;
    } | null;
    return (
      u?.name?.trim() ||
      u?.fullName?.trim() ||
      u?.displayName?.trim() ||
      fallback
    );
  }, [currentUser, fallback]);
}

function partnerPublicId(user: unknown): string {
  const u = user as {_id?: string; id?: string; partnerId?: string} | null;
  const raw = String(u?.partnerId || u?._id || u?.id || '').trim();
  if (!raw) return '';
  return raw.slice(-8).toUpperCase();
}

/** Avatar in the header — panel is rendered by AccountMenuProvider. */
export function AccountMenu({
  navigation,
  compact,
}: {
  navigation: any;
  compact?: boolean;
}) {
  const ctx = useContext(AccountMenuContext);
  const {t} = useTranslation();
  const {colorTheme} = useStore();
  const name = useDisplayName(String(t('collab.partnerFallback')));
  const primary =
    colorTheme === 'brand'
      ? getBrandThemeSwatch()
      : PARTNER_COLOR_THEMES.find(x => x.id === colorTheme)?.swatch ||
        HEADER.primary;

  return (
    <View collapsable={false} style={compact ? s.triggerWrapCompact : s.triggerWrap}>
      <TouchableOpacity
        style={s.trigger}
        onPress={() => ctx?.openMenu(navigation)}
        hitSlop={{top: 8, bottom: 8, left: 4, right: 8}}
        accessibilityLabel={String(t('account.menu'))}
        accessibilityRole="button">
        <View style={[s.avatar, {backgroundColor: `${primary}2E`}]}>
          <Text style={[s.avatarText, {color: primary}]}>
            {initialsFrom(name)}
          </Text>
        </View>
        {compact ? null : (
          <Icon name="expand-more" size={18} color={HEADER.text} />
        )}
      </TouchableOpacity>
    </View>
  );
}

function AccountMenuHost({
  visible,
  navigation,
  onClose,
}: {
  visible: boolean;
  navigation: any;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const {t} = useTranslation();
  const tx = (key: string) => String(t(key));
  const {
    currentUser,
    setCurrentUser,
    language,
    setLanguage,
    isDarkMode,
    toggleTheme,
    colorTheme,
    setColorTheme,
  } = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [busy, setBusy] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const name = useDisplayName(tx('account.account'));
  const phone = useMemo(() => {
    const u = currentUser as {phoneNumber?: string; phone?: string} | null;
    return u?.phoneNumber || u?.phone || '';
  }, [currentUser]);
  const partnerId = partnerPublicId(currentUser);
  const canSwitch = Boolean(
    (currentUser as {canSwitchToCustomer?: boolean})?.canSwitchToCustomer,
  );
  const brandSwatch = getBrandThemeSwatch();
  const primary = theme.primary || HEADER.primary;
  const panelBg = isDarkMode ? '#151E2E' : theme.card || '#FFFFFF';
  const divider = isDarkMode
    ? 'rgba(148, 163, 184, 0.22)'
    : 'rgba(226, 232, 240, 0.85)';
  const labelColor = isDarkMode ? '#E8EDF5' : HEADER.text;
  const mutedColor = isDarkMode ? '#94A3B8' : HEADER.textSecondary;
  const dangerColor = theme.error || HEADER.error;

  const go = (screen: string) => {
    onClose();
    const parent = navigation?.getParent?.();
    if (parent?.navigate) {
      parent.navigate('Settings', {screen});
      return;
    }
    navigation?.navigate('Settings', {screen});
  };

  const colorThemeLabel = (() => {
    const nested = tx('settings.colorTheme.label');
    if (nested && !nested.startsWith('settings.')) {
      return nested;
    }
    const raw = t('settings.colorTheme');
    return typeof raw === 'string' ? raw : 'Theme color';
  })();

  const openCustomer = () => {
    if (busy) return;
    onClose();
    if (canSwitch) {
      setBusy(true);
      void createCustomerContextHandoff()
        .then(code => Linking.openURL(customerHandoffUrl(code)))
        .catch(() => Linking.openURL(getCustomerWebUrl()))
        .finally(() => setBusy(false));
      return;
    }
    void Linking.openURL(getCustomerWebUrl());
  };

  const pickTheme = (id: PartnerColorThemeId) => {
    void setColorTheme(id);
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={onClose}>
        <View style={{flex: 1}}>
          <Pressable style={s.backdrop} onPress={onClose} />
          <View
            pointerEvents="box-none"
            style={[s.panelWrap, {top: insets.top + 52}]}>
            <View
              style={[
                s.panel,
                {
                  backgroundColor: panelBg,
                },
              ]}>
              <View
                pointerEvents="none"
                style={[
                  s.crystalTint,
                  {
                    backgroundColor: isDarkMode
                      ? `${primary}24`
                      : `${primary}12`,
                  },
                ]}
              />
              <View
                pointerEvents="none"
                style={[
                  s.crystalHighlight,
                  isDarkMode ? s.crystalHighlightDark : null,
                ]}
              />
              <ScrollView
                style={s.panelBody}
                bounces={false}
                keyboardShouldPersistTaps="handled">
                <View style={[s.identity, {borderBottomColor: divider}]}>
                  <Text style={[s.identityName, {color: labelColor}]}>
                    {name}
                  </Text>
                  {partnerId ? (
                    <Text style={[s.identityMeta, {color: mutedColor}]}>
                      ID: {partnerId}
                    </Text>
                  ) : null}
                  {phone ? (
                    <Text style={[s.identityMeta, {color: mutedColor}]}>
                      {phone}
                    </Text>
                  ) : null}
                </View>

                <View style={[s.modeBlock, {borderBottomColor: divider}]}>
                  <View style={s.modeCurrent}>
                    <Icon name="check" size={16} color={primary} />
                    <Text style={[s.modeCurrentText, {color: primary}]}>
                      {tx('mode.partner')}
                    </Text>
                  </View>
                  <TouchableOpacity style={s.item} onPress={openCustomer}>
                    <Icon name="swap-horiz" size={20} color={labelColor} />
                    <View style={{flex: 1}}>
                      <Text style={[s.itemLabelStrong, {color: labelColor}]}>
                        {canSwitch
                          ? tx('mode.switchToCustomer')
                          : tx('ecosystem.becomeCustomer')}
                      </Text>
                      <Text style={[s.itemHint, {color: mutedColor}]}>
                        {tx('mode.switchToCustomerHint')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={s.item}
                  onPress={() => go('SettingsProfile')}>
                  <Icon name="person" size={20} color={labelColor} />
                  <Text style={[s.itemLabel, {color: labelColor}]}>
                    {tx('account.profile')}
                  </Text>
                </TouchableOpacity>

                <View style={[s.themes, {borderBottomColor: divider}]}>
                  <View style={s.themesLabel}>
                    <Icon name="palette" size={20} color={labelColor} />
                    <Text style={[s.themesLabelText, {color: labelColor}]}>
                      {colorThemeLabel}
                    </Text>
                  </View>
                  <View style={s.themesRow}>
                    {PARTNER_COLOR_THEMES.map(opt => {
                      const selected = colorTheme === opt.id;
                      const swatch =
                        opt.id === 'brand' ? brandSwatch : opt.swatch;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[
                            s.themeSwatch,
                            selected
                              ? {
                                  borderColor: `${swatch}73`,
                                  backgroundColor: `${swatch}1F`,
                                }
                              : null,
                          ]}
                          onPress={() => pickTheme(opt.id)}
                          accessibilityRole="button"
                          accessibilityState={{selected}}
                          accessibilityLabel={tx(
                            `settings.colorTheme.${opt.id}`,
                          )}>
                          {selected ? (
                            <View
                              style={[
                                s.themeDotRing,
                                {
                                  borderColor: swatch,
                                  backgroundColor: panelBg,
                                },
                              ]}>
                              <View
                                style={[s.themeDot, {backgroundColor: swatch}]}
                              />
                            </View>
                          ) : (
                            <View
                              style={[s.themeDot, {backgroundColor: swatch}]}
                            />
                          )}
                          <Text
                            style={[
                              s.themeName,
                              {color: mutedColor},
                              selected ? {color: labelColor} : null,
                            ]}
                            numberOfLines={1}>
                            {tx(`settings.colorTheme.${opt.id}`)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={s.toggle}>
                  <View style={s.toggleLabel}>
                    <Icon name="brightness-2" size={20} color={labelColor} />
                    <Text style={[s.itemLabel, {color: labelColor}]}>
                      {tx('settings.themeMode.dark')}
                    </Text>
                  </View>
                  <Switch
                    value={isDarkMode}
                    onValueChange={() => toggleTheme()}
                    trackColor={{false: divider, true: primary}}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={s.langRow}>
                  <Icon name="language" size={16} color={mutedColor} />
                  <TouchableOpacity
                    style={[
                      s.langPill,
                      language === 'hi'
                        ? {backgroundColor: `${primary}29`}
                        : null,
                    ]}
                    onPress={() => void setLanguage('hi')}>
                    <Text
                      style={[
                        s.langPillText,
                        {color: mutedColor},
                        language === 'hi'
                          ? {color: primary, fontWeight: '700'}
                          : null,
                      ]}>
                      {tx('login.langHindi')}
                    </Text>
                  </TouchableOpacity>
                  <Text style={[s.langSep, {color: mutedColor}]}>|</Text>
                  <TouchableOpacity
                    style={[
                      s.langPill,
                      language === 'en'
                        ? {backgroundColor: `${primary}29`}
                        : null,
                    ]}
                    onPress={() => void setLanguage('en')}>
                    <Text
                      style={[
                        s.langPillText,
                        {color: mutedColor},
                        language === 'en'
                          ? {color: primary, fontWeight: '700'}
                          : null,
                      ]}>
                      {tx('login.langEnglish')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={s.item}
                  onPress={() => go('SettingsMain')}>
                  <Icon name="settings" size={20} color={labelColor} />
                  <Text style={[s.itemLabel, {color: labelColor}]}>
                    {tx('nav.settings')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.item}
                  onPress={() => {
                    onClose();
                    setSuggestOpen(true);
                  }}>
                  <Icon name="person-add" size={20} color={labelColor} />
                  <Text style={[s.itemLabel, {color: labelColor}]}>
                    {tx('nav.addPartner')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.item}
                  onPress={() => {
                    onClose();
                    setShowLogout(true);
                  }}>
                  <Icon name="logout" size={20} color={dangerColor} />
                  <Text style={[s.itemLabel, {color: dangerColor}]}>
                    {tx('account.logout')}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      <LogoutConfirmationModal
        visible={showLogout}
        onCancel={() => setShowLogout(false)}
        onConfirm={async () => {
          setShowLogout(false);
          try {
            await authService.logout();
          } catch {
            /* still clear */
          }
          await setCurrentUser(null);
          if (navigation) {
            rootNav(navigation).dispatch(
              CommonActions.reset({index: 0, routes: [{name: 'Login'}]}),
            );
          }
        }}
      />

      <SuggestPartnerModal
        theme={theme}
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
      />
    </>
  );
}

export function AccountMenuProvider({children}: {children: React.ReactNode}) {
  const [visible, setVisible] = useState(false);
  const [navigation, setNavigation] = useState<any>(null);

  const value = useMemo<MenuCtx>(
    () => ({
      openMenu: nav => {
        setNavigation(nav);
        setVisible(true);
      },
    }),
    [],
  );

  return (
    <AccountMenuContext.Provider value={value}>
      {children}
      <AccountMenuHost
        visible={visible}
        navigation={navigation}
        onClose={() => setVisible(false)}
      />
    </AccountMenuContext.Provider>
  );
}
