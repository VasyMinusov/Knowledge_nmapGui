import React, { useState, useEffect } from 'react';
import { IndustrialModal, NeonInput, NeonSelect, NeonCheckbox, NeonButton } from '@/components_kit';
import type { ScheduleFormModalProps } from './ScheduleFormModal.types';
import styles from './ScheduleFormModal.module.css';

const profiles = [
  { value: 'intense', label: 'Intense ( -T4 -A -v )' },
  { value: 'quick', label: 'Quick ( -T4 -F )' },
  { value: 'ping', label: 'Ping Sweep ( -sn )' },
  { value: 'custom', label: 'Custom' },
];

export const ScheduleFormModal: React.FC<ScheduleFormModalProps> = ({ open, schedule, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [targets, setTargets] = useState('');
  const [profile, setProfile] = useState('intense');
  const [cron, setCron] = useState('0 3 * * *');
  const [active, setActive] = useState(true);
  const [osDetection, setOsDetection] = useState(false);
  const [versionDetection, setVersionDetection] = useState(false);
  const [traceroute, setTraceroute] = useState(false);
  const [scripts, setScripts] = useState('');

  useEffect(() => {
    if (schedule) {
      setName(schedule.name);
      setTargets(schedule.targets);
      setProfile(schedule.profile);
      setCron(schedule.cron_expression);
      setActive(schedule.active);
      const opts = schedule.options ? JSON.parse(schedule.options) : {};
      setOsDetection(opts.os_detection || false);
      setVersionDetection(opts.version_detection || false);
      setTraceroute(opts.traceroute || false);
      setScripts(opts.scripts || '');
    } else {
      setName('');
      setTargets('');
      setProfile('intense');
      setCron('0 3 * * *');
      setActive(true);
      setOsDetection(false);
      setVersionDetection(false);
      setTraceroute(false);
      setScripts('');
    }
  }, [schedule, open]);

  const handleSave = () => {
    if (!name.trim() || !targets.trim() || !cron.trim()) return;
    onSave({
      name: name.trim(),
      targets: targets.trim(),
      profile,
      options: {
        os_detection: osDetection,
        version_detection: versionDetection,
        traceroute,
        scripts: scripts.trim() || undefined,
      },
      cron_expression: cron.trim(),
      active,
    });
    onClose();
  };

  return (
    <IndustrialModal
      open={open}
      onClose={onClose}
      title={schedule ? 'Edit Schedule' : 'Create Schedule'}
      variant="default"
      footer={
        <>
          <NeonButton variant="danger" onClick={onClose}>Cancel</NeonButton>
          <NeonButton variant="primary" onClick={handleSave}>Save</NeonButton>
        </>
      }
    >
      <div className={styles.form}>
        <NeonInput label="Name" value={name} onChange={setName} placeholder="Schedule name" />
        <NeonInput label="Targets" value={targets} onChange={setTargets} placeholder="e.g. 192.168.1.0/24" />
        <NeonSelect label="Profile" options={profiles} value={profile} onChange={setProfile} />
        <NeonInput label="Cron Expression" value={cron} onChange={setCron} placeholder="e.g. 0 3 * * *" />
        <div className={styles.hint}>Format: minute hour day month day_of_week (e.g., 0 3 * * * for daily at 3:00 AM)</div>
        <div className={styles.optionsRow}>
          <NeonCheckbox checked={osDetection} onChange={setOsDetection} label="OS Detection" />
          <NeonCheckbox checked={versionDetection} onChange={setVersionDetection} label="Version Detection" />
          <NeonCheckbox checked={traceroute} onChange={setTraceroute} label="Traceroute" />
        </div>
        <NeonInput label="Scripts (optional)" value={scripts} onChange={setScripts} placeholder="e.g. default, safe" />
        <NeonCheckbox checked={active} onChange={setActive} label="Active" />
      </div>
    </IndustrialModal>
  );
};