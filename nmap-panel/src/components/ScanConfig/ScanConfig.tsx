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
  { value: 'intense', label: 'Intense ( -T4 -A -v )' },
  { value: 'quick', label: 'Quick ( -T4 -F )' },
  { value: 'ping', label: 'Ping Sweep ( -sn )' },
  { value: 'custom', label: 'Custom' },
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
        console.error('Failed to load presets:', err);
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
      console.error('Failed to parse preset options:', e);
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
    { value: '', label: '— Select preset —' },
    ...presets.map(p => ({ value: String(p.id), label: p.name })),
  ];

  return (
    <IndustrialCard variant="accent">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <VscAdd size={20} />
        <GlitchText text="NEW SCAN" />
      </div>
      <div className={styles.config}>
        {/* Выбор пресета */}
        <NeonSelect
          label="Load Preset"
          options={presetOptions}
          value={selectedPresetId ? String(selectedPresetId) : ''}
          onChange={(val) => {
            const id = val ? Number(val) : '';
            if (id) applyPreset(id);
            else setSelectedPresetId('');
          }}
        />

        <NeonInput
          label="Targets"
          value={targets}
          onChange={setTargets}
          placeholder="e.g. 192.168.1.1-254, example.com"
          hint="IP, CIDR, range, hostname"
        />

        <NeonSelect
          label="Profile"
          options={profiles}
          value={profile}
          onChange={setProfile}
        />

        {profile === 'custom' && (
          <NeonInput
            label="Scripts (--script)"
            value={scripts}
            onChange={setScripts}
            placeholder="e.g. default, safe, vuln"
          />
        )}

        <div className={styles.optionsRow}>
          <NeonTooltip content="Detect operating system (-O)">
            <NeonCheckbox
              checked={osDetection}
              onChange={setOsDetection}
              label="OS Detection"
            />
          </NeonTooltip>
          <NeonTooltip content="Detect service versions (-sV)">
            <NeonCheckbox
              checked={versionDetection}
              onChange={setVersionDetection}
              label="Version Detection"
            />
          </NeonTooltip>
          <NeonTooltip content="Trace route (--traceroute)">
            <NeonCheckbox
              checked={traceroute}
              onChange={setTraceroute}
              label="Traceroute"
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
            {loading ? 'SCANNING...' : '▶ START SCAN'}
          </NeonButton>
          <NeonButton
            size="lg"
            variant="primary"
            onClick={clearForm}
            disabled={loading}
          >
            <VscClearAll /> Clear
          </NeonButton>
        </div>
      </div>
    </IndustrialCard>
  );
};