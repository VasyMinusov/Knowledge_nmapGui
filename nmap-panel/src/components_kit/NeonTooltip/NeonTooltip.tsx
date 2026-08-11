import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import type { NeonTooltipProps } from './NeonTooltip.types';
import styles from './NeonTooltip.module.css';

export const NeonTooltip: React.FC<NeonTooltipProps> = ({
  content,
  children,
  position = 'top',
  portal = true, // новый проп, по умолчанию true
}) => {
  const [visible, setVisible] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  // Функция вычисления координат для портала
  const calculatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const offset = 8; // отступ от края
    let x = 0, y = 0;

    switch (position) {
      case 'top':
        x = rect.left + rect.width / 2;
        y = rect.top - offset;
        break;
      case 'bottom':
        x = rect.left + rect.width / 2;
        y = rect.bottom + offset;
        break;
      case 'left':
        x = rect.left - offset;
        y = rect.top + rect.height / 2;
        break;
      case 'right':
        x = rect.right + offset;
        y = rect.top + rect.height / 2;
        break;
    }
    setCoords({ x, y });
  };

  // Обновляем позицию при открытии, скролле, ресайзе
  useEffect(() => {
    if (!portal || !visible) return;
    calculatePosition();
    const handleUpdate = () => calculatePosition();
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [visible, position, portal]);

  // Если портал отключён — используем старый абсолютный рендеринг
  if (!portal) {
    return (
      <span
        className={styles.wrapper}
        ref={triggerRef}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      >
        {children}
        <AnimatePresence>
          {visible && (
            <motion.span
              role="tooltip"
              className={`${styles.tooltip} ${styles[position]}`}
              initial={{ opacity: 0, ...offsetMap[position] }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, ...offsetMap[position] }}
              transition={{ duration: 0.12 }}
            >
              {content}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    );
  }

  // Портал-версия
  return (
    <span
      className={styles.wrapper}
      ref={triggerRef}
      onMouseEnter={() => { setVisible(true); }}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && coords && createPortal(
        <motion.span
          ref={tooltipRef}
          role="tooltip"
          className={styles.tooltipPortal}
          style={{
            position: 'fixed',
            left: coords.x,
            top: coords.y,
            transform: `translate(${
              position === 'left' ? '-100%' :
              position === 'right' ? '0' :
              '-50%'
            }, ${
              position === 'top' ? '-100%' :
              position === 'bottom' ? '0' :
              '-50%'
            })`,
            zIndex: 9999,
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.12 }}
        >
          {content}
        </motion.span>,
        document.body
      )}
    </span>
  );
};

// Вспомогательный объект для анимаций без портала (не меняется)
const offsetMap = {
  top: { y: 4 },
  bottom: { y: -4 },
  left: { x: 4 },
  right: { x: -4 },
};