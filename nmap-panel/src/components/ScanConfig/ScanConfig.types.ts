import type { ScanRequest } from '../../api/nmapApi';

export interface ScanConfigProps {
  onStart: (params: ScanRequest) => void;
  loading: boolean;
}