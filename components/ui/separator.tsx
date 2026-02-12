import * as React from 'react';
import { View, ViewProps } from 'react-native';

import { cn } from '@/src/lib/cn';

export function Separator({ className, ...props }: ViewProps) {
  return <View className={cn('h-px bg-[#efe1d4]', className)} {...props} />;
}
