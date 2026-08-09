// frontend/src/components/HostDetailsModal/HostDetailsModal.tsx
import React from 'react';
import { IndustrialModal, GlitchText, StatusBadge } from '@/components_kit';
import type { HostDetailsModalProps } from './HostDetailsModal.types';
import styles from './HostDetailsModal.module.css';

export const HostDetailsModal: React.FC<HostDetailsModalProps> = ({ open, host, onClose }) => {
  if (!host) return null;

  const openPorts = host.ports.filter(p => p.state === 'open');

  return (
    <IndustrialModal
      open={open}
      onClose={onClose}
      title={`HOST: ${host.ip}`}
      variant="default"
    >
      <div className={styles.details}>
        <div className={styles.row}>
          <span className={styles.label}>Status</span>
          <StatusBadge label={host.status} variant={host.status === 'up' ? 'accent' : 'muted'} />
        </div>
        {host.hostname && (
          <div className={styles.row}>
            <span className={styles.label}>Hostname</span>
            <span>{host.hostname}</span>
          </div>
        )}
        {host.os && (
          <div className={styles.row}>
            <span className={styles.label}>OS</span>
            <span>{host.os}</span>
          </div>
        )}
        {host.uptime && (
          <div className={styles.row}>
            <span className={styles.label}>Uptime</span>
            <span>{host.uptime}s</span>
          </div>
        )}

        <div>
          <GlitchText text={`Open Ports (${openPorts.length})`} />
          {openPorts.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No open ports</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.portTable}>
                <thead>
                  <tr>
                    <th>Port</th>
                    <th>Protocol</th>
                    <th>State</th>
                    <th>Service</th>
                    <th>Version</th>
                  </tr>
                </thead>
                <tbody>
                  {openPorts.map(p => (
                    <tr key={`${p.port}-${p.protocol}`}>
                      <td>{p.port}</td>
                      <td>{p.protocol}</td>
                      <td className={styles.openState}>{p.state}</td>
                      <td>{p.service || '—'}</td>
                      <td>{p.version || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </IndustrialModal>
  );
};