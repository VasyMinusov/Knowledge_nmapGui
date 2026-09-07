// src/hooks/useTerminal.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { terminalApi } from '../api/nmapApi';

const POLL_MS = 450;
const HISTORY_KEY = 'nmap-panel:terminal-history';

export interface TerminalHook {
  /** Весь накопленный вывод (несколько команд подряд). */
  scrollback: string;
  running: boolean;
  exitCode: number | null;
  history: string[];
  exec: (command: string) => Promise<void>;
  interrupt: () => void;
  kill: () => void;
  clear: () => void;
}

export const useTerminal = (): TerminalHook => {
  const [scrollback, setScrollback] = useState('');
  const [running, setRunning] = useState(false);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [history, setHistory] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const sessionId = useRef<string | null>(null);
  const cursor = useRef(0);
  const poller = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPoll = useCallback(() => {
    if (poller.current) {
      clearInterval(poller.current);
      poller.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    const sid = sessionId.current;
    if (!sid) return;
    terminalApi
      .poll(sid, cursor.current)
      .then((res) => {
        const { chunk, cursor: next, running: isRunning, exit_code } = res.data;
        if (chunk) {
          setScrollback((prev) => prev + chunk);
          cursor.current = next;
        }
        setRunning(isRunning);
        if (!isRunning) {
          setExitCode(exit_code);
          stopPoll();
        }
      })
      .catch(() => {
        /* сессия могла устареть — просто останавливаемся */
        stopPoll();
        setRunning(false);
      });
  }, [stopPoll]);

  const exec = useCallback(
    async (command: string) => {
      const cmd = command.trim();
      if (!cmd || running) return;

      setHistory((prev) => {
        const next = [cmd, ...prev.filter((c) => c !== cmd)].slice(0, 60);
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        } catch {
          /* приватный режим */
        }
        return next;
      });

      setExitCode(null);
      setRunning(true);
      // отбивка перед новой командой
      setScrollback((prev) => (prev && !prev.endsWith('\n\n') ? prev + '\n' : prev));

      try {
        const res = await terminalApi.exec(cmd);
        sessionId.current = res.data.session_id;
        cursor.current = 0;
        stopPoll();
        tick();
        poller.current = setInterval(tick, POLL_MS);
      } catch (e: any) {
        const detail = e?.response?.data?.detail || 'Не удалось выполнить команду';
        setScrollback((prev) => prev + `$ ${cmd}\n[x] ${detail}\n`);
        setRunning(false);
        setExitCode(1);
      }
    },
    [running, stopPoll, tick],
  );

  const signal = useCallback((sig: 'int' | 'kill') => {
    const sid = sessionId.current;
    if (!sid) return;
    terminalApi.signal(sid, sig).catch(() => undefined);
  }, []);

  const interrupt = useCallback(() => signal('int'), [signal]);
  const kill = useCallback(() => signal('kill'), [signal]);

  const clear = useCallback(() => {
    setScrollback('');
    setExitCode(null);
  }, []);

  useEffect(() => {
    return () => {
      stopPoll();
      if (sessionId.current) terminalApi.close(sessionId.current).catch(() => undefined);
    };
  }, [stopPoll]);

  return { scrollback, running, exitCode, history, exec, interrupt, kill, clear };
};
