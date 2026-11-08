// src/components/AnalyticsDashboard/AnalyticsDashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  IndustrialCard,
  GlitchText,
  NeonSpinner,
  NeonSelect,
  NeonButton,
} from '@/components_kit';
import { nmapApi } from '@/api/nmapApi';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { applyPipChartDefaults, pipChartColors, pipSeriesPalette } from '@/tokens/chartTheme';
import styles from './AnalyticsDashboard.module.css';

// Регистрируем компоненты Chart.js
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);
applyPipChartDefaults(ChartJS); // B4: шрифт/цвета/сетка из --pip-* токенов

export const AnalyticsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [osDist, setOsDist] = useState<any[]>([]);
  const [topPorts, setTopPorts] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [timelineDays, setTimelineDays] = useState(30);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, servicesRes, osRes, portsRes, timelineRes] = await Promise.all([
        nmapApi.getAnalyticsOverview(),
        nmapApi.getTopServices(10),
        nmapApi.getOSDistribution(),
        nmapApi.getTopPorts(10),
        nmapApi.getTimeline(timelineDays),
      ]);
      setOverview(overviewRes.data);
      setServices(servicesRes.data);
      setOsDist(osRes.data);
      setTopPorts(portsRes.data);
      setTimeline(timelineRes.data);
    } catch (err) {
      console.error('Не удалось загрузить аналитику:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timelineDays]);

  // Цветовая схема для графиков — из pip-токенов (B4)
  const pip = pipChartColors();
  const colors = pipSeriesPalette(10);
  const pipBg = '#0a0f0a';

  // Данные для круговой диаграммы ОС
  const osChartData = {
    labels: osDist.map((item) => item.os || 'Неизвестно'),
    datasets: [
      {
        data: osDist.map((item) => item.count),
        backgroundColor: colors.slice(0, osDist.length),
        borderColor: pipBg,
        borderWidth: 1,
      },
    ],
  };

  // Данные для гистограммы сервисов
  const servicesChartData = {
    labels: services.map((item) => item.service),
    datasets: [
      {
        label: 'Открытых портов',
        data: services.map((item) => item.count),
        backgroundColor: pip.fgGhost,
        borderColor: pip.fg,
        borderWidth: 1,
      },
    ],
  };

  // Данные для гистограммы портов
  const portsChartData = {
    labels: topPorts.map((item) => `${item.port}/${item.protocol}`),
    datasets: [
      {
        label: 'Количество вхождений',
        data: topPorts.map((item) => item.count),
        backgroundColor: pip.fgGhost,
        borderColor: pip.fg,
        borderWidth: 1,
      },
    ],
  };

  // Данные для временного ряда
  const timelineChartData = {
    labels: timeline.map((item) => item.date),
    datasets: [
      {
        label: 'Хосты',
        data: timeline.map((item) => item.hosts),
        borderColor: pip.fg,
        backgroundColor: pip.fgGhost,
        fill: true,
        tension: 0,               // Pip-Boy: ломаные, без сглаживания
        pointBackgroundColor: pip.fg,
        pointBorderColor: pipBg,
        pointBorderWidth: 1,
        pointRadius: 2,
      },
      {
        label: 'Открытые порты',
        data: timeline.map((item) => item.ports),
        borderColor: pip.warning,
        backgroundColor: 'transparent',
        fill: false,
        tension: 0,
        borderDash: [4, 3],       // вторая серия — пунктиром
        pointBackgroundColor: pip.warning,
        pointBorderColor: pipBg,
        pointBorderWidth: 1,
        pointRadius: 2,
      },
    ],
  };

  const timelineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: pip.fg,
          font: { family: "'Share Tech Mono', 'Courier New', monospace" },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: pip.fgDim, font: { family: "'Share Tech Mono', 'Courier New', monospace" } },
        grid: { color: pip.fgGhost },
      },
      y: {
        ticks: { color: pip.fgDim, font: { family: "'Share Tech Mono', 'Courier New', monospace" } },
        grid: { color: pip.fgGhost },
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: pip.fg,
          font: { family: "'Share Tech Mono', 'Courier New', monospace", size: 10 },
          boxWidth: 12,
          padding: 8,
        },
      },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: pip.fg,
          font: { family: "'Share Tech Mono', 'Courier New', monospace" },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: pip.fgDim, font: { family: "'Share Tech Mono', 'Courier New', monospace", size: 9 } },
        grid: { color: pip.fgGhost },
      },
      y: {
        ticks: { color: pip.fgDim, font: { family: "'Share Tech Mono', 'Courier New', monospace" } },
        grid: { color: pip.fgGhost },
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return (
      <IndustrialCard variant="accent">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <NeonSpinner size={48} label="Загрузка аналитики..." />
        </div>
      </IndustrialCard>
    );
  }

  return (
    <div className={styles.dashboard}>
      <IndustrialCard variant="accent">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <GlitchText text="ПАНЕЛЬ АНАЛИТИКИ" />
        </div>

        {/* Карточки обзора */}
        <div className={styles.overviewGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Всего сканов</div>
            <div className={styles.statValue}>{overview?.total_scans || 0}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Всего хостов</div>
            <div className={styles.statValue}>{overview?.total_hosts || 0}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Открытых портов</div>
            <div className={styles.statValue}>{overview?.total_open_ports || 0}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Уязвимостей</div>
            <div className={styles.statValue}>{overview?.total_vulnerabilities || 0}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Уникальных CVE</div>
            <div className={styles.statValue}>{overview?.unique_cves || 0}</div>
          </div>
        </div>

        {/* Управление временным диапазоном */}
        <div className={styles.timelineControls}>
          <NeonSelect
            label="Дней"
            options={[
              { value: '7', label: '7 дней' },
              { value: '30', label: '30 дней' },
              { value: '90', label: '90 дней' },
              { value: '365', label: '365 дней' },
            ]}
            value={String(timelineDays)}
            onChange={(val) => setTimelineDays(Number(val))}
          />
          <NeonButton size="sm" variant="primary" onClick={loadData}>
            ↻ Обновить
          </NeonButton>
        </div>

        {/* График временного ряда */}
        {timeline.length > 0 && (
          <div className={styles.chartContainer}>
            <div className={styles.chartTitle}>Хосты и порты во времени</div>
            <div className={styles.chartWrapper}>
              <Line data={timelineChartData} options={timelineOptions} />
            </div>
          </div>
        )}

        {/* Сетка графиков */}
        <div className={styles.chartsGrid}>
          {osDist.length > 0 && (
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>Распределение ОС</div>
              <div className={styles.chartWrapperSmall}>
                <Doughnut data={osChartData} options={doughnutOptions} />
              </div>
            </div>
          )}

          {services.length > 0 && (
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>Топ сервисов</div>
              <div className={styles.chartWrapperSmall}>
                <Bar data={servicesChartData} options={barOptions} />
              </div>
            </div>
          )}

          {topPorts.length > 0 && (
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>Топ открытых портов</div>
              <div className={styles.chartWrapperSmall}>
                <Bar data={portsChartData} options={barOptions} />
              </div>
            </div>
          )}
        </div>
      </IndustrialCard>
    </div>
  );
};
