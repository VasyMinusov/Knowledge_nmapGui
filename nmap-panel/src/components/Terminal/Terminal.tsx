// src/components/Terminal/Terminal.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { IndustrialCard, GlitchText } from '@/components_kit';
import { transitions } from '@/tokens/motion';
import { VscTerminalPowershell, VscListSelection } from 'react-icons/vsc';
import { terminalApi } from '@/api/nmapApi';
import type { TerminalTool } from '@/api/nmapApi';
import { useTerminal } from '@/hooks/useTerminal';
import { TerminalConsole } from './TerminalConsole';
import { FlagBuilder } from './FlagBuilder';
import type { TerminalProps } from './Terminal.types';
import styles from './Terminal.module.css';

type Mode = 'raw' | 'builder';

const MODES: { id: Mode; label: string; icon: React.ReactNode }[] = [
  { id: 'raw', label: 'Терминал', icon: <VscTerminalPowershell /> },
  { id: 'builder', label: 'Конструктор', icon: <VscListSelection /> },
];

const QUICK: string[] = [
  'whatweb --color=never -a 1 ',
  'nmap -sV -T4 ',
  'nikto -h ',
  'dig +short ',
  'curl -sSIL ',
];

export const Terminal: React.FC<TerminalProps> = ({ initialTarget, title = 'ВСТРОЕННЫЙ ТЕРМИНАЛ' }) => {
  const term = useTerminal();
  const [mode, setMode] = useState<Mode>('raw');
  const [tools, setTools] = useState<TerminalTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ have: number; total: number } | null>(null);

  const loadCatalog = useCallback(() => {
    setLoading(true);
    setError(null);
    terminalApi
      .getCatalog()
      .then((res) => {
        setTools(res.data.tools);
        const bins = Object.values(res.data.binaries);
        setStats({ have: bins.filter(Boolean).length, total: bins.length });
      })
      .catch(() => setError('Не удалось получить каталог. Бэкенд запущен и доступен по /api?'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(loadCatalog, [loadCatalog]);

  return (
    <div className={styles.wrap}>
      <IndustrialCard variant="accent">
        <div className={styles.head}>
          <VscTerminalPowershell size={20} />
          <GlitchText text={title} />
          <span className={styles.spacer} />
          {stats && (
            <span className={styles.stats}>
              инструментов: <b>{stats.have}</b>/{stats.total}
            </span>
          )}
        </div>

        <div className={styles.toggle} role="tablist">
          {MODES.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                role="tab"
                aria-selected={active}
                className={`${styles.toggleBtn} ${active ? styles.toggleActive : ''}`}
                onClick={() => setMode(m.id)}
              >
                {active && (
                  <motion.span
                    layoutId="termModePill"
                    className={styles.pill}
                    transition={transitions.mechanical}
                  />
                )}
                <span className={styles.toggleLabel}>
                  {m.icon} {m.label}
                </span>
              </button>
            );
          })}
        </div>

        {mode === 'raw' ? (
          <div className={styles.quickRow}>
            <span className={styles.quickLabel}>быстрый старт:</span>
            {QUICK.map((q) => (
              <button
                key={q}
                className={styles.quickChip}
                disabled={term.running}
                onClick={() => term.exec(q + (initialTarget?.split(',')[0]?.trim() || 'example.com'))}
              >
                {q.trim()}
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.builderPane}>
            <FlagBuilder
              tools={tools}
              loading={loading}
              error={error}
              initialTarget={initialTarget}
              running={term.running}
              onRun={(cmd) => term.exec(cmd)}
              onReloadCatalog={loadCatalog}
            />
          </div>
        )}
      </IndustrialCard>

      <TerminalConsole term={term} interactive boot />
    </div>
  );
};
