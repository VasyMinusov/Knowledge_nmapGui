import type { Preset } from '@/api/nmapApi';

export interface PresetFormModalProps {
  open: boolean;
  preset: Preset | null; // null для создания
  onClose: () => void;
  onSave: (data: any) => void;
}