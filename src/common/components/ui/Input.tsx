import React, { forwardRef, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { InputVariant } from '@common/types';

interface InputProps extends TextInputProps {
  label?:       string;
  error?:       string;
  hint?:        string;
  variant?:     InputVariant;
  leftIcon?:    React.ReactNode;
  rightIcon?:   React.ReactNode;
  isPassword?:  boolean;
}

const variantBorder: Record<InputVariant, string> = {
  default: 'border-secondary-300 focus:border-primary-500',
  error:   'border-error-500',
  success: 'border-success-500',
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    error,
    hint,
    variant    = 'default',
    leftIcon,
    rightIcon,
    isPassword = false,
    ...rest
  },
  ref,
) {
  const [showPassword, setShowPassword] = useState(false);
  const resolvedVariant: InputVariant   = error ? 'error' : variant;

  return (
    <View className="mb-4">
      {label ? (
        <Text className="mb-1.5 text-sm font-sans-semi text-secondary-700">{label}</Text>
      ) : null}

      <View
        className={[
          'flex-row items-center rounded-xl border bg-white px-3',
          variantBorder[resolvedVariant],
        ].join(' ')}
      >
        {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}

        <TextInput
          ref={ref}
          className="flex-1 py-3 text-base text-secondary-900 font-sans"
          placeholderTextColor="#94a3b8"
          secureTextEntry={isPassword && !showPassword}
          autoCapitalize="none"
          {...rest}
        />

        {isPassword ? (
          <TouchableOpacity
            onPress={() => setShowPassword((p) => !p)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text className="text-sm text-secondary-500">
              {showPassword ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        ) : rightIcon ? (
          <View className="ml-2">{rightIcon}</View>
        ) : null}
      </View>

      {error ? (
        <Text className="mt-1 text-xs text-error-500">{error}</Text>
      ) : hint ? (
        <Text className="mt-1 text-xs text-secondary-400">{hint}</Text>
      ) : null}
    </View>
  );
});
