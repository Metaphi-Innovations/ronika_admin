import React, { useState, useEffect, useRef } from 'react';

export const useWidth = () => {
  const [width, setWidth] = useState(1200); // Default to lg
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setWidth(entries[0].contentRect.width);
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { width, ref };
};
