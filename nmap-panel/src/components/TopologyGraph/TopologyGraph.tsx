// src/components/TopologyGraph/TopologyGraph.tsx
import React, { useState, useCallback } from 'react';
import { VscLayout, VscListTree, VscTable, VscGraph } from 'react-icons/vsc';
import { IndustrialCard, GlitchText, NeonButton } from '@/components_kit';
import type { HostInfo } from '@/api/nmapApi';
import styles from './TopologyGraph.module.css';

// Режимы
import { TopologyGrid } from './modes/TopologyGrid';
import { TopologyTree } from './modes/TopologyTree';
import { TopologyTable } from './modes/TopologyTable';
import { TopologyGraphD3 } from './modes/TopologyGraphD3';

type TopologyMode = 'grid' | 'tree' | 'table' | 'graph';

interface TopologyGraphProps {
  hosts: HostInfo[];
  loading?: boolean;
  scanId?: string;
  onNodeClick?: (host: HostInfo) => void;
}

const MODE_BUTTONS: { id: TopologyMode; label: string; icon: React.ReactNode }[] = [
  { id: 'grid', label: 'Карта', icon: <VscLayout size={18} /> },
  { id: 'tree', label: 'Дерево', icon: <VscListTree size={18} /> },
  { id: 'table', label: 'Таблица', icon: <VscTable size={18} /> },
  { id: 'graph', label: 'Граф', icon: <VscGraph size={18} /> },
];

export const TopologyGraph: React.FC<TopologyGraphProps> = ({
  hosts,
  loading = false,
  scanId,
  onNodeClick,
}) => {
  const [mode, setMode] = useState<TopologyMode>('grid');

  const renderContent = useCallback(() => {
    if (loading) {
      return <div className={styles.loading}>LOADING TOPOLOGY...</div>;
    }
    if (hosts.length === 0) {
      return (
        <div className={styles.empty}>
          <GlitchText text="No topology data available" />
          <p>Run a scan with traceroute to see network topology.</p>
        </div>
      );
    }

    switch (mode) {
      case 'grid': return <TopologyGrid hosts={hosts} onNodeClick={onNodeClick} />;
      case 'tree': return <TopologyTree hosts={hosts} onNodeClick={onNodeClick} />;
      case 'table': return <TopologyTable hosts={hosts} onNodeClick={onNodeClick} />;
      case 'graph': return <TopologyGraphD3 hosts={hosts} onNodeClick={onNodeClick} />;
      default: return null;
    }
  }, [mode, hosts, loading, onNodeClick]);

  return (
    <IndustrialCard variant="accent">
      <div className={styles.header}>
        <GlitchText text="NETWORK TOPOLOGY" />
        {scanId && <span className={styles.scanId}>Scan: {scanId.slice(0, 8)}</span>}
        <div className={styles.modeSwitcher}>
          {MODE_BUTTONS.map((btn) => (
            <NeonButton
              key={btn.id}
              size="sm"
              variant={mode === btn.id ? 'primary' : 'primary'}
              onClick={() => setMode(btn.id)}
            >
              {btn.icon} {btn.label}
            </NeonButton>
          ))}
        </div>
      </div>
      <div className={styles.content}>
        {renderContent()}
      </div>
    </IndustrialCard>
  );
};