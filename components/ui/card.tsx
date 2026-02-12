import * as React from 'react';
import { View, ViewProps, Text, TextProps } from 'react-native';

import { cn } from '@/src/lib/cn';

export function Card({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn(
        'rounded-3xl bg-[#fff7ef] border border-[#efe1d4] shadow-sm',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ViewProps) {
  return <View className={cn('px-4 pt-4', className)} {...props} />;
}

export function CardTitle({ className, ...props }: TextProps) {
  return (
    <Text
      className={cn('text-[17px] font-semibold text-[#3b2f28]', className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: TextProps) {
  return (
    <Text
      className={cn('text-[13px] text-[#a08474]', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: ViewProps) {
  return <View className={cn('px-4 pb-4', className)} {...props} />;
}

export function CardFooter({ className, ...props }: ViewProps) {
  return <View className={cn('px-4 pb-4 pt-2', className)} {...props} />;
}
