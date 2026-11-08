import React, { useEffect, useState } from 'react';
import styles from './StatusBar.module.css';

export interface StatusBarProps {
  /** Текущий экран (уже человекочитаемая метка) */
  screen: string;
  /** Текущая тема оформления */
  theme: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

export const StatusBar: React.FC<StatusBarProps> = ({ screen, theme }) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const clock = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  return (
    <div className={styles.bar}>
      <span className={styles.brand}>
        <span className={styles.dot}>●</span> NMAP PANEL
      </span>
      <span className={styles.sep}>│</span>
      <span className={styles.item}>РЕЖИМ: {screen}</span>
      <span className={styles.sep}>│</span>
      <span className={styles.item}>ТЕМА: {theme}</span>
      <span className={styles.spacer} />
      <span className={styles.item}>{clock}</span>
    </div>
  );
};
