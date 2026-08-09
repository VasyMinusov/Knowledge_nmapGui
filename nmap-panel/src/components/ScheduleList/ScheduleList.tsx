import React from 'react';
import { StatusBadge, NeonButton, NeonTooltip } from '@/components_kit';
import type { ScheduleListProps } from './ScheduleList.types';
import styles from './ScheduleList.module.css';

export const ScheduleList: React.FC<ScheduleListProps> = ({ schedules, onView, onEdit, onDelete, onRun, loading }) => {
  if (loading) return <div className={styles.empty}>Loading...</div>;
  if (schedules.length === 0) return <div className={styles.empty}>No schedules defined.</div>;

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Name</th>
          <th>Targets</th>
          <th>Profile</th>
          <th>Cron</th>
          <th>Status</th>
          <th>Last Run</th>
          <th>Actions</th>
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
                label={sch.active ? 'Active' : 'Inactive'}
                variant={sch.active ? 'accent' : 'muted'}
              />
            </td>
            <td>{sch.last_run ? new Date(sch.last_run).toLocaleString() : '—'}</td>
            <td className={styles.actions}>
              <NeonTooltip content="View details">
                <NeonButton size="sm" onClick={() => onView(sch)}>View</NeonButton>
              </NeonTooltip>
              <NeonTooltip content="Edit">
                <NeonButton size="sm" variant="primary" onClick={() => onEdit(sch)}>Edit</NeonButton>
              </NeonTooltip>
              <NeonTooltip content="Run now">
                <NeonButton size="sm" variant="primary" onClick={() => onRun(sch.id)}>Run</NeonButton>
              </NeonTooltip>
              <NeonTooltip content="Delete">
                <NeonButton size="sm" variant="danger" onClick={() => onDelete(sch.id)}>Delete</NeonButton>
              </NeonTooltip>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};