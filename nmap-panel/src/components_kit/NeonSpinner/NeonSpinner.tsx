import { motion } from 'motion/react';
import type { NeonSpinnerProps } from './NeonSpinner.types';
import styles from './NeonSpinner.module.css';

export const NeonSpinner: React.FC<NeonSpinnerProps> = ({ size = 40, label }) => {
  const ticks = Array.from({ length: 8 }, (_, i) => i * 45); // 8 засечек через 45°

  return (
    <div className={styles.wrapper}>
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        className={styles.svg}
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
      >
        <circle cx="20" cy="20" r="17" className={styles.track} />
        <circle
          cx="20"
          cy="20"
          r="17"
          className={styles.arc}
          strokeDasharray="80 100"   // удлинённая дуга
          strokeLinecap="round"      // скруглённые концы
        />
        {ticks.map((deg) => (
          <rect
            key={deg}
            x="18"
            y="0"
            width="4"                // шире
            height="8"               // выше
            className={styles.tick}
            transform={`rotate(${deg} 20 20)`}
          />
        ))}
      </motion.svg>
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
};