import { useEffect, useState } from "react";
import { MapPin, Users, AlertTriangle, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { sitesService, BackendSite } from "@/services/sites";

interface Site {
  id: string;
  name: string;
  guards: number;
  incidents: number;
  cameras: number;
  status: "normal" | "warning" | "alert";
  position: { top: string; left: string };
}

const statusStyles = {
  normal: "bg-success/20 border-success/40 text-success",
  warning: "bg-warning/20 border-warning/40 text-warning",
  alert: "bg-destructive/20 border-destructive/40 text-destructive animate-pulse",
};

export const SiteMap = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSites = async () => {
      try {
        const data = await sitesService.getAll();

        // Transform backend response to UI structure
        const mapped: Site[] = data.sites.map(
          (site: BackendSite, index: number) => {
            let status: "normal" | "warning" | "alert" = "normal";

            if (site.openIncidents > 1) status = "alert";
            else if (site.openIncidents === 1) status = "warning";

            // Auto distribute positions dynamically
            const top = `${20 + index * 15}%`;
            const left = `${20 + (index % 3) * 25}%`;

            return {
              id: site.id.slice(0, 1).toUpperCase(),
              name: site.name,
              guards: site.activeGuards,
              incidents: site.openIncidents,
              cameras: site.cameraCount,
              status,
              position: { top, left },
            };
          }
        );

        setSites(mapped);
      } catch (error) {
        console.error("Failed to load sites:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSites();
  }, []);

  return (
    <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
      <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base text-foreground">Site Overview</h3>
        </div>
      </div>

      <div className="relative h-[200px] sm:h-[300px] bg-gradient-to-br from-secondary/30 to-secondary/10 p-3 sm:p-4">
        {loading && (
          <p className="text-xs sm:text-sm text-muted-foreground">
            Loading sites...
          </p>
        )}

        {!loading &&
          sites.map((site) => (
            <div
              key={site.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
              style={{ top: site.position.top, left: site.position.left }}
            >
              <div
                className={cn(
                  "relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl border-2 flex items-center justify-center font-bold text-base sm:text-lg transition-transform group-hover:scale-110",
                  statusStyles[site.status]
                )}
              >
                {site.id}
              </div>

              {/* Tooltip - shows on hover on desktop, always visible on touch devices */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="bg-popover border border-border rounded-lg p-2 sm:p-3 shadow-xl min-w-[140px] sm:min-w-[180px]">
                  <p className="font-semibold text-xs sm:text-sm text-foreground mb-1 sm:mb-2">
                    {site.name}
                  </p>
                  <div className="space-y-0.5 sm:space-y-1 text-xs">
                    <p className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground">
                      <Users className="w-3 h-3" /> {site.guards} Guards Active
                    </p>
                    <p className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground">
                      <Video className="w-3 h-3" /> {site.cameras} Cameras
                    </p>
                    <p
                      className={cn(
                        "flex items-center gap-1.5 sm:gap-2",
                        site.incidents > 0
                          ? "text-destructive"
                          : "text-muted-foreground"
                      )}
                    >
                      <AlertTriangle className="w-3 h-3" />{" "}
                      {site.incidents} Open Incidents
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