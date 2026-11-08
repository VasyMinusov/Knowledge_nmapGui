import type { StatusBadgeProps } from './StatusBadge.types';
import styles from './StatusBadge.module.css';

const GLYPH: Record<NonNullable<StatusBadgeProps['variant']>, string> = {
  accent: '●',   // OK
  muted: '○',    // OFF
  warning: '▲',  // WARN
  danger: '✕',   // ERR
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'accent',
  pulse = false,
}) => {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      <span className={`${styles.glyph} ${pulse ? styles.blink : ''}`}>
        {GLYPH[variant]}
      </span>
      {label}
    </span>
  );
};
