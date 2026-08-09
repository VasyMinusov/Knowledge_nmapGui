// src/components/ScheduleList/ScheduleList.tsx
import React from 'react';
import { StatusBadge, NeonButton, NeonTooltip } from '@/components_kit';
import type { ScheduleListProps } from './ScheduleList.types';
import styles from './ScheduleList.module.css';

export const ScheduleList: React.FC<ScheduleListProps> = ({ schedules, onView, onEdit, onDelete, onRun, loading }) => {
  if (loading) return <div className={styles.empty}>Загрузка...</div>;
  if (schedules.length === 0) return <div className={styles.empty}>Расписания не заданы.</div>;

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Имя</th>
          <th>Цели</th>
          <th>Профиль</th>
          <th>Cron</th>
          <th>Статус</th>
          <th>Последний запуск</th>
          <th>Действия</th>
        </tr>
      </thead>
      <tbody>
        {schedules.map(sch => (
          <tr key={sch.id}>
            <td>{sch.name}</td>
            <td>{sch.targets}</td>
            <td>{sch.profile}</td>
            <td><code>{sch.cron_expression}</code></td>
            <td>
              <StatusBadge
                label={sch.active ? 'Активно' : 'Неактивно'}
                variant={sch.active ? 'accent' : 'muted'}
              />
            </td>
            <td>{sch.last_run ? new Date(sch.last_run).toLocaleString() : '—'}</td>
            <td className={styles.actions}>
              <NeonTooltip content="Просмотреть детали">
                <NeonButton size="sm" onClick={() => onView(sch)}>Просмотр</NeonButton>
              </NeonTooltip>
              <NeonTooltip content="Редактировать">
                <NeonButton size="sm" variant="primary" onClick={() => onEdit(sch)}>Редактировать</NeonButton>
              </NeonTooltip>
              <NeonTooltip content="Запустить сейчас">
                <NeonButton size="sm" variant="primary" onClick={() => onRun(sch.id)}>Запустить</NeonButton>
              </NeonTooltip>
              <NeonTooltip content="Удалить">
                <NeonButton size="sm" variant="danger" onClick={() => onDelete(sch.id)}>Удалить</NeonButton>
              </NeonTooltip>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};