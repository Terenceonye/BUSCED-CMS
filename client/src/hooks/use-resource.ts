import * as React from "react";
import { get } from "@/lib/api";

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches a URL and re-fetches when `deps` change or `reload()` is called.
 * `select` pulls the payload out of the API envelope, which is not consistent
 * across the older endpoints (some return {data}, some {images}, some an array).
 */
export function useResource<T>(
  url: string | null,
  select: (payload: any) => T,
  deps: React.DependencyList = [],
): State<T> & { reload: () => void; setData: (v: T) => void } {
  const [state, setState] = React.useState<State<T>>({
    data: null,
    loading: !!url,
    error: null,
  });
  const [nonce, setNonce] = React.useState(0);

  // Keep the latest selector without making it a dependency of the effect.
  const selectRef = React.useRef(select);
  React.useEffect(() => {
    selectRef.current = select;
  });

  React.useEffect(() => {
    if (!url) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    get(url)
      .then((payload) => {
        if (cancelled) return;
        setState({ data: selectRef.current(payload), loading: false, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          data: null,
          loading: false,
          error: err?.message || "Request failed",
        });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, nonce, ...deps]);

  const reload = React.useCallback(() => setNonce((n) => n + 1), []);
  const setData = React.useCallback(
    (v: T) => setState((s) => ({ ...s, data: v })),
    [],
  );

  return { ...state, reload, setData };
}
