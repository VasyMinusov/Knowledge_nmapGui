import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { NeonTooltipProps } from './NeonTooltip.types';
import styles from './NeonTooltip.module.css';

export const NeonTooltip: React.FC<NeonTooltipProps> = ({
  content,
  children,
  position = 'top',
  portal = true,
}) => {
  const [visible, setVisible] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  const calculatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const offset = 6;
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

  if (!portal) {
    return (
      <span
        className={styles.wrapper}
        ref={triggerRef}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      >
        {children}
        {visible && (
          <span role="tooltip" className={`${styles.tooltip} ${styles[position]}`}>
            {content}
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      className={styles.wrapper}
      ref={triggerRef}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && coords && createPortal(
        <span
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
        >
          {content}
        </span>,
        document.body
      )}
    </span>
  );
};
