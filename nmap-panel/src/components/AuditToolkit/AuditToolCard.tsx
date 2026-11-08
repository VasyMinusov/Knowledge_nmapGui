// src/components/AuditToolkit/AuditToolCard.tsx
import React, { useState } from 'react';
import { NeonButton, NeonInput, NeonSelect, StatusBadge } from '@/components_kit';
import { VscPlay, VscSettingsGear } from 'react-icons/vsc';
import type { AuditToolCardProps } from './AuditToolkit.types';
import styles from './AuditToolCard.module.css';

const CATEGORY_ICON: Record<string, string> = {
  recon: '🛰',
  scanning: '📡',
  vuln: '☣',
  exploit: '💥',
  brute: '🔑',
  tls: '🔐',
  utils: '🛠',
};

// Группы опций по id инструментов.
const PORT_TOOLS = new Set(['sslyze', 'openssl_cert', 'ldapsearch', 'hydra', 'msf_ssh_login']);
const WORDLIST_TOOLS = new Set([
  'gobuster', 'ffuf', 'feroxbuster', 'dirsearch', 'wfuzz', 'dnsenum',
  'hydra', 'medusa', 'patator', 'ncrack', 'john', 'hashcat',
]);
// A4.4: какая категория словарей подходит инструменту.
const WORDLIST_KIND: Record<string, 'directories' | 'passwords' | 'subdomains'> = {
  gobuster: 'directories', ffuf: 'directories', feroxbuster: 'directories',
  dirsearch: 'directories', wfuzz: 'directories', dnsenum: 'subdomains',
  hydra: 'passwords', medusa: 'passwords', patator: 'passwords', ncrack: 'passwords',
  john: 'passwords', hashcat: 'passwords',
};
const USERLIST_TOOLS = new Set(['hydra']); // A4.4: отдельное поле -L
const THREADS_TOOLS = new Set([
  'gobuster', 'ffuf', 'feroxbuster', 'dirsearch', 'wfuzz',
  'hydra', 'medusa', 'patator', 'ncrack',
]);
const EXTENSIONS_TOOLS = new Set(['gobuster', 'dirsearch']);
const USER_TOOLS = new Set(['hydra', 'medusa', 'patator', 'ncrack', 'smbmap', 'rpcclient']);
const SERVICE_TOOLS = new Set(['hydra', 'ncrack']);
const MODULE_TOOLS = new Set(['medusa', 'patator']);

