import type { IndustrialToggleProps } from './IndustrialToggle.types';
import styles from './IndustrialToggle.module.css';

export const IndustrialToggle: React.FC<IndustrialToggleProps> = ({
  checked,
  onChange,
  disabled,
}) => {
  return (
    <span
      className={`${styles.toggle} ${disabled ? styles.disabled : ''}`}
      role="switch"
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
      [{checked ? 'ON ' : 'OFF'}]
    </span>
  );
};
