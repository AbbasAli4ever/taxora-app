import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppTabParamList } from '@common/types';

import { HomeStackNavigator } from './stacks/home.stack';
import { SalesStackNavigator } from './stacks/sales.stack';
import { ExpensesStackNavigator } from './stacks/expenses.stack';
import { ApprovalsStackNavigator } from './stacks/approvals.stack';
import { MoreStackNavigator } from './stacks/more.stack';

const Tab = createBottomTabNavigator<AppTabParamList>();

const TAB_CONFIG: Record<
  keyof AppTabParamList,
  {
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    iconActive: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    label: string;
  }
> = {
  HomeStack: { icon: 'view-dashboard-outline', iconActive: 'view-dashboard', label: 'Home' },
  SalesStack: { icon: 'monitor-dashboard', iconActive: 'monitor-dashboard', label: 'Analytics' },
  ExpensesStack: { icon: 'wallet-outline', iconActive: 'wallet', label: 'Transactions' },
  ApprovalsStack: {
    icon: 'check-decagram-outline',
    iconActive: 'check-decagram',
    label: 'Approvals',
  },
  MoreStack: { icon: 'cog-outline', iconActive: 'cog', label: 'Settings' },
};

export function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const cfg = TAB_CONFIG[route.name as keyof AppTabParamList];
        return {
          headerShown: false,
          tabBarIcon: ({ color, focused, size }) => (
            <MaterialCommunityIcons
              name={focused ? cfg.iconActive : cfg.icon}
              color={color}
              size={22}
            />
          ),
          tabBarActiveTintColor: '#003d9b',
          tabBarInactiveTintColor: '#737685',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopColor: '#e5e7eb',
            height: Platform.OS === 'ios' ? 80 : 62,
            paddingBottom: Platform.OS === 'ios' ? 20 : 8,
            paddingTop: 6,
            shadowColor: '#09305a',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.08,
            shadowRadius: 10,
            elevation: 12,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
          tabBarLabel: cfg.label,
        };
      }}
    >
      <Tab.Screen name="HomeStack" component={HomeStackNavigator} options={{ title: 'Home' }} />
      <Tab.Screen name="SalesStack" component={SalesStackNavigator} options={{ title: 'Sales' }} />
      <Tab.Screen
        name="ExpensesStack"
        component={ExpensesStackNavigator}
        options={{ title: 'Expenses' }}
      />
      <Tab.Screen
        name="ApprovalsStack"
        component={ApprovalsStackNavigator}
        options={{ title: 'Approvals' }}
      />
      <Tab.Screen name="MoreStack" component={MoreStackNavigator} options={{ title: 'More' }} />
    </Tab.Navigator>
  );
}
