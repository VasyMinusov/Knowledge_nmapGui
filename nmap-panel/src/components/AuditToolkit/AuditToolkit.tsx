// src/components/AuditToolkit/AuditToolkit.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { IndustrialCard, IndustrialTabs, GlitchText, NeonInput, NeonSelect, NeonButton } from '@/components_kit';
import { VscTools, VscRefresh } from 'react-icons/vsc';
import { auditApi } from '@/api/nmapApi';
import type { AuditTool } from '@/api/nmapApi';
import { useAudit } from '@/hooks/useAudit';
import { AuditToolCard } from './AuditToolCard';
import { AuditTaskPanel } from './AuditTaskPanel';
import type { AuditToolkitProps } from './AuditToolkit.types';
import styles from './AuditToolkit.module.css';

export const AuditToolkit: React.FC<AuditToolkitProps> = ({ scanId, hosts, targets }) => {
  const [tools, setTools] = useState<AuditTool[]>([]);
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);
  const [loadingTools, setLoadingTools] = useState(true);
  const [toolsError, setToolsError] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string>('all');
  const [target, setTarget] = useState<string>('');

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
  };

  useEffect(loadTools, []);

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

        <IndustrialTabs tabs={tabs} active={activeCat} onChange={setActiveCat} />

        {loadingTools && <div className={styles.state}>Загрузка инструментов…</div>}
        {toolsError && <div className={styles.stateError}>{toolsError}</div>}

        {!loadingTools && !toolsError && (
          <div className={styles.grid}>
            {visibleTools.map((tool) => (
              <AuditToolCard
                key={tool.id}
                tool={tool}
                disabled={!target.trim()}
                running={taskList.some((t) => t.tool_id === tool.id && t.status === 'running')}
                onRun={handleRun}
              />
            ))}
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
