import type { HostInfo } from '@/api/nmapApi';
import type { AuditTool, AuditTaskStatus } from '@/api/nmapApi';

export interface AuditToolkitProps {
  scanId: string;
  hosts: HostInfo[];
  targets: string;
}

export interface AuditToolCardProps {
  tool: AuditTool;
  disabled: boolean;
  running: boolean;
  onRun: (toolId: string, options: Record<string, unknown>) => void;
}

export interface AuditTaskPanelProps {
  task: AuditTaskStatus;
  toolName: string;
  onCancel: (taskId: string) => void;
  onRemove: (taskId: string) => void;
}
