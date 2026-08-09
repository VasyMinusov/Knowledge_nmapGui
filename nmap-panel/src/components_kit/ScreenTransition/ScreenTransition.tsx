import { motion, AnimatePresence } from 'motion/react';
import type { ScreenTransitionProps } from './ScreenTransition.types';

// Функция easing, имитирующая steps(6)
const steps6 = (t: number) => Math.floor(t * 6) / 6;

export const ScreenTransition: React.FC<ScreenTransitionProps> = ({
  children,
  screenKey,
}) => (
  <AnimatePresence mode="popLayout">
    <motion.div
      key={screenKey}
      initial={{ x: 300, opacity: 1 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 1 }}
      transition={{
        duration: 0.25,
        ease: steps6,
      }}
      style={{ width: '100%', height: '100%' }}
    >
      {children}
    </motion.div>
  </AnimatePresence>
);