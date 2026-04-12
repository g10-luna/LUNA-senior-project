import { useEffect, useMemo, useState } from "react";
import type { RobotStatus } from "./robotTypes";
import type { RobotServiceClient } from "./robotServiceClient";
import { createRobotServiceClient } from "./robotServiceClient";

interface UseRobotStatusResult {
  statuses: RobotStatus[] | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook to consume robot status for the dashboard.
 *
 * - By default, creates a RobotServiceClient bound to the real API via apiFetch.
 * - Tests or storybook can inject a mock RobotServiceClient via clientOverride.
 */
export function useRobotStatus(clientOverride?: RobotServiceClient): UseRobotStatusResult {
  const client = useMemo(
    () => clientOverride ?? createRobotServiceClient(),
    [clientOverride]
  );

  const [statuses, setStatuses] = useState<RobotStatus[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = client.subscribeAllStatuses?.((next) => {
      if (!isMounted) return;
      setStatuses(next);
      setError(null);
      setLoading(false);
    });

    void Promise.resolve()
      .then(() => {
        if (!isMounted) return undefined;
        setLoading(true);
        setError(null);
        return client.getAllStatuses();
      })
      .then((next) => {
        if (!isMounted || next === undefined) return;
        setStatuses(next);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err : new Error("Failed to load robot status"));
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [client]);

  return { statuses, loading, error };
}

