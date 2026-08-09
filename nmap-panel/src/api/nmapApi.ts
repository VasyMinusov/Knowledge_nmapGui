// frontend/src/api/nmapApi.ts
import axios from 'axios';

const SCAN_BASE = 'http://localhost:5000/api/scan';
const SCHEDULE_BASE = 'http://localhost:5000/api/schedule';
const KNOWLEDGE_BASE = 'http://localhost:5000/api/knowledge';
const PORT_CHECK_BASE = 'http://localhost:5000/api/port-check';

// --- Типы для сканирования ---
export interface ScanOptions {
  os_detection?: boolean;
  version_detection?: boolean;
  traceroute?: boolean;
  scripts?: string;
  timing?: number;
}

export interface ScanRequest {
  targets: string;
  profile: string;  // 'intense' | 'quick' | 'ping' | 'custom'
  options?: ScanOptions;
}

export interface PortInfo {
  port: number;
  protocol: string;
  state: string;
  service?: string;
  version?: string;
}

export interface HostInfo {
  ip: string;
  hostname?: string;
  status: string; // 'up' | 'down'
  ports: PortInfo[];
  os?: string;
  uptime?: string;
}

export interface ScanStatus {
  scan_id: string;
  status: 'pending' | 'running' | 'done' | 'error';
  progress?: number;
  hosts: HostInfo[];
  summary?: string;
}

export interface ScanHistoryItem {
  id: number;
  scan_id: string;
  targets: string;
  profile: string;
  options: string; // JSON
  status: string;
  start_time: string;
  end_time?: string;
  result_path?: string;
  summary?: string;
}

export interface Preset {
  id: number;
  name: string;
  targets?: string;
  profile: string;
  options?: string; // JSON
  description?: string;
  created_at: string;
}

export interface Schedule {
  id: number;
  name: string;
  targets: string;
  profile: string;
  options?: string; // JSON
  cron_expression: string;
  active: boolean;
  created_at: string;
  last_run?: string;
  last_scan_id?: string;
}

export interface KnowledgeOption {
  id: string;
  category: string;
  flag: string;
  name: string;
  description: string;
  example: string;
  use_case: string;
}

export interface PortCheckRequest {
  host: string;
  ports: number[];
  timeout?: number;
}

export interface PortCheckResult {
  port: number;
  state: 'open' | 'closed' | 'error';
  error?: string;
}

export interface PortCheckResponse {
  host: string;
  results: PortCheckResult[];
  summary: {
    total: number;
    open: number;
    closed: number;
    error: number;
  };
}

