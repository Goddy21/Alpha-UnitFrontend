// src/context/BadgeContext.tsx
// Centralises the notification/incident badge counts so that
// Sidebar and Header both read from one shared fetch — not two separate ones.

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import api from "@/lib/api";

interface BadgeCounts {
  notifications: number;
  incidents: number;
}

interface BadgeContextValue {
  badges: BadgeCounts;
  refresh: () => void;
}

const BadgeContext = createContext<BadgeContextValue>({
  badges: { notifications: 0, incidents: 0 },
  refresh: () => {},
});

export const BadgeProvider = ({ children }: { children: ReactNode }) => {
  const [badges, setBadges] = useState<BadgeCounts>({ notifications: 0, incidents: 0 });

  const fetchBadges = useCallback(async () => {
    try {
      const [notifRes, incidentRes] = await Promise.allSettled([
        api.get("/notifications/stats"),
        api.get("/incidents/stats"),
      ]);

      setBadges({
        notifications:
          notifRes.status === "fulfilled"
            ? Number(notifRes.value.data?.data?.unread ?? 0)
            : 0,
        incidents:
          incidentRes.status === "fulfilled"
            ? Number(incidentRes.value.data?.data?.open_incidents ?? 0)
            : 0,
      });
    } catch {
      // Silently fail — badges stay at 0
    }
  }, []);

  useEffect(() => {
    fetchBadges();
    // Poll every 90 seconds (not 60) to reduce request volume
    const interval = setInterval(fetchBadges, 90_000);
    return () => clearInterval(interval);
  }, [fetchBadges]);

  return (
    <BadgeContext.Provider value={{ badges, refresh: fetchBadges }}>
      {children}
    </BadgeContext.Provider>
  );
};

export const useBadges = () => useContext(BadgeContext);