import { useState, useEffect } from 'react';

export const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480 };
export const COLS = { lg: 12, md: 10, sm: 6, xs: 4 };

export type Breakpoint = 'lg' | 'md' | 'sm' | 'xs';

export const getBreakpoint = (width: number): Breakpoint => {
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
};

export const useDesignState = () => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('lg');
  const [cols, setCols] = useState<number>(COLS.lg);

  useEffect(() => {
    const handleResize = () => {
      // We use window.innerWidth to strictly synchronize with the CSS pixel 
      // coordinate space measured by useWidth (ResizeObserver).
      // This prevents the grid layout math from failing when the user zooms
      // the browser or resizes the container.
      const normalizedWidth = window.innerWidth;
      
      const bp = getBreakpoint(normalizedWidth);
      setBreakpoint(bp);
      setCols(COLS[bp]);
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { breakpoint, cols };
};
