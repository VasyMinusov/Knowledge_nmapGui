// src/components/Terminal/FlagBuilder.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NeonButton, NeonInput, NeonSelect, NeonCheckbox, StatusBadge } from '@/components_kit';
import { transitions } from '@/tokens/motion';
import { VscPlay, VscRefresh, VscArrowLeft, VscTerminal } from 'react-icons/vsc';
import type { TerminalTool } from '@/api/nmapApi';
import type { FlagBuilderProps } from './Terminal.types';
import styles from './FlagBuilder.module.css';

const CAT_ICON: Record<string, string> = {
  recon: '🛰',
  dirs: '🗂',
  web_vuln: '☣',
  tls: '🔐',
  osint: '🔎',
  network: '🌐',
  brute: '🔑',
};

const needsQuote = (v: string) => /[\s"'`$;|&<>()?*]/.test(v);
const quote = (v: string) => (needsQuote(v) ? `"${v.replace(/"/g, '\\"')}"` : v);

type FlagState = Record<string, { on: boolean; value: string }>;

function assemble(tool: TerminalTool, target: string, flags: FlagState): string {
  const parts: string[] = [tool.binary];
  if (tool.target.prefix_subcommand) parts.push(tool.target.prefix_subcommand);

  const t = target.trim();
  if (t) {
    if (tool.target.flag) parts.push(tool.target.flag);
    parts.push(quote(t));
  }

  for (const def of tool.flags) {
    const st = flags[def.flag];
    if (!st?.on) continue;
    if (def.type === 'bool') {
      parts.push(def.flag);
    } else {
      const val = (st.value ?? '').trim();
      if (!val) continue;
      // флаги вида "--foo=bar" пишем слитно, остальные — "флаг значение"
      if (def.flag.endsWith('=')) parts.push(def.flag + quote(val));
      else parts.push(def.flag, quote(val));
    }
  }
  return parts.join(' ');
}

export const FlagBuilder: React.FC<FlagBuilderProps> = ({
  tools,
  loading,
  error,
  initialTarget,
  onRun,
  running,
  onReloadCatalog,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [target, setTarget] = useState(initialTarget?.split(',')[0]?.trim() || '');
  const [flags, setFlags] = useState<FlagState>({});

  const tool = useMemo(() => tools.find((t) => t.id === selectedId) || null, [tools, selectedId]);

  // Инициализация состояния флагов при выборе инструмента (учёт default: "on").
  useEffect(() => {
    if (!tool) return;
    const next: FlagState = {};
    for (const f of tool.flags) {
      next[f.flag] = {
        on: f.type === 'bool' && f.default === 'on',
        value: f.type !== 'bool' && f.default && f.default !== 'on' ? f.default : '',
      };
    }
    setFlags(next);
  }, [tool]);

  const groups = useMemo(() => {
    if (!tool) return [];
    const map = new Map<string, typeof tool.flags>();
    for (const f of tool.flags) {
      const g = f.group || 'Прочее';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(f);
    }
    return [...map.entries()];
  }, [tool]);

  const command = tool ? assemble(tool, target, flags) : '';

  const setFlag = (flag: string, patch: Partial<{ on: boolean; value: string }>) =>
    setFlags((prev) => ({ ...prev, [flag]: { ...prev[flag], ...patch } }));

  if (loading) return <div className={styles.state}>Загрузка каталога инструментов…</div>;
  if (error)
    return (
      <div className={styles.stateError}>
        {error}
        <NeonButton size="sm" onClick={onReloadCatalog}>
          <VscRefresh /> Повторить
        </NeonButton>
      </div>
    );

  // ── Шаг 1: выбор инструмента ──
  if (!tool) {
    return (
      <div className={styles.picker}>
        <div className={styles.pickerHint}>Выберите инструмент — дальше соберём флаги</div>
        <div className={styles.grid}>
          {tools.map((tl, i) => (
            <motion.button
              key={tl.id}
              className={`${styles.toolCard} ${!tl.available ? styles.dim : ''}`}
              onClick={() => setSelectedId(tl.id)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...transitions.mechanical, delay: i * 0.03 }}
              whileHover={{ y: -4, boxShadow: '0 0 22px var(--color-accent-glow)' }}
            >
              <span className={styles.toolIcon}>{CAT_ICON[tl.category] ?? '▪'}</span>
              <span className={styles.toolName}>{tl.name}</span>
              <span className={styles.toolDesc}>{tl.description}</span>
              <span className={styles.toolFoot}>
                <code>{tl.binary}</code>
                <StatusBadge
                  label={tl.available ? 'установлен' : 'нет'}
                  variant={tl.available ? 'accent' : 'muted'}
                />
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  // ── Шаг 2: конфигуратор флагов ──
  return (
    <div className={styles.builder}>
      <div className={styles.builderHead}>
        <NeonButton size="sm" onClick={() => setSelectedId(null)}>
          <VscArrowLeft /> инструменты
        </NeonButton>
        <span className={styles.builderTitle}>
          {CAT_ICON[tool.category]} {tool.name}
        </span>
        {!tool.available && <StatusBadge label="не установлен" variant="warning" />}
      </div>

      <div className={styles.targetRow}>
        <NeonInput
          label={`Цель (${tool.target.kind === 'url' ? 'URL' : 'host'})`}
          value={target}
          onChange={setTarget}
          placeholder={tool.target.placeholder}
        />
      </div>

      <div className={styles.groups}>
        {groups.map(([name, list], gi) => (
          <motion.div
            key={name}
            className={styles.group}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...transitions.smooth, delay: gi * 0.04 }}
          >
            <div className={styles.groupName}>{name}</div>
            <div className={styles.groupBody}>
              {list.map((f) => {
                const st = flags[f.flag] || { on: false, value: '' };
                return (
                  <div key={f.flag} className={`${styles.flag} ${st.on ? styles.flagOn : ''}`}>
                    <div className={styles.flagTop}>
                      <NeonCheckbox
                        checked={st.on}
                        onChange={(on) => setFlag(f.flag, { on })}
                        label={f.label}
                      />
                      <code className={styles.flagCode}>{f.flag}</code>
                    </div>
                    <div className={styles.flagDesc}>{f.description}</div>
                    <AnimatePresence>
                      {st.on && f.type !== 'bool' && (
                        <motion.div
                          className={styles.flagInput}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={transitions.snap}
                        >
                          {f.type === 'choice' ? (
                            <NeonSelect
                              value={st.value}
                              onChange={(value) => setFlag(f.flag, { value })}
                              options={(f.choices || []).map((c) => ({ value: c, label: c }))}
                              placeholder="выберите"
                            />
                          ) : (
                            <NeonInput
                              value={st.value}
                              onChange={(value) => setFlag(f.flag, { value })}
                              placeholder={f.placeholder || 'значение'}
                              size="sm"
                            />
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      <div className={styles.previewWrap}>
        <div className={styles.previewLabel}>Команда</div>
        <motion.div
          className={styles.preview}
          key={command}
          initial={{ boxShadow: '0 0 0 var(--color-accent-glow)' }}
          animate={{ boxShadow: '0 0 16px var(--color-accent-dim)' }}
          transition={{ duration: 0.4 }}
        >
          <code>$ {command}</code>
        </motion.div>
        <div className={styles.previewActions}>
          <NeonButton
            size="md"
            variant="primary"
            disabled={running || !target.trim() || !tool.available}
            onClick={() => onRun(command)}
          >
            <VscPlay /> {running ? 'Выполняется…' : 'Выполнить'}
          </NeonButton>
          <NeonButton size="md" disabled={running} onClick={() => onRun(command)}>
            <VscTerminal /> В терминал
          </NeonButton>
          {tool.examples[0] && (
            <button className={styles.example} onClick={() => onRun(tool.examples[0])} disabled={running}>
              пример: <code>{tool.examples[0]}</code>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
