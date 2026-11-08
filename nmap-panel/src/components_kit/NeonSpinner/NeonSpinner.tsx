import { useEffect, useState } from 'react';
import type { NeonSpinnerProps } from './NeonSpinner.types';
import styles from './NeonSpinner.module.css';

const FRAMES = ['|', '/', '-', '\\'];

export const NeonSpinner: React.FC<NeonSpinnerProps> = ({ size = 40, label }) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), 100);
    return () => clearInterval(t);
  }, []);

  return (
    <div className={styles.wrapper}>
      <span className={styles.glyph} style={{ fontSize: size * 0.5, width: size, height: size }}>
        {FRAMES[frame]}
      </span>
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
};
