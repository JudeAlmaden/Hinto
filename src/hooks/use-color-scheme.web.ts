import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    // Defer the hydration signal to the next macrotask so the first render
    // always uses the safe default, and the flag flip is asynchronous
    // (respects the lint rule's guidance to avoid synchronous setState in effects).
    const raf = requestAnimationFrame(() => setHasHydrated(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