const humanSize = (bytes: number): string => {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${bytes} Б`;
};

export const AuditToolCard: React.FC<AuditToolCardProps> = ({ tool, disabled, running, wordlists, onRun }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [port, setPort] = useState('443');
  const [threads, setThreads] = useState('20');
  const [extensions, setExtensions] = useState('');
  const [wordlist, setWordlist] = useState('');
  const [userlist, setUserlist] = useState('');
  const [user, setUser] = useState('root');
  const [service, setService] = useState('ssh');
  const [module, setModule] = useState('ssh_login');
  const [msfModule, setMsfModule] = useState('');
  const [msfOptions, setMsfOptions] = useState('');
  const [aggression, setAggression] = useState('1');
  const [severity, setSeverity] = useState('low,medium,high,critical');
  const [wpEnumerate, setWpEnumerate] = useState('vp,vt,u');
  const [allSources, setAllSources] = useState(false);

  const hasOptions =
    tool.category === 'tls'
    || PORT_TOOLS.has(tool.id)
    || WORDLIST_TOOLS.has(tool.id)
    || USERLIST_TOOLS.has(tool.id)
    || USER_TOOLS.has(tool.id)
    || ['whatweb', 'nuclei', 'wpscan', 'subfinder', 'msf_custom'].includes(tool.id);

  const collectOptions = (): Record<string, unknown> => {
    const o: Record<string, unknown> = {};
    if (tool.category === 'tls' || PORT_TOOLS.has(tool.id)) o.port = Number(port) || 443;
    if (WORDLIST_TOOLS.has(tool.id) && wordlist.trim()) o.wordlist = wordlist.trim();
    if (USERLIST_TOOLS.has(tool.id) && userlist.trim()) o.userlist = userlist.trim();
    if (THREADS_TOOLS.has(tool.id)) o.threads = Number(threads) || 20;
    if (EXTENSIONS_TOOLS.has(tool.id) && extensions.trim()) o.extensions = extensions.trim();
    if (USER_TOOLS.has(tool.id)) o.user = user.trim() || 'root';
    if (SERVICE_TOOLS.has(tool.id)) o.service = service;
    if (MODULE_TOOLS.has(tool.id)) o.module = module.trim() || 'ssh_login';
    if (tool.id === 'whatweb') o.aggression = Number(aggression) || 1;
    if (tool.id === 'nuclei') o.severity = severity;
    if (tool.id === 'wpscan') o.enumerate = wpEnumerate;
    if (tool.id === 'subfinder') o.all = allSources;
    if (tool.id === 'msf_custom') {
      o.module = msfModule.trim();
      if (msfOptions.trim()) o.options_str = msfOptions.trim();
    }
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
          {(tool.category === 'tls' || PORT_TOOLS.has(tool.id)) && (
            <NeonInput label="Порт" value={port} onChange={setPort} size="sm" placeholder="443" />
          )}
          {WORDLIST_TOOLS.has(tool.id) && (() => {
            const kind = WORDLIST_KIND[tool.id] ?? 'directories';
            const entries = [...(wordlists?.[kind] ?? []), ...(wordlists?.generated ?? [])];
            if (entries.length > 0) {
              return (
                <NeonSelect
                  label={`Словарь (${kind === 'passwords' ? 'пароли' : kind === 'subdomains' ? 'поддомены' : 'директории'})`}
                  value={wordlist}
                  onChange={setWordlist}
                  options={[
                    { value: '', label: 'по умолчанию' },
                    ...entries.map((e) => ({ value: e.path, label: `${e.name} (${humanSize(e.size)})` })),
                  ]}
                />
              );
            }
            return (
              <NeonInput
                label="Словарь (путь в контейнере, пусто = по умолчанию)"
                value={wordlist}
                onChange={setWordlist}
                size="sm"
                placeholder="/usr/share/seclists/…"
              />
            );
          })()}
          {USERLIST_TOOLS.has(tool.id) && (() => {
            const entries = wordlists?.usernames ?? [];
            if (entries.length > 0) {
              return (
                <NeonSelect
                  label="Файл логинов -L (пусто = один логин)"
                  value={userlist}
                  onChange={setUserlist}
                  options={[
                    { value: '', label: '— не использовать —' },
                    ...entries.map((e) => ({ value: e.path, label: `${e.name} (${humanSize(e.size)})` })),
                  ]}
                />
              );
            }
            return null;
          })()}
          {THREADS_TOOLS.has(tool.id) && (
            <NeonInput label="Потоки" value={threads} onChange={setThreads} size="sm" />
          )}
          {EXTENSIONS_TOOLS.has(tool.id) && (
            <NeonInput
              label="Расширения"
              value={extensions}
              onChange={setExtensions}
              size="sm"
              placeholder="php,txt,bak"
            />
          )}
          {USER_TOOLS.has(tool.id) && (
            <NeonInput label="Пользователь" value={user} onChange={setUser} size="sm" />
          )}
          {SERVICE_TOOLS.has(tool.id) && (
            <NeonSelect
              label="Сервис"
              value={service}
              onChange={setService}
              options={[
                { value: 'ssh', label: 'SSH' },
                { value: 'ftp', label: 'FTP' },
                { value: 'telnet', label: 'Telnet' },
                { value: 'rdp', label: 'RDP' },
                { value: 'smb', label: 'SMB' },
                { value: 'smtp', label: 'SMTP' },
                { value: 'mysql', label: 'MySQL' },
                { value: 'postgres', label: 'PostgreSQL' },
                { value: 'vnc', label: 'VNC' },
              ]}
            />
          )}
          {MODULE_TOOLS.has(tool.id) && (
            <NeonInput
              label="Модуль"
              value={module}
              onChange={setModule}
              size="sm"
              placeholder={tool.id === 'patator' ? 'ssh_login' : 'ssh'}
            />
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
          {tool.id === 'msf_custom' && (
            <>
              <NeonInput
                label="Модуль Metasploit"
                value={msfModule}
                onChange={setMsfModule}
                size="sm"
                placeholder="auxiliary/scanner/http/http_version"
              />
              <NeonInput
                label="set-опции (по строке: set KEY VALUE)"
                value={msfOptions}
                onChange={setMsfOptions}
                size="sm"
                placeholder="set RPORT 8080"
              />
            </>
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

