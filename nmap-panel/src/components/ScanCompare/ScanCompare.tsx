// src/components/ScanCompare/ScanCompare.tsx
import React, { useState, useEffect } from 'react';
import {
  IndustrialCard,
  GlitchText,
  NeonSelect,
  NeonButton,
  NeonSpinner,
  StatusBadge,
} from '@/components_kit';
import { nmapApi, type ScanHistoryItem } from '@/api/nmapApi';
import styles from './ScanCompare.module.css';

interface DiffHost {
  ip: string;
  hostname?: string;
  status?: string;
  os?: string;
  uptime?: number;
  ports?: any[];
}

interface DiffResult {
  added: DiffHost[];
  removed: DiffHost[];
  modified: Array<{
    ip: string;
    changes: any;
    host1: DiffHost;
    host2: DiffHost;
  }>;
}

export const ScanCompare: React.FC = () => {
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [scan1Id, setScan1Id] = useState<string>('');
  const [scan2Id, setScan2Id] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | { scan1: any; scan2: any; diff: DiffResult }>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await nmapApi.getHistory(100, 0);
      setHistory(res.data.scans);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompare = async () => {
    if (!scan1Id || !scan2Id) return;
    setLoading(true);
    try {
      const res = await nmapApi.compareScans(scan1Id, scan2Id);
      setResult(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const scanOptions = history.map((s) => ({
    value: s.scan_id,
    label: `${s.scan_id.slice(0, 8)} - ${s.targets} (${new Date(s.start_time).toLocaleString()})`,
  }));

  return (
    <IndustrialCard variant="accent">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <GlitchText text="COMPARE SCANS" />
      </div>
      <div className={styles.selector}>
        <NeonSelect
          label="First scan"
          options={scanOptions}
          value={scan1Id}
          onChange={setScan1Id}
        />
        <NeonSelect
          label="Second scan"
          options={scanOptions}
          value={scan2Id}
          onChange={setScan2Id}
        />
        <NeonButton
          variant="primary"
          size="md"
          onClick={handleCompare}
          disabled={!scan1Id || !scan2Id || loading}
        >
          {loading ? <NeonSpinner size={24} /> : 'COMPARE'}
        </NeonButton>
      </div>

      {result && (
        <div className={styles.results}>
          <div className={styles.summary}>
            <GlitchText text={`Added: ${result.diff.added.length} | Removed: ${result.diff.removed.length} | Modified: ${result.diff.modified.length}`} />
          </div>

          {result.diff.added.length > 0 && (
            <div>
              <h3 className={styles.sectionTitle}>Added hosts</h3>
              <div className={styles.hostList}>
                {result.diff.added.map((h) => (
                  <div key={h.ip} className={styles.hostCard}>
                    <span className={styles.ip}>{h.ip}</span>
                    {h.hostname && <span className={styles.hostname}>{h.hostname}</span>}
                    <StatusBadge label="up" variant="accent" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.diff.removed.length > 0 && (
            <div>
              <h3 className={styles.sectionTitle}>Removed hosts</h3>
              <div className={styles.hostList}>
                {result.diff.removed.map((h) => (
                  <div key={h.ip} className={styles.hostCard}>
                    <span className={styles.ip}>{h.ip}</span>
                    {h.hostname && <span className={styles.hostname}>{h.hostname}</span>}
                    <StatusBadge label="down" variant="muted" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.diff.modified.length > 0 && (
            <div>
              <h3 className={styles.sectionTitle}>Modified hosts</h3>
              {result.diff.modified.map((m) => (
                <div key={m.ip} className={styles.modifiedCard}>
                  <div className={styles.modifiedHeader}>
                    <span className={styles.ip}>{m.ip}</span>
                    <span className={styles.changesSummary}>
                      {m.changes.status && `Status: ${m.changes.status.old} → ${m.changes.status.new} `}
                      {m.changes.os && `OS: ${m.changes.os.old} → ${m.changes.os.new} `}
                      {m.changes.ports && `Ports: +${m.changes.ports.added.length} -${m.changes.ports.removed.length}`}
                    </span>
                  </div>
                  {m.changes.ports && (
                    <div className={styles.portChanges}>
                      {m.changes.ports.added.map((p: any) => (
                        <span key={`${p.port}-${p.protocol}`} className={styles.portAdded}>
                          {p.port}/{p.protocol} (new)
                        </span>
                      ))}
                      {m.changes.ports.removed.map((p: any) => (
                        <span key={`${p.port}-${p.protocol}`} className={styles.portRemoved}>
                          {p.port}/{p.protocol} (removed)
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </IndustrialCard>
  );
};