import React from 'react';
import { Virtuoso } from 'react-virtuoso';
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
  if (loading) return <div className={styles.empty}>Загрузка...</div>;
  if (items.length === 0) return <div className={styles.empty}>История сканирований пуста.</div>;

  return (
    <div style={{ height: 500, width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className={styles.headerRow}>
        <div className={styles.cellHeader}>Дата</div>
        <div className={styles.cellHeader}>Цели</div>
        <div className={styles.cellHeader}>Профиль</div>
        <div className={styles.cellHeader}>Статус</div>
        <div className={styles.cellHeader}>Сводка</div>
        <div className={styles.cellHeader}>Действия</div>
      </div>
      <Virtuoso
        style={{ flex: 1 }}
        totalCount={items.length}
        itemContent={(index) => {
          const item = items[index];
          return (
            <div className={styles.row} onClick={() => onView(item.scan_id)}>
              <div className={styles.cell}>{new Date(item.start_time).toLocaleString()}</div>
              <div className={styles.cell}>{item.targets}</div>
              <div className={styles.cell}>{item.profile}</div>
              <div className={styles.cell}>
                <StatusBadge
                  label={item.status}
                  variant={item.status === 'done' ? 'accent' : item.status === 'error' ? 'danger' : 'warning'}
                  pulse={item.status === 'running'}
                />
              </div>
              <div className={styles.cell}>{item.summary || '—'}</div>
              {/* Используем отдельный класс для контейнера действий */}
              <div className={styles.cellActions} onClick={(e) => e.stopPropagation()}>
                <NeonTooltip content="Просмотреть результаты">
                  <NeonButton size="sm" onClick={() => onView(item.scan_id)}>Просмотр</NeonButton>
                </NeonTooltip>
                <NeonTooltip content="Копировать в пресет">
                  <NeonButton size="sm" variant="primary" onClick={() => onCopyPreset(item)}>Копировать</NeonButton>
                </NeonTooltip>
                {onDownload && (
                  <NeonTooltip content="Скачать отчёт">
                    <NeonButton size="sm" variant="primary" onClick={() => onDownload(item.scan_id)}>Скачать</NeonButton>
                  </NeonTooltip>
                )}
                <NeonTooltip content="Удалить">
                  <NeonButton size="sm" variant="danger" onClick={() => onDelete(item.scan_id)}>Удалить</NeonButton>
                </NeonTooltip>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
};