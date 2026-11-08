import { useId, useState } from 'react';
import type { NeonInputProps } from './NeonInput.types';
import styles from './NeonInput.module.css';

export const NeonInput: React.FC<NeonInputProps> = ({
  label,
  value,
  onChange,
  error,
  hint,
  size = 'md',
  icon,
  disabled,
  ...rest
}) => {
  const id = useId();
  const [focused, setFocused] = useState(false);

  return (
    <div className={`${styles.wrapper} ${styles[size]}`}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      <div
        className={`${styles.field} ${focused ? styles.focused : ''} ${error ? styles.errorField : ''} ${disabled ? styles.disabled : ''}`}
      >
        <span className={styles.prompt}>&gt;</span>
        {icon && <span className={styles.icon}>{icon}</span>}
        <input
          id={id}
          className={styles.input}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
        />
        {focused && <span className={styles.cursor}>█</span>}
      </div>
      {error ? (
        <div className={styles.error}>{'>> '} {error}</div>
      ) : hint ? (
        <div className={styles.hint}>{hint}</div>
      ) : null}
    </div>
  );
};
