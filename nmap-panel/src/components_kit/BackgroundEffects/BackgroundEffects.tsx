import styles from './BackgroundEffects.module.css';

export const BackgroundEffects: React.FC = () => {
  // pointer-events: none на .overlay — эффект чисто визуальный
  return (
    <div className={styles.overlay}>
      <div className={styles.scanlines} />
      <div className={styles.vignette} />
    </div>
  );
};
