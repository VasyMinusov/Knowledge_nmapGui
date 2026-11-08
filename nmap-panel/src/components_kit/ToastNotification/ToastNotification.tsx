import type { ToastStackProps } from './ToastNotification.types';
import styles from './ToastNotification.module.css';

const GLYPH = {
  accent: '[+]',
  danger: '[x]',
  warning: '[!]',
} as const;

export const ToastStack: React.FC<ToastStackProps> = ({ toasts, onDismiss }) => {
  return (
    <div className={styles.stack}>
      {toasts.map((toast) => {
        const variant = toast.variant ?? 'accent';
        return (
          <div key={toast.id} className={`${styles.toast} ${styles[variant]}`}>
            <span className={styles.icon}>{GLYPH[variant]}</span>
            <div className={styles.text}>
              <div className={styles.title}>{toast.title}</div>
              {toast.description && <div className={styles.desc}>{toast.description}</div>}
            </div>
            <button className={styles.close} onClick={() => onDismiss(toast.id)} aria-label="Dismiss">
              [x]
            </button>
          </div>
        );
      })}
    </div>
  );
};
