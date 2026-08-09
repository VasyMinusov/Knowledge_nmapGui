import type { NeonIconProps } from './NeonIcon.types';
import styles from './NeonIcon.module.css';

export const NeonIcon: React.FC<NeonIconProps> = ({
  icon: Icon,
  size = 24,
  className,
  color = 'var(--color-accent-neon)',
  glowIntensity = 'medium',
}) => {
  return (
    <span
      className={`${styles.iconWrapper} ${styles[glowIntensity]} ${className || ''}`}
      style={{ color }}
    >
      <Icon size={size} />
    </span>
  );
};