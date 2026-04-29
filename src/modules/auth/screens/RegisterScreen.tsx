import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { ScreenLayout } from '@common/components/layouts/ScreenLayout';
import { Input }        from '@common/components/ui/Input';
import { Button }       from '@common/components/ui/Button';
import { registerSchema, RegisterDto, authController } from '../auth.module';
import { AuthStackParamList } from '@common/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export function RegisterScreen() {
  const navigation = useNavigation<Nav>();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterDto>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterDto) => {
    const result = await authController.register(data);
    if (!result.success) {
      Alert.alert('Registration Failed', result.error);
    }
  };

  return (
    <ScreenLayout scrollable padded bgClass="bg-white">
      <View className="flex-1 justify-center py-8">
        <View className="mb-10">
          <Text className="text-3xl font-sans-bold text-secondary-900 mb-2">
            Create account
          </Text>
          <Text className="text-base font-sans text-secondary-500">
            Join us today — it's free
          </Text>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Controller
              control={control}
              name="firstName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="First name"
                  placeholder="Jane"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.firstName?.message}
                />
              )}
            />
          </View>
          <View className="flex-1">
            <Controller
              control={control}
              name="lastName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Last name"
                  placeholder="Doe"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.lastName?.message}
                />
              )}
            />
          </View>
        </View>

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

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Confirm password"
              placeholder="••••••••"
              isPassword
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              error={errors.confirmPassword?.message}
            />
          )}
        />

        <Button
          title="Create Account"
          onPress={handleSubmit(onSubmit)}
          isLoading={isSubmitting}
          fullWidth
          className="mt-2"
        />

        <View className="flex-row items-center justify-center mt-8">
          <Text className="text-sm text-secondary-500 font-sans">
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text className="text-sm font-sans-semi text-primary-600">Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenLayout>
  );
}
