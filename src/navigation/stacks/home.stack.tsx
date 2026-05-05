import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from '@common/types';
import { HomeScreen } from '@modules/home/screens/HomeScreen';
import { QuickStatsScreen } from '@modules/home/screens/QuickStatsScreen';
import { ActivityFeedScreen } from '@modules/home/screens/ActivityFeedScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="QuickStats" component={QuickStatsScreen} />
      <Stack.Screen name="ActivityFeed" component={ActivityFeedScreen} />
    </Stack.Navigator>
  );
}