// --- API вызовы ---
export const nmapApi = {
  // Сканирование
  startScan: (params: ScanRequest) => axios.post<{ scan_id: string }>(`${SCAN_BASE}/start`, params),
  getStatus: (scanId: string) => axios.get<ScanStatus>(`${SCAN_BASE}/${scanId}/status`),
  cancelScan: (scanId: string) => axios.post(`${SCAN_BASE}/${scanId}/cancel`),

  // История
  getHistory: (limit = 50, offset = 0) =>
    axios.get<{ scans: ScanHistoryItem[] }>(`${SCAN_BASE}/history?limit=${limit}&offset=${offset}`),
  getHistoryItem: (scanId: string) =>
    axios.get<ScanHistoryItem>(`${SCAN_BASE}/history/${scanId}`),
  deleteHistoryItem: (scanId: string) =>
    axios.delete(`${SCAN_BASE}/history/${scanId}`),
  getScanHosts: (scanId: string) =>  // НОВЫЙ МЕТОД
    axios.get<{ hosts: HostInfo[] }>(`${SCAN_BASE}/history/${scanId}/hosts`),

  // Пресеты
  getPresets: () =>
    axios.get<{ presets: Preset[] }>(`${SCAN_BASE}/presets`),
  getPreset: (id: number) =>
    axios.get<Preset>(`${SCAN_BASE}/presets/${id}`),
  createPreset: (data: { name: string; targets?: string; profile: string; options?: any; description?: string }) =>
    axios.post(`${SCAN_BASE}/presets`, data),
  updatePreset: (id: number, data: { name: string; targets?: string; profile: string; options?: any; description?: string }) =>
    axios.put(`${SCAN_BASE}/presets/${id}`, data),
  deletePreset: (id: number) =>
    axios.delete(`${SCAN_BASE}/presets/${id}`),

  // Расписания
  getSchedules: () =>
    axios.get<{ schedules: Schedule[] }>(`${SCHEDULE_BASE}/`),
  getSchedule: (id: number) =>
    axios.get<Schedule>(`${SCHEDULE_BASE}/${id}`),
  createSchedule: (data: any) =>
    axios.post(`${SCHEDULE_BASE}/`, data),
  updateSchedule: (id: number, data: any) =>
    axios.put(`${SCHEDULE_BASE}/${id}`, data),
  deleteSchedule: (id: number) =>
    axios.delete(`${SCHEDULE_BASE}/${id}`),
  runScheduleNow: (id: number) =>
    axios.post(`${SCHEDULE_BASE}/${id}/run`),

  // Knowledge Base
  getKnowledgeOptions: () => 
    axios.get<KnowledgeOption[]>(`${KNOWLEDGE_BASE}/options`),
  getKnowledgeCategories: () => 
    axios.get<string[]>(`${KNOWLEDGE_BASE}/categories`),

  explainCommand: (command: string) =>
    axios.post<{ command: string; summary: string; flags: any[] }>(
        `${KNOWLEDGE_BASE}/explain`,
        { command }
    ),
  
  // Port Check
  checkPorts: (data: PortCheckRequest) => 
    axios.post<PortCheckResponse>(`${PORT_CHECK_BASE}/check`, data),

  // Report generation
  downloadReport: (scanId: string, format: 'html' | 'docx' | 'pdf') =>
    axios.get(`${SCAN_BASE}/${scanId}/report?format=${format}`, {
      responseType: 'blob',
    }),

  // Compare
  compareScans: (scanId1: string, scanId2: string) =>
    axios.post<{ scan1: any; scan2: any; diff: any }>(`${SCAN_BASE}/compare`, {
        scan_id_1: scanId1,
        scan_id_2: scanId2,
    }),

  getTopology: (scanId: string) =>
    axios.get<{ nodes: any[]; edges: any[] }>(`${SCAN_BASE}/topology/${scanId}`),

  // Vuln
  getVulnerabilities: (scanId: string) =>
    axios.get<{ scan_id: string; vulnerabilities: any[] }>(
        `${SCAN_BASE}/vulnerabilities/scan/${scanId}`
    ),
  getAllVulnerabilities: (limit = 100, offset = 0) =>
    axios.get<{ vulnerabilities: any[]; limit: number; offset: number }>(
        `${SCAN_BASE}/vulnerabilities/all?limit=${limit}&offset=${offset}`
    ),
  getVulnerabilityStats: () =>
    axios.get<{ total: number; unique_cves: number; avg_cvss: number; high: number; medium: number; low: number }>(
        `${SCAN_BASE}/vulnerabilities/stats`
    ),

  // Analytics
  getAnalyticsOverview: () =>
    axios.get<{
        total_scans: number;
        total_hosts: number;
        total_open_ports: number;
        total_vulnerabilities: number;
        unique_cves: number;
    }>(`${SCAN_BASE}/analytics/overview`),

  getTopServices: (limit = 10) =>
    axios.get<{ service: string; count: number }[]>(`${SCAN_BASE}/analytics/services?limit=${limit}`),

  getOSDistribution: () =>
    axios.get<{ os: string; count: number }[]>(`${SCAN_BASE}/analytics/os`),

  getTopPorts: (limit = 10) =>
    axios.get<{ port: number; protocol: string; count: number }[]>(`${SCAN_BASE}/analytics/ports?limit=${limit}`),

  getTimeline: (days = 30) =>
    axios.get<{ date: string; hosts: number; ports: number }[]>(`${SCAN_BASE}/analytics/timeline?days=${days}`),
};