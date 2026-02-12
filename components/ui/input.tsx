import * as React from 'react';
import { TextInput, TextInputProps } from 'react-native';

import { cn } from '@/src/lib/cn';

export type InputProps = TextInputProps;

export function Input({ className, ...props }: InputProps) {
  return (
    <TextInput
      placeholderTextColor="#b09a8b"
      className={cn(
        'h-11 flex-1 rounded-full border border-[#eaded2] bg-[#fffaf4] px-4 text-[15px] text-[#3b2f28]',
        className
      )}
      {...props}
    />
  );
}
