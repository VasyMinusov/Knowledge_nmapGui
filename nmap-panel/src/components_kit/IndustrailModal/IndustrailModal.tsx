import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VscClose } from 'react-icons/vsc';
import { transitions } from '../../tokens/motion';
import { GlitchText } from '../GlitchText/GlitchText';
import type { IndustrialModalProps } from './IndustrialModal.types';
import styles from './IndustrialModal.module.css';

export const IndustrialModal: React.FC<IndustrialModalProps> = ({
  open,
  onClose,
  title,
  children,
  footer,
  variant = 'default',
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const corners = ['tl', 'tr', 'bl', 'br'] as const;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className={`${styles.modal} ${variant === 'danger' ? styles.danger : ''}`}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={transitions.mechanical}
            onClick={(e) => e.stopPropagation()}
          >
            {corners.map((pos) => (
              <div key={pos} className={`${styles.corner} ${styles[pos]}`} />
            ))}

            <div className={styles.header}>
              <div className={styles.indicator} />
              {title && <GlitchText text={title} />}
              <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
                <VscClose size={18} />
              </button>
            </div>

            <div className={styles.body}>{children}</div>

            {footer && <div className={styles.footer}>{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};