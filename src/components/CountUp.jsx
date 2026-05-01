import { useState, useEffect, useRef } from 'react';
import { currencyPrefix } from '../utils/money';

export function CountUp({ value, duration = 800, prefix, currency = 'INR', style = {} }) {
  const [v, setV] = useState(0);
  const prev = useRef(0);
  const p = prefix ?? currencyPrefix(currency);

  useEffect(() => {
    let raf, start;
    const from = prev.current;
    const to = value;
    const tick = (t) => {
      if (!start) start = t;
      const prog = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - prog, 3);
      setV(from + (to - from) * eased);
      if (prog < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span style={style}>
      {p}{Math.round(v).toLocaleString('en-IN')}
    </span>
  );
}
