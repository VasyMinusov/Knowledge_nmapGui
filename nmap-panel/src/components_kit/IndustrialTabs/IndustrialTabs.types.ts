export interface IndustrialTabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface IndustrialTabsProps {
  tabs: IndustrialTabItem[];
  active: string;
  onChange: (id: string) => void;
}