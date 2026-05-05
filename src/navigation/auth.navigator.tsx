import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@common/types';
import { SplashScreen } from '@modules/auth/screens/SplashScreen';
import { LoginScreen } from '@modules/auth/screens/LoginScreen';
import { ForgotPasswordScreen } from '@modules/auth/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '@modules/auth/screens/ResetPasswordScreen';
import { MFAChallengeScreen } from '@modules/auth/screens/MFAChallengeScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#faf8ff' },
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="MFAChallenge" component={MFAChallengeScreen} />
    </Stack.Navigator>
  );
}
