import React from 'react';
import { StatusBadge, NeonButton, NeonTooltip } from '@/components_kit';
import type { HistoryListProps } from './HistoryList.types';
import styles from './HistoryList.module.css';

export const HistoryList: React.FC<HistoryListProps> = ({
  items,
  onView,
  onDelete,
  onCopyPreset,
  onDownload,
  loading,
}) => {
  if (loading) return <div className={styles.empty}>Loading...</div>;
  if (items.length === 0) return <div className={styles.empty}>No scan history.</div>;

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Date</th>
          <th>Targets</th>
          <th>Profile</th>
          <th>Status</th>
          <th>Summary</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {items.map(item => (
          <tr key={item.scan_id} className={styles.row} onClick={() => onView(item.scan_id)}>
            <td>{new Date(item.start_time).toLocaleString()}</td>
            <td>{item.targets}</td>
            <td>{item.profile}</td>
            <td>
              <StatusBadge
                label={item.status}
                variant={item.status === 'done' ? 'accent' : item.status === 'error' ? 'danger' : 'warning'}
                pulse={item.status === 'running'}
              />
            </td>
            <td>{item.summary || '—'}</td>
            <td className={styles.actions} onClick={(e) => e.stopPropagation()}>
              <NeonTooltip content="View results">
                <NeonButton size="sm" onClick={() => onView(item.scan_id)}>View</NeonButton>
              </NeonTooltip>
              <NeonTooltip content="Copy as preset">
                <NeonButton size="sm" variant="primary" onClick={() => onCopyPreset(item)}>Copy preset</NeonButton>
              </NeonTooltip>
              {onDownload && (
                <NeonTooltip content="Download report">
                  <NeonButton size="sm" variant="primary" onClick={() => onDownload(item.scan_id)}>Download</NeonButton>
                </NeonTooltip>
              )}
              <NeonTooltip content="Delete">
                <NeonButton size="sm" variant="danger" onClick={() => onDelete(item.scan_id)}>Delete</NeonButton>
              </NeonTooltip>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};