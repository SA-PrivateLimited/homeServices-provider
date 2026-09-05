import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../../store';
import useTranslation from '../../hooks/useTranslation';
import {appHeaderStyles as s, HEADER} from '../../fromWebCss/accountMenu.styles';
import {AccountMenu} from './AccountMenu';

type Props = {
  navigation: any;
};

export function AppHeader({navigation}: Props) {
  const insets = useSafeAreaInsets();
  const {t} = useTranslation();
  const {currentUser} = useStore();
  const u = currentUser as {name?: string; fullName?: string} | null;
  const name = u?.name?.trim() || u?.fullName?.trim() || '';
  const title = name
    ? String(t('home.helloName', {name}))
    : String(t('home.hello'));

  return (
    <View style={[s.header, {paddingTop: insets.top}]}>
      <View style={s.leading}>
        <Text style={s.greetTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={s.greetSub} numberOfLines={1}>
          {t('login.productName')}
        </Text>
      </View>
      <View style={s.actions}>
        <TouchableOpacity
          style={s.iconBtn}
          onPress={() =>
            navigation.navigate('Jobs', {screen: 'Notifications'})
          }
          accessibilityLabel={String(t('notifications.title'))}>
          <Icon name="notifications-outline" size={22} color={HEADER.text} />
        </TouchableOpacity>
        <AccountMenu navigation={navigation} />
      </View>
    </View>
  );
}
