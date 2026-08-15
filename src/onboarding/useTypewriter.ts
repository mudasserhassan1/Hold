import { useEffect, useState } from 'react';

export function useTypewriter(text: string, ms = 22) {
  const [shown, setShown] = useState('');

  useEffect(() => {
    setShown('');
    if (!text) {
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
      }
    }, ms);
    return () => clearInterval(id);
  }, [ms, text]);

  const display = text.startsWith(shown) ? shown : '';
  return { shown: display, done: display === text && text.length > 0 };
}
