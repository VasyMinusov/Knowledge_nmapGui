// src/components/VulnerabilitiesList/VulnerabilitiesList.tsx
import React, { useState, useEffect } from 'react';
import {
  IndustrialCard,
  GlitchText,
  NeonSpinner,
  NeonButton,
  NeonInput,
  NeonSelect,
} from '@/components_kit';
import { nmapApi } from '@/api/nmapApi';
import styles from './VulnerabilitiesList.module.css';

interface Vulnerability {
  id: number;
  scan_id: string;
  host_id: number;
  ip: string;
  hostname?: string;
  os?: string;
  port?: number;
  protocol?: string;
  cve?: string;
  cvss?: number | null;
  description: string;
  start_time?: string;
}

interface VulnerabilitiesListProps {
  scanId?: string;
}

export const VulnerabilitiesList: React.FC<VulnerabilitiesListProps> = ({ scanId }) => {
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cvssFilter, setCvssFilter] = useState<string>('all');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [scanId]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (scanId) {
        const res = await nmapApi.getVulnerabilities(scanId);
        setVulns(res.data.vulnerabilities);
      } else {
        const [vulnsRes, statsRes] = await Promise.all([
          nmapApi.getAllVulnerabilities(200, 0),
          nmapApi.getVulnerabilityStats(),
        ]);
        setVulns(vulnsRes.data.vulnerabilities);
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredVulns = vulns.filter((v) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      (v.cve && v.cve.toLowerCase().includes(searchLower)) ||
      v.ip.includes(search) ||
      (v.description && v.description.toLowerCase().includes(searchLower)) ||
      (v.hostname && v.hostname.toLowerCase().includes(searchLower));
    if (!matchesSearch) return false;

    if (cvssFilter === 'high') return v.cvss !== undefined && v.cvss !== null && v.cvss >= 7.0;
    if (cvssFilter === 'medium') return v.cvss !== undefined && v.cvss !== null && v.cvss >= 4.0 && v.cvss < 7.0;
    if (cvssFilter === 'low') return v.cvss !== undefined && v.cvss !== null && v.cvss < 4.0;
    return true;
  });

  const getCvssColor = (cvss: number): string => {
    if (cvss >= 7.0) return 'var(--color-danger-base)';
    if (cvss >= 4.0) return '#ffb800';
    return 'var(--color-accent-neon)';
  };

  if (loading) {
    return (
      <IndustrialCard variant="accent">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <NeonSpinner size={48} label="Loading vulnerabilities..." />
        </div>
      </IndustrialCard>
    );
  }

  return (
    <IndustrialCard variant="accent">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <GlitchText text="VULNERABILITIES" />
        {scanId && <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Scan: {scanId.slice(0, 8)}</span>}
      </div>

      {!scanId && stats && (
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total</span>
            <span className={styles.statValue}>{stats.total}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Unique CVEs</span>
            <span className={styles.statValue}>{stats.unique_cves}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Avg CVSS</span>
            <span className={styles.statValue}>{stats.avg_cvss?.toFixed(1) || 'N/A'}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>High</span>
            <span className={styles.statValue} style={{ color: 'var(--color-danger-base)' }}>{stats.high}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Medium</span>
            <span className={styles.statValue} style={{ color: '#ffb800' }}>{stats.medium}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Low</span>
            <span className={styles.statValue} style={{ color: 'var(--color-accent-neon)' }}>{stats.low}</span>
          </div>
        </div>
      )}

      <div className={styles.controls}>
        <NeonInput
          label="Search"
          value={search}
          onChange={setSearch}
          placeholder="CVE, IP, description..."
          size="sm"
        />
        <NeonSelect
          label="CVSS Severity"
          options={[
            { value: 'all', label: 'All' },
            { value: 'high', label: 'High (>=7.0)' },
            { value: 'medium', label: 'Medium (4.0-6.9)' },
            { value: 'low', label: 'Low (<4.0)' },
          ]}
          value={cvssFilter}
          onChange={setCvssFilter}
        />
        <NeonButton size="sm" variant="primary" onClick={loadData}>
          ↻ Refresh
        </NeonButton>
      </div>

      {filteredVulns.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          No vulnerabilities found
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>CVE</th>
                <th>CVSS</th>
                <th>Host</th>
                <th>Port</th>
                <th>Description</th>
                <th>Scan</th>
              </tr>
            </thead>
            <tbody>
              {filteredVulns.map((v) => (
                <tr key={v.id}>
                  <td>
                    {v.cve ? (
                      <a
                        href={`https://nvd.nist.gov/vuln/detail/${v.cve}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.cveLink}
                      >
                        {v.cve}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {v.cvss !== undefined && v.cvss !== null ? (
                      <span style={{ color: getCvssColor(v.cvss), fontWeight: 'bold' }}>
                        {v.cvss.toFixed(1)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <div className={styles.hostInfo}>
                      <span className={styles.ip}>{v.ip}</span>
                      {v.hostname && <span className={styles.hostname}>{v.hostname}</span>}
                    </div>
                  </td>
                  <td>
                    {v.port ? `${v.port}/${v.protocol || 'tcp'}` : '—'}
                  </td>
                  <td className={styles.descCell}>
                    <div className={styles.descText}>
                      {v.description?.length > 100 ? v.description.slice(0, 100) + '...' : v.description || '—'}
                    </div>
                  </td>
                  <td>
                    {!scanId && v.scan_id && (
                      <span className={styles.scanId}>{v.scan_id.slice(0, 8)}</span>
                    )}
                    {v.start_time && (
                      <span className={styles.scanTime}>
                        {new Date(v.start_time).toLocaleDateString()}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </IndustrialCard>
  );
};