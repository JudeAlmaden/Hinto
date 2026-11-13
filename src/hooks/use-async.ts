import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

interface Result<T> {
  id: string;
  data: T | null;
  error: string | null;
}

/**
 * Runs a loader on mount and whenever `key` changes. There is deliberately no
 * data-fetching library (plan D15): screens need a promise, a loading flag and a
 * reload, nothing more.
 *
 * State is only written from promise callbacks (never synchronously in an
 * effect), and `loading` is derived from whether the current request has
 * settled, which keeps React Compiler's lint rules satisfied without disabling
 * them.
 */
export function useAsyncData<T>(loader: () => Promise<T>, key: string): AsyncState<T> {
  const loaderRef = useRef(loader);
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  const requestId = `${key}#${nonce}`;

  useEffect(() => {
    let cancelled = false;

    void loaderRef
      .current()
      .then((data) => {
        if (!cancelled) setResult({ id: requestId, data, error: null });
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setResult({
            id: requestId,
            data: null,
            error: reason instanceof Error ? reason.message : 'Something went wrong.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);
  const current = result?.id === requestId ? result : null;

  return {
    data: current?.data ?? null,
    loading: current === null,
    error: current?.error ?? null,
    reload,
  };
}
