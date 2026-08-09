export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'accent' | 'danger' | 'warning';
}

export interface ToastStackProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}