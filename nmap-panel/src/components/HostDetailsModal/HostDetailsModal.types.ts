import type { HostInfo } from '@/api/nmapApi';

export interface HostDetailsModalProps {
  open: boolean;
  host: HostInfo | null;
  onClose: () => void;
}