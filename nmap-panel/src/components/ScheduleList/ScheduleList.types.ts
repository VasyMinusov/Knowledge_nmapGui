import type { Schedule } from '@/api/nmapApi';

export interface ScheduleListProps {
  schedules: Schedule[];
  onView: (schedule: Schedule) => void;
  onEdit: (schedule: Schedule) => void;
  onDelete: (id: number) => void;
  onRun: (id: number) => void;
  loading: boolean;
}