import React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@common/components/ui/Button';

interface ErrorStateProps {
  title?:   string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title   = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <Text className="text-5xl mb-4">⚠️</Text>
      <Text className="text-xl font-sans-semi text-secondary-900 text-center mb-2">
        {title}
      </Text>
      <Text className="text-sm font-sans text-secondary-500 text-center mb-8">
        {message}
      </Text>
      {onRetry ? (
        <Button title="Try Again" onPress={onRetry} variant="primary" />
      ) : null}
    </View>
  );
}
