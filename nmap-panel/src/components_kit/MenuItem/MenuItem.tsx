import type { MenuItemProps } from './MenuItem.types';
import styles from './MenuItem.module.css';

export const MenuItem: React.FC<MenuItemProps> = ({
  label,
  icon,
  index,
  active,
  onClick,
}) => {
  return (
    <div
      className={`${styles.item} ${active ? styles.active : ''}`}
      onClick={onClick}
    >
      <span className={styles.index}>{String(index).padStart(2, '0')}</span>
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.label}>{label}</span>
      {active && <span className={styles.marker}>◄</span>}
    </div>
  );
};
