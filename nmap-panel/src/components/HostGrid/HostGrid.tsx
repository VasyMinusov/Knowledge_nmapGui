import React, { useMemo } from 'react';
import type { HostGridProps } from './HostGrid.types';
import styles from './HostGrid.module.css';

const getSubnet = (ip: string): string => {
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }
  return 'unknown';
};

export const HostGrid: React.FC<HostGridProps> = ({ hosts, onHostClick }) => {
  const grouped = useMemo(() => {
    const groups: Record<string, typeof hosts> = {};
    hosts.forEach(host => {
      const subnet = getSubnet(host.ip);
      if (!groups[subnet]) groups[subnet] = [];
      groups[subnet].push(host);
    });
    return groups;
  }, [hosts]);

  return (
    <div className={styles.grid}>
      {Object.entries(grouped).map(([subnet, hostsInSubnet]) => (
        <div key={subnet} className={styles.subnetGroup}>
          <div className={styles.subnetTitle}>
            {subnet} ({hostsInSubnet.length} hosts)
          </div>
          <div className={styles.hostList}>
            {hostsInSubnet.map(host => {
              const openPorts = host.ports.filter(p => p.state === 'open').length;
              return (
                <div
                  key={host.ip}
                  className={`${styles.hostTile} ${host.status === 'up' ? styles.up : styles.down}`}
                  onClick={() => onHostClick(host)}
                >
                  <span className={styles.ip}>{host.ip}</span>
                  {host.hostname && <span className={styles.hostname}>{host.hostname}</span>}
                  {host.status === 'up' && openPorts > 0 && (
                    <span className={styles.portCount}>{openPorts}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};