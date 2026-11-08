// B4 — Pip-Boy дефолты для Chart.js.
// Цвета читаются из CSS-переменных (--pip-*), чтобы графики
// автоматически следовали текущей теме (green / amber).
import type { Chart as ChartJSType } from 'chart.js';

type ChartJSModule = typeof ChartJSType;

const cssVar = (name: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};

/** Текущие цвета темы (перечитываются при каждом вызове — тема может меняться) */
export const pipChartColors = () => {
  const fg = cssVar('--pip-fg', '#33ff66');
  const fgDim = cssVar('--pip-fg-dim', '#1a9944');
  const fgGhost = cssVar('--pip-fg-ghost', 'rgba(51, 255, 102, 0.35)');
  const warning = cssVar('--pip-warning', '#ffbb00');
  const danger = cssVar('--pip-danger', 'var(--pip-danger)');
  return { fg, fgDim, fgGhost, warning, danger };
};

/** Палитра для серий: один фосфорный цвет в разной прозрачности + акценты */
export const pipSeriesPalette = (n: number): string[] => {
  const { fg, warning, danger } = pipChartColors();
  const steps = [1, 0.75, 0.55, 0.4, 0.28, 0.18, 0.12, 0.09, 0.07, 0.05];
  const rgb = hexToRgb(fg);
  const out = steps.slice(0, Math.max(0, n - 2)).map((a) => `rgba(${rgb}, ${a})`);
  if (n >= 2) out.push(warning);
  if (n >= 3) out.push(danger);
  return out.slice(0, n);
};

const hexToRgb = (hex: string): string => {
  const m = hex.replace('#', '');
  if (m.length !== 6) return '51, 255, 102';
  return [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16)).join(', ');
};

/** Устанавливает глобальные дефолты Chart.js под тему. Вызывать после register(). */
export const applyPipChartDefaults = (ChartJS: ChartJSModule): void => {
  const { fg, fgDim, fgGhost } = pipChartColors();
  ChartJS.defaults.font.family = "'Share Tech Mono', 'Courier New', monospace";
  ChartJS.defaults.font.size = 11;
  ChartJS.defaults.color = fgDim;
  ChartJS.defaults.borderColor = fgGhost;
  ChartJS.defaults.plugins.legend.labels.color = fg;
  ChartJS.defaults.plugins.tooltip.backgroundColor = '#0a0f0a';
  ChartJS.defaults.plugins.tooltip.borderColor = fg;
  ChartJS.defaults.plugins.tooltip.borderWidth = 1;
  ChartJS.defaults.plugins.tooltip.titleColor = fg;
  ChartJS.defaults.plugins.tooltip.bodyColor = fg;
  ChartJS.defaults.animation = false; // Pip-Boy: без анимаций (B6)
};
