// src/components/ScanResults/ScanResults.tsx
import React, { useState, useMemo } from 'react';
import { IndustrialCard, GlitchText, NeonInput, NeonSelect, NeonButton, IndustrialTabs } from '@/components_kit';
import type { HostInfo } from '@/api/nmapApi';
import { ScanProgress } from '../ScanProgress/ScanProgress';
import { HostGrid } from '../HostGrid/HostGrid';
import { HostDetailsModal } from '../HostDetailsModal/HostDetailsModal';
import { TopologyGraph } from '../TopologyGraph/TopologyGraph';
import { VulnerabilitiesList } from '../VulnerabilitiesList/VulnerabilitiesList';
import type { ScanResultsProps } from './ScanResults.types';
import styles from './ScanResults.module.css';
import { nmapApi } from '@/api/nmapApi';

type FilterStatus = 'all' | 'up' | 'down';
type TabId = 'hosts' | 'topology' | 'vulnerabilities';

export const ScanResults: React.FC<ScanResultsProps> = ({ status, loading }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [selectedHost, setSelectedHost] = useState<HostInfo | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('hosts');

  const handleHostClick = (host: HostInfo) => {
    setSelectedHost(host);
    setModalOpen(true);
  };

  const filteredHosts = useMemo(() => {
    if (!status) return [];
    let hosts = status.hosts;
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      hosts = hosts.filter(h =>
        h.ip.includes(s) || (h.hostname && h.hostname.toLowerCase().includes(s))
      );
    }
    if (filter !== 'all') {
      hosts = hosts.filter(h => h.status === filter);
    }
    return hosts;
  }, [status, search, filter]);

  const handleDownload = async (format: 'html' | 'docx' | 'pdf') => {
    if (!status) return;
    try {
      const res = await nmapApi.downloadReport(status.scan_id, format);
      const contentType = String(res.headers['content-type'] || 'application/octet-stream');
      const blob = new Blob([res.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `scan_${status.scan_id.slice(0,8)}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Не удалось скачать отчёт');
    }
  };

  if (loading && !status) {
    return (
      <IndustrialCard title="📡 РЕЗУЛЬТАТЫ">
        <ScanProgress status="pending" progress={0} summary="Инициализация..." />
      </IndustrialCard>
    );
  }

  if (!status) {
    return (
      <IndustrialCard title="РЕЗУЛЬТАТЫ">
        <p style={{ color: 'var(--color-text-muted)' }}>Результатов сканирования пока нет.</p>
      </IndustrialCard>
    );
  }

  const hostsUp = status.hosts.filter(h => h.status === 'up').length;
  const total = status.hosts.length;

  const tabs = [
    { id: 'hosts', label: `Хосты (${total})` },
    { id: 'topology', label: 'Топология' },
    { id: 'vulnerabilities', label: 'Уязвимости' },
  ];

  return (
    <IndustrialCard title="РЕЗУЛЬТАТЫ" variant="accent">
      <div className={styles.results}>
        <ScanProgress
          progress={status.progress || 0}
          status={status.status}
          summary={status.summary}
        />

        {status.status === 'done' && (
          <>
            <div className={styles.header}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <GlitchText text={`Хостов доступно: ${hostsUp} / ${total}`} />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <NeonButton size="sm" onClick={() => handleDownload('html')}>HTML</NeonButton>
                  <NeonButton size="sm" onClick={() => handleDownload('docx')}>DOCX</NeonButton>
                  <NeonButton size="sm" onClick={() => handleDownload('pdf')}>PDF</NeonButton>
                </div>
              </div>
            </div>

            <IndustrialTabs
              tabs={tabs}
              active={activeTab}
              onChange={(id) => setActiveTab(id as TabId)}
            />

            {activeTab === 'hosts' && (
              <>
                <div className={styles.controls}>
                  <NeonInput
                    label="Поиск"
                    value={search}
                    onChange={setSearch}
                    placeholder="IP или имя хоста..."
                    size="sm"
                  />
                  <NeonSelect
                    label="Статус"
                    options={[
                      { value: 'all', label: 'Все' },
                      { value: 'up', label: 'Доступны' },
                      { value: 'down', label: 'Недоступны' },
                    ]}
                    value={filter}
                    onChange={(v) => setFilter(v as FilterStatus)}
                  />
                </div>
                <div className={styles.gridContainer}>
                  {filteredHosts.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)' }}>Нет хостов, соответствующих фильтрам</p>
                  ) : (
                    <HostGrid hosts={filteredHosts} onHostClick={handleHostClick} />
                  )}
                </div>
              </>
            )}

            {activeTab === 'topology' && (
              <TopologyGraph
                hosts={status.hosts}
                scanId={status.scan_id}
                onNodeClick={handleHostClick}
              />
            )}

            {activeTab === 'vulnerabilities' && (
              <VulnerabilitiesList scanId={status.scan_id} />
            )}

            <HostDetailsModal
              open={modalOpen}
              host={selectedHost}
              onClose={() => setModalOpen(false)}
            />
          </>
        )}
      </div>
    </IndustrialCard>
  );
};