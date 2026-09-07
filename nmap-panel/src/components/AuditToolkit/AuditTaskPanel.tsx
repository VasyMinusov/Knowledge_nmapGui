// src/components/AuditToolkit/AuditTaskPanel.tsx
import React, { useState } from 'react';
import { NeonButton, NeonSpinner, StatusBadge } from '@/components_kit';
import { VscChevronDown, VscChevronRight, VscClose, VscDebugStop } from 'react-icons/vsc';
import type { AuditSeverity } from '@/api/nmapApi';
import type { AuditTaskPanelProps } from './AuditToolkit.types';
import styles from './AuditTaskPanel.module.css';

const SEV_VARIANT: Record<AuditSeverity, 'accent' | 'danger' | 'warning' | 'muted'> = {
  critical: 'danger',
  high: 'danger',
  medium: 'warning',
  low: 'accent',
  info: 'muted',
};

const STATE_VARIANT: Record<string, 'accent' | 'danger' | 'warning' | 'muted'> = {
  running: 'warning',
  done: 'accent',
  error: 'danger',
  cancelled: 'muted',
};

const STATE_LABEL: Record<string, string> = {
  running: 'выполняется',
  done: 'готово',
  error: 'ошибка',
  cancelled: 'остановлено',
};

export const AuditTaskPanel: React.FC<AuditTaskPanelProps> = ({ task, toolName, onCancel, onRemove }) => {
  const [showOutput, setShowOutput] = useState(false);
  const running = task.status === 'running';

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.tool}>{toolName}</span>
        <span className={styles.target}>{task.target}</span>
        <StatusBadge label={STATE_LABEL[task.status] ?? task.status} variant={STATE_VARIANT[task.status] ?? 'muted'} pulse={running} />
        <span className={styles.spacer} />
        {running ? (
          <NeonButton size="sm" variant="danger" onClick={() => onCancel(task.task_id)}>
            <VscDebugStop /> Остановить
          </NeonButton>
        ) : (
          <NeonButton size="sm" onClick={() => onRemove(task.task_id)}>
            <VscClose /> Убрать
          </NeonButton>
        )}
      </div>

      <div className={styles.summary}>
        {running && <NeonSpinner size={14} />}
        <span>{task.summary || '—'}</span>
      </div>

      {task.findings.length > 0 && (
        <div className={styles.findings}>
          <table>
            <thead>
              <tr>
                <th>Важность</th>
                <th>Что</th>
                <th>Детали</th>
              </tr>
            </thead>
            <tbody>
              {task.findings.map((f, i) => (
                <tr key={i}>
                  <td>
                    <StatusBadge label={f.severity} variant={SEV_VARIANT[f.severity] ?? 'muted'} />
                  </td>
                  <td className={styles.fTitle}>{f.title}</td>
                  <td className={styles.fDetail}>{f.detail || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {task.command && (
        <div className={styles.command}>
          <code>$ {task.command}</code>
        </div>
      )}

      {(task.output || running) && (
        <div className={styles.outputBlock}>
          <button className={styles.outputToggle} onClick={() => setShowOutput((v) => !v)}>
            {showOutput ? <VscChevronDown /> : <VscChevronRight />} Сырой вывод
          </button>
          {showOutput && (
            <pre className={styles.output}>{task.output || 'Ожидание вывода…'}</pre>
          )}
        </div>
      )}
    </div>
  );
};
