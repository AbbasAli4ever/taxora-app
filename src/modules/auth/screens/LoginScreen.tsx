import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { ScreenLayout } from '@common/components/layouts/ScreenLayout';
import { Input }        from '@common/components/ui/Input';
import { Button }       from '@common/components/ui/Button';
import { loginSchema, LoginDto, authController } from '../auth.module';
import { AuthStackParamList } from '@common/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export function LoginScreen() {
  const navigation = useNavigation<Nav>();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginDto>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginDto) => {
    const result = await authController.login(data);
    if (!result.success) {
      Alert.alert('Login Failed', result.error);
    }
  };

  return (
    <ScreenLayout scrollable padded bgClass="bg-white">
      <View className="flex-1 justify-center py-8">
        {/* Header */}
        <View className="mb-10">
          <Text className="text-3xl font-sans-bold text-secondary-900 mb-2">
            Welcome back
          </Text>
          <Text className="text-base font-sans text-secondary-500">
            Sign in to your account to continue
          </Text>
        </View>

        {/* Form */}
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Email"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              error={errors.email?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Password"
              placeholder="••••••••"
              isPassword
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              error={errors.password?.message}
            />
          )}
        />

        <Button
          title="Sign In"
          onPress={handleSubmit(onSubmit)}
          isLoading={isSubmitting}
          fullWidth
          className="mt-2"
        />

        {/* Footer */}
        <View className="flex-row items-center justify-center mt-8">
          <Text className="text-sm text-secondary-500 font-sans">
            Don't have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text className="text-sm font-sans-semi text-primary-600">Sign up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenLayout>
  );
}
