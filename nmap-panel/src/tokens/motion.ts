export const transitions = {
  mechanical: { type: 'spring' as const, stiffness: 400, damping: 25 },
  glitch: { type: 'tween' as const, duration: 0.15 },
  smooth: { type: 'spring' as const, stiffness: 200, damping: 20 },
  snap: { type: 'spring' as const, stiffness: 500, damping: 30 },
};