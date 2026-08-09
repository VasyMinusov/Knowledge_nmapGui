export interface NeonSelectOption {
  value: string;
  label: string;
}

export interface NeonSelectProps {
  label?: string;
  options: NeonSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}