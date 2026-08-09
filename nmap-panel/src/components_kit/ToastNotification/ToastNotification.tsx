import { motion, AnimatePresence } from 'motion/react';
import { VscClose, VscWarning, VscError, VscCheck } from 'react-icons/vsc';
import { transitions } from '../../tokens/motion';
import type { ToastStackProps } from './ToastNotification.types';
import styles from './ToastNotification.module.css';

const icons = {
  accent: VscCheck,
  danger: VscError,
  warning: VscWarning,
};

export const ToastStack: React.FC<ToastStackProps> = ({ toasts, onDismiss }) => {
  return (
    <div className={styles.stack}>
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const variant = toast.variant ?? 'accent';
          const Icon = icons[variant];
          return (
            <motion.div
              key={toast.id}
              layout
              className={`${styles.toast} ${styles[variant]}`}
              initial={{ opacity: 0, x: 80, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.9 }}
              transition={transitions.mechanical}
            >
              <span className={styles.icon}>
                <Icon size={16} />
              </span>
              <div className={styles.text}>
                <div className={styles.title}>{toast.title}</div>
                {toast.description && <div className={styles.desc}>{toast.description}</div>}
              </div>
              <button className={styles.close} onClick={() => onDismiss(toast.id)} aria-label="Dismiss">
                <VscClose size={14} />
              </button>
              <motion.div
                className={styles.timer}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 4, ease: 'linear' }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};