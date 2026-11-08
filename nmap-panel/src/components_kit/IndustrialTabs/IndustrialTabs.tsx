import type { IndustrialTabsProps } from './IndustrialTabs.types';
import styles from './IndustrialTabs.module.css';

export const IndustrialTabs: React.FC<IndustrialTabsProps> = ({ tabs, active, onChange }) => {
  return (
    <div className={styles.tabs} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            className={`${styles.tab} ${isActive ? styles.active : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon && <span className={styles.icon}>{tab.icon}</span>}
            <span>{isActive ? `[ ${tab.label} ]` : `  ${tab.label}  `}</span>
          </button>
        );
      })}
    </div>
  );
};
