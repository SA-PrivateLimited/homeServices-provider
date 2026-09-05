import React from 'react';
import {StyleSheet, View} from 'react-native';
import NotificationIcon from '../NotificationIcon';
import {AccountMenu} from './AccountMenu';

type Props = {
  navigation: any;
};

/** Native stack headerRight is width-clipped on Android — keep this row a fixed size. */
export function HeaderAccountActions({navigation}: Props) {
  return (
    <View style={styles.row}>
      <NotificationIcon
        compact
        onPress={() => navigation.navigate('Notifications')}
      />
      <AccountMenu navigation={navigation} compact />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: 84,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
});
