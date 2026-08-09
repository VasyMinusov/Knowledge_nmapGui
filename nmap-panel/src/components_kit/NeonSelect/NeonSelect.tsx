import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VscChevronDown, VscCheck } from 'react-icons/vsc';
import { transitions } from '../../tokens/motion';
import type { NeonSelectProps } from './NeonSelect.types';
import styles from './NeonSelect.module.css';

export const NeonSelect: React.FC<NeonSelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'SELECT...',
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={styles.wrapper} ref={ref}>
      {label && <span className={styles.label}>{label}</span>}
      <motion.button
        type="button"
        className={`${styles.trigger} ${open ? styles.open : ''} ${disabled ? styles.disabled : ''}`}
        onClick={() => !disabled && setOpen((o) => !o)}
        whileTap={disabled ? undefined : { scale: 0.98 }}
        transition={transitions.mechanical}
        disabled={disabled}
      >
        <span className={selected ? styles.value : styles.placeholder}>
          {selected ? selected.label : placeholder}
        </span>
        <motion.span
          className={styles.chevron}
          animate={{ rotate: open ? 180 : 0 }}
          transition={transitions.snap}
        >
          <VscChevronDown />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.ul
            className={styles.menu}
            initial={{ opacity: 0, y: -8, scaleY: 0.9 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -8, scaleY: 0.9 }}
            transition={{ duration: 0.15 }}
            style={{ transformOrigin: 'top' }}
          >
            {options.map((opt, i) => (
              <motion.li
                key={opt.value}
                className={`${styles.option} ${opt.value === value ? styles.selected : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, ...transitions.mechanical }}
                whileHover={{ x: 4 }}
              >
                <span>{opt.label}</span>
                {opt.value === value && <VscCheck className={styles.checkIcon} />}
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};