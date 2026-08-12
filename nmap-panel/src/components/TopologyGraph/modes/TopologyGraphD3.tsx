// src/components/TopologyGraph/modes/TopologyGraphD3.tsx
import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { VscZoomIn, VscZoomOut, VscScreenFull, VscTarget } from 'react-icons/vsc';
import { useTheme } from '../../../context/ThemeContext';
import type { HostInfo } from '@/api/nmapApi';
import styles from './TopologyGraphD3.module.css';

interface Props {
  hosts: HostInfo[];
  onNodeClick?: (host: HostInfo) => void;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  group: 'host' | 'router';
  status?: string;
  ports?: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  id: string;
}

export const TopologyGraphD3: React.FC<Props> = ({ hosts, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const { theme } = useTheme();
  const [selected, setSelected] = useState<string | null>(null);

  const colors = useMemo(() => {
    const isGreen = theme === 'green';
    return {
      accent: isGreen ? '#66ff33' : '#ffb800',
      accentGlow: isGreen ? 'rgba(102,255,51,0.8)' : 'rgba(255,184,0,0.8)',
      accentDim: isGreen ? 'rgba(102,255,51,0.2)' : 'rgba(255,184,0,0.2)',
      text: isGreen ? '#ccff66' : '#ffdd66',
      secondary: isGreen ? '#a8e633' : '#e6b800',
      muted: isGreen ? '#77aa33' : '#a67c00',
      danger: isGreen ? '#ff5555' : '#3399ff',
      bgNode: isGreen ? '#0c1a0c' : '#1a140e',
      bgRouter: isGreen ? '#0f1f0f' : '#1f180f',
      link: isGreen ? '#215a21' : '#4a331d',
      linkPulse: isGreen ? '#9dff70' : '#ffd166',
      nodeStroke: isGreen ? '#66ff33' : '#ffb800',
      routerStroke: isGreen ? '#a8e633' : '#e6b800',
      grid: isGreen ? 'rgba(102,255,51,0.05)' : 'rgba(255,184,0,0.05)',
    };
  }, [theme]);

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
        nodeMap.set(ip, { id: ip, label: ip, group: 'host', status: host.status });
      }
    });

    subnetMap.forEach((ips, subnet) => {
      const subnetId = `subnet-${subnet}`;
      if (!nodeMap.has(subnetId)) {
        nodeMap.set(subnetId, { id: subnetId, label: subnet, group: 'router', status: 'up' });
      }
      ips.forEach((ip) => {
        if (!nodeMap.has(ip)) {
          const host = hosts.find((h) => h.ip === ip);
          const openPorts = host?.ports.filter((p) => p.state === 'open').length || 0;
          nodeMap.set(ip, { id: ip, label: ip, group: 'host', status: host?.status, ports: openPorts });
        }
        linkList.push({ id: `${subnetId}__${ip}`, source: subnetId, target: ip });
      });
    });

    return { nodes: Array.from(nodeMap.values()), links: linkList };
  }, [hosts]);

  const handleZoom = useCallback((factor: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(250)
      .call(zoomRef.current.scaleBy, factor);
  }, []);

  const handleReset = useCallback(() => {
    if (!svgRef.current || !zoomRef.current || !containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    d3.select(svgRef.current)
      .transition()
      .duration(350)
      .call(
        zoomRef.current.transform,
        d3.zoomIdentity.translate(width / 2, height / 2).scale(1).translate(-width / 2, -height / 2)
      );
  }, []);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 500;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // ---- defs: glow filters + grid pattern ----
    const defs = svg.append('defs');

    const glowFilter = defs.append('filter').attr('id', 'nodeGlow').attr('x', '-100%').attr('y', '-100%').attr('width', '300%').attr('height', '300%');
    glowFilter.append('feGaussianBlur').attr('stdDeviation', 3.2).attr('result', 'blur');
    const merge = glowFilter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    const pattern = defs.append('pattern')
      .attr('id', 'gridPattern')
      .attr('width', 32)
      .attr('height', 32)
      .attr('patternUnits', 'userSpaceOnUse');
    pattern.append('path')
      .attr('d', 'M 32 0 L 0 0 0 32')
      .attr('fill', 'none')
      .attr('stroke', colors.grid)
      .attr('stroke-width', 1);

    const g = svg.append('g');

    // background grid, fixed to viewport (not zoomed content) via separate group
    const bgGroup = svg.insert('g', ':first-child');
    const bgRect = bgGroup.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'url(#gridPattern)');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        bgRect.attr('transform', event.transform);
      });
    svg.call(zoom);
    zoomRef.current = zoom;
    svg.call(zoom.transform, d3.zoomIdentity);

    // Настройка симуляции с более стабильными параметрами
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('charge', d3.forceManyBody().strength(-180))
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(120))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(42))
      .alphaDecay(0.06)
      .velocityDecay(0.6);

    simulationRef.current = simulation;

    // ---- links ----
    const linkGroup = g.append('g').attr('class', 'links');
    linkGroup.selectAll('line')
      .data(links, (d: any) => d.id)
      .enter()
      .append('line')
      .attr('stroke', colors.link)
      .attr('stroke-width', 2.5)
      .attr('opacity', 0)
      .transition().duration(400).attr('opacity', 1);

    const linkSelection = linkGroup.selectAll('line');

    // ---- animated data pulses traveling along each link ----
    const pulseGroup = g.append('g').attr('class', 'pulses');
    const pulses = pulseGroup.selectAll('circle')
      .data(links, (d: any) => d.id)
      .enter()
      .append('circle')
      .attr('r', 2.6)
      .attr('fill', colors.linkPulse)
      .attr('filter', 'url(#nodeGlow)')
      .attr('opacity', 0.9);

    // ---- nodes ----
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const nodeEnter = nodeGroup.selectAll('g.node')
      .data(nodes, (d: any) => d.id)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('cursor', 'pointer')
      .attr('opacity', 0)
      .on('click', (_event, d) => {
        // Только выделение и вызов колбэка – без фиксации позиции!
        setSelected(d.id);
        if (d.group === 'host' && onNodeClick) {
          const host = hosts.find(h => h.ip === d.id);
          if (host) onNodeClick(host);
        }
      })
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          // Фиксируем узел на текущей позиции, чтобы симуляция не смещала его
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, _d) => {
          if (!event.active) simulation.alphaTarget(0);
          // Оставляем узел зафиксированным, чтобы он остался на месте после перетаскивания
          // Если хотите, чтобы узел снова подчинялся силам – раскомментируйте строки ниже:
          // d.fx = null;
          // d.fy = null;
        })
      );

    nodeEnter.transition().duration(400).attr('opacity', 1);

    nodeEnter.each(function (d) {
      const sel = d3.select(this);
      if (d.group === 'router') {
        // outer rotating radar ring
        const radarRing = sel.append('circle')
          .attr('r', 30)
          .attr('fill', 'none')
          .attr('stroke', colors.routerStroke)
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3 6')
          .attr('opacity', 0.5);

        const rotate = () => {
          radarRing
            .attr('transform', 'rotate(0)')
            .transition()
            .duration(6000)
            .ease(d3.easeLinear)
            .attrTween('transform', () => d3.interpolateString('rotate(0)', 'rotate(360)'))
            .on('end', rotate);
        };
        rotate();

        sel.append('rect')
          .attr('width', 42)
          .attr('height', 42)
          .attr('x', -21)
          .attr('y', -21)
          .attr('rx', 3)
          .attr('fill', colors.bgRouter)
          .attr('stroke', colors.routerStroke)
          .attr('stroke-width', 2.5)
          .attr('filter', 'url(#nodeGlow)');

        // corner ticks like IndustrialCard
        const c = 6;
        const corners: [number, number][] = [[-21, -21], [21, -21], [-21, 21], [21, 21]];
        corners.forEach(([cx, cy]) => {
          sel.append('rect')
            .attr('x', cx - (cx > 0 ? c : 0))
            .attr('y', cy - (cy > 0 ? c : 0))
            .attr('width', c)
            .attr('height', c)
            .attr('fill', colors.accent);
        });
      } else {
        const isUp = d.status === 'up';
        sel.append('circle')
          .attr('r', 22)
          .attr('fill', isUp ? colors.bgNode : '#131313')
          .attr('stroke', isUp ? colors.nodeStroke : '#555')
          .attr('stroke-width', 2.2)
          .attr('filter', isUp ? 'url(#nodeGlow)' : null);

        if (isUp) {
          // pulsing halo for live hosts
          const halo = sel.append('circle')
            .attr('r', 22)
            .attr('fill', 'none')
            .attr('stroke', colors.nodeStroke)
            .attr('stroke-width', 1.5)
            .attr('opacity', 0.6);

          const pulseHalo = () => {
            halo
              .attr('r', 22)
              .attr('opacity', 0.6)
              .transition()
              .duration(1800)
              .ease(d3.easeSinOut)
              .attr('r', 34)
              .attr('opacity', 0)
              .on('end', pulseHalo);
          };
          pulseHalo();
        }

        if (d.ports && d.ports > 0) {
          sel.append('circle')
            .attr('cx', 15)
            .attr('cy', -15)
            .attr('r', 8)
            .attr('fill', colors.accent)
            .attr('stroke', colors.bgNode)
            .attr('stroke-width', 1.5);
          sel.append('text')
            .attr('x', 15)
            .attr('y', -15)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('font-size', '8px')
            .attr('font-weight', 'bold')
            .attr('fill', '#061006')
            .text(d.ports > 9 ? '9+' : d.ports);
        }
      }
    });

    nodeEnter.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', d => d.group === 'router' ? colors.secondary : (d.status === 'up' ? colors.text : '#777'))
      .attr('font-size', d => d.group === 'router' ? '14px' : '12px')
      .attr('font-family', 'var(--font-mono)')
      .text(d => d.group === 'router' ? '\u25C8' : '\u25CF');

    nodeEnter.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.group === 'router' ? 38 : 34)
      .attr('fill', colors.text)
      .attr('font-family', 'var(--font-mono)')
      .attr('font-size', '9px')
      .text(d => d.label.length > 14 ? d.label.slice(0, 12) + '\u2026' : d.label);

    let pulseTime = 0;
    simulation.on('tick', () => {
      linkSelection
        .attr('x1', (d: any) => (d.source as GraphNode).x!)
        .attr('y1', (d: any) => (d.source as GraphNode).y!)
        .attr('x2', (d: any) => (d.target as GraphNode).x!)
        .attr('y2', (d: any) => (d.target as GraphNode).y!);

      nodeEnter.attr('transform', d => `translate(${d.x}, ${d.y})`);
    });

    // ticking pulse animation along links (rAF loop, smooth regardless of sim alpha)
    let raf: number;
    const animatePulses = () => {
      pulseTime += 0.006;
      pulses.each(function (d: any) {
        const t = (pulseTime + (d.id ? d.id.length * 0.05 : 0)) % 1;
        const sx = d.source.x, sy = d.source.y, tx = d.target.x, ty = d.target.y;
        if (sx === undefined || tx === undefined) return;
        d3.select(this)
          .attr('cx', sx + (tx - sx) * t)
          .attr('cy', sy + (ty - sy) * t);
      });
      raf = requestAnimationFrame(animatePulses);
    };
    animatePulses();

    setTimeout(() => simulation.alphaTarget(0), 2500);

    return () => {
      simulation.stop();
      simulationRef.current = null;
      cancelAnimationFrame(raf);
    };
  }, [nodes, links, hosts, onNodeClick, colors]);

  return (
    <div ref={containerRef} className={styles.graphContainer}>
      <svg ref={svgRef} width="100%" height="100%" />

      <div className={styles.controls}>
        <button className={styles.controlBtn} onClick={() => handleZoom(1.3)} title="Приблизить">
          <VscZoomIn size={16} />
        </button>
        <button className={styles.controlBtn} onClick={() => handleZoom(0.75)} title="Отдалить">
          <VscZoomOut size={16} />
        </button>
        <button className={styles.controlBtn} onClick={handleReset} title="Сбросить вид">
          <VscScreenFull size={16} />
        </button>
      </div>

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.legendRouter}`} />
          Подсеть
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.legendUp}`} />
          Хост активен
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.legendDown}`} />
          Хост недоступен
        </div>
      </div>

      {selected && (
        <div className={styles.hint}>
          <VscTarget size={12} /> {selected}
        </div>
      )}
    </div>
  );
};