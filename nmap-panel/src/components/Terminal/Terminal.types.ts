import type { TerminalHook } from '@/hooks/useTerminal';
import type { TerminalTool } from '@/api/nmapApi';

export interface TerminalProps {
  /** Необязательная стартовая цель (например, targets открытого скана). */
  initialTarget?: string;
  /** Заголовок консоли. */
  title?: string;
}

export interface TerminalConsoleProps {
  term: TerminalHook;
  /** Показывать активную строку ввода. */
  interactive?: boolean;
  boot?: boolean;
}

export interface FlagBuilderProps {
  tools: TerminalTool[];
  loading: boolean;
  error: string | null;
  initialTarget?: string;
  onRun: (command: string) => void;
  running: boolean;
  onReloadCatalog: () => void;
}
