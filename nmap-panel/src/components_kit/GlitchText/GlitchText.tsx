import type { GlitchTextProps } from './GlitchText.types';
import styles from './GlitchText.module.css';

// Pip-Boy: глитч-эффект убран (B6). Пропсы interval/speed сохранены
// для обратной совместимости, но больше не используются.
export const GlitchText: React.FC<GlitchTextProps> = ({ text, className }) => {
  return (
    <span className={`${styles.glitch} ${className || ''}`}>
      {text}
    </span>
  );
};
