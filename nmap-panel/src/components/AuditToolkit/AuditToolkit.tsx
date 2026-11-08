// src/components/AuditToolkit/AuditToolkit.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IndustrialCard, IndustrialTabs, GlitchText, NeonInput, NeonSelect, NeonButton } from '@/components_kit';
import { VscTools, VscRefresh, VscLightbulb, VscListUnordered, VscGift } from 'react-icons/vsc';
import { auditApi, payloadsApi } from '@/api/nmapApi';
import type {
  AuditTool,
  AuditSuggestion,
  AuditFindingsResponse,
  PayloadGenerateResponse,
} from '@/api/nmapApi';
import { useAudit } from '@/hooks/useAudit';
import { AuditToolCard } from './AuditToolCard';
import { AuditTaskPanel } from './AuditTaskPanel';
import type { AuditToolkitProps, AuditWordlists } from './AuditToolkit.types';
import styles from './AuditToolkit.module.css';

const SEV_LABEL: Record<string, string> = {
  critical: 'CRIT', high: 'HIGH', medium: 'MED', low: 'LOW', info: 'INFO',
};
const PAYLOAD_FORMATS = ['exe', 'elf', 'raw', 'python', 'psh', 'php', 'asp', 'aspx', 'jsp', 'war', 'dll', 'macho'];

