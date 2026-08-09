// src/components/CommandExplainer/CommandExplainer.tsx
import React, { useState } from 'react';
import {
  IndustrialCard,
  GlitchText,
  NeonInput,
  NeonButton,
  NeonSpinner,
  StatusBadge,
} from '@/components_kit';
import { nmapApi } from '@/api/nmapApi';
import styles from './CommandExplainer.module.css';


interface ExplainedFlag {
  flag: string;
  arg?: string | null;
  name?: string | null;
  description: string;
  category: string;
  example?: string | null;
  use_case?: string | null;
}

interface ExplainResponse {
  command: string;
  summary: string;
  flags: ExplainedFlag[];
}

export const CommandExplainer: React.FC = () => {
  const [command, setCommand] = useState('nmap -sS -sV -p 22,80 192.168.1.1');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExplainResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExplain = async () => {
    if (!command.trim()) {
      setError('Пожалуйста, введите команду');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await nmapApi.explainCommand(command.trim());
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Не удалось объяснить команду');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleExplain();
    }
  };

  // Примеры команд для быстрой вставки
  const examples = [
    'nmap -sS -sV -O -T4 192.168.1.0/24',
    'nmap -sU -p 53,123 192.168.1.1',
    'nmap --script vuln --script-args http-title.url=/admin 192.168.1.1',
    'nmap -sn 192.168.1.0/24',
    'nmap -A --traceroute 192.168.1.1',
  ];

  return (
    <IndustrialCard variant="accent">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <GlitchText text="ОБЪЯСНИТЕЛЬ КОМАНД" />
      </div>

      <div className={styles.inputArea}>
        <NeonInput
          label="Команда Nmap"
          value={command}
          onChange={setCommand}
          onKeyDown={handleKeyDown}
          placeholder="например, nmap -sS -sV 192.168.1.1"
          error={error || undefined}
          size="lg"
        />
        <NeonButton
          variant="primary"
          size="lg"
          onClick={handleExplain}
          disabled={loading || !command.trim()}
        >
          {loading ? <NeonSpinner size={24} /> : '▶ ОБЪЯСНИТЬ'}
        </NeonButton>
      </div>

      <div className={styles.examples}>
        <span className={styles.exampleLabel}>Быстрые примеры:</span>
        {examples.map((ex, idx) => (
          <button
            key={idx}
            className={styles.exampleBtn}
            onClick={() => setCommand(ex)}
            disabled={loading}
          >
            {ex}
          </button>
        ))}
      </div>

      {result && (
        <div className={styles.result}>
          <div className={styles.summary}>
            <GlitchText text={result.summary} />
            <span className={styles.commandDisplay}>$ {result.command}</span>
          </div>
          <div className={styles.flagsGrid}>
            {result.flags.map((flag, idx) => (
              <div key={idx} className={styles.flagCard}>
                <div className={styles.flagHeader}>
                  <span className={styles.flagCode}>{flag.flag}</span>
                  {flag.arg && <span className={styles.flagArg}> {flag.arg}</span>}
                  {flag.category && flag.category !== 'unknown' && (
                    <StatusBadge label={flag.category} variant="muted" />
                  )}
                </div>
                <div className={styles.flagBody}>
                  {flag.name ? (
                    <>
                      <div className={styles.flagName}>{flag.name}</div>
                      <div className={styles.flagDesc}>{flag.description}</div>
                      {flag.use_case && (
                        <div className={styles.flagUseCase}>
                          <span className={styles.label}>Применение:</span> {flag.use_case}
                        </div>
                      )}
                      {flag.example && (
                        <div className={styles.flagExample}>
                          <span className={styles.label}>Пример:</span> {flag.example}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={styles.flagUnknown}>Неизвестный флаг – проверьте команду</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </IndustrialCard>
  );
};