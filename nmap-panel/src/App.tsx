// src/App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  BackgroundEffects,
  ToastStack,
  GlitchText,
  NeonButton,
  IndustrialCard,
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
import { ScanDetailsPage } from './page/ScanDetailsPage/ScanDetailsPage';
import { useScan } from './hooks/useScan';
import { nmapApi, type ScanHistoryItem, type Preset, type ScanRequest, type Schedule } from './api/nmapApi';
import { useTheme } from './context/ThemeContext';

type Screen =
  | 'scan'
  | 'history'
  | 'presets'
  | 'schedules'
  | 'knowledge'
  | 'portcheck'
  | 'compare'
  | 'explainer'
  | 'vulns'
  | 'analytics';

const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  const [screen, setScreen] = useState<Screen>('scan');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);

  // История
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Пресеты
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetFormOpen, setPresetFormOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);

  // Расписания
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  // Port Check
  const [portCheckResults, setPortCheckResults] = useState<any>(null);
  const [portCheckLoading, setPortCheckLoading] = useState(false);

  const { startScan, cancelScan, status, loading } = useScan(() => {
    if (screen === 'history') loadHistory();
  });

  const addToast = useCallback((title: string, description?: string, variant?: Toast['variant']) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, title, description, variant: variant || 'accent' }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await nmapApi.getHistory();
      setHistory(res.data.scans);
    } catch {
      addToast('Ошибка', 'Не удалось загрузить историю', 'danger');
    } finally {
      setHistoryLoading(false);
    }
  }, [addToast]);

  const loadPresets = useCallback(async () => {
    try {
      const res = await nmapApi.getPresets();
      setPresets(res.data.presets);
    } catch {
      addToast('Ошибка', 'Не удалось загрузить пресеты', 'danger');
    }
  }, [addToast]);

  const loadSchedules = useCallback(async () => {
    setSchedulesLoading(true);
    try {
      const res = await nmapApi.getSchedules();
      setSchedules(res.data.schedules);
    } catch {
      addToast('Ошибка', 'Не удалось загрузить расписания', 'danger');
    } finally {
      setSchedulesLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (screen === 'history') loadHistory();
    if (screen === 'presets') loadPresets();
    if (screen === 'schedules') loadSchedules();
  }, [screen, loadHistory, loadPresets, loadSchedules]);

  // --- Обработчики ---
  const handleViewHistory = useCallback((scanId: string) => {
    setSelectedScanId(scanId);
  }, []);

  const handleDeleteHistory = useCallback(async (scanId: string) => {
    try {
      await nmapApi.deleteHistoryItem(scanId);
      addToast('Удалено', `Скан ${scanId} удалён`, 'accent');
      loadHistory();
    } catch {
      addToast('Ошибка', 'Не удалось удалить запись', 'danger');
    }
  }, [addToast, loadHistory]);

  const handleCopyPreset = useCallback((item: ScanHistoryItem) => {
    let options = {};
    try { options = item.options ? JSON.parse(item.options) : {}; } catch {}
    setEditingPreset({
      id: 0,
      name: `Пресет из ${item.scan_id.slice(0, 8)}`,
      targets: item.targets,
      profile: item.profile,
      options: JSON.stringify(options),
      description: `Скопировано из скана ${item.scan_id}`,
      created_at: new Date().toISOString(),
    });
    setPresetFormOpen(true);
  }, []);

  const handleDownloadReport = useCallback(async (scanId: string) => {
    const format = prompt('Введите формат (html, docx, pdf):', 'html');
    if (!format || !['html', 'docx', 'pdf'].includes(format)) return;
    try {
      const res = await nmapApi.downloadReport(scanId, format as 'html' | 'docx' | 'pdf');
      const blob = new Blob([res.data], { type: String(res.headers['content-type'] || 'application/octet-stream') });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `scan_${scanId.slice(0,8)}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('Отчёт скачан', `Формат: ${format}`, 'accent');
    } catch {
      addToast('Ошибка', 'Не удалось скачать отчёт', 'danger');
    }
  }, [addToast]);

  // --- Остальные обработчики (пресеты, расписания, сканирование, порт-чек) ---
  // (они такие же, как в предыдущей версии, просто копируем)
  const handleSelectPreset = useCallback((preset: Preset) => {
    setScreen('scan');
    addToast('Пресет выбран', `Загружен "${preset.name}"`, 'accent');
  }, [addToast]);

  const handleEditPreset = useCallback((preset: Preset) => {
    setEditingPreset(preset);
    setPresetFormOpen(true);
  }, []);

  const handleDeletePreset = useCallback(async (id: number) => {
    try {
      await nmapApi.deletePreset(id);
      addToast('Удалено', 'Пресет удалён', 'accent');
      loadPresets();
    } catch {
      addToast('Ошибка', 'Не удалось удалить пресет', 'danger');
    }
  }, [addToast, loadPresets]);

  const handleSavePreset = useCallback(async (data: any) => {
    try {
      if (editingPreset && editingPreset.id > 0) {
        await nmapApi.updatePreset(editingPreset.id, data);
        addToast('Обновлено', 'Пресет обновлён', 'accent');
      } else {
        await nmapApi.createPreset(data);
        addToast('Создано', 'Пресет создан', 'accent');
      }
      setPresetFormOpen(false);
      setEditingPreset(null);
      loadPresets();
    } catch {
      addToast('Ошибка', 'Не удалось сохранить пресет', 'danger');
    }
  }, [addToast, editingPreset, loadPresets]);

  const handleViewSchedule = useCallback((schedule: Schedule) => {
    addToast('Информация', `Расписание: ${schedule.name}`, 'accent');
  }, [addToast]);

  const handleEditSchedule = useCallback((schedule: Schedule) => {
    setEditingSchedule(schedule);
    setScheduleFormOpen(true);
  }, []);

  const handleDeleteSchedule = useCallback(async (id: number) => {
    try {
      await nmapApi.deleteSchedule(id);
      addToast('Удалено', 'Расписание удалено', 'accent');
      loadSchedules();
    } catch {
      addToast('Ошибка', 'Не удалось удалить расписание', 'danger');
    }
  }, [addToast, loadSchedules]);

  const handleRunScheduleNow = useCallback(async (id: number) => {
    try {
      const res = await nmapApi.runScheduleNow(id);
      addToast('Расписание запущено', `ID скана: ${res.data.scan_id}`, 'accent');
      loadSchedules();
    } catch {
      addToast('Ошибка', 'Не удалось запустить расписание', 'danger');
    }
  }, [addToast, loadSchedules]);

  const handleSaveSchedule = useCallback(async (data: any) => {
    try {
      if (editingSchedule && editingSchedule.id > 0) {
        await nmapApi.updateSchedule(editingSchedule.id, data);
        addToast('Обновлено', 'Расписание обновлено', 'accent');
      } else {
        await nmapApi.createSchedule(data);
        addToast('Создано', 'Расписание создано', 'accent');
      }
      setScheduleFormOpen(false);
      setEditingSchedule(null);
      loadSchedules();
    } catch {
      addToast('Ошибка', 'Не удалось сохранить расписание', 'danger');
    }
  }, [addToast, editingSchedule, loadSchedules]);

  const handleStartScan = useCallback((params: ScanRequest) => {
    startScan(params);
    addToast('Сканирование запущено', 'Nmap выполняется...', 'accent');
  }, [startScan, addToast]);

  const handleCancelScan = useCallback(() => {
    cancelScan();
    addToast('Сканирование отменено', 'Процесс остановлен', 'warning');
  }, [cancelScan, addToast]);

  const handlePortCheck = useCallback(async (host: string, ports: number[]) => {
    setPortCheckLoading(true);
    try {
      const res = await nmapApi.checkPorts({ host, ports });
      setPortCheckResults(res.data);
      addToast('Проверка портов завершена', `Найдено ${res.data.summary.open} открытых портов`, 'accent');
    } catch {
      addToast('Ошибка', 'Не удалось проверить порты', 'danger');
    } finally {
      setPortCheckLoading(false);
    }
  }, [addToast]);

  // --- Рендер ---
  const renderScreen = useCallback(() => {
    switch (screen) {
      case 'scan':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <ScanConfig onStart={handleStartScan} loading={loading} />
              {loading && status?.scan_id && (
                <div style={{ marginTop: '12px' }}>
                  <NeonButton variant="danger" size="md" onClick={handleCancelScan}>
                    ОТМЕНИТЬ СКАНИРОВАНИЕ
                  </NeonButton>
                </div>
              )}
            </div>
            <IndustrialCard variant="accent">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <VscServer size={20} />
                <GlitchText text="РЕЗУЛЬТАТЫ СКАНИРОВАНИЯ" />
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
              <GlitchText text="ИСТОРИЯ СКАНИРОВАНИЙ" />
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
              <GlitchText text="ПРЕСЕТЫ" />
            </div>
            <PresetManager
              presets={presets}
              onSelect={handleSelectPreset}
              onEdit={handleEditPreset}
              onDelete={handleDeletePreset}
              onCreate={() => { setEditingPreset(null); setPresetFormOpen(true); }}
            />
          </IndustrialCard>
        );
      case 'schedules':
        return (
          <IndustrialCard variant="accent">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <VscClockface size={20} />
              <GlitchText text="РАСПИСАНИЯ" />
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
              <NeonButton variant="primary" onClick={() => { setEditingSchedule(null); setScheduleFormOpen(true); }}>
                + ДОБАВИТЬ РАСПИСАНИЕ
              </NeonButton>
            </div>
          </IndustrialCard>
        );
      case 'knowledge':
        return (
          <IndustrialCard variant="accent">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <VscBook size={20} />
              <GlitchText text="БАЗА ЗНАНИЙ" />
            </div>
            <KnowledgeBase />
          </IndustrialCard>
        );
      case 'portcheck':
        return (
          <IndustrialCard variant="accent">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <VscServer size={20} />
              <GlitchText text="ПРОВЕРКА ПОРТОВ" />
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
  }, [screen, loading, status, history, historyLoading, presets, schedules, schedulesLoading,
      portCheckResults, portCheckLoading, handleStartScan, handleCancelScan, handleViewHistory,
      handleDeleteHistory, handleCopyPreset, handleDownloadReport, handleSelectPreset,
      handleEditPreset, handleDeletePreset, handleViewSchedule, handleEditSchedule,
      handleDeleteSchedule, handleRunScheduleNow, handlePortCheck]);

  // Если выбран скан – показываем страницу деталей
  if (selectedScanId) {
    return (
      <div className="machine-party-root" style={{ minHeight: '100vh', padding: '24px' }}>
        <BackgroundEffects />
        <ScanDetailsPage scanId={selectedScanId} onClose={() => setSelectedScanId(null)} />
        <ToastStack toasts={toasts} onDismiss={id => setToasts(prev => prev.filter(t => t.id !== id))} />
      </div>
    );
  }

  // Основной интерфейс
  return (
    <div className="machine-party-root" style={{ minHeight: '100vh', padding: '24px' }}>
      <BackgroundEffects />
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <GlitchText text="ПАНЕЛЬ NMAP" />
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <NeonButton variant="primary" onClick={toggleTheme} size="sm">
              {theme === 'green' ? '🟢 Зелёная' : '🟡 Жёлтая'}
            </NeonButton>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 24, marginTop: 12, flexWrap: 'wrap' }}>
          {['scan','history','presets','schedules','knowledge','portcheck','compare','explainer','vulns','analytics'].map((s) => (
            <div key={s} style={screen === s ? { boxShadow: '0 0 20px var(--color-accent-neon)' } : {}}>
              <NeonButton variant="primary" onClick={() => setScreen(s as Screen)}>
                {s === 'scan' && 'Сканирование'}
                {s === 'history' && 'История'}
                {s === 'presets' && 'Пресеты'}
                {s === 'schedules' && 'Расписания'}
                {s === 'knowledge' && 'База знаний'}
                {s === 'portcheck' && 'Проверка портов'}
                {s === 'compare' && 'Сравнение'}
                {s === 'explainer' && 'Объяснитель'}
                {s === 'vulns' && 'Уязвимости'}
                {s === 'analytics' && 'Аналитика'}
              </NeonButton>
            </div>
          ))}
        </div>

        {renderScreen()}
      </div>

      <PresetFormModal
        open={presetFormOpen}
        preset={editingPreset}
        onClose={() => { setPresetFormOpen(false); setEditingPreset(null); }}
        onSave={handleSavePreset}
      />
      <ScheduleFormModal
        open={scheduleFormOpen}
        schedule={editingSchedule}
        onClose={() => { setScheduleFormOpen(false); setEditingSchedule(null); }}
        onSave={handleSaveSchedule}
      />
      <ToastStack toasts={toasts} onDismiss={id => setToasts(prev => prev.filter(t => t.id !== id))} />
    </div>
  );
};

export default App;