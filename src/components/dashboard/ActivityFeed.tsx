import { useEffect, useState } from "react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, MapPin, Video, Shield, LogIn, Bell, Clock,
} from "lucide-react";

interface Activity {
  id: string;
  type: "incident" | "patrol" | "cctv" | "personnel" | "login" | "alert";
  message: string;
  time: string;
  isNew?: boolean;
}

const typeConfig = {
  incident:  { icon: AlertTriangle, color: "text-destructive",      bg: "bg-destructive/10" },
  patrol:    { icon: MapPin,        color: "text-primary",          bg: "bg-primary/10" },
  cctv:      { icon: Video,         color: "text-warning",          bg: "bg-warning/10" },
  personnel: { icon: Shield,        color: "text-success",          bg: "bg-success/10" },
  login:     { icon: LogIn,         color: "text-muted-foreground", bg: "bg-muted" },
  alert:     { icon: Bell,          color: "text-destructive",      bg: "bg-destructive/10" },
};

// Fallback icon for unknown types
const DEFAULT_CONFIG = { icon: Bell, color: "text-muted-foreground", bg: "bg-muted" };

const formatTimeAgo = (dateString: string): string => {
  if (!dateString) return "Unknown";
  const diff    = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1)  return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)   return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} day(s) ago`;
};

export const ActivityFeed = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res  = await api.get("/notifications?limit=20");
        const data = res.data;

        if (data.success && Array.isArray(data.data)) {
          // Get current user id for read_by check
          const storedUser = localStorage.getItem("user");
          const userId     = storedUser ? JSON.parse(storedUser)?.id : null;

          const formatted: Activity[] = data.data.map((item: any) => {
            // read_by is a JSON array of UUIDs that have read the notification
            const readBy = Array.isArray(item.read_by) ? item.read_by : [];
            const isRead = userId ? readBy.includes(userId) : readBy.length > 0;

            return {
              id:    String(item.id),
              type:  item.type in typeConfig ? item.type : "alert",
              message: item.message ?? item.title ?? "Notification",
              time:  formatTimeAgo(item.created_at ?? item.timestamp),
              isNew: !isRead,
            };
          });
          setActivities(formatted);
        }
      } catch (err) {
        console.error("Failed to fetch activities:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  return (
    <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Live Activity</h3>
        </div>
        <span className="text-xs font-medium text-muted-foreground">Real-time updates</span>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {loading && (
          <div className="p-4 text-sm text-muted-foreground">Loading activities...</div>
        )}

        {!loading && activities.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">No recent activity</div>
        )}

        {activities.map((activity) => {
          const config = typeConfig[activity.type] ?? DEFAULT_CONFIG;
          const Icon   = config.icon;

          return (
            <div
              key={activity.id}
              className={cn(
                "px-5 py-3 border-b border-border/30 hover:bg-secondary/30 transition-colors flex items-start gap-3",
                activity.isNew && "bg-primary/5"
              )}
            >
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", config.bg)}>
                <Icon className={cn("w-4 h-4", config.color)} />
              </div>

              <div className="flex-1 min-w-0">
                <p className={cn("text-sm text-foreground", activity.isNew && "font-medium")}>
                  {activity.message}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
              </div>

              {activity.isNew && (
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0 mt-2" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
