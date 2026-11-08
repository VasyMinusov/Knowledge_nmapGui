import type { ScreenTransitionProps } from './ScreenTransition.types';

// Pip-Boy: анимации переходов убраны (B6). screenKey остаётся —
// смена ключа по-прежнему даёт чистый remount экрана.
export const ScreenTransition: React.FC<ScreenTransitionProps> = ({
  children,
  screenKey,
}) => (
  <div key={screenKey} style={{ width: '100%', height: '100%' }}>
    {children}
  </div>
);
