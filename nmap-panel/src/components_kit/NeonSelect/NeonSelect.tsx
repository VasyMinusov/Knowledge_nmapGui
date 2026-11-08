import { useEffect, useRef, useState } from 'react';
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
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.open : ''} ${disabled ? styles.disabled : ''}`}
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
      >
        <span className={selected ? styles.value : styles.placeholder}>
          {selected ? selected.label : placeholder}
        </span>
        <span className={styles.chevron}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <ul className={styles.menu}>
          {options.map((opt) => (
            <li
              key={opt.value}
              className={`${styles.option} ${opt.value === value ? styles.selected : ''}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              <span>{opt.value === value ? '[x] ' : '[ ] '}{opt.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
