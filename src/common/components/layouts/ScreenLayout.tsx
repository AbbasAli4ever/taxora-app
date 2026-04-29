import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenLayoutProps {
  children:     React.ReactNode;
  scrollable?:  boolean;
  padded?:      boolean;
  style?:       ViewStyle;
  contentStyle?: ViewStyle;
  bgClass?:     string;
}

export function ScreenLayout({
  children,
  scrollable  = false,
  padded      = true,
  style,
  contentStyle,
  bgClass     = 'bg-white',
}: ScreenLayoutProps) {
  const paddingClass = padded ? 'px-5' : '';

  return (
    <SafeAreaView className={`flex-1 ${bgClass}`} style={style}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {scrollable ? (
          <ScrollView
            className={`flex-1 ${paddingClass}`}
            contentContainerStyle={{ flexGrow: 1, ...contentStyle }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View className={`flex-1 ${paddingClass}`} style={contentStyle}>
            {children}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
