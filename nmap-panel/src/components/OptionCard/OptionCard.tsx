import React from 'react';
import { VscInfo } from 'react-icons/vsc';
import type { OptionCardProps } from './OptionCard.types';
import styles from './OptionCard.module.css';

export const OptionCard: React.FC<OptionCardProps> = ({ option }) => {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <VscInfo className={styles.icon} size={16} />
        <span className={styles.flag}>{option.flag}</span>
        <span className={styles.category}>{option.category}</span>
      </div>
      <div className={styles.description}>{option.description}</div>
      {option.example && (
        <div className={styles.example}>
          <span style={{ color: 'var(--color-text-muted)' }}>$ </span>
          {option.example}
        </div>
      )}
    </div>
  );
};