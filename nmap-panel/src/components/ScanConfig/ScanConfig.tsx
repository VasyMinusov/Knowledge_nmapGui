// frontend/src/components/ScanConfig/ScanConfig.tsx
import React, { useState, useEffect } from 'react';
import {
  IndustrialCard,
  NeonInput,
  NeonSelect,
  NeonCheckbox,
  NeonButton,
  NeonTooltip,
  GlitchText,
} from '@/components_kit';
import { VscAdd, VscClearAll } from 'react-icons/vsc';
import type { ScanConfigProps } from './ScanConfig.types';
import { nmapApi, type Preset } from '@/api/nmapApi';
import styles from './ScanConfig.module.css';

const profiles = [
  { value: 'intense', label: 'Интенсивное ( -T4 -A -v )' },
  { value: 'quick', label: 'Быстрое ( -T4 -F )' },
  { value: 'ping', label: 'Ping-обход ( -sn )' },
  { value: 'custom', label: 'Пользовательский' },
];

export const ScanConfig: React.FC<ScanConfigProps> = ({ onStart, loading }) => {
  const [targets, setTargets] = useState('192.168.1.0/24');
  const [profile, setProfile] = useState('intense');
  const [osDetection, setOsDetection] = useState(false);
  const [versionDetection, setVersionDetection] = useState(false);
  const [traceroute, setTraceroute] = useState(false);
  const [scripts, setScripts] = useState('');
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<number | ''>('');

  // Загрузка пресетов
  useEffect(() => {
    const loadPresets = async () => {
      try {
        const res = await nmapApi.getPresets();
        setPresets(res.data.presets);
      } catch (err) {
        console.error('Не удалось загрузить пресеты:', err);
      }
    };
    loadPresets();
  }, []);

  // Применение выбранного пресета
  const applyPreset = (presetId: number) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;
    setTargets(preset.targets || '');
    setProfile(preset.profile);
    try {
      const opts = preset.options ? JSON.parse(preset.options) : {};
      setOsDetection(opts.os_detection || false);
      setVersionDetection(opts.version_detection || false);
      setTraceroute(opts.traceroute || false);
      setScripts(opts.scripts || '');
    } catch (e) {
      console.error('Не удалось разобрать опции пресета:', e);
    }
    setSelectedPresetId(presetId);
  };

  // Сброс формы
  const clearForm = () => {
    setTargets('');
    setProfile('intense');
    setOsDetection(false);
    setVersionDetection(false);
    setTraceroute(false);
    setScripts('');
    setSelectedPresetId('');
  };

  const handleSubmit = () => {
    if (!targets.trim()) return;
    onStart({
      targets: targets.trim(),
      profile,
      options: {
        os_detection: osDetection,
        version_detection: versionDetection,
        traceroute,
        scripts: scripts.trim() || undefined,
      },
    });
  };

  // Список пресетов для выпадающего меню
  const presetOptions = [
    { value: '', label: '— Выберите пресет —' },
    ...presets.map(p => ({ value: String(p.id), label: p.name })),
  ];

  return (
    <IndustrialCard variant="accent">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <VscAdd size={20} />
        <GlitchText text="НОВОЕ СКАНИРОВАНИЕ" />
      </div>
      <div className={styles.config}>
        {/* Выбор пресета */}
        <NeonSelect
          label="Загрузить пресет"
          options={presetOptions}
          value={selectedPresetId ? String(selectedPresetId) : ''}
          onChange={(val) => {
            const id = val ? Number(val) : '';
            if (id) applyPreset(id);
            else setSelectedPresetId('');
          }}
        />

        <NeonInput
          label="Цели"
          value={targets}
          onChange={setTargets}
          placeholder="например, 192.168.1.1-254, example.com"
          hint="IP, CIDR, диапазон, имя хоста"
        />

        <NeonSelect
          label="Профиль"
          options={profiles}
          value={profile}
          onChange={setProfile}
        />

        {profile === 'custom' && (
          <NeonInput
            label="Скрипты (--script)"
            value={scripts}
            onChange={setScripts}
            placeholder="например, default, safe, vuln"
          />
        )}

        <div className={styles.optionsRow}>
          <NeonTooltip content="Определить операционную систему (-O)">
            <NeonCheckbox
              checked={osDetection}
              onChange={setOsDetection}
              label="Определение ОС"
            />
          </NeonTooltip>
          <NeonTooltip content="Определить версии сервисов (-sV)">
            <NeonCheckbox
              checked={versionDetection}
              onChange={setVersionDetection}
              label="Определение версий"
            />
          </NeonTooltip>
          <NeonTooltip content="Трассировка маршрута (--traceroute)">
            <NeonCheckbox
              checked={traceroute}
              onChange={setTraceroute}
              label="Трассировка"
            />
          </NeonTooltip>
        </div>

        <div className={styles.buttonRow}>
          <NeonButton
            size="lg"
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || !targets.trim()}
          >
            {loading ? 'СКАНИРОВАНИЕ...' : '▶ ЗАПУСТИТЬ СКАНИРОВАНИЕ'}
          </NeonButton>
          <NeonButton
            size="lg"
            variant="primary"
            onClick={clearForm}
            disabled={loading}
          >
            <VscClearAll /> Очистить
          </NeonButton>
        </div>
      </div>
    </IndustrialCard>
  );
};