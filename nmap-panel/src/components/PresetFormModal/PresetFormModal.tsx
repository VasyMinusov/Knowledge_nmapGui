import React, { useState, useEffect } from 'react';
import { IndustrialModal, NeonInput, NeonSelect, NeonCheckbox, NeonButton } from '@/components_kit';
import type { PresetFormModalProps } from './PresetFormModal.types';
import styles from './PresetFormModal.module.css';

const profiles = [
  { value: 'intense', label: 'Intense ( -T4 -A -v )' },
  { value: 'quick', label: 'Quick ( -T4 -F )' },
  { value: 'ping', label: 'Ping Sweep ( -sn )' },
  { value: 'custom', label: 'Custom' },
];

export const PresetFormModal: React.FC<PresetFormModalProps> = ({ open, preset, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [targets, setTargets] = useState('');
  const [profile, setProfile] = useState('intense');
  const [osDetection, setOsDetection] = useState(false);
  const [versionDetection, setVersionDetection] = useState(false);
  const [traceroute, setTraceroute] = useState(false);
  const [scripts, setScripts] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (preset) {
      setName(preset.name);
      setTargets(preset.targets || '');
      setProfile(preset.profile);
      const opts = preset.options ? JSON.parse(preset.options) : {};
      setOsDetection(opts.os_detection || false);
      setVersionDetection(opts.version_detection || false);
      setTraceroute(opts.traceroute || false);
      setScripts(opts.scripts || '');
      setDescription(preset.description || '');
    } else {
      setName('');
      setTargets('');
      setProfile('intense');
      setOsDetection(false);
      setVersionDetection(false);
      setTraceroute(false);
      setScripts('');
      setDescription('');
    }
  }, [preset, open]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      targets: targets.trim() || undefined,
      profile,
      options: {
        os_detection: osDetection,
        version_detection: versionDetection,
        traceroute,
        scripts: scripts.trim() || undefined,
      },
      description: description.trim() || undefined,
    });
    onClose();
  };

  return (
    <IndustrialModal
      open={open}
      onClose={onClose}
      title={preset ? 'Edit Preset' : 'Create Preset'}
      variant="default"
      footer={
        <>
          <NeonButton variant="danger" onClick={onClose}>Cancel</NeonButton>
          <NeonButton variant="primary" onClick={handleSave}>Save</NeonButton>
        </>
      }
    >
      <div className={styles.form}>
        <NeonInput label="Name" value={name} onChange={setName} placeholder="Preset name" />
        <NeonInput label="Targets (optional)" value={targets} onChange={setTargets} placeholder="e.g. 192.168.1.0/24" hint="Leave empty to enter later" />
        <NeonSelect label="Profile" options={profiles} value={profile} onChange={setProfile} />
        <div className={styles.optionsRow}>
          <NeonCheckbox checked={osDetection} onChange={setOsDetection} label="OS Detection" />
          <NeonCheckbox checked={versionDetection} onChange={setVersionDetection} label="Version Detection" />
          <NeonCheckbox checked={traceroute} onChange={setTraceroute} label="Traceroute" />
        </div>
        <NeonInput label="Scripts (optional)" value={scripts} onChange={setScripts} placeholder="e.g. default, safe" />
        <NeonInput label="Description (optional)" value={description} onChange={setDescription} placeholder="Brief description" />
      </div>
    </IndustrialModal>
  );
};