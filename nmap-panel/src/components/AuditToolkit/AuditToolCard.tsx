// src/components/AuditToolkit/AuditToolCard.tsx
import React, { useState } from 'react';
import { NeonButton, NeonInput, NeonSelect, StatusBadge } from '@/components_kit';
import { VscPlay, VscSettingsGear } from 'react-icons/vsc';
import type { AuditToolCardProps } from './AuditToolkit.types';
import styles from './AuditToolCard.module.css';

const CATEGORY_ICON: Record<string, string> = {
  recon: '🛰',
  dirs: '🗂',
  web_vuln: '☣',
  tls: '🔐',
  osint: '🔎',
  network: '🌐',
};

export const AuditToolCard: React.FC<AuditToolCardProps> = ({ tool, disabled, running, onRun }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [port, setPort] = useState('443');
  const [threads, setThreads] = useState('20');
  const [extensions, setExtensions] = useState('');
  const [aggression, setAggression] = useState('1');
  const [severity, setSeverity] = useState('low,medium,high,critical');
  const [wpEnumerate, setWpEnumerate] = useState('vp,vt,u');
  const [allSources, setAllSources] = useState(false);

  const hasOptions = tool.category === 'tls' || tool.category === 'dirs'
    || ['whatweb', 'nuclei', 'wpscan', 'subfinder'].includes(tool.id);

  const collectOptions = (): Record<string, unknown> => {
    const o: Record<string, unknown> = {};
    if (tool.category === 'tls') o.port = Number(port) || 443;
    if (tool.category === 'dirs') {
      o.threads = Number(threads) || 20;
      if (extensions.trim()) o.extensions = extensions.trim();
    }
    if (tool.id === 'whatweb') o.aggression = Number(aggression) || 1;
    if (tool.id === 'nuclei') o.severity = severity;
    if (tool.id === 'wpscan') o.enumerate = wpEnumerate;
    if (tool.id === 'subfinder') o.all = allSources;
    return o;
  };

  return (
    <div className={`${styles.card} ${!tool.available ? styles.unavailable : ''}`}>
      <div className={styles.head}>
        <span className={styles.icon}>{CATEGORY_ICON[tool.category] ?? '▪'}</span>
        <span className={styles.name}>{tool.name}</span>
        <span className={styles.spacer} />
        <StatusBadge
          label={tool.available ? 'установлен' : 'нет'}
          variant={tool.available ? 'accent' : 'muted'}
        />
      </div>

      <div className={styles.category}>{tool.category_label}</div>
      <p className={styles.desc}>{tool.description}</p>

      {!tool.available && (
        <div className={styles.hint}>
          Требуется <code>{tool.binary}</code> — установка: <code>{tool.install_hint}</code>
        </div>
      )}

      {hasOptions && showOptions && (
        <div className={styles.options}>
          {tool.category === 'tls' && (
            <NeonInput label="Порт" value={port} onChange={setPort} size="sm" placeholder="443" />
          )}
          {tool.category === 'dirs' && (
            <>
              <NeonInput label="Потоки" value={threads} onChange={setThreads} size="sm" />
              <NeonInput
                label="Расширения"
                value={extensions}
                onChange={setExtensions}
                size="sm"
                placeholder="php,txt,bak"
              />
            </>
          )}
          {tool.id === 'whatweb' && (
            <NeonSelect
              label="Агрессивность"
              value={aggression}
              onChange={setAggression}
              options={[
                { value: '1', label: '1 — пассивно' },
                { value: '3', label: '3 — умеренно' },
                { value: '4', label: '4 — агрессивно' },
              ]}
            />
          )}
          {tool.id === 'nuclei' && (
            <NeonSelect
              label="Критичность"
              value={severity}
              onChange={setSeverity}
              options={[
                { value: 'low,medium,high,critical', label: 'low и выше' },
                { value: 'medium,high,critical', label: 'medium и выше' },
                { value: 'high,critical', label: 'high и critical' },
                { value: 'critical', label: 'только critical' },
              ]}
            />
          )}
          {tool.id === 'wpscan' && (
            <NeonSelect
              label="Перечислять"
              value={wpEnumerate}
              onChange={setWpEnumerate}
              options={[
                { value: 'vp,vt,u', label: 'уязв. плагины/темы + юзеры' },
                { value: 'vp', label: 'только уязвимые плагины' },
                { value: 'ap,at,u', label: 'все плагины/темы + юзеры' },
                { value: 'u', label: 'только пользователи' },
              ]}
            />
          )}
          {tool.id === 'subfinder' && (
            <NeonSelect
              label="Источники"
              value={allSources ? 'all' : 'fast'}
              onChange={(v) => setAllSources(v === 'all')}
              options={[
                { value: 'fast', label: 'быстрые (по умолчанию)' },
                { value: 'all', label: 'все источники (медленно)' },
              ]}
            />
          )}
        </div>
      )}

      <div className={styles.actions}>
        <NeonButton
          size="sm"
          variant="primary"
          disabled={disabled || running || !tool.available}
          onClick={() => onRun(tool.id, collectOptions())}
        >
          <VscPlay /> {running ? 'Выполняется…' : 'Запустить'}
        </NeonButton>
        {hasOptions && (
          <NeonButton size="sm" onClick={() => setShowOptions((v) => !v)}>
            <VscSettingsGear />
          </NeonButton>
        )}
      </div>
    </div>
  );
};
