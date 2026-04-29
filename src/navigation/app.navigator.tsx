import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '@modules/home/screens/HomeScreen';
import { AppStackParamList } from '@common/types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown:  false,
        animation:    'slide_from_right',
        contentStyle: { backgroundColor: '#f8fafc' },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
    </Stack.Navigator>
  );
}
