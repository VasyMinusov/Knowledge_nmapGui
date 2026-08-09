import type { Schedule } from '@/api/nmapApi';

export interface ScheduleFormModalProps {
  open: boolean;
  schedule: Schedule | null; // null для создания
  onClose: () => void;
  onSave: (data: any) => void;
}