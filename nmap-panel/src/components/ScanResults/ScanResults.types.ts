import type { ScanStatus } from '@/api/nmapApi';

export interface ScanResultsProps {
  status: ScanStatus | null;
  loading: boolean;
}