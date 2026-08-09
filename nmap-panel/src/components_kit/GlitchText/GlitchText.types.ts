export interface GlitchTextProps {
  text: string;
  /** Интервал между повторениями эффекта (мс) */
  interval?: number;
  /** Скорость «дешифровки» (мс) */
  speed?: number;
  className?: string;
}