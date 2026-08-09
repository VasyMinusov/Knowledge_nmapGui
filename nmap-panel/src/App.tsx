// frontend/src/App.tsx
import React, { useState, useEffect } from 'react';
import {
  BackgroundEffects,
  ToastStack,
  GlitchText,
  NeonButton,
  IndustrialCard,
  IndustrialModal,
} from '@/components_kit';
import {
  VscServer,
  VscHistory,
  VscSettings,
  VscClockface,
  VscBook,
} from 'react-icons/vsc';
import type { Toast } from '@/components_kit/ToastNotification/ToastNotification.types';
import { ScanConfig } from './components/ScanConfig/ScanConfig';
import { ScanResults } from './components/ScanResults/ScanResults';
import { HistoryList } from './components/HistoryList/HistoryList';
import { PresetManager } from './components/PresetManager/PresetManager';
import { PresetFormModal } from './components/PresetFormModal/PresetFormModal';
import { ScheduleList } from './components/ScheduleList/ScheduleList';
import { ScheduleFormModal } from './components/ScheduleFormModal/ScheduleFormModal';
import { KnowledgeBase } from './components/KnowledgeBase/KnowledgeBase';
import { PortChecker } from './components/PortChecker/PortChecker';
import { ScanCompare } from './components/ScanCompare/ScanCompare';
import { CommandExplainer } from './components/CommandExplainer/CommandExplainer';
import { VulnerabilitiesList } from './components/VulnerabilitiesList/VulnerabilitiesList';
import { AnalyticsDashboard } from './components/AnalyticsDashboard/AnalyticsDashboard';

import { useScan } from './hooks/useScan';
import { nmapApi, type ScanHistoryItem, type Preset, type ScanRequest, type Schedule, type HostInfo } from './api/nmapApi';

type Screen = 'scan' | 'history' | 'presets' | 'schedules' | 'knowledge' | 'portcheck' | 'compare' | 'explainer' | 'vulns' | 'analytics';

