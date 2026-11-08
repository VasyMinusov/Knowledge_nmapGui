import type { NeonCheckboxProps } from './NeonCheckbox.types';
import styles from './NeonCheckbox.module.css';

export const NeonCheckbox: React.FC<NeonCheckboxProps> = ({
  checked,
  onChange,
  label,
  disabled,
}) => {
  return (
    <span
      className={`${styles.wrapper} ${disabled ? styles.disabled : ''}`}
      role="checkbox"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && onChange(!checked)}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onChange(!checked);
        }
      }}
    >
      <span className={styles.box}>[{checked ? 'x' : ' '}]</span>
      {label && <span className={styles.label}>{label}</span>}
    </span>
  );
};
