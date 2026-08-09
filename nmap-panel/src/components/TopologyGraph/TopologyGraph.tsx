// src/components/TopologyGraph/TopologyGraph.tsx
import React, { useRef, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { IndustrialCard, NeonSpinner, GlitchText } from '@/components_kit';
import type { HostInfo } from '@/api/nmapApi';
import styles from './TopologyGraph.module.css';

interface TopologyGraphProps {
  hosts: HostInfo[];
  loading?: boolean;
  scanId?: string;
  onNodeClick?: (host: HostInfo) => void;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  group: 'host' | 'router';
  status?: string;
  os?: string;
  hostname?: string;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  delay?: number;
}

export const TopologyGraph: React.FC<TopologyGraphProps> = ({
  hosts,
  loading = false,
  scanId,
  onNodeClick,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const { nodes, links } = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();
    const linkList: GraphLink[] = [];

    if (!hosts || hosts.length === 0) return { nodes: [], links: [] };

    const subnetMap = new Map<string, string[]>();
    hosts.forEach((host) => {
      const ip = host.ip;
      const parts = ip.split('.');
      if (parts.length === 4) {
        const subnet = `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
        if (!subnetMap.has(subnet)) subnetMap.set(subnet, []);
        subnetMap.get(subnet)!.push(ip);
      } else {
        nodeMap.set(ip, {
          id: ip,
          label: ip,
          group: 'host',
          status: host.status,
          os: host.os,
          hostname: host.hostname,
        });
      }
    });

    subnetMap.forEach((ips, subnet) => {
      const subnetId = `subnet-${subnet}`;
      if (!nodeMap.has(subnetId)) {
        nodeMap.set(subnetId, {
          id: subnetId,
          label: subnet,
          group: 'router',
          status: 'up',
        });
      }
      ips.forEach((ip) => {
        if (!nodeMap.has(ip)) {
          const host = hosts.find((h) => h.ip === ip);
          nodeMap.set(ip, {
            id: ip,
            label: ip,
            group: 'host',
            status: host?.status,
            os: host?.os,
            hostname: host?.hostname,
          });
        }
        linkList.push({
          source: subnetId,
          target: ip,
          delay: Math.round(Math.random() * 10 + 1),
        });
      });
    });

    return { nodes: Array.from(nodeMap.values()), links: linkList };
  }, [hosts]);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 500;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // ─── DEFS: filters, gradients, patterns ───
    const defs = svg.append('defs');

    // Neon glow filter
    const glowFilter = defs.append('filter')
      .attr('id', 'neon-glow')
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%');
    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'coloredBlur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Strong glow for active
    const strongGlow = defs.append('filter')
      .attr('id', 'strong-glow')
      .attr('x', '-100%').attr('y', '-100%')
      .attr('width', '300%').attr('height', '300%');
    strongGlow.append('feGaussianBlur')
      .attr('stdDeviation', '8')
      .attr('result', 'coloredBlur');
    const strongMerge = strongGlow.append('feMerge');
    strongMerge.append('feMergeNode').attr('in', 'coloredBlur');
    strongMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Shadow filter
    const shadowFilter = defs.append('filter')
      .attr('id', 'drop-shadow')
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%');
    shadowFilter.append('feDropShadow')
      .attr('dx', 0).attr('dy', 4)
      .attr('stdDeviation', 6)
      .attr('flood-color', '#000')
      .attr('flood-opacity', 0.6);

    // Grid pattern background
    const gridPattern = defs.append('pattern')
      .attr('id', 'grid')
      .attr('width', 40)
      .attr('height', 40)
      .attr('patternUnits', 'userSpaceOnUse');
    gridPattern.append('path')
      .attr('d', 'M 40 0 L 0 0 0 40')
      .attr('fill', 'none')
      .attr('stroke', '#1a2e1a')
      .attr('stroke-width', 0.5);

    // Pulse animation for active hosts
    defs.append('style').text(`
      @keyframes pulse {
        0%, 100% { opacity: 0.4; r: 28; }
        50% { opacity: 0.1; r: 40; }
      }
      .pulse-ring {
        animation: pulse 2s ease-in-out infinite;
      }
      @keyframes dash {
        to { stroke-dashoffset: -20; }
      }
      .animated-link {
        stroke-dasharray: 5, 5;
        animation: dash 1s linear infinite;
      }
    `);

    // ─── BACKGROUND ───
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'var(--color-bg-primary)');
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'url(#grid)');

    const g = svg.append('g');

    // Zoom & pan
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    const nodeRadius = (d: GraphNode) => (d.group === 'router' ? 45 : 32);

    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('charge', d3.forceManyBody().strength(-350))
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id((d) => d.id).distance(120))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide<GraphNode>().radius((d) => nodeRadius(d) + 25));

    // ─── LINKS ───
    const linkGroup = g.append('g').attr('class', 'links');

    // Base link line
    linkGroup.selectAll('line.base')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'base')
      .attr('stroke', '#1a3d1a')
      .attr('stroke-width', 3)
      .attr('opacity', 0.6);

    // Animated neon link
    linkGroup.selectAll('line.neon')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'neon animated-link')
      .attr('stroke', '#3dff00')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.8);

    // Link delay labels
    const linkLabelSelection = g.append('g')
      .selectAll('g.link-label')
      .data(links)
      .enter()
      .append('g')
      .attr('class', 'link-label');

    linkLabelSelection.append('rect')
      .attr('width', 36)
      .attr('height', 16)
      .attr('rx', 8)
      .attr('fill', 'rgba(10, 20, 10, 0.9)')
      .attr('stroke', '#3dff00')
      .attr('stroke-width', 0.5);

    linkLabelSelection.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', '#a8e633')
      .attr('font-size', '9px')
      .attr('font-family', 'Courier New, monospace')
      .attr('dy', '0.5px')
      .text((d) => (d.delay ? `${d.delay}ms` : ''));

    // ─── NODES ───
    const nodeGroup = g.append('g').attr('class', 'nodes');

    const nodeEnter = nodeGroup.selectAll('g.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('cursor', 'pointer')
      .on('mouseenter', function(_, d) {
        setHoveredNode(d.id);
        d3.select(this).select('.node-shape')
          .transition().duration(200)
          .attr('transform', 'scale(1.15)');
      })
      .on('mouseleave', function() {
        setHoveredNode(null);
        d3.select(this).select('.node-shape')
          .transition().duration(200)
          .attr('transform', 'scale(1)');
      })
      .on('click', (_, d) => {
        if (d.group === 'host' && onNodeClick) {
          const host = hosts.find((h) => h.ip === d.id);
          if (host) onNodeClick(host);
        }
      })
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Pulse ring for active hosts
    nodeEnter.filter((d: GraphNode) => Boolean(d.group === 'host' && d.status === 'up'))
      .append('circle')
      .attr('class', 'pulse-ring')
      .attr('r', 28)
      .attr('fill', 'none')
      .attr('stroke', '#66ff33')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.3);

    // Outer glow ring
    nodeEnter.append('circle')
      .attr('r', (d) => nodeRadius(d) + 6)
      .attr('fill', (d) => {
        if (d.group === 'router') return 'rgba(168, 230, 51, 0.08)';
        if (d.status === 'up') return 'rgba(102, 255, 51, 0.08)';
        return 'rgba(119, 119, 119, 0.05)';
      })
      .attr('filter', 'url(#strong-glow)');

    // Main node shape
    const nodeShapes = nodeEnter.append('g').attr('class', 'node-shape');

    // Router = hexagon, Host = circle
    nodeShapes.each(function(d) {
      const sel = d3.select(this);
      if (d.group === 'router') {
        const r = 40;
        const points: [number, number][] = [];
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          points.push([r * Math.cos(angle), r * Math.sin(angle)]);
        }
        sel.append('polygon')
          .attr('points', points.map(p => p.join(',')).join(' '))
          .attr('fill', '#0f1f0f')
          .attr('stroke', '#a8e633')
          .attr('stroke-width', 2.5)
          .attr('filter', 'url(#neon-glow)');
      } else {
        sel.append('circle')
          .attr('r', 30)
          .attr('fill', d.status === 'up' ? '#0c1a0c' : '#151515')
          .attr('stroke', d.status === 'up' ? '#66ff33' : '#555')
          .attr('stroke-width', 3)
          .attr('filter', 'url(#neon-glow)');
        sel.append('circle')
          .attr('r', 22)
          .attr('fill', 'none')
          .attr('stroke', d.status === 'up' ? 'rgba(102, 255, 51, 0.3)' : 'rgba(85, 85, 85, 0.2)')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '4,3');
      }
    });

    // Icon / symbol
    nodeEnter.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', (d) => {
        if (d.group === 'router') return '#a8e633';
        return d.status === 'up' ? '#ccff66' : '#777';
      })
      .attr('font-size', (d) => (d.group === 'router' ? '20px' : '18px'))
      .attr('dy', '-2px')
      .text((d) => (d.group === 'router' ? '◈' : '●'));

    // Label below node
    nodeEnter.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => (d.group === 'router' ? 58 : 48))
      .attr('fill', (d) => {
        if (d.group === 'router') return '#a8e633';
        return d.status === 'up' ? '#ccff66' : '#888';
      })
      .attr('font-family', 'Courier New, monospace')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('filter', 'url(#drop-shadow)')
      .text((d) => {
        if (d.hostname && d.hostname !== d.id) return `${d.hostname}`;
        return d.label.length > 14 ? d.label.slice(0, 12) + '..' : d.label;
      });

    // IP sub-label for hosts with hostname
    nodeEnter.filter((d: GraphNode) => Boolean(d.group === 'host' && d.hostname && d.hostname !== d.id))
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 60)
      .attr('fill', '#77aa33')
      .attr('font-family', 'Courier New, monospace')
      .attr('font-size', '8px')
      .attr('opacity', 0.8)
      .text((d) => d.label);

    // OS badge
    nodeEnter.filter((d: GraphNode) => Boolean(d.group === 'host' && d.os))
      .append('rect')
      .attr('x', -18)
      .attr('y', -48)
      .attr('width', 36)
      .attr('height', 12)
      .attr('rx', 6)
      .attr('fill', 'rgba(10, 30, 10, 0.9)')
      .attr('stroke', '#3dff00')
      .attr('stroke-width', 0.5);

    nodeEnter.filter((d: GraphNode) => Boolean(d.group === 'host' && d.os))
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', -40)
      .attr('fill', '#a8e633')
      .attr('font-family', 'Courier New, monospace')
      .attr('font-size', '7px')
      .text((d) => {
        const os = d.os || '';
        return os.length > 8 ? os.slice(0, 7) + '..' : os;
      });

    // Status dot
    nodeEnter.filter((d: GraphNode) => Boolean(d.group === 'host'))
      .append('circle')
      .attr('cx', 20)
      .attr('cy', -20)
      .attr('r', 5)
      .attr('fill', (d) => d.status === 'up' ? '#00ff41' : '#ff4444')
      .attr('stroke', '#000')
      .attr('stroke-width', 1.5)
      .attr('filter', 'url(#neon-glow)');

    // ─── SIMULATION TICK ───
    simulation.on('tick', () => {
      linkGroup.selectAll('line')
        .attr('x1', (d: any) => (d.source as GraphNode).x!)
        .attr('y1', (d: any) => (d.source as GraphNode).y!)
        .attr('x2', (d: any) => (d.target as GraphNode).x!)
        .attr('y2', (d: any) => (d.target as GraphNode).y!);

      linkLabelSelection
        .attr('transform', (d: any) => {
          const sx = (d.source as GraphNode).x!;
          const sy = (d.source as GraphNode).y!;
          const tx = (d.target as GraphNode).x!;
          const ty = (d.target as GraphNode).y!;
          return `translate(${(sx + tx) / 2 - 18}, ${(sy + ty) / 2 - 8})`;
        });

      nodeEnter
        .attr('transform', (d) => `translate(${d.x}, ${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links, hosts, onNodeClick]);

  if (loading) {
    return (
      <IndustrialCard variant="accent">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <NeonSpinner size={48} label="Building topology..." />
        </div>
      </IndustrialCard>
    );
  }

  if (nodes.length === 0) {
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
    <div style={{ overflow: 'hidden', maxHeight: '650px', flexShrink: 0 }}>
      <IndustrialCard variant="accent">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <GlitchText text="NETWORK TOPOLOGY" />
          {scanId && (
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              Scan: {scanId.slice(0, 8)}
            </span>
          )}
        </div>
        <div
          ref={containerRef}
          className={styles.graphContainer}
          style={{ height: '550px', overflow: 'hidden', flexShrink: 0, position: 'relative' }}
        >
          <svg ref={svgRef} width="100%" height="100%" style={{ background: 'var(--color-bg-primary)', cursor: 'grab' }} />
          
          {hoveredNode && (() => {
            const node = nodes.find(n => n.id === hoveredNode);
            if (!node) return null;
            return (
              <div style={{
                position: 'absolute',
                bottom: 12,
                left: 12,
                background: 'rgba(10, 20, 10, 0.95)',
                border: '1px solid #3dff00',
                borderRadius: 8,
                padding: '10px 14px',
                fontFamily: 'Courier New, monospace',
                fontSize: 12,
                color: '#ccff66',
                pointerEvents: 'none',
                boxShadow: '0 0 20px rgba(61, 255, 0, 0.15)',
                zIndex: 10,
                minWidth: 160,
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: 4, color: '#a8e633' }}>
                  {node.group === 'router' ? '◈ SUBNET ROUTER' : '● HOST NODE'}
                </div>
                <div>ID: {node.id}</div>
                {node.hostname ? <div>Host: {node.hostname}</div> : null}
                {node.os ? <div>OS: {node.os}</div> : null}
                {node.status ? (
                  <div>
                    Status:{" "}
                    <span style={{ color: node.status === 'up' ? '#00ff41' : '#ff4444' }}>
                      {node.status.toUpperCase()}
                    </span>
                  </div>
                ) : null}
                {node.group === 'router' ? (
                  <div>
                    Children:{" "}
                    {links.filter((l: any) =>
                      (l.source as GraphNode).id === node.id || (l.target as GraphNode).id === node.id
                    ).length}
                  </div>
                ) : null}
              </div>
            );
          })()}
        </div>
        
        <div className={styles.legend} style={{ marginTop: 12, display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12, fontFamily: 'Courier New, monospace' }}>
          <div className={styles.legendItem} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#66ff33', boxShadow: '0 0 8px #66ff33', display: 'inline-block' }}></span>
            <span>Host (up)</span>
          </div>
          <div className={styles.legendItem} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#555', display: 'inline-block' }}></span>
            <span>Host (down)</span>
          </div>
          <div className={styles.legendItem} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', background: '#a8e633', boxShadow: '0 0 8px #a8e633', display: 'inline-block' }}></span>
            <span>Subnet / Router</span>
          </div>
          <div className={styles.legendItem} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 20, height: 2, background: '#3dff00', display: 'inline-block', boxShadow: '0 0 4px #3dff00' }}></span>
            <span>Connection</span>
          </div>
        </div>
      </IndustrialCard>
    </div>
  );
};