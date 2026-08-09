import React, { useState } from 'react';
import { StatusBadge, NeonButton } from '@/components_kit';
import type { HostCardProps } from './HostCard.types';
import styles from './HostCard.module.css';

export const HostCard: React.FC<HostCardProps> = ({ host }) => {
  const [expanded, setExpanded] = useState(false);
  const openPorts = host.ports.filter(p => p.state === 'open');

  const toggleExpand = () => setExpanded(prev => !prev);

  return (
    <div className={styles.card}>
      <div className={styles.header} onClick={toggleExpand}>
        <div>
          <span className={styles.ip}>{host.ip}</span>
          {host.hostname && (
            <span style={{ color: 'var(--color-text-secondary)', marginLeft: '8px' }}>
              ({host.hostname})
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <StatusBadge label={host.status} variant={host.status === 'up' ? 'accent' : 'muted'} />
          <span style={{ color: 'var(--color-text-muted)' }}>{openPorts.length} open</span>
          <NeonButton size="sm" onClick={toggleExpand}>
            {expanded ? '−' : '+'}
          </NeonButton>
        </div>
      </div>
      {expanded && (
        <div className={styles.details}>
          {host.os && <div><span style={{ color: 'var(--color-text-secondary)' }}>OS:</span> {host.os}</div>}
          {host.uptime && <div><span style={{ color: 'var(--color-text-secondary)' }}>Uptime:</span> {host.uptime}s</div>}
          <div className={styles.portChips}>
            {openPorts.map(p => (
              <span key={`${p.port}-${p.protocol}`} className={styles.portChip}>
                {p.port}/{p.protocol} {p.service || ''} {p.version ? `(${p.version})` : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};