// src/components/PortChecker/PortChecker.tsx
import React, { useState, useMemo } from 'react';
import {
  NeonInput,
  NeonButton,
  StatusBadge,
  GlitchText,
  NeonSpinner,
} from '@/components_kit';
import { VscAdd, VscTrash } from 'react-icons/vsc';
import type { PortCheckerProps } from './PortChecker.types';
import styles from './PortChecker.module.css';

// Парсинг строки с портами: "80,443,22-25,3306" → [80,443,22,23,24,25,3306]
const parsePorts = (input: string): number[] => {
  const parts = input.split(',').map(s => s.trim()).filter(Boolean);
  const result: number[] = [];
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end) && start > 0 && end <= 65535 && start <= end) {
        for (let p = start; p <= end; p++) result.push(p);
      }
    } else {
      const num = Number(part);
      if (!isNaN(num) && num > 0 && num <= 65535) result.push(num);
    }
  }
  return [...new Set(result)];
};

const QUICK_PORTS = [
  { label: 'SSH', ports: [22] },
  { label: 'HTTP', ports: [80] },
  { label: 'HTTPS', ports: [443] },
  { label: 'DNS', ports: [53] },
  { label: 'MySQL', ports: [3306] },
  { label: 'PostgreSQL', ports: [5432] },
  { label: 'RDP', ports: [3389] },
  { label: 'SMTP', ports: [25, 587] },
];

export const PortChecker: React.FC<PortCheckerProps> = ({
  onCheck,
  loading,
  results,
}) => {
  const [host, setHost] = useState('192.168.1.1');
  const [portInput, setPortInput] = useState('');
  const [ports, setPorts] = useState<number[]>([80, 443, 22, 21]);
  const [error, setError] = useState('');

  const addPortsFromInput = () => {
    if (!portInput.trim()) return;
    const parsed = parsePorts(portInput);
    if (parsed.length === 0) {
      setError('Некорректные порты. Используйте, например: 80, 443, 22-25');
      return;
    }
    setError('');
    setPorts(prev => [...new Set([...prev, ...parsed])]);
    setPortInput('');
  };

  const addQuickPorts = (newPorts: number[]) => {
    setPorts(prev => [...new Set([...prev, ...newPorts])]);
  };

  const removePort = (port: number) => {
    setPorts(prev => prev.filter(p => p !== port));
  };

  const clearPorts = () => {
    setPorts([]);
  };

  const handleSubmit = () => {
    if (!host.trim()) {
      setError('Требуется указать хост');
      return;
    }
    if (ports.length === 0) {
      setError('Необходимо указать хотя бы один порт');
      return;
    }
    setError('');
    onCheck(host.trim(), ports);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPortsFromInput();
    }
  };

  const openCount = useMemo(() => {
    if (!results) return 0;
    return results.results.filter((r: any) => r.state === 'open').length;
  }, [results]);

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <div className={styles.hostField}>
          <NeonInput
            label="Хост"
            value={host}
            onChange={setHost}
            placeholder="IP или имя хоста"
            error={error && !host.trim() ? error : undefined}
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.portInputGroup}>
          <NeonInput
            label="Порты"
            value={portInput}
            onChange={setPortInput}
            placeholder="например, 80, 443, 22-25"
            onKeyDown={handleKeyDown}
            error={error && !portInput.trim() ? error : undefined}
            hint="Разделяйте запятыми, используйте '-' для диапазонов"
          />
          <div className={styles.portActions}>
            <NeonButton size="sm" onClick={addPortsFromInput}>
              <VscAdd /> Добавить
            </NeonButton>
            <NeonButton size="sm" variant="danger" onClick={clearPorts}>
              Очистить всё
            </NeonButton>
          </div>
        </div>
        <div className={styles.checkButton}>
          <NeonButton
            size="lg"
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || !host.trim() || ports.length === 0}
          >
            {loading ? <NeonSpinner size={24} /> : '▶ ПРОВЕРИТЬ ПОРТЫ'}
          </NeonButton>
        </div>
      </div>

      <div className={styles.quickButtons}>
        <span className={styles.quickLabel}>Быстрое добавление:</span>
        {QUICK_PORTS.map(q => (
          <NeonButton
            key={q.label}
            size="sm"
            onClick={() => addQuickPorts(q.ports)}
            disabled={loading}
          >
            {q.label}
          </NeonButton>
        ))}
      </div>

      <div className={styles.portChips}>
        {ports.length === 0 && (
          <span className={styles.emptyChips}>Порты не выбраны</span>
        )}
        {ports.map(port => (
          <span key={port} className={styles.chip}>
            {port}
            <button
              className={styles.chipRemove}
              onClick={() => removePort(port)}
              disabled={loading}
            >
              <VscTrash size={12} />
            </button>
          </span>
        ))}
      </div>

      {results && (
        <div className={styles.results}>
          <div className={styles.summary}>
            <GlitchText
              text={`${results.host} – ${openCount} открыто / ${results.summary.closed} закрыто / ${results.summary.error} ошибок`}
            />
          </div>
          <div className={styles.resultTable}>
            <table>
              <thead>
                <tr>
                  <th>Порт</th>
                  <th>Состояние</th>
                  <th>Ошибка</th>
                </tr>
              </thead>
              <tbody>
                {results.results.map((r: any) => (
                  <tr key={r.port}>
                    <td>{r.port}</td>
                    <td>
                      <StatusBadge
                        label={r.state}
                        variant={
                          r.state === 'open'
                            ? 'accent'
                            : r.state === 'error'
                            ? 'danger'
                            : 'muted'
                        }
                      />
                    </td>
                    <td>{r.error || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};