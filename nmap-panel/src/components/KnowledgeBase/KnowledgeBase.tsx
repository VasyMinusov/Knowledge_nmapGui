import React, { useState, useEffect, useMemo } from 'react';
import { NeonInput, NeonSelect } from '@/components_kit';
import { nmapApi, type KnowledgeOption } from '@/api/nmapApi';
import styles from './KnowledgeBase.module.css';
import { OptionCard } from '../OptionCard/OptionCard';

export const KnowledgeBase: React.FC = () => {
  const [options, setOptions] = useState<KnowledgeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    nmapApi.getKnowledgeOptions()
      .then(res => setOptions(res.data))
      .catch(err => console.error('Failed to load knowledge:', err))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const cats = ['All', ...new Set(options.map(o => o.category))];
    return cats;
  }, [options]);

  const filtered = useMemo(() => {
    let items = options;
    if (category !== 'All') {
      items = items.filter(o => o.category === category);
    }
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      items = items.filter(o =>
        o.flag.toLowerCase().includes(s) ||
        o.name?.toLowerCase().includes(s) ||
        o.description.toLowerCase().includes(s) ||
        (o.example && o.example.toLowerCase().includes(s))
      );
    }
    return items;
  }, [search, category, options]);

  if (loading) return <div className={styles.empty}>Loading knowledge base...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <NeonInput
          label="Search"
          value={search}
          onChange={setSearch}
          placeholder="Flag, description, example..."
        />
        <div style={{ minWidth: 200 }}>
          <NeonSelect
            label="Category"
            options={categories.map(c => ({ value: c, label: c }))}
            value={category}
            onChange={setCategory}
          />
        </div>
      </div>
      <div className={styles.grid}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>No options found</div>
        ) : (
          filtered.map(opt => <OptionCard key={opt.id} option={opt} />)
        )}
      </div>
    </div>
  );
};