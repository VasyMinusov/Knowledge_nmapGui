// src/components/TopologyGraph/TopologyGraph.tsx
import React, { useRef } from 'react';
// @ts-ignore - нет типов для react-cytoscapejs
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { IndustrialCard, NeonSpinner, GlitchText } from '@/components_kit';
import type { HostInfo } from '@/api/nmapApi';
import styles from './TopologyGraph.module.css';

// Регистрируем layout-плагин
cytoscape.use(dagre);

interface TopologyGraphProps {
  hosts: HostInfo[];
  loading?: boolean;
  scanId?: string;
  onNodeClick?: (host: HostInfo) => void; // колбэк при клике на узел
}

export const TopologyGraph: React.FC<TopologyGraphProps> = ({
  hosts,
  loading = false,
  scanId,
  onNodeClick,
}) => {
  const cyRef = useRef<cytoscape.Core | null>(null);

  // Преобразуем хосты в элементы графа
  const buildElements = () => {
    const nodes: any[] = [];
    const edges: any[] = [];

    if (!hosts || hosts.length === 0) return { nodes, edges };

    // Группируем хосты по подсетям (IPv4 /24)
    const subnetMap = new Map<string, string[]>();
    hosts.forEach((host) => {
      const ip = host.ip;
      // Простое определение IPv4
      const parts = ip.split('.');
      if (parts.length === 4) {
        const subnet = `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
        if (!subnetMap.has(subnet)) {
          subnetMap.set(subnet, []);
        }
        subnetMap.get(subnet)!.push(ip);
      } else {
        // IPv6 или другие – добавляем как отдельный узел
        nodes.push({
          data: {
            id: ip,
            label: ip,
            group: 'host',
            status: host.status,
            os: host.os,
            hostname: host.hostname,
          },
        });
      }
    });

    // Создаём узлы подсетей и рёбра к хостам
    subnetMap.forEach((ips, subnet) => {
      const subnetId = `subnet-${subnet}`;
      nodes.push({
        data: {
          id: subnetId,
          label: subnet,
          group: 'router',
          status: 'up',
        },
      });
      ips.forEach((ip) => {
        // Добавляем хост, если ещё не добавлен
        if (!nodes.some((n) => n.data.id === ip)) {
          const host = hosts.find((h) => h.ip === ip);
          nodes.push({
            data: {
              id: ip,
              label: ip,
              group: 'host',
              status: host?.status,
              os: host?.os,
              hostname: host?.hostname,
            },
          });
        }
        edges.push({
          data: {
            id: `edge-${subnetId}-${ip}`,
            source: subnetId,
            target: ip,
            delay: Math.round(Math.random() * 10 + 1), // симуляция задержки
          },
        });
      });
    });

    return { nodes, edges };
  };

  const { nodes, edges } = buildElements();
  const elements = [...nodes, ...edges];

  // Стили для Cytoscape (с `as any` для обхода типов)
  const cyStyles = [
    {
      selector: 'node',
      style: {
        'background-color': '#1f301f',
        'border-color': '#66ff33',
        'border-width': '2px',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#ccff66',
        'font-family': 'Courier New, monospace',
        'font-size': '10px',
        'text-shadow': '0 0 6px #66ff33',
        'text-wrap': 'wrap',
        'width': 'label',
        'height': 'label',
        'padding': '8px',
      } as any,
    },
    {
      selector: 'node[group="host"]',
      style: {
        'background-color': '#0c120c',
        'border-color': '#66ff33',
        'border-width': '3px',
        'shape': 'rectangle',
        'width': 'label',
        'height': 'label',
        'padding': '12px',
        'text-shadow': '0 0 10px #66ff33',
      } as any,
    },
    {
      selector: 'node[group="router"]',
      style: {
        'background-color': '#182618',
        'border-color': '#a8e633',
        'border-width': '2px',
        'shape': 'ellipse',
        'width': 'label',
        'height': 'label',
        'padding': '8px',
        'text-shadow': '0 0 8px #a8e633',
      } as any,
    },
    {
      selector: 'node[status="down"]',
      style: {
        'border-color': '#777',
        'opacity': 0.5,
        'text-shadow': 'none',
        'color': '#777',
      } as any,
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#3dff00',
        'target-arrow-color': '#3dff00',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
      } as any,
    },
    {
      selector: 'edge[delay]',
      style: {
        'label': 'data(delay)ms',
        'font-size': '8px',
        'color': '#77aa33',
        'text-shadow': '0 0 4px #77aa33',
        'text-rotation': 'autorotate',
        'text-margin-y': -10,
      } as any,
    },
  ];

  const handleNodeTap = (event: any) => {
    const node = event.target;
    const id = node.data('id');
    const group = node.data('group');
    if (group === 'host' && onNodeClick) {
      const host = hosts.find((h) => h.ip === id);
      if (host) onNodeClick(host);
    }
  };

  if (loading) {
    return (
      <IndustrialCard variant="accent">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <NeonSpinner size={48} label="Building topology..." />
        </div>
      </IndustrialCard>
    );
  }

  if (elements.length === 0) {
    return (
      <IndustrialCard variant="accent">
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <GlitchText text="No topology data available" />
          <p style={{ marginTop: '8px' }}>Run a scan with traceroute to see network topology.</p>
        </div>
      </IndustrialCard>
    );
  }

  return (
    <IndustrialCard variant="accent">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <GlitchText text="NETWORK TOPOLOGY" />
        {scanId && (
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Scan: {scanId.slice(0, 8)}
          </span>
        )}
      </div>
      <div className={styles.graphContainer}>
        <CytoscapeComponent
          elements={elements}
          style={{ width: '100%', height: '600px', background: 'var(--color-bg-primary)' }}
          stylesheet={cyStyles}
          layout={{
            name: 'dagre',
            rankDir: 'TB',
            spacingFactor: 1.2,
            nodeSep: 50,
            rankSep: 70,
          } as any}
          cy={(cy: cytoscape.Core) => {
            cyRef.current = cy;
            cy.on('tap', 'node', handleNodeTap);
            cy.ready(() => {
              cy.fit();
              cy.center();
            });
          }}
        />
      </div>
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ background: '#66ff33', border: '3px solid #66ff33' }}></span>
          <span>Host (up)</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ background: '#777', border: '3px solid #777' }}></span>
          <span>Host (down)</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ background: '#a8e633', border: '2px solid #a8e633', borderRadius: '50%' }}></span>
          <span>Subnet / Router</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ background: 'none', border: 'none', width: 'auto' }}>
            <span style={{ border: '2px solid #3dff00', padding: '0 8px' }}>→</span>
          </span>
          <span>Connection (delay)</span>
        </div>
      </div>
    </IndustrialCard>
  );
};