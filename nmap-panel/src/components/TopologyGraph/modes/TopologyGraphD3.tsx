// src/components/TopologyGraph/modes/TopologyGraphD3.tsx
import React, { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
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
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {}

export const TopologyGraphD3: React.FC<Props> = ({ hosts, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);

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
          nodeMap.set(ip, { id: ip, label: ip, group: 'host', status: host?.status });
        }
        linkList.push({ source: subnetId, target: ip });
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

    const g = svg.append('g');

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 2])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    // Симуляция с быстрым затуханием
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('charge', d3.forceManyBody().strength(-150))
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(100))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(30))
      .alphaDecay(0.05)
      .velocityDecay(0.6);

    simulationRef.current = simulation;

    // Линии
    const linkGroup = g.append('g').attr('class', 'links');
    const linkLines = linkGroup.selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#1a3d1a')
      .attr('stroke-width', 2);

    // Узлы
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const nodeEnter = nodeGroup.selectAll('g.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        // Фиксируем узел при клике
        d.fx = d.x;
        d.fy = d.y;
        // Если это хост, вызываем колбэк
        if (d.group === 'host' && onNodeClick) {
          const host = hosts.find(h => h.ip === d.id);
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
          // Оставляем фиксацию
        })
      );

    // Фигура узла
    nodeEnter.each(function(d) {
      const sel = d3.select(this);
      if (d.group === 'router') {
        sel.append('rect')
          .attr('width', 40)
          .attr('height', 40)
          .attr('x', -20)
          .attr('y', -20)
          .attr('fill', '#0f1f0f')
          .attr('stroke', '#a8e633')
          .attr('stroke-width', 2);
      } else {
        sel.append('circle')
          .attr('r', 20)
          .attr('fill', d.status === 'up' ? '#0c1a0c' : '#151515')
          .attr('stroke', d.status === 'up' ? '#66ff33' : '#555')
          .attr('stroke-width', 2);
      }
    });

    // Текст внутри
    nodeEnter.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', d => d.group === 'router' ? '#a8e633' : (d.status === 'up' ? '#ccff66' : '#777'))
      .attr('font-size', '12px')
      .text(d => d.group === 'router' ? '◈' : '●');

    // Подпись
    nodeEnter.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.group === 'router' ? 32 : 28)
      .attr('fill', '#ccff66')
      .attr('font-size', '8px')
      .text(d => d.label.length > 10 ? d.label.slice(0, 8) + '..' : d.label);

    // Обновление позиций
    simulation.on('tick', () => {
      linkLines
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!);

      nodeEnter.attr('transform', d => `translate(${d.x}, ${d.y})`);
    });

    // Остановка после стабилизации
    setTimeout(() => {
      simulation.alphaTarget(0);
    }, 3000);

    return () => {
      simulation.stop();
      simulationRef.current = null;
    };
  }, [nodes, links, hosts, onNodeClick]);

  return (
    <div ref={containerRef} className={styles.graphContainer}>
      <svg ref={svgRef} width="100%" height="100%" />
    </div>
  );
};