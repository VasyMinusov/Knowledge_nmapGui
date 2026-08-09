// src/components/ScanProgress/ScanProgress.tsx
import React from 'react';
import { ProgressBar, StatusBadge, NeonSpinner } from '@/components_kit';
import type { ScanProgressProps } from './ScanProgress.types';
import styles from './ScanProgress.module.css';

export const ScanProgress: React.FC<ScanProgressProps> = ({ progress = 0, status, summary, stage }) => {
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
        {isRunning && <NeonSpinner size={24} label={stage || "Scanning..."} />}
        {summary && <span style={{ color: 'var(--color-text-secondary)' }}>{summary}</span>}
      </div>
      {stage && !isDone && !isError && (
        <div className={styles.stage}>
          <span className={styles.stageLabel}>Stage:</span>
          <span className={styles.stageValue}>{stage}</span>
        </div>
      )}
      <ProgressBar value={progress} label={`${Math.round(progress)}%`} variant={isError ? 'danger' : 'accent'} />
    </div>
  );
};