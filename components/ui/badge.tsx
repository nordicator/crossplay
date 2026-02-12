import * as React from 'react';
import { View, ViewProps, Text, TextProps } from 'react-native';

import { cn } from '@/src/lib/cn';

export function Badge({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn(
        'rounded-full px-2.5 py-1 items-center justify-center',
        className
      )}
      {...props}
    />
  );
}

export function BadgeLabel({ className, ...props }: TextProps) {
  return (
    <Text
      className={cn('text-[11px] font-semibold', className)}
      {...props}
    />
  );
}
