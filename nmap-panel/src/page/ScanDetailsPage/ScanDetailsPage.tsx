// src/pages/ScanDetailsPage/ScanDetailsPage.tsx
import React, { useState, useEffect } from 'react';
import { IndustrialCard, GlitchText, NeonButton, IndustrialTabs } from '@/components_kit';
import { TopologyGraph } from '@/components/TopologyGraph/TopologyGraph';
import { HostGrid } from '@/components/HostGrid/HostGrid';
import { HostDetailsModal } from '@/components/HostDetailsModal/HostDetailsModal';
import { VulnerabilitiesList } from '@/components/VulnerabilitiesList/VulnerabilitiesList';
import { nmapApi, type ScanHistoryItem, type HostInfo } from '@/api/nmapApi';
import styles from './ScanDetailsPage.module.css';

interface ScanDetailsPageProps {
  scanId: string;
  onClose: () => void;
}

type TabId = 'summary' | 'hosts' | 'topology' | 'vulnerabilities';

export const ScanDetailsPage: React.FC<ScanDetailsPageProps> = ({ scanId, onClose }) => {
  const [scan, setScan] = useState<ScanHistoryItem | null>(null);
  const [hosts, setHosts] = useState<HostInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('summary');
  const [selectedHost, setSelectedHost] = useState<HostInfo | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [scanRes, hostsRes] = await Promise.all([
          nmapApi.getHistoryItem(scanId),
          nmapApi.getScanHosts(scanId),
        ]);
        setScan(scanRes.data);
        setHosts(hostsRes.data.hosts);
      } catch (error) {
        console.error('Failed to load scan details', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [scanId]);

  const handleHostClick = (host: HostInfo) => {
    setSelectedHost(host);
    setModalOpen(true);
  };

  const tabs = [
    { id: 'summary', label: 'Сводка' },
    { id: 'hosts', label: `Хосты (${hosts.length})` },
    { id: 'topology', label: 'Топология' },
    { id: 'vulnerabilities', label: 'Уязвимости' },
  ];

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Загрузка данных скана...</div>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>Скан не найден</div>
        <NeonButton onClick={onClose}>Назад</NeonButton>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <GlitchText text={`Скан: ${scan.scan_id.slice(0, 8)}`} />
        <div className={styles.headerRight}>
          <span className={styles.scanInfo}>
            {scan.targets} | {scan.profile} | {scan.status}
          </span>
          <NeonButton variant="danger" size="sm" onClick={onClose}>
            ✕ Закрыть
          </NeonButton>
        </div>
      </div>

      <IndustrialTabs
        tabs={tabs}
        active={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
      />

      <div className={styles.content}>
        {activeTab === 'summary' && (
          <IndustrialCard variant="accent">
            <div className={styles.summaryGrid}>
              <div><strong>ID:</strong> {scan.scan_id}</div>
              <div><strong>Цели:</strong> {scan.targets}</div>
              <div><strong>Профиль:</strong> {scan.profile}</div>
              <div><strong>Статус:</strong> {scan.status}</div>
              <div><strong>Начало:</strong> {new Date(scan.start_time).toLocaleString()}</div>
              {scan.end_time && <div><strong>Конец:</strong> {new Date(scan.end_time).toLocaleString()}</div>}
              <div><strong>Сводка:</strong> {scan.summary || '—'}</div>
            </div>
          </IndustrialCard>
        )}

        {activeTab === 'hosts' && (
          <IndustrialCard variant="accent">
            <HostGrid hosts={hosts} onHostClick={handleHostClick} />
          </IndustrialCard>
        )}

        {activeTab === 'topology' && (
          <TopologyGraph hosts={hosts} scanId={scan.scan_id} onNodeClick={handleHostClick} />
        )}

        {activeTab === 'vulnerabilities' && (
          <VulnerabilitiesList scanId={scan.scan_id} />
        )}
      </div>

      <HostDetailsModal
        open={modalOpen}
        host={selectedHost}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
};