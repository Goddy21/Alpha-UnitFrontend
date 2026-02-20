import { cn } from "@/lib/utils";
import { 
  AlertTriangle, 
  MapPin, 
  Video, 
  Shield, 
  LogIn, 
  Bell,
  Clock
} from "lucide-react";

interface Activity {
  id: string;
  type: "incident" | "patrol" | "cctv" | "personnel" | "login" | "alert";
  message: string;
  time: string;
  isNew?: boolean;
}

const activities: Activity[] = [
  { id: "1", type: "incident", message: "New incident reported at Site B - Unauthorized access attempt", time: "2 min ago", isNew: true },
  { id: "2", type: "patrol", message: "Patrol checkpoint completed - Site A, Zone 3", time: "5 min ago" },
  { id: "3", type: "cctv", message: "Motion detected - Camera 12, Warehouse entrance", time: "8 min ago", isNew: true },
  { id: "4", type: "login", message: "Guard Martinez checked in at Main Gate", time: "12 min ago" },
  { id: "5", type: "alert", message: "Fence alarm triggered - Site C, Sector 2", time: "15 min ago", isNew: true },
  { id: "6", type: "personnel", message: "Shift change completed - Night to Morning", time: "23 min ago" },
  { id: "7", type: "patrol", message: "Route deviation detected - Guard Kim, Site B", time: "28 min ago" },
  { id: "8", type: "cctv", message: "Camera 7 offline - Maintenance required", time: "35 min ago" },
];

const typeConfig = {
  incident: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  patrol: { icon: MapPin, color: "text-primary", bg: "bg-primary/10" },
  cctv: { icon: Video, color: "text-warning", bg: "bg-warning/10" },
  personnel: { icon: Shield, color: "text-success", bg: "bg-success/10" },
  login: { icon: LogIn, color: "text-muted-foreground", bg: "bg-muted" },
  alert: { icon: Bell, color: "text-destructive", bg: "bg-destructive/10" },
};

export const ActivityFeed = () => {
  return (
    <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Live Activity</h3>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          Real-time updates
        </span>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {activities.map((activity) => {
          const config = typeConfig[activity.type];
          const Icon = config.icon;

          return (
            <div 
              key={activity.id}
              className={cn(
                "px-5 py-3 border-b border-border/30 hover:bg-secondary/30 transition-colors flex items-start gap-3",
                activity.isNew && "bg-primary/5"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                config.bg
              )}>
                <Icon className={cn("w-4 h-4", config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm text-foreground",
                  activity.isNew && "font-medium"
                )}>
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