export const AuditToolkit: React.FC<AuditToolkitProps> = ({ scanId, hosts, targets }) => {
  const [tools, setTools] = useState<AuditTool[]>([]);
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);
  const [loadingTools, setLoadingTools] = useState(true);
  const [toolsError, setToolsError] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string>('all');
  const [target, setTarget] = useState<string>('');
  const [wordlists, setWordlists] = useState<AuditWordlists>({});

  // A6 — рекомендации и сводка находок
  const [suggestions, setSuggestions] = useState<AuditSuggestion[]>([]);
  const [findingsRes, setFindingsRes] = useState<AuditFindingsResponse | null>(null);

  // A3.3 — генератор payload
  const [plPayload, setPlPayload] = useState('windows/x64/meterpreter/reverse_tcp');
  const [plLhost, setPlLhost] = useState('');
  const [plLport, setPlLport] = useState('4444');
  const [plFormat, setPlFormat] = useState('exe');
  const [plBusy, setPlBusy] = useState(false);
  const [plResult, setPlResult] = useState<PayloadGenerateResponse | null>(null);
  const [plError, setPlError] = useState<string | null>(null);

  const { taskList, runningCount, runTool, cancelTask, removeTask } = useAudit(scanId);

  const hostOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (const h of hosts) {
      if (h.status !== 'up' && h.status !== 'unknown') continue;
      const label = h.hostname ? `${h.ip} (${h.hostname})` : h.ip;
      opts.push({ value: h.hostname || h.ip, label });
      if (h.hostname) opts.push({ value: h.ip, label: h.ip });
    }
    const firstTarget = (targets || '').split(',')[0]?.trim();
    if (firstTarget && !opts.some((o) => o.value === firstTarget)) {
      opts.unshift({ value: firstTarget, label: `${firstTarget} (цель скана)` });
    }
    return opts;
  }, [hosts, targets]);

  useEffect(() => {
    if (!target && hostOptions.length) setTarget(hostOptions[0].value);
  }, [hostOptions, target]);

  const loadTools = () => {
    setLoadingTools(true);
    setToolsError(null);
    auditApi
      .getTools()
      .then((res) => {
        setTools(res.data.tools);
        setCategories(res.data.categories);
      })
      .catch(() => setToolsError('Не удалось получить список инструментов. Бэкенд запущен?'))
      .finally(() => setLoadingTools(false));
    // A4.3: словари для выпадающих списков (не критично при ошибке)
    auditApi
      .getWordlists()
      .then((res) => setWordlists(res.data.categories))
      .catch(() => setWordlists({}));
  };

  const loadSuggestions = useCallback(() => {
    if (!scanId) return;
    auditApi
      .getSuggestions(scanId)
      .then((res) => setSuggestions(res.data.suggestions))
      .catch(() => setSuggestions([]));
  }, [scanId]);

  const loadFindings = useCallback(() => {
    if (!scanId) return;
    auditApi
      .getFindings(scanId)
      .then((res) => setFindingsRes(res.data))
      .catch(() => setFindingsRes(null));
  }, [scanId]);

  useEffect(loadTools, []);
  useEffect(() => {
    loadSuggestions();
    loadFindings();
  }, [loadSuggestions, loadFindings]);

  const tabs = useMemo(
    () => [{ id: 'all', label: 'Все' }, ...categories.map((c) => ({ id: c.id, label: c.label }))],
    [categories],
  );

  const visibleTools = tools.filter((t) => activeCat === 'all' || t.category === activeCat);

  const toolName = (id: string) => tools.find((t) => t.id === id)?.name ?? id;

  const handleRun = (toolId: string, options: Record<string, unknown>) => {
    const value = target.trim();
    if (!value) return;
    runTool(toolId, value, options).catch(() => undefined);
  };

  const handleSuggestion = (s: AuditSuggestion) => {
    runTool(s.tool_id, s.target, s.options)
      .then(() => loadSuggestions())
      .catch(() => undefined);
  };

  const handleGeneratePayload = () => {
    setPlBusy(true);
    setPlError(null);
    setPlResult(null);
    payloadsApi
      .generate({ payload: plPayload.trim(), lhost: plLhost.trim(), lport: Number(plLport) || 4444, format: plFormat })
      .then((res) => setPlResult(res.data))
      .catch((err) => setPlError(err?.response?.data?.detail || 'Не удалось сгенерировать payload'))
      .finally(() => setPlBusy(false));
  };

  const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];

  return (
    <div className={styles.wrap}>
      <IndustrialCard variant="accent">
        <div className={styles.title}>
          <VscTools size={20} />
          <GlitchText text="ИНСТРУМЕНТАРИЙ АУДИТА" />
          <span className={styles.spacer} />
          <NeonButton size="sm" onClick={loadTools}>
            <VscRefresh /> Обновить
          </NeonButton>
        </div>

        <div className={styles.targetRow}>
          {hostOptions.length > 0 ? (
            <div className={styles.targetSelect}>
              <NeonSelect
                label="Цель из результатов скана"
                value={hostOptions.some((o) => o.value === target) ? target : ''}
                onChange={setTarget}
                options={hostOptions}
                placeholder="выберите хост"
              />
            </div>
          ) : null}
          <div className={styles.targetInput}>
            <NeonInput
              label="Цель (host или URL)"
              value={target}
              onChange={setTarget}
              placeholder="example.com или https://example.com/app"
              hint="Для веб-инструментов можно указать полный URL, для TLS — только хост"
            />
          </div>
        </div>

        {/* A6: рекомендуемые действия по открытым портам/технологиям скана */}
        {suggestions.length > 0 && (
          <div className={styles.sugg}>
            <div className={styles.suggTitle}>
              <VscLightbulb /> РЕКОМЕНДУЕМЫЕ ДЕЙСТВИЯ
              <button type="button" className={styles.linkBtn} onClick={loadSuggestions}>
                обновить
              </button>
            </div>
            <div className={styles.chips}>
              {suggestions.map((s) => (
                <button
                  key={`${s.tool_id}:${s.target}`}
                  type="button"
                  className={styles.chip}
                  title={`${s.reason}\nЦель: ${s.target}`}
                  onClick={() => handleSuggestion(s)}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <IndustrialTabs tabs={tabs} active={activeCat} onChange={setActiveCat} />

        {loadingTools && <div className={styles.state}>Загрузка инструментов…</div>}
        {toolsError && <div className={styles.stateError}>{toolsError}</div>}

        {!loadingTools && !toolsError && (
          <div className={styles.grid}>
            {visibleTools.map((tool) => (
              <AuditToolCard
                key={tool.id}
                tool={tool}
                wordlists={wordlists}
                disabled={tool.target_kind !== 'none' && !target.trim()}
                running={taskList.some((t) => t.tool_id === tool.id && t.status === 'running')}
                onRun={handleRun}
              />
            ))}
          </div>
        )}
      </IndustrialCard>

      {/* A6: сводная таблица находок по всем задачам скана */}
      <IndustrialCard variant="accent">
        <div className={styles.title}>
          <VscListUnordered size={20} />
          <GlitchText text="СВОДКА НАХОДОК" />
          <span className={styles.spacer} />
          <NeonButton size="sm" onClick={loadFindings}>
            <VscRefresh /> Обновить
          </NeonButton>
        </div>
        {!findingsRes || findingsRes.findings.length === 0 ? (
          <div className={styles.state}>
            Находок пока нет — они появятся после завершения задач аудита.
          </div>
        ) : (
          <>
            <div className={styles.fstats}>
              {severityOrder
                .filter((sev) => findingsRes.by_severity[sev])
                .map((sev) => (
                  <span key={sev} className={`${styles.fstat} ${styles[`sev_${sev}`]}`}>
                    {SEV_LABEL[sev]}: {findingsRes.by_severity[sev]}
                  </span>
                ))}
              <span className={styles.fstat}>задач: {findingsRes.tasks_total}</span>
            </div>
            <div className={styles.ftable}>
              {findingsRes.findings.slice(0, 100).map((f, i) => (
                <div key={`${f.task_id}-${i}`} className={styles.frow}>
                  <span className={`${styles.fsev} ${styles[`sev_${f.severity}`]}`}>
                    {SEV_LABEL[f.severity] ?? f.severity}
                  </span>
                  <span className={styles.fsrc}>
                    {f.source}
                    {f.host ? ` · ${f.host}${f.port ? `:${f.port}` : ''}` : ''}
                  </span>
                  <span className={styles.ftitle} title={f.detail}>
                    {f.title}
                    {f.detail ? ` — ${f.detail}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </IndustrialCard>

      {/* A3.3: генератор полезных нагрузок (msfvenom, профиль max) */}
      <IndustrialCard variant="accent">
        <div className={styles.title}>
          <VscGift size={20} />
          <GlitchText text="PAYLOADS (MSFVENOM)" />
        </div>
        <div className={styles.payloadGrid}>
          <NeonInput
            label="Payload"
            value={plPayload}
            onChange={setPlPayload}
            placeholder="windows/x64/meterpreter/reverse_tcp"
          />
          <NeonInput label="LHOST" value={plLhost} onChange={setPlLhost} placeholder="10.0.0.1" />
          <NeonInput label="LPORT" value={plLport} onChange={setPlLport} placeholder="4444" />
          <NeonSelect
            label="Формат"
            value={plFormat}
            onChange={setPlFormat}
            options={PAYLOAD_FORMATS.map((f) => ({ value: f, label: f }))}
          />
        </div>
        <div className={styles.payloadActions}>
          <NeonButton
            size="sm"
            variant="primary"
            disabled={plBusy || !plPayload.trim() || !plLhost.trim()}
            onClick={handleGeneratePayload}
          >
            {plBusy ? 'Генерация…' : 'Сгенерировать'}
          </NeonButton>
        </div>
        {plError && <div className={styles.stateError}>{plError}</div>}
        {plResult && (
          <div className={styles.payloadResult}>
            <code>{plResult.command}</code>
            <div>
              Файл: <code>{plResult.name}</code> ({Math.round(plResult.size / 1024)} КБ) —{' '}
              <a className={styles.dlLink} href={plResult.download_url} download>
                скачать
              </a>
            </div>
          </div>
        )}
      </IndustrialCard>

      <IndustrialCard variant="accent">
        <div className={styles.title}>
          <GlitchText text={`ЗАДАЧИ АУДИТА${runningCount ? ` · выполняется ${runningCount}` : ''}`} />
        </div>
        {taskList.length === 0 ? (
          <div className={styles.state}>
            Задач ещё нет. Выберите цель и запустите инструмент выше — результаты появятся здесь.
          </div>
        ) : (
          <div className={styles.tasks}>
            {taskList.map((task) => (
              <AuditTaskPanel
                key={task.task_id}
                task={task}
                toolName={toolName(task.tool_id)}
                onCancel={cancelTask}
                onRemove={removeTask}
              />
            ))}
          </div>
        )}
      </IndustrialCard>
    </div>
  );
};
