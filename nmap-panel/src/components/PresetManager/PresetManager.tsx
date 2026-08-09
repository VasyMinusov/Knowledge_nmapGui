import React from 'react';
import { NeonButton, NeonTooltip } from '@/components_kit';
import type { PresetManagerProps } from './PresetManager.types';
import styles from './PresetManager.module.css';

export const PresetManager: React.FC<PresetManagerProps> = ({ presets, onSelect, onEdit, onDelete, onCreate }) => {
  if (presets.length === 0) {
    return (
      <div>
        <p style={{ color: 'var(--color-text-muted)' }}>No presets yet.</p>
        <NeonButton size="md" onClick={onCreate}>+ Create Preset</NeonButton>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <NeonButton size="md" onClick={onCreate}>+ Create Preset</NeonButton>
      </div>
      <div className={styles.grid}>
        {presets.map(preset => (
          <div key={preset.id} className={styles.card}>
            <div className={styles.name}>{preset.name}</div>
            <div className={styles.details}>
              <div>Targets: {preset.targets || '(empty)'}</div>
              <div>Profile: {preset.profile}</div>
              {preset.options && (
                <div>Options: {preset.options}</div>
              )}
              {preset.description && <div>{preset.description}</div>}
            </div>
            <div className={styles.actions}>
              <NeonTooltip content="Use this preset">
                <NeonButton size="sm" onClick={() => onSelect(preset)}>Select</NeonButton>
              </NeonTooltip>
              <NeonTooltip content="Edit">
                <NeonButton size="sm" variant="primary" onClick={() => onEdit(preset)}>Edit</NeonButton>
              </NeonTooltip>
              <NeonTooltip content="Delete">
                <NeonButton size="sm" variant="danger" onClick={() => onDelete(preset.id)}>Delete</NeonButton>
              </NeonTooltip>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};