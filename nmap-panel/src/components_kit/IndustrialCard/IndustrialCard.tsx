import type { IndustrialCardProps } from './IndustrialCard.types';
import styles from './IndustrialCard.module.css';

export const IndustrialCard: React.FC<IndustrialCardProps> = ({
  children,
  title,
  variant = 'default',
}) => {
  const isAccent = variant === 'accent';

  return (
    <div className={`${styles.card} ${isAccent ? styles.accent : ''}`}>
      {title && <div className={styles.header}>[ {title} ]</div>}
      <div className={styles.body}>{children}</div>
    </div>
  );
};
