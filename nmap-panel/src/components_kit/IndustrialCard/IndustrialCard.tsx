import { motion } from 'motion/react';
import { transitions } from '../../tokens/motion';
import { GlitchText } from '../GlitchText/GlitchText';
import type { IndustrialCardProps } from './IndustrialCard.types';
import styles from './IndustrialCard.module.css';

export const IndustrialCard: React.FC<IndustrialCardProps> = ({
  children,
  title,
  variant = 'default',
}) => {
  const isAccent = variant === 'accent';
  const accentColor = 'var(--color-accent-neon)';
  const mutedColor = 'var(--color-text-muted)';
  const cornerColor = isAccent ? accentColor : mutedColor;

  const corners = ['tl', 'tr', 'bl', 'br'] as const;

  return (
    <motion.div
      className={`${styles.card} ${isAccent ? styles.accent : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitions.mechanical}
      style={
        { '--corner-color': cornerColor, '--indicator-color': cornerColor } as React.CSSProperties
      }
    >
      {corners.map((pos) => (
        <div key={pos} className={`${styles.corner} ${styles[pos]}`} />
      ))}

      {title && (
        <div className={styles.header}>
          <div className={styles.indicator} />
          <GlitchText text={title} />
        </div>
      )}
      <div className={styles.body}>{children}</div>
    </motion.div>
  );
};