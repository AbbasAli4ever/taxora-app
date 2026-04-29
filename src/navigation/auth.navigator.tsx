import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen }    from '@modules/auth/screens/LoginScreen';
import { RegisterScreen } from '@modules/auth/screens/RegisterScreen';
import { AuthStackParamList } from '@common/types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown:    false,
        animation:      'slide_from_right',
        contentStyle:   { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen name="Login"    component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
