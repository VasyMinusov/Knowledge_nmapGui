import type { HostInfo } from '@/api/nmapApi';

export interface HostGridProps {
  hosts: HostInfo[];
  onHostClick: (host: HostInfo) => void;
}