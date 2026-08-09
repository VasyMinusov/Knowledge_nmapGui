import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { NeonTooltipProps } from './NeonTooltip.types';
import styles from './NeonTooltip.module.css';

export const NeonTooltip: React.FC<NeonTooltipProps> = ({
  content,
  children,
  position = 'top',
}) => {
  const [visible, setVisible] = useState(false);

  const offset = { top: { y: 4 }, bottom: { y: -4 }, left: { x: 4 }, right: { x: -4 } }[position];

  return (
    <span
      className={styles.wrapper}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.span
            role="tooltip"
            className={`${styles.tooltip} ${styles[position]}`}
            initial={{ opacity: 0, ...offset }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, ...offset }}
            transition={{ duration: 0.12 }}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
};