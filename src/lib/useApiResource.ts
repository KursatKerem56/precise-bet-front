import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "./api";

export interface Resource<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Runs `fetcher` on mount and on every `reload()`, aborting any in-flight
 * request first. The fetcher is read from a ref, so callers do not have to
 * memoize it.
 */
export function useApiResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
): Resource<T> {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [token, setToken] = useState(0);
  const [state, setState] = useState<Omit<Resource<T>, "reload">>({
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setState((previous) => ({ ...previous, loading: true, error: null }));

    fetcherRef
      .current(controller.signal)
      .then((data) => {
        if (active) setState({ data, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (!active || controller.signal.aborted) return;
        setState({
          data: null,
          loading: false,
          error:
            error instanceof ApiError
              ? error
              : new ApiError("unknown", "The request could not be completed.", null, null),
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [token]);

  const reload = useCallback(() => setToken((value) => value + 1), []);

  return { ...state, reload };
}
