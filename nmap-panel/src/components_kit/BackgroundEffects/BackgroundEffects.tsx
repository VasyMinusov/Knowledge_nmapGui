import styles from './BackgroundEffects.module.css';

export const BackgroundEffects: React.FC = () => {
  return (
    <div className={styles.overlay}>
      <div className={styles.scanlines} />
      <div className={styles.vignette} />
      <div className={styles.blobs} />
      <div className={styles.noise} />
    </div>
  );
};