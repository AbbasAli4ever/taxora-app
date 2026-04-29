import React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@common/components/ui/Button';

interface EmptyStateProps {
  icon?:       string;
  title?:      string;
  message?:    string;
  actionLabel?: string;
  onAction?:   () => void;
}

export function EmptyState({
  icon        = '📭',
  title       = 'Nothing here yet',
  message     = 'There is nothing to show at the moment.',
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <Text className="text-5xl mb-4">{icon}</Text>
      <Text className="text-xl font-sans-semi text-secondary-900 text-center mb-2">
        {title}
      </Text>
      <Text className="text-sm font-sans text-secondary-500 text-center mb-8">
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} variant="primary" />
      ) : null}
    </View>
  );
}
