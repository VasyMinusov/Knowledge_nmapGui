import { motion } from 'motion/react';
import type { StatusBadgeProps } from './StatusBadge.types';
import styles from './StatusBadge.module.css';

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'accent',
  pulse = false,
}) => {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      <span className={styles.dotWrap}>
        <span className={styles.dot} />
        {pulse && (
          <motion.span
            className={styles.pulseDot}
            animate={{ scale: [1, 2.4], opacity: [0.7, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </span>
      {label}
    </span>
  );
};