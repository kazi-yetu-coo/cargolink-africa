import { useCallback, useEffect, useState } from "react";
export function useLoad<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await loader());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load records.");
    } finally {
      setLoading(false);
    }
  }, [loader]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, error, loading, reload };
}
