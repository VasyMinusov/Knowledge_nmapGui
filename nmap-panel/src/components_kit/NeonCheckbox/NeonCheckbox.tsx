import { motion } from 'motion/react';
import { transitions } from '../../tokens/motion';
import type { NeonCheckboxProps } from './NeonCheckbox.types';
import styles from './NeonCheckbox.module.css';

export const NeonCheckbox: React.FC<NeonCheckboxProps> = ({
  checked,
  onChange,
  label,
  disabled,
}) => {
  return (
    <label className={`${styles.wrapper} ${disabled ? styles.disabled : ''}`}>
      <motion.span
        className={`${styles.box} ${checked ? styles.checked : ''}`}
        onClick={() => !disabled && onChange(!checked)}
        whileTap={disabled ? undefined : { scale: 0.9 }}
        transition={transitions.mechanical}
      >
        <svg viewBox="0 0 20 20" className={styles.svg}>
          <motion.polyline
            points="4,10 8,14 16,5"
            fill="none"
            strokeWidth="3"
            strokeLinecap="square"
            strokeLinejoin="miter"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          />
        </svg>
      </motion.span>
      {label && <span className={styles.label}>{label}</span>}
    </label>
  );
};