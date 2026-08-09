export interface MenuItemProps {
  label: string;                   // только строка для GlitchText
  icon?: React.ReactNode;          // иконка (опционально)
  index: number;
  active: boolean;
  onClick: () => void;
}