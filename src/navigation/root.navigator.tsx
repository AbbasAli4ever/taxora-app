import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthNavigator } from './auth.navigator';
import { AppNavigator }  from './app.navigator';
import { useAuthStore }  from '@modules/auth/store';
import { Loader }        from '@common/components/ui/Loader';
import { RootStackParamList } from '@common/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <Loader fullScreen message="Loading…" />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {isAuthenticated ? (
        <Stack.Screen name="App"  component={AppNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}
