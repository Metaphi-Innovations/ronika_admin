import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';

export const useWidth = () => {
  const [width, setWidth] = useState(1200); // Default to lg
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const initialWidth = Math.floor(ref.current.getBoundingClientRect().width || ref.current.offsetWidth || 0);
    if (initialWidth > 0 && Math.abs(initialWidth - width) > 1) {
      setWidth(initialWidth);
    }
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    
    // Prevent ResizeObserver loop error
    let animationFrameId: number;
    
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        // Use animation frame to avoid "ResizeObserver loop limit exceeded"
        animationFrameId = window.requestAnimationFrame(() => {
          const newWidth = Math.floor(entries[0].contentRect.width);
          // Only update if change is meaningful (>1px) to prevent scrollbar-induced width loops
          setWidth(prev => (Math.abs(prev - newWidth) > 1 ? newWidth : prev));
        });
      }
    });
    
    observer.observe(ref.current);
    
    return () => {
      observer.disconnect();
      if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return { width, ref };
};
