// src/components/TopologyGraph/modes/TopologyTree.tsx
import React, { useState, useMemo } from 'react';
import { VscServer, VscGlobe, VscError, VscChevronDown, VscChevronRight } from 'react-icons/vsc';
import type { HostInfo } from '@/api/nmapApi';
import styles from './TopologyTree.module.css';

interface Props {
  hosts: HostInfo[];
  onNodeClick?: (host: HostInfo) => void;
}

export const TopologyTree: React.FC<Props> = ({ hosts, onNodeClick }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

  const toggleSubnet = (subnet: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(subnet)) next.delete(subnet);
      else next.add(subnet);
      return next;
    });
  };

  if (hosts.length === 0) return <div className={styles.empty}>No hosts</div>;

  return (
    <div className={styles.tree}>
      {grouped.map(([subnet, hostsInSubnet]) => {
        const isExpanded = expanded.has(subnet);
        return (
          <div key={subnet} className={styles.subnet}>
            <div
              className={styles.subnetHeader}
              onClick={() => toggleSubnet(subnet)}
            >
              <span className={styles.expandIcon}>
                {isExpanded ? <VscChevronDown size={14} /> : <VscChevronRight size={14} />}
              </span>
              <VscGlobe className={styles.subnetIcon} />
              <span className={styles.subnetName}>{subnet}</span>
              <span className={styles.hostCount}>({hostsInSubnet.length})</span>
            </div>
            {isExpanded && (
              <div className={styles.hostList}>
                {hostsInSubnet.map((host) => {
                  const isUp = host.status === 'up';
                  return (
                    <div
                      key={host.ip}
                      className={`${styles.hostItem} ${isUp ? styles.up : styles.down}`}
                      onClick={() => onNodeClick?.(host)}
                    >
                      <span className={styles.hostIcon}>
                        {isUp ? <VscServer size={16} /> : <VscError size={16} />}
                      </span>
                      <span className={styles.hostIp}>{host.ip}</span>
                      {host.hostname && (
                        <span className={styles.hostname}> ({host.hostname})</span>
                      )}
                      {host.os && (
                        <span className={styles.hostOs}> [{host.os}]</span>
                      )}
                      <span className={styles.hostStatus}>
                        {isUp ? 'UP' : 'DOWN'}
                      </span>
                      {isUp && (
                        <span className={styles.portCount}>
                          {host.ports.filter(p => p.state === 'open').length} ports
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};