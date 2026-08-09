// src/components/PortChecker/PortChecker.types.ts
export interface PortCheckerProps {
  onCheck: (host: string, ports: number[]) => void;
  loading: boolean;
  results?: {
    host: string;
    results: Array<{
      port: number;
      state: 'open' | 'closed' | 'error';
      error?: string;
    }>;
    summary: {
      total: number;
      open: number;
      closed: number;
      error: number;
    };
  };
}