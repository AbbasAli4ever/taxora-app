import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ScreenLayout } from '@common/components/layouts/ScreenLayout';
import { useAuthStore } from '@modules/auth/store';
import { authController } from '@modules/auth/auth.controller';

export function HomeScreen() {
  const user = useAuthStore((s) => s.user);

  return (
    <ScreenLayout padded bgClass="bg-secondary-50">
      {/* Header card */}
      <View className="bg-primary-600 rounded-2xl p-6 mt-4 mb-6">
        <Text className="text-white font-sans text-sm opacity-80 mb-1">
          Welcome back
        </Text>
        <Text className="text-white font-sans-bold text-2xl">
          {user ? `${user.firstName} ${user.lastName}` : 'User'} 👋
        </Text>
      </View>

      {/* Placeholder cards */}
      <Text className="text-secondary-500 font-sans-semi text-xs uppercase tracking-widest mb-3">
        Quick Actions
      </Text>

      <View className="flex-row gap-3 mb-6">
        {['Analytics', 'Reports', 'Settings'].map((label) => (
          <View
            key={label}
            className="flex-1 bg-white rounded-2xl p-4 items-center shadow-sm"
          >
            <Text className="text-2xl mb-1">
              {label === 'Analytics' ? '📊' : label === 'Reports' ? '📋' : '⚙️'}
            </Text>
            <Text className="text-xs font-sans-semi text-secondary-700">{label}</Text>
          </View>
        ))}
      </View>

      {/* Recent activity placeholder */}
      <Text className="text-secondary-500 font-sans-semi text-xs uppercase tracking-widest mb-3">
        Recent Activity
      </Text>
      <View className="bg-white rounded-2xl p-5">
        <Text className="text-secondary-400 font-sans text-sm text-center py-4">
          No recent activity yet
        </Text>
      </View>

      {/* Sign out */}
      <TouchableOpacity
        onPress={() => authController.logout()}
        className="mt-8 items-center py-3"
      >
        <Text className="text-error-500 font-sans-semi text-sm">Sign Out</Text>
      </TouchableOpacity>
    </ScreenLayout>
  );
}
