import { useEffect } from 'react';
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

  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={`${styles.modal} ${variant === 'danger' ? styles.danger : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          {title && <span className={styles.title}>[ {title} ]</span>}
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            [x]
          </button>
        </div>

        <div className={styles.body}>{children}</div>

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
};
