import { useState, useEffect, useRef } from 'react';

export function CountUp({ value, duration = 800, prefix = '₹', style = {} }) {
  const [v, setV] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    let raf, start;
    const from = prev.current;
    const to = value;
    const tick = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span style={style}>
      {prefix}{Math.round(v).toLocaleString('en-IN')}
    </span>
  );
}
