import { motion } from 'motion/react';
import { transitions } from '../../tokens/motion';
import type { IndustrialToggleProps } from './IndustrialToggle.types';
import styles from './IndustrialToggle.module.css';

export const IndustrialToggle: React.FC<IndustrialToggleProps> = ({
  checked,
  onChange,
  disabled,
}) => {
  return (
    <motion.div
      className={`${styles.track} ${checked ? styles.checked : ''} ${disabled ? styles.disabled : ''}`}
      onClick={() => !disabled && onChange(!checked)}
      whileTap={{ scale: 0.95 }}
      transition={transitions.mechanical}
    >
      <motion.div
        className={styles.thumb}
        layout
        transition={transitions.snap}
      />
    </motion.div>
  );
};