const App: React.FC = () => {
  // --- Состояния ---
  const [screen, setScreen] = useState<Screen>('scan');
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Состояния для истории
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedScan, setSelectedScan] = useState<{
    scan: ScanHistoryItem;
    hosts: HostInfo[];
  } | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);

  // Состояния для пресетов
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetFormOpen, setPresetFormOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);

  // Состояния для расписаний
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  // Состояния для Port Check
  const [portCheckResults, setPortCheckResults] = useState<any>(null);
  const [portCheckLoading, setPortCheckLoading] = useState(false);

  // Хук для сканирования – передаём колбэк для перезагрузки истории
  const { startScan, cancelScan, status, loading } = useScan(() => {
    if (screen === 'history') loadHistory();
  });

  // --- Вспомогательные функции ---
  const addToast = (title: string, description?: string, variant?: Toast['variant']) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, title, description, variant: variant || 'accent' }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // --- Загрузка истории ---
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await nmapApi.getHistory();
      setHistory(res.data.scans);
    } catch (error) {
      addToast('Error', 'Failed to load history', 'danger');
    } finally {
      setHistoryLoading(false);
    }
  };

  // --- Загрузка пресетов ---
  const loadPresets = async () => {
    try {
      const res = await nmapApi.getPresets();
      setPresets(res.data.presets);
    } catch (error) {
      addToast('Error', 'Failed to load presets', 'danger');
    }
  };

  // --- Загрузка расписаний ---
  const loadSchedules = async () => {
    setSchedulesLoading(true);
    try {
      const res = await nmapApi.getSchedules();
      setSchedules(res.data.schedules);
    } catch (error) {
      addToast('Error', 'Failed to load schedules', 'danger');
    } finally {
      setSchedulesLoading(false);
    }
  };

  // Загрузка выбранного скана для просмотра
  const loadSelectedScan = async (scanId: string) => {
    setSelectedLoading(true);
    try {
      const [scanRes, hostsRes] = await Promise.all([
        nmapApi.getHistoryItem(scanId),
        nmapApi.getScanHosts(scanId),
      ]);
      setSelectedScan({
        scan: scanRes.data,
        hosts: hostsRes.data.hosts,
      });
    } catch (error) {
      addToast('Error', 'Failed to load scan details', 'danger');
    } finally {
      setSelectedLoading(false);
    }
  };

  // Загружаем данные при переключении экранов
  useEffect(() => {
    if (screen === 'history') {
      loadHistory();
    }
    if (screen === 'presets') {
      loadPresets();
    }
    if (screen === 'schedules') {
      loadSchedules();
    }
  }, [screen]);

  // --- Обработчики для истории ---
  const handleViewHistory = (scanId: string) => {
    loadSelectedScan(scanId);
  };

  const handleDeleteHistory = async (scanId: string) => {
    try {
      await nmapApi.deleteHistoryItem(scanId);
      addToast('Deleted', `Scan ${scanId} removed`, 'accent');
      loadHistory();
      if (selectedScan?.scan.scan_id === scanId) setSelectedScan(null);
    } catch (error) {
      addToast('Error', 'Failed to delete history item', 'danger');
    }
  };

  const handleCopyPreset = (item: ScanHistoryItem) => {
    let options = {};
    try {
      options = item.options ? JSON.parse(item.options) : {};
    } catch (e) { /* ignore */ }
    setEditingPreset({
      id: 0,
      name: `Preset from ${item.scan_id.slice(0, 8)}`,
      targets: item.targets,
      profile: item.profile,
      options: JSON.stringify(options),
      description: `Copied from scan ${item.scan_id}`,
      created_at: new Date().toISOString(),
    });
    setPresetFormOpen(true);
  };

  // --- Обработчики для пресетов ---
  const handleSelectPreset = (preset: Preset) => {
    setScreen('scan');
    addToast('Preset selected', `Loaded "${preset.name}"`, 'accent');
  };

  const handleEditPreset = (preset: Preset) => {
    setEditingPreset(preset);
    setPresetFormOpen(true);
  };

  const handleDeletePreset = async (id: number) => {
    try {
      await nmapApi.deletePreset(id);
      addToast('Deleted', 'Preset removed', 'accent');
      loadPresets();
    } catch (error) {
      addToast('Error', 'Failed to delete preset', 'danger');
    }
  };

  const handleSavePreset = async (data: any) => {
    try {
      if (editingPreset && editingPreset.id > 0) {
        await nmapApi.updatePreset(editingPreset.id, data);
        addToast('Updated', 'Preset updated', 'accent');
      } else {
        await nmapApi.createPreset(data);
        addToast('Created', 'Preset created', 'accent');
      }
      setPresetFormOpen(false);
      setEditingPreset(null);
      loadPresets();
    } catch (error) {
      addToast('Error', 'Failed to save preset', 'danger');
    }
  };

  // --- Обработчики для расписаний ---
  const handleViewSchedule = (schedule: Schedule) => {
    addToast('Info', `Schedule: ${schedule.name}`, 'accent');
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setScheduleFormOpen(true);
  };

  const handleDeleteSchedule = async (id: number) => {
    try {
      await nmapApi.deleteSchedule(id);
      addToast('Deleted', 'Schedule removed', 'accent');
      loadSchedules();
    } catch (error) {
      addToast('Error', 'Failed to delete schedule', 'danger');
    }
  };

  const handleRunScheduleNow = async (id: number) => {
    try {
      const res = await nmapApi.runScheduleNow(id);
      addToast('Schedule started', `Scan ID: ${res.data.scan_id}`, 'accent');
      loadSchedules();
    } catch (error) {
      addToast('Error', 'Failed to run schedule', 'danger');
    }
  };

  const handleSaveSchedule = async (data: any) => {
    try {
      if (editingSchedule && editingSchedule.id > 0) {
        await nmapApi.updateSchedule(editingSchedule.id, data);
        addToast('Updated', 'Schedule updated', 'accent');
      } else {
        await nmapApi.createSchedule(data);
        addToast('Created', 'Schedule created', 'accent');
      }
      setScheduleFormOpen(false);
      setEditingSchedule(null);
      loadSchedules();
    } catch (error) {
      addToast('Error', 'Failed to save schedule', 'danger');
    }
  };

  // --- Обработчики сканирования ---
  const handleStartScan = (params: ScanRequest) => {
    startScan(params);
    addToast('Scan started', 'Nmap is running...', 'accent');
  };

  const handleCancelScan = () => {
    cancelScan();
    addToast('Scan cancelled', 'The scan was stopped', 'warning');
  };

  // --- Обработчик Port Check ---
  const handlePortCheck = async (host: string, ports: number[]) => {
    setPortCheckLoading(true);
    try {
      const res = await nmapApi.checkPorts({ host, ports });
      setPortCheckResults(res.data);
      addToast('Port check completed', `Found ${res.data.summary.open} open ports`, 'accent');
    } catch (error) {
      addToast('Error', 'Port check failed', 'danger');
    } finally {
      setPortCheckLoading(false);
    }
  };

  // --- Обработчик скачивания отчёта ---
  const handleDownloadReport = async (scanId: string) => {
    const format = prompt('Enter format (html, docx, pdf):', 'html');
    if (!format || !['html', 'docx', 'pdf'].includes(format)) return;
    try {
      const res = await nmapApi.downloadReport(scanId, format as 'html' | 'docx' | 'pdf');
      const contentType = String(res.headers['content-type'] || 'application/octet-stream');
      const blob = new Blob([res.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `scan_${scanId.slice(0,8)}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('Report downloaded', `Format: ${format}`, 'accent');
    } catch (error) {
      addToast('Error', 'Failed to download report', 'danger');
    }
  };

  // --- Рендер экранов ---
  const renderScreen = () => {
    switch (screen) {
      case 'scan':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <ScanConfig onStart={handleStartScan} loading={loading} />
              {loading && status?.scan_id && (
                <div style={{ marginTop: '12px' }}>
                  <NeonButton variant="danger" size="md" onClick={handleCancelScan}>
                    CANCEL SCAN
                  </NeonButton>
                </div>
              )}
            </div>
            <IndustrialCard variant="accent">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <VscServer size={20} />
                <GlitchText text="SCAN RESULTS" />
              </div>
              <ScanResults status={status} loading={loading} />
            </IndustrialCard>
          </div>
        );

      case 'history':
        return (
          <IndustrialCard variant="accent">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <VscHistory size={20} />
              <GlitchText text="SCAN HISTORY" />
            </div>
            <HistoryList
              items={history}
              onView={handleViewHistory}
              onDelete={handleDeleteHistory}
              onCopyPreset={handleCopyPreset}
              onDownload={handleDownloadReport}
              loading={historyLoading}
            />
          </IndustrialCard>
        );

      case 'presets':
        return (
          <IndustrialCard variant="accent">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <VscSettings size={20} />
              <GlitchText text="PRESETS" />
            </div>
            <PresetManager
              presets={presets}
              onSelect={handleSelectPreset}
              onEdit={handleEditPreset}
              onDelete={handleDeletePreset}
              onCreate={() => {
                setEditingPreset(null);
                setPresetFormOpen(true);
              }}
            />
          </IndustrialCard>
        );

      case 'schedules':
        return (
          <IndustrialCard variant="accent">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <VscClockface size={20} />
              <GlitchText text="SCHEDULES" />
            </div>
            <ScheduleList
              schedules={schedules}
              onView={handleViewSchedule}
              onEdit={handleEditSchedule}
              onDelete={handleDeleteSchedule}
              onRun={handleRunScheduleNow}
              loading={schedulesLoading}
            />
            <div style={{ marginTop: '16px' }}>
              <NeonButton
                variant="primary"
                onClick={() => {
                  setEditingSchedule(null);
                  setScheduleFormOpen(true);
                }}
              >
                + ADD SCHEDULE
              </NeonButton>
            </div>
          </IndustrialCard>
        );

      case 'knowledge':
        return (
          <IndustrialCard variant="accent">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <VscBook size={20} />
              <GlitchText text="KNOWLEDGE BASE" />
            </div>
            <KnowledgeBase />
          </IndustrialCard>
        );

      case 'portcheck':
        return (
          <IndustrialCard variant="accent">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <VscServer size={20} />
              <GlitchText text="PORT CHECKER" />
            </div>
            <PortChecker
              onCheck={handlePortCheck}
              loading={portCheckLoading}
              results={portCheckResults}
            />
          </IndustrialCard>
        );

      case 'compare':
        return <ScanCompare />;

      case 'explainer':
        return <CommandExplainer />;

      case 'vulns':
        return <VulnerabilitiesList />;
      
      case 'analytics':
        return <AnalyticsDashboard />;

      default:
        return null;
    }
  };

  // --- Основной рендер ---
  return (
    <div className="machine-party-root" style={{ minHeight: '100vh', padding: '24px' }}>
      <BackgroundEffects />

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <GlitchText text="NMAP PANEL" />

        <div style={{ display: 'flex', gap: 12, marginBottom: 24, marginTop: 12, flexWrap: 'wrap' }}>
          <div style={screen === 'scan' ? { boxShadow: '0 0 20px var(--color-accent-neon)' } : {}}>
            <NeonButton variant="primary" onClick={() => setScreen('scan')}>Scan</NeonButton>
          </div>
          <div style={screen === 'history' ? { boxShadow: '0 0 20px var(--color-accent-neon)' } : {}}>
            <NeonButton variant="primary" onClick={() => setScreen('history')}>History</NeonButton>
          </div>
          <div style={screen === 'presets' ? { boxShadow: '0 0 20px var(--color-accent-neon)' } : {}}>
            <NeonButton variant="primary" onClick={() => setScreen('presets')}>Presets</NeonButton>
          </div>
          <div style={screen === 'schedules' ? { boxShadow: '0 0 20px var(--color-accent-neon)' } : {}}>
            <NeonButton variant="primary" onClick={() => setScreen('schedules')}>Schedules</NeonButton>
          </div>
          <div style={screen === 'knowledge' ? { boxShadow: '0 0 20px var(--color-accent-neon)' } : {}}>
            <NeonButton variant="primary" onClick={() => setScreen('knowledge')}>Knowledge</NeonButton>
          </div>
          <div style={screen === 'portcheck' ? { boxShadow: '0 0 20px var(--color-accent-neon)' } : {}}>
            <NeonButton variant="primary" onClick={() => setScreen('portcheck')}>Port Check</NeonButton>
          </div>
          <div style={screen === 'compare' ? { boxShadow: '0 0 20px var(--color-accent-neon)' } : {}}>
            <NeonButton variant="primary" onClick={() => setScreen('compare')}>Compare</NeonButton>
          </div>
          <div style={screen === 'explainer' ? { boxShadow: '0 0 20px var(--color-accent-neon)' } : {}}>
            <NeonButton variant="primary" onClick={() => setScreen('explainer')}>Explainer</NeonButton>
          </div>
          <div style={screen === 'vulns' ? { boxShadow: '0 0 20px var(--color-accent-neon)' } : {}}>
            <NeonButton variant="primary" onClick={() => setScreen('vulns')}>Vulns</NeonButton>
          </div>
          <div style={screen === 'analytics' ? { boxShadow: '0 0 20px var(--color-accent-neon)' } : {}}>
            <NeonButton variant="primary" onClick={() => setScreen('analytics')}>Analytics</NeonButton>
          </div>
        </div>

        {renderScreen()}
      </div>

      {/* Модалка для просмотра результатов из истории */}
      <IndustrialModal
        open={!!selectedScan}
        onClose={() => setSelectedScan(null)}
        title={selectedScan ? `Scan: ${selectedScan.scan.scan_id.slice(0, 8)}` : ''}
        variant="default"
      >
        {selectedScan && (
          <ScanResults
            status={{
              scan_id: selectedScan.scan.scan_id,
              status: selectedScan.scan.status as 'done' | 'error',
              hosts: selectedScan.hosts,
              summary: selectedScan.scan.summary || '',
              progress: 100,
            }}
            loading={selectedLoading}
          />
        )}
      </IndustrialModal>

      {/* Модалка для создания/редактирования пресета */}
      <PresetFormModal
        open={presetFormOpen}
        preset={editingPreset}
        onClose={() => {
          setPresetFormOpen(false);
          setEditingPreset(null);
        }}
        onSave={handleSavePreset}
      />

      {/* Модалка для создания/редактирования расписания */}
      <ScheduleFormModal
        open={scheduleFormOpen}
        schedule={editingSchedule}
        onClose={() => {
          setScheduleFormOpen(false);
          setEditingSchedule(null);
        }}
        onSave={handleSaveSchedule}
      />

      <ToastStack toasts={toasts} onDismiss={id => setToasts(prev => prev.filter(t => t.id !== id))} />
    </div>
  );
};

export default App;