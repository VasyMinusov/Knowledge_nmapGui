import { motion } from 'motion/react';
import { transitions } from '../../tokens/motion';
import { GlitchText } from '../GlitchText/GlitchText';
import type { MenuItemProps } from './MenuItem.types';
import styles from './MenuItem.module.css';

export const MenuItem: React.FC<MenuItemProps> = ({
  label,
  icon,
  index,
  active,
  onClick,
}) => {
  return (
    <motion.div
      className={`${styles.item} ${active ? styles.active : ''}`}
      onClick={onClick}
      whileHover={{ x: 8 }}
      transition={transitions.mechanical}
    >
      <span className={styles.index}>{String(index).padStart(2, '0')}</span>
      {icon && <span className={styles.icon}>{icon}</span>}
      <GlitchText text={label} />
      {active && (
        <motion.div
          className={styles.dot}
          layoutId="activeIndicator"
        />
      )}
    </motion.div>
  );
};