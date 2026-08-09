import React from 'react';
import { ProgressBar, StatusBadge, NeonSpinner } from '@/components_kit';
import type { ScanProgressProps } from './ScanProgress.types';
import styles from './ScanProgress.module.css';

export const ScanProgress: React.FC<ScanProgressProps> = ({ progress = 0, status, summary }) => {
  const isRunning = status === 'running' || status === 'pending';
  const isDone = status === 'done';
  const isError = status === 'error';

  return (
    <div className={styles.progressContainer}>
      <div className={styles.statusRow}>
        <StatusBadge
          label={status.toUpperCase()}
          variant={isDone ? 'accent' : isError ? 'danger' : 'warning'}
          pulse={isRunning}
        />
        {isRunning && <NeonSpinner size={24} label="Scanning..." />}
        {summary && <span style={{ color: 'var(--color-text-secondary)' }}>{summary}</span>}
      </div>
      <ProgressBar value={progress} label={`${Math.round(progress)}%`} variant={isError ? 'danger' : 'accent'} />
    </div>
  );
};