import { useState, useEffect } from 'react';
import type { GlitchTextProps } from './GlitchText.types';
import styles from './GlitchText.module.css';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';

export const GlitchText: React.FC<GlitchTextProps> = ({
  text,
  interval = 5000,
  speed = 30,
  className,
}) => {
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    const runGlitch = () => {
      let iteration = 0;
      const timer = setInterval(() => {
        setDisplay(
          text
            .split('')
            .map((char, i) => {
              if (char === ' ') return ' ';
              if (i < iteration) return text[i];
              return CHARS[Math.floor(Math.random() * CHARS.length)];
            })
            .join('')
        );
        iteration += 1 / 3;
        if (iteration >= text.length) {
          clearInterval(timer);
          setDisplay(text);
        }
      }, speed);
    };

    runGlitch();
    const loop = setInterval(runGlitch, interval);
    return () => clearInterval(loop);
  }, [text, interval, speed]);

  return (
    <span className={`${styles.glitch} ${className || ''}`}>
      {display}
    </span>
  );
};