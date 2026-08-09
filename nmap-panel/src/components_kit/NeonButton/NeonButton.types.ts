export type ButtonVariant = 'primary' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface NeonButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onClick?: () => void;
  disabled?: boolean;
}