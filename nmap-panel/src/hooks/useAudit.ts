// src/hooks/useAudit.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { auditApi } from '../api/nmapApi';
import type { AuditRunRequest, AuditTaskStatus } from '../api/nmapApi';

const POLL_MS = 2000;
const TERMINAL = new Set(['done', 'error', 'cancelled']);

/**
 * Управляет жизненным циклом задач аудита: запуск инструмента, опрос статуса
 * каждые 2 секунды (как useScan), отмена. Хранит map task_id -> статус.
 */
export const useAudit = (scanId?: string) => {
  const [tasks, setTasks] = useState<Record<string, AuditTaskStatus>>({});
  const [order, setOrder] = useState<string[]>([]);
  const pollers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const stopPoll = useCallback((taskId: string) => {
    const t = pollers.current[taskId];
    if (t) {
      clearInterval(t);
      delete pollers.current[taskId];
    }
  }, []);

  const poll = useCallback((taskId: string) => {
    auditApi
      .getStatus(taskId)
      .then((res) => {
        setTasks((prev) => ({ ...prev, [taskId]: res.data }));
        if (TERMINAL.has(res.data.status)) stopPoll(taskId);
      })
      .catch(() => {
        /* игнорируем сетевые сбои опроса */
      });
  }, [stopPoll]);

  const startPoll = useCallback((taskId: string) => {
    stopPoll(taskId);
    poll(taskId);
    pollers.current[taskId] = setInterval(() => poll(taskId), POLL_MS);
  }, [poll, stopPoll]);

  const runTool = useCallback(
    async (toolId: string, target: string, options?: Record<string, any>) => {
      const body: AuditRunRequest = { tool_id: toolId, target, scan_id: scanId ?? null, options };
      const res = await auditApi.run(body);
      const taskId = res.data.task_id;
      setTasks((prev) => ({
        ...prev,
        [taskId]: {
          task_id: taskId,
          tool_id: toolId,
          target,
          scan_id: scanId ?? null,
          status: 'running',
          command: '',
          output: '',
          findings: [],
          summary: 'Запуск...',
        },
      }));
      setOrder((prev) => [taskId, ...prev]);
      startPoll(taskId);
      return taskId;
    },
    [scanId, startPoll],
  );

  const cancelTask = useCallback(async (taskId: string) => {
    try {
      await auditApi.cancel(taskId);
    } catch {
      /* задача уже завершилась */
    }
    poll(taskId);
  }, [poll]);

  const removeTask = useCallback((taskId: string) => {
    stopPoll(taskId);
    setOrder((prev) => prev.filter((id) => id !== taskId));
    setTasks((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
    auditApi.deleteTask(taskId).catch(() => undefined);
  }, [stopPoll]);

  // Подтягиваем прошлые задачи этого скана при монтировании.
  useEffect(() => {
    if (!scanId) return;
    let cancelled = false;
    auditApi
      .getHistory(scanId)
      .then((res) => {
        if (cancelled) return;
        const rows = res.data.tasks;
        setTasks((prev) => {
          const next = { ...prev };
          for (const r of rows) {
            if (next[r.task_id]) continue;
            next[r.task_id] = {
              task_id: r.task_id,
              tool_id: r.tool_id,
              target: r.target,
              scan_id: r.scan_id,
              status: r.status,
              command: r.command || '',
              output: '',
              findings: [],
              summary: r.summary,
            };
          }
          return next;
        });
        setOrder((prev) => {
          const known = new Set(prev);
          const extra = rows.map((r) => r.task_id).filter((id) => !known.has(id));
          return [...prev, ...extra];
        });
        for (const r of rows) if (r.status === 'running') startPoll(r.task_id);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [scanId, startPoll]);

  // Чистим таймеры при размонтировании.
  useEffect(() => {
    const timers = pollers.current;
    return () => {
      Object.values(timers).forEach(clearInterval);
    };
  }, []);

  const taskList = order.map((id) => tasks[id]).filter(Boolean);
  const runningCount = taskList.filter((t) => t.status === 'running').length;

  return { taskList, tasks, runningCount, runTool, cancelTask, removeTask };
};
