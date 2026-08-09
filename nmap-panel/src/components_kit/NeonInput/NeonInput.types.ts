import type { InputHTMLAttributes } from 'react';

export interface NeonInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange'> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}