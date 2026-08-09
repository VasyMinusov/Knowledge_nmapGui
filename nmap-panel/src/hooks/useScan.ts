// frontend/src/hooks/useScan.ts
import { useState, useEffect, useRef } from 'react';
import { nmapApi } from '../api/nmapApi';
import type { ScanRequest, ScanStatus } from '../api/nmapApi';

export const useScan = (onComplete?: () => void) => {
  const [scanId, setScanId] = useState<string | null>(null);
  const [status, setStatus] = useState<ScanStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const startScan = async (params: ScanRequest) => {
    setLoading(true);
    try {
      const res = await nmapApi.startScan(params);
      const id = res.data.scan_id;
      setScanId(id);
      if (pollInterval.current) clearInterval(pollInterval.current);
      pollInterval.current = setInterval(() => pollStatus(id), 2000);
    } catch (error) {
      console.error('Failed to start scan', error);
      setLoading(false);
    }
  };

  const pollStatus = async (id: string) => {
    try {
      const res = await nmapApi.getStatus(id);
      setStatus(res.data);
      setLoading(false);
      if (res.data.status === 'done' || res.data.status === 'error') {
        if (pollInterval.current) {
          clearInterval(pollInterval.current);
          pollInterval.current = null;
        }
        onComplete?.(); // вызываем обновление истории
      }
    } catch (error) {
      // игнорируем ошибки опроса
    }
  };

  const cancelScan = async () => {
    if (!scanId) return;
    try {
      await nmapApi.cancelScan(scanId);
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }
      setLoading(false);
    } catch (error) {
      console.error('Cancel failed', error);
    }
  };

  useEffect(() => {
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, []);

  return { startScan, cancelScan, status, loading };
};