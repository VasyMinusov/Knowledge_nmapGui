import type { ProgressBarProps } from './ProgressBar.types';
import styles from './ProgressBar.module.css';

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  label,
  variant = 'accent',
}) => {
  const fillClass = variant === 'accent' ? styles.accent : styles.danger;

  return (
    <div className={styles.wrapper}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.track}>
        <div
          className={`${styles.fill} ${fillClass}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
};