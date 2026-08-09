import { motion } from 'motion/react';
import { transitions } from '../../tokens/motion';
import type { NeonButtonProps } from './NeonButton.types';
import styles from './NeonButton.module.css';

export const NeonButton: React.FC<NeonButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled,
}) => {
  const variantClass = styles[variant];
  const sizeClass = styles[size];

  return (
    <motion.button
      className={`${styles.button} ${variantClass} ${sizeClass}`}
      whileHover={{
        scale: 1.02,
        boxShadow:
          variant === 'danger'
            ? '0 0 20px var(--color-danger-glow), inset 0 0 20px var(--color-danger-glow)'
            : '0 0 20px var(--color-accent-glow), inset 0 0 20px var(--color-accent-glow)',
      }}
      whileTap={{ scale: 0.98 }}
      transition={transitions.mechanical}
      onClick={onClick}
      disabled={disabled}
    >
      <motion.div
        className={styles.sweep}
        initial={{ x: '-100%' }}
        whileHover={{ x: '100%' }}
        transition={{ duration: 0.5 }}
      />
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
    </motion.button>
  );
};