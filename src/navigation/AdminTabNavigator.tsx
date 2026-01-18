import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

import AdminAppointmentsScreen from '../screens/AdminAppointmentsScreen';
import AdminSettingsScreen from '../screens/AdminSettingsScreen';
import AdminUsersManagementScreen from '../screens/AdminUsersManagementScreen';
import AdminFeeChangeRequestsScreen from '../screens/AdminFeeChangeRequestsScreen';
import AdminOrdersScreen from '../screens/AdminOrdersScreen';

const Tab = createBottomTabNavigator();

export default function AdminTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#FF9500',
        tabBarInactiveTintColor: '#8E8E93',
      }}>
      <Tab.Screen
        name="Fee Requests"
        component={AdminFeeChangeRequestsScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <Icon name="attach-money" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Appointments"
        component={AdminAppointmentsScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <Icon name="calendar-today" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={AdminOrdersScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <Icon name="receipt-long" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={AdminSettingsScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <Icon name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
