// src/components/TopologyGraph/modes/TopologyTable.tsx
import React, { useState, useMemo } from 'react';
import { NeonInput } from '@/components_kit';
import type { HostInfo } from '@/api/nmapApi';
import styles from './TopologyTable.module.css';

interface Props {
  hosts: HostInfo[];
  onNodeClick?: (host: HostInfo) => void;
}

type SortKey = 'ip' | 'hostname' | 'status' | 'os' | 'ports';
type SortOrder = 'asc' | 'desc';

export const TopologyTable: React.FC<Props> = ({ hosts, onNodeClick }) => {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('ip');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const filtered = useMemo(() => {
    if (!search.trim()) return hosts;
    const s = search.trim().toLowerCase();
    return hosts.filter(h =>
      h.ip.includes(s) ||
      (h.hostname && h.hostname.toLowerCase().includes(s))
    );
  }, [hosts, search]);

  const sorted = useMemo(() => {
    const sortedData = [...filtered];
    sortedData.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      switch (sortKey) {
        case 'ip': aVal = a.ip; bVal = b.ip; break;
        case 'hostname': aVal = a.hostname || ''; bVal = b.hostname || ''; break;
        case 'status': aVal = a.status; bVal = b.status; break;
        case 'os': aVal = a.os || ''; bVal = b.os || ''; break;
        case 'ports': aVal = a.ports.filter(p => p.state === 'open').length; bVal = b.ports.filter(p => p.state === 'open').length; break;
      }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sortedData;
  }, [filtered, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  if (hosts.length === 0) return <div className={styles.empty}>No hosts</div>;

  return (
    <div>
      <div className={styles.searchBar}>
        <NeonInput
          label="Поиск"
          value={search}
          onChange={setSearch}
          placeholder="IP или hostname..."
          size="sm"
        />
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => handleSort('ip')} className={styles.sortable}>
                IP {sortKey === 'ip' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th onClick={() => handleSort('hostname')} className={styles.sortable}>
                Hostname {sortKey === 'hostname' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th onClick={() => handleSort('status')} className={styles.sortable}>
                Status {sortKey === 'status' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th onClick={() => handleSort('os')} className={styles.sortable}>
                OS {sortKey === 'os' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th onClick={() => handleSort('ports')} className={styles.sortable}>
                Open Ports {sortKey === 'ports' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((host) => {
              const openPorts = host.ports.filter(p => p.state === 'open');
              const portsStr = openPorts.map(p => `${p.port}/${p.protocol}`).join(', ');
              return (
                <tr
                  key={host.ip}
                  onClick={() => onNodeClick?.(host)}
                  className={host.status === 'up' ? styles.up : styles.down}
                >
                  <td>{host.ip}</td>
                  <td>{host.hostname || '—'}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${host.status === 'up' ? styles.up : styles.down}`}>
                      {host.status.toUpperCase()}
                    </span>
                  </td>
                  <td>{host.os || '—'}</td>
                  <td>{openPorts.length > 0 ? portsStr : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};