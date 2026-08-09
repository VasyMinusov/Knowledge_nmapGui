// src/components/PresetManager/PresetManager.tsx
import React from 'react';
import { NeonButton, NeonTooltip } from '@/components_kit';
import type { PresetManagerProps } from './PresetManager.types';
import styles from './PresetManager.module.css';

export const PresetManager: React.FC<PresetManagerProps> = ({ presets, onSelect, onEdit, onDelete, onCreate }) => {
  if (presets.length === 0) {
    return (
      <div>
        <p style={{ color: 'var(--color-text-muted)' }}>Пока нет пресетов.</p>
        <NeonButton size="md" onClick={onCreate}>+ Создать пресет</NeonButton>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <NeonButton size="md" onClick={onCreate}>+ Создать пресет</NeonButton>
      </div>
      <div className={styles.grid}>
        {presets.map(preset => (
          <div key={preset.id} className={styles.card}>
            <div className={styles.name}>{preset.name}</div>
            <div className={styles.details}>
              <div>Цели: {preset.targets || '(пусто)'}</div>
              <div>Профиль: {preset.profile}</div>
              {preset.options && (
                <div>Опции: {preset.options}</div>
              )}
              {preset.description && <div>{preset.description}</div>}
            </div>
            <div className={styles.actions}>
              <NeonTooltip content="Использовать этот пресет">
                <NeonButton size="sm" onClick={() => onSelect(preset)}>Выбрать</NeonButton>
              </NeonTooltip>
              <NeonTooltip content="Редактировать">
                <NeonButton size="sm" variant="primary" onClick={() => onEdit(preset)}>Редактировать</NeonButton>
              </NeonTooltip>
              <NeonTooltip content="Удалить">
                <NeonButton size="sm" variant="danger" onClick={() => onDelete(preset.id)}>Удалить</NeonButton>
              </NeonTooltip>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};