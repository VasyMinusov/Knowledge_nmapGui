import type { IconType } from 'react-icons';

export interface NeonIconProps {
  icon: IconType;
  size?: number;
  className?: string;
  color?: string;         // если нужен специфичный цвет
  glowIntensity?: 'low' | 'medium' | 'high';
}