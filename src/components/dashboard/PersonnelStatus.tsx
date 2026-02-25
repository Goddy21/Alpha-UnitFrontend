import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { User, MapPin, Clock, Shield } from "lucide-react";
import { personnelService, Personnel } from "@/services/personnel";

interface GuardProps {
  name: string;
  role: string;
  location: string;
  status: "on-duty" | "off-duty" | "break" | "alert";
  checkInTime: string;
}

const Guard = ({ name, role, location, status, checkInTime }: GuardProps) => {
  const statusConfig = {
    "on-duty": { color: "bg-success", label: "On Duty", textColor: "text-success" },
    "off-duty": { color: "bg-muted-foreground", label: "Off Duty", textColor: "text-muted-foreground" },
    "break": { color: "bg-warning", label: "On Break", textColor: "text-warning" },
    "alert": { color: "bg-destructive animate-pulse", label: "Alert", textColor: "text-destructive" },
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
      <div className="relative">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div
          className={cn(
            "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-card",
            statusConfig[status]?.color
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">
            {name}
          </p>
          <span
            className={cn("text-xs", statusConfig[status]?.textColor)}
          >
            {statusConfig[status]?.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{role}</p>
      </div>

      <div className="text-right">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {location}
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {checkInTime}
        </p>
      </div>
    </div>
  );
};

export const PersonnelStatus = () => {
  const [guards, setGuards] = useState<GuardProps[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPersonnel = async () => {
      try {
        const data = await personnelService.getAll({
          page: 1,
          limit: 50,
        });

        // Transform backend data to UI format
        const mapped = data.personnel.map((person: Personnel) => ({
          name: `${person.first_name} ${person.last_name}`,
          role: person.role,
          location: person.current_location || "Not Assigned",
          status: person.status,
          checkInTime: person.last_check_in
            ? new Date(person.last_check_in).toLocaleTimeString()
            : "—",
        }));

        setGuards(mapped);
      } catch (error) {
        console.error("Failed to load personnel:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPersonnel();
  }, []);

  const onDutyCount = guards.filter(g => g.status === "on-duty").length;

  return (
    <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Active Personnel</h3>
        </div>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-success/10 text-success">
          {onDutyCount} On Duty
        </span>
      </div>

      <div className="p-4 space-y-2 max-h-[360px] overflow-y-auto">
        {loading && <p className="text-sm text-muted-foreground">Loading personnel...</p>}

        {!loading && guards.length === 0 && (
          <p className="text-sm text-muted-foreground">No personnel found.</p>
        )}

        {guards.map((guard, idx) => (
          <Guard key={idx} {...guard} />
        ))}
      </div>
    </div>
  );
};