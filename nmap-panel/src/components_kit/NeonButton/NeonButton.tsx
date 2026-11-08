import type { NeonButtonProps } from './NeonButton.types';
import styles from './NeonButton.module.css';

export const NeonButton: React.FC<NeonButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled,
}) => {
  return (
    <button
      type="button"
      className={`${styles.button} ${styles[variant]} ${styles[size]}`}
      onClick={onClick}
      disabled={disabled}
    >
      [ {children} ]
    </button>
  );
};
