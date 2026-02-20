import { cn } from "@/lib/utils";
import { AlertTriangle, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IncidentCardProps {
  id: string;
  title: string;
  location: string;
  time: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "resolved";
}

export const IncidentCard = ({ id, title, location, time, severity, status }: IncidentCardProps) => {
  const severityConfig = {
    low: { color: "text-muted-foreground", bg: "bg-muted", label: "Low" },
    medium: { color: "text-warning", bg: "bg-warning/10", label: "Medium" },
    high: { color: "text-destructive", bg: "bg-destructive/10", label: "High" },
    critical: { color: "text-destructive", bg: "bg-destructive/20 glow-destructive", label: "Critical" },
  };

  const statusConfig = {
    open: { color: "text-destructive", bg: "bg-destructive/10", label: "Open" },
    investigating: { color: "text-warning", bg: "bg-warning/10", label: "Investigating" },
    resolved: { color: "text-success", bg: "bg-success/10", label: "Resolved" },
  };

  return (
    <div className="glass-card rounded-xl p-4 border border-border/50 hover:border-primary/30 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            severityConfig[severity].bg
          )}>
            <AlertTriangle className={cn("w-4 h-4", severityConfig[severity].color)} />
          </div>
          <div>
            <span className="text-xs font-mono text-muted-foreground">#{id}</span>
            <h4 className="text-sm font-medium text-foreground line-clamp-1">{title}</h4>
          </div>
        </div>
        <span className={cn(
          "text-xs font-medium px-2 py-1 rounded-full",
          statusConfig[status].bg,
          statusConfig[status].color
        )}>
          {statusConfig[status].label}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {location}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {time}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className={cn(
          "text-xs font-medium px-2 py-1 rounded",
          severityConfig[severity].bg,
          severityConfig[severity].color
        )}>
          {severityConfig[severity].label} Priority
        </span>
        <Button variant="ghost" size="sm" className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">
          View Details
        </Button>
      </div>
    </div>
  );
};
