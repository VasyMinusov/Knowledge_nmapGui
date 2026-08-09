// src/components/KnowledgeBase/KnowledgeBase.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { NeonInput, NeonSelect } from '@/components_kit';
import { nmapApi, type KnowledgeOption } from '@/api/nmapApi';
import styles from './KnowledgeBase.module.css';
import { OptionCard } from '../OptionCard/OptionCard';

export const KnowledgeBase: React.FC = () => {
  const [options, setOptions] = useState<KnowledgeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Все');

  useEffect(() => {
    nmapApi.getKnowledgeOptions()
      .then(res => setOptions(res.data))
      .catch(err => console.error('Не удалось загрузить базу знаний:', err))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const cats = ['Все', ...new Set(options.map(o => o.category))];
    return cats;
  }, [options]);

  const filtered = useMemo(() => {
    let items = options;
    if (category !== 'Все') {
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

  if (loading) return <div className={styles.empty}>Загрузка базы знаний...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <NeonInput
          label="Поиск"
          value={search}
          onChange={setSearch}
          placeholder="Флаг, описание, пример..."
        />
        <div style={{ minWidth: 200 }}>
          <NeonSelect
            label="Категория"
            options={categories.map(c => ({ value: c, label: c }))}
            value={category}
            onChange={setCategory}
          />
        </div>
      </div>
      <div className={styles.grid}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>Опции не найдены</div>
        ) : (
          filtered.map(opt => <OptionCard key={opt.id} option={opt} />)
        )}
      </div>
    </div>
  );
};