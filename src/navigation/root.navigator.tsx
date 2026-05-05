import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '@common/types';
import { AuthNavigator } from './auth.navigator';
import { AppNavigator } from './app.navigator';
import { CompanySelectScreen } from '@modules/auth/screens/CompanySelectScreen';
import { useAuthStore } from '@modules/auth/store';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#faf8ff' },
      }}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen name="App" component={AppNavigator} />
          <Stack.Screen name="CompanySelect" component={CompanySelectScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Auth" component={AuthNavigator} />
          <Stack.Screen name="CompanySelect" component={CompanySelectScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
