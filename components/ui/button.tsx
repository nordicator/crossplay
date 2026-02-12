import * as React from 'react';
import { Pressable, PressableProps, Text } from 'react-native';

import { cn } from '@/src/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'dark';
type ButtonSize = 'sm' | 'md' | 'lg';

const variantStyles: Record<ButtonVariant, { container: string; text: string }> = {
  primary: {
    container: 'bg-[#f27663] shadow-sm',
    text: 'text-[#fff6ee]',
  },
  secondary: {
    container: 'bg-[#fff1e7] border border-[#f2e3d6]',
    text: 'text-[#7a5b4c]',
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-[#7a5b4c]',
  },
  dark: {
    container: 'bg-[#3b2f28] shadow-sm',
    text: 'text-[#fff6ee]',
  },
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 rounded-full',
  md: 'px-4 py-3 rounded-full',
  lg: 'px-5 py-3.5 rounded-full',
};

export type ButtonProps = PressableProps & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  labelClassName?: string;
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  labelClassName,
  children,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      className={cn(
        'items-center justify-center',
        sizeStyles[size],
        variantStyles[variant].container,
        className
      )}
      {...props}>
      <Text className={cn('text-[15px] font-semibold', variantStyles[variant].text, labelClassName)}>
        {children}
      </Text>
    </Pressable>
  );
}
