import type { ProgressBarProps } from './ProgressBar.types';
import styles from './ProgressBar.module.css';

const BLOCKS = 20;

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  label,
  variant = 'accent',
}) => {
  const clamped = Math.min(100, Math.max(0, value));
  const filled = Math.round((clamped / 100) * BLOCKS);
  const bar = '█'.repeat(filled) + '░'.repeat(BLOCKS - filled);
  const fillClass = variant === 'accent' ? styles.accent : styles.danger;

  return (
    <div className={styles.wrapper}>
      {label && <span className={styles.label}>{label}</span>}
      <span className={`${styles.bar} ${fillClass}`}>
        {bar} {Math.round(clamped)}%
      </span>
    </div>
  );
};
