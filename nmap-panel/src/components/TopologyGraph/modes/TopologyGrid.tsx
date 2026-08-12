// src/components/TopologyGraph/modes/TopologyGrid.tsx
import React, { useMemo, useState } from 'react';
import { VscServer, VscDeviceMobile, VscGlobe, VscError } from 'react-icons/vsc';
import type { HostInfo } from '@/api/nmapApi';
import styles from './TopologyGrid.module.css';

interface Props {
  hosts: HostInfo[];
  onNodeClick?: (host: HostInfo) => void;
}

export const TopologyGrid: React.FC<Props> = ({ hosts, onNodeClick }) => {
  const [hoveredHost, setHoveredHost] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, HostInfo[]>();
    hosts.forEach((host) => {
      const parts = host.ip.split('.');
      const subnet = parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.0/24` : 'other';
      if (!map.has(subnet)) map.set(subnet, []);
      map.get(subnet)!.push(host);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [hosts]);

  if (hosts.length === 0) return <div className={styles.empty}>No hosts</div>;

  return (
    <div className={styles.gridContainer}>
      {grouped.map(([subnet, hostsInSubnet]) => {
        const openCount = hostsInSubnet.filter(h => h.status === 'up').length;
        return (
          <div key={subnet} className={styles.subnetGroup}>
            <div className={styles.subnetHeader}>
              <VscGlobe className={styles.subnetIcon} />
              <span className={styles.subnetName}>{subnet}</span>
              <span className={styles.subnetStats}>
                {openCount} up / {hostsInSubnet.length} total
              </span>
            </div>
            <div className={styles.hostGrid}>
              {hostsInSubnet.map((host) => {
                const isUp = host.status === 'up';
                const openPorts = host.ports.filter(p => p.state === 'open').length;
                const isHovered = hoveredHost === host.ip;
                return (
                  <div
                    key={host.ip}
                    className={`${styles.hostTile} ${isUp ? styles.up : styles.down} ${isHovered ? styles.hovered : ''}`}
                    onClick={() => onNodeClick?.(host)}
                    onMouseEnter={() => setHoveredHost(host.ip)}
                    onMouseLeave={() => setHoveredHost(null)}
                  >
                    <div className={styles.iconWrapper}>
                      {isUp ? (
                        openPorts > 0 ? <VscServer className={styles.icon} /> : <VscDeviceMobile className={styles.icon} />
                      ) : (
                        <VscError className={styles.iconDown} />
                      )}
                    </div>
                    <div className={styles.ip}>{host.ip}</div>
                    {host.hostname && <div className={styles.hostname}>{host.hostname}</div>}
                    {isUp && (
                      <div className={styles.portBadge}>{openPorts}</div>
                    )}
                    {isUp && openPorts > 0 && (
                      <div className={styles.portsPreview}>
                        {host.ports.filter(p => p.state === 'open').slice(0, 3).map(p => (
                          <span key={p.port} className={styles.portChip}>{p.port}</span>
                        ))}
                        {openPorts > 3 && <span className={styles.more}>+{openPorts - 3}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};