// src/components/Terminal/TerminalConsole.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { NeonButton } from '@/components_kit';
import { VscDebugStop, VscClearAll, VscChevronRight } from 'react-icons/vsc';
import type { TerminalConsoleProps } from './Terminal.types';
import styles from './TerminalConsole.module.css';

const ANSI = /\x1b\[[0-9;]*m/g;
const BOOT_LINES = [
  'MACHINE-PARTY SHELL // v1.0',
  'инициализация окружения ..........  ok',
  'песочница ....................... backend/terminal_runs/',
  'политика ....................... allowlist (без shell, без записи в БД)',
  'готов. введите команду или откройте КОНСТРУКТОР.',
];

export const TerminalConsole: React.FC<TerminalConsoleProps> = ({ term, interactive = true, boot = true }) => {
  const { scrollback, running, exitCode, history, exec, interrupt, kill, clear } = term;

  const [input, setInput] = useState('');
  const [histIdx, setHistIdx] = useState(-1);
  const [bootText, setBootText] = useState(boot ? '' : BOOT_LINES.join('\n') + '\n');
  const viewRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Загрузочная «печать»
  useEffect(() => {
    if (!boot) return;
    const full = BOOT_LINES.join('\n') + '\n';
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setBootText(full.slice(0, i));
      if (i >= full.length) clearInterval(id);
    }, 12);
    return () => clearInterval(id);
  }, [boot]);

  const rendered = useMemo(() => (bootText + scrollback).replace(ANSI, ''), [bootText, scrollback]);

  // Автопрокрутка вниз
  useEffect(() => {
    const el = viewRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [rendered, running]);

  const submit = () => {
    if (!input.trim() || running) return;
    exec(input);
    setInput('');
    setHistIdx(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(histIdx + 1, history.length - 1);
      if (next >= 0) {
        setHistIdx(next);
        setInput(history[next]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = histIdx - 1;
      if (next < 0) {
        setHistIdx(-1);
        setInput('');
      } else {
        setHistIdx(next);
        setInput(history[next]);
      }
    } else if (e.key === 'c' && e.ctrlKey) {
      if (running) {
        e.preventDefault();
        interrupt();
      }
    }
  };

  return (
    <div className={`${styles.console} ${running ? styles.busy : ''}`} onClick={() => inputRef.current?.focus()}>
      <div className={styles.scanlines} aria-hidden />
      <div className={styles.glow} aria-hidden />

      <div className={styles.bar}>
        <span className={styles.dot} data-c="r" />
        <span className={styles.dot} data-c="y" />
        <span className={styles.dot} data-c="g" />
        <span className={styles.barTitle}>
          {running ? (
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.1, repeat: Infinity }}
            >
              ● выполняется
            </motion.span>
          ) : exitCode === null ? (
            'idle'
          ) : (
            <span className={exitCode === 0 ? styles.ok : styles.fail}>
              exit {exitCode}
            </span>
          )}
        </span>
        <span className={styles.barActions}>
          {running && (
            <>
              <NeonButton size="sm" variant="danger" onClick={interrupt}>
                <VscDebugStop /> SIGINT
              </NeonButton>
              <NeonButton size="sm" variant="danger" onClick={kill}>
                KILL
              </NeonButton>
            </>
          )}
          <NeonButton size="sm" onClick={clear}>
            <VscClearAll /> Очистить
          </NeonButton>
        </span>
      </div>

      <div className={styles.view} ref={viewRef}>
        <pre className={styles.pre}>{rendered}</pre>
        {running && <span className={styles.runCursor}>▊</span>}
      </div>

      {interactive && (
        <div className={styles.inputRow}>
          <span className={styles.prompt}>
            <VscChevronRight />
          </span>
          <input
            ref={inputRef}
            className={styles.input}
            value={input}
            spellCheck={false}
            autoComplete="off"
            placeholder={running ? 'процесс выполняется — Ctrl+C для остановки' : 'nmap -sV example.com'}
            disabled={running}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
          />
          {!running && <span className={styles.caret} aria-hidden />}
        </div>
      )}
    </div>
  );
};
