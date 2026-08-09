import type { AvatarProps } from './Avatar.types';
import styles from './Avatar.module.css';

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

export const Avatar: React.FC<AvatarProps> = ({ name, size = 36, status }) => {
  return (
    <span className={styles.wrapper} style={{ width: size, height: size }}>
      <span className={styles.square} style={{ fontSize: size * 0.38 }}>
        {getInitials(name)}
      </span>
      {status && <span className={`${styles.status} ${styles[status]}`} />}
    </span>
  );
};