import { useId, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { transitions } from '../../tokens/motion';
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
      <motion.div
        className={`${styles.field} ${focused ? styles.focused : ''} ${error ? styles.errorField : ''} ${disabled ? styles.disabled : ''}`}
        animate={focused ? { boxShadow: 'var(--shadow-neon-md)' } : { boxShadow: '0 0 0 rgba(0,0,0,0)' }}
        transition={transitions.mechanical}
      >
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
        <motion.span
          className={styles.caretBar}
          initial={false}
          animate={{ scaleX: focused ? 1 : 0, opacity: focused ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        />
      </motion.div>
      <AnimatePresence mode="wait">
        {error ? (
          <motion.div
            key="error"
            className={styles.error}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {'>> '} {error}
          </motion.div>
        ) : hint ? (
          <motion.div
            key="hint"
            className={styles.hint}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {hint}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};