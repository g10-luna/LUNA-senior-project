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
    setLoading(true);
    setError(null);

    const unsubscribe = client.subscribeAllStatuses?.((next) => {
      setStatuses(next);
      setLoading(false);
    });

    if (!unsubscribe) {
      client
        .getAllStatuses()
        .then((next) => {
          setStatuses(next);
        })
        .catch((err) => {
          setError(err instanceof Error ? err : new Error("Failed to load robot status"));
        })
        .finally(() => {
          setLoading(false);
        });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [client]);

  return { statuses, loading, error };
}

