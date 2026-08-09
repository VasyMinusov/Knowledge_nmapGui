import type { ScanHistoryItem } from '@/api/nmapApi';

export interface HistoryListProps {
  items: ScanHistoryItem[];
  onView: (scanId: string) => void;
  onDelete: (scanId: string) => void;
  onCopyPreset: (item: ScanHistoryItem) => void;
  loading: boolean;
  onDownload?: (scanId: string) => void;
}