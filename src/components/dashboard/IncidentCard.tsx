import { cn } from "@/lib/utils";
import { AlertTriangle, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export interface IncidentCardProps {
  id: string;
  title: string;
  location: string;
  time: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "resolved" | "closed";
}

const IncidentCard = ({
  id,
  title,
  location,
  time,
  severity,
  status,
}: IncidentCardProps) => {
  const navigate = useNavigate();

  const severityConfig = {
    low:      { color: "text-muted-foreground", bg: "bg-muted",           label: "Low" },
    medium:   { color: "text-warning",          bg: "bg-warning/10",      label: "Medium" },
    high:     { color: "text-destructive",      bg: "bg-destructive/10",  label: "High" },
    critical: { color: "text-destructive",      bg: "bg-destructive/20",  label: "Critical" },
  };

  const statusConfig = {
    open:          { color: "text-destructive", bg: "bg-destructive/10", label: "Open" },
    investigating: { color: "text-warning",     bg: "bg-warning/10",     label: "Investigating" },
    resolved:      { color: "text-success",     bg: "bg-success/10",     label: "Resolved" },
    closed:        { color: "text-muted-foreground", bg: "bg-muted",     label: "Closed" },
  };

  const sev = severityConfig[severity] ?? severityConfig.low;
  const sta = statusConfig[status]     ?? statusConfig.open;

  return (
    <div className="glass-card rounded-lg sm:rounded-xl p-3 sm:p-4 border border-border/50 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center", sev.bg)}>
            <AlertTriangle className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", sev.color)} />
          </div>
          <div>
            <span className="text-xs font-mono text-muted-foreground">#{id}</span>
            <h4 className="text-xs sm:text-sm font-medium text-foreground">{title}</h4>
          </div>
        </div>
        <span className={cn("text-xs font-medium px-2 py-0.5 sm:py-1 rounded-full flex-shrink-0", sta.bg, sta.color)}>
          {sta.label}
        </span>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 text-xs text-muted-foreground mb-2 sm:mb-3">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{location}</span>
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          <Clock className="w-3 h-3" />
          {time}
        </span>
      </div>

      {/* Severity badge & action button */}
      <div className="flex items-center justify-between gap-2">
        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", sev.bg, sev.color)}>
          {sev.label} Severity
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 sm:h-8"
          onClick={() => navigate(`/incidents/${id}`)}
        >
          View Details
        </Button>
      </div>
    </div>
  );
};

export default IncidentCard;