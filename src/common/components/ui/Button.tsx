import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
} from 'react-native';
import { ButtonVariant, ButtonSize } from '@common/types';

interface ButtonProps extends TouchableOpacityProps {
  title:       string;
  variant?:    ButtonVariant;
  size?:       ButtonSize;
  isLoading?:  boolean;
  fullWidth?:  boolean;
}

const variantClasses: Record<ButtonVariant, { container: string; text: string }> = {
  primary:   { container: 'bg-primary-600 border border-primary-600',   text: 'text-white' },
  secondary: { container: 'bg-secondary-100 border border-secondary-200', text: 'text-secondary-800' },
  outline:   { container: 'bg-transparent border border-primary-600',   text: 'text-primary-600' },
  ghost:     { container: 'bg-transparent border border-transparent',   text: 'text-primary-600' },
  danger:    { container: 'bg-error-500 border border-error-500',       text: 'text-white' },
};

const sizeClasses: Record<ButtonSize, { container: string; text: string }> = {
  sm: { container: 'px-3 py-2 rounded-lg',    text: 'text-sm' },
  md: { container: 'px-5 py-3 rounded-xl',    text: 'text-base' },
  lg: { container: 'px-6 py-4 rounded-xl',    text: 'text-lg' },
};

export function Button({
  title,
  variant   = 'primary',
  size      = 'md',
  isLoading = false,
  fullWidth = false,
  disabled,
  ...rest
}: ButtonProps) {
  const vc = variantClasses[variant];
  const sc = sizeClasses[size];
  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      className={[
        'flex-row items-center justify-center',
        vc.container,
        sc.container,
        fullWidth ? 'w-full' : 'self-start',
        isDisabled ? 'opacity-50' : 'opacity-100',
      ].join(' ')}
      disabled={isDisabled}
      activeOpacity={0.75}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? '#2563eb' : '#ffffff'}
          className="mr-2"
        />
      ) : null}
      <Text className={`font-sans-semi ${vc.text} ${sc.text}`}>{title}</Text>
    </TouchableOpacity>
  );
}
