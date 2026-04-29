import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

interface LoaderProps {
  size?:    'small' | 'large';
  message?: string;
  fullScreen?: boolean;
}

export function Loader({ size = 'large', message, fullScreen = false }: LoaderProps) {
  return (
    <View
      className={[
        'items-center justify-center',
        fullScreen ? 'flex-1 bg-white' : 'py-8',
      ].join(' ')}
    >
      <ActivityIndicator size={size} color="#2563eb" />
      {message ? (
        <Text className="mt-3 text-sm text-secondary-500 font-sans">{message}</Text>
      ) : null}
    </View>
  );
}
