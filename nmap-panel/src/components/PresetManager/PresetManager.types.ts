import type { Preset } from '@/api/nmapApi';

export interface PresetManagerProps {
  presets: Preset[];
  onSelect: (preset: Preset) => void;
  onEdit: (preset: Preset) => void;
  onDelete: (id: number) => void;
  onCreate: () => void;
}