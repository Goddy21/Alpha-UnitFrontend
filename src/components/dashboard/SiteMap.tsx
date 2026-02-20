import { MapPin, Users, AlertTriangle, Video } from "lucide-react";
import { cn } from "@/lib/utils";

interface Site {
  id: string;
  name: string;
  guards: number;
  incidents: number;
  cameras: number;
  status: "normal" | "warning" | "alert";
  position: { top: string; left: string };
}

const sites: Site[] = [
  { id: "A", name: "Site A - Industrial", guards: 8, incidents: 0, cameras: 12, status: "normal", position: { top: "20%", left: "25%" } },
  { id: "B", name: "Site B - Commercial", guards: 5, incidents: 1, cameras: 8, status: "warning", position: { top: "45%", left: "60%" } },
  { id: "C", name: "Site C - Office Complex", guards: 6, incidents: 2, cameras: 16, status: "alert", position: { top: "70%", left: "35%" } },
  { id: "D", name: "Site D - Residential", guards: 4, incidents: 0, cameras: 6, status: "normal", position: { top: "30%", left: "75%" } },
];

const statusStyles = {
  normal: "bg-success/20 border-success/40 text-success",
  warning: "bg-warning/20 border-warning/40 text-warning",
  alert: "bg-destructive/20 border-destructive/40 text-destructive animate-pulse",
};

export const SiteMap = () => {
  return (
    <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Site Overview</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-success">
            <span className="w-2 h-2 rounded-full bg-success" /> Normal
          </span>
          <span className="flex items-center gap-1 text-xs text-warning">
            <span className="w-2 h-2 rounded-full bg-warning" /> Warning
          </span>
          <span className="flex items-center gap-1 text-xs text-destructive">
            <span className="w-2 h-2 rounded-full bg-destructive" /> Alert
          </span>
        </div>
      </div>
      
      {/* Map Area */}
      <div className="relative h-[300px] bg-gradient-to-br from-secondary/30 to-secondary/10 p-4">
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full" style={{
            backgroundImage: 'linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        {/* Sites */}
        {sites.map((site) => (
          <div
            key={site.id}
            className={cn(
              "absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
            )}
            style={{ top: site.position.top, left: site.position.left }}
          >
            {/* Pulse ring */}
            <div className={cn(
              "absolute inset-0 rounded-full animate-ping opacity-50",
              site.status === "alert" && "bg-destructive",
              site.status === "warning" && "bg-warning",
              site.status === "normal" && "bg-success/0"
            )} />
            
            {/* Site marker */}
            <div className={cn(
              "relative w-12 h-12 rounded-xl border-2 flex items-center justify-center font-bold text-lg transition-transform group-hover:scale-110",
              statusStyles[site.status]
            )}>
              {site.id}
            </div>

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <div className="bg-popover border border-border rounded-lg p-3 shadow-xl min-w-[180px]">
                <p className="font-semibold text-sm text-foreground mb-2">{site.name}</p>
                <div className="space-y-1 text-xs">
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-3 h-3" /> {site.guards} Guards Active
                  </p>
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Video className="w-3 h-3" /> {site.cameras} Cameras
                  </p>
                  <p className={cn(
                    "flex items-center gap-2",
                    site.incidents > 0 ? "text-destructive" : "text-muted-foreground"
                  )}>
                    <AlertTriangle className="w-3 h-3" /> {site.incidents} Open Incidents
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
