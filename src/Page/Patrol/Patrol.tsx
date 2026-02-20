import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  MapPin,
  Navigation,
  Play,
  Pause,
  Clock,
  AlertTriangle,
  CheckCircle,
  Filter,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PatrolRoute {
  id: string;
  guardName: string;
  guardId: string;
  siteName: string;
  startTime: string;
  endTime?: string;
  checkpoints: number;
  completedCheckpoints: number;
  status: "active" | "completed" | "deviation" | "delayed";
  distance: string;
  duration?: string;
}

const patrolStatusConfig = {
  active: { color: "text-success", bg: "bg-success/10", label: "Active" },
  completed: { color: "text-muted-foreground", bg: "bg-muted", label: "Completed" },
  deviation: { color: "text-destructive", bg: "bg-destructive/10", label: "Route Deviation" },
  delayed: { color: "text-warning", bg: "bg-warning/10", label: "Delayed" },
};

const mockPatrols: PatrolRoute[] = [
  {
    id: "PTR001",
    guardName: "John Martinez",
    guardId: "GRD001",
    siteName: "Westgate Mall",
    startTime: "2026-01-19 06:00",
    checkpoints: 8,
    completedCheckpoints: 5,
    status: "active",
    distance: "1.2 km"
  },
  {
    id: "PTR002",
    guardName: "David Kim",
    guardId: "GRD002",
    siteName: "SafariCom HQ",
    startTime: "2026-01-19 05:45",
    endTime: "2026-01-19 06:30",
    checkpoints: 6,
    completedCheckpoints: 6,
    status: "completed",
    distance: "0.8 km",
    duration: "45 min"
  },
  {
    id: "PTR003",
    guardName: "Michael Ochieng",
    guardId: "GRD004",
    siteName: "Kenya Power Station",
    startTime: "2026-01-19 03:00",
    checkpoints: 10,
    completedCheckpoints: 7,
    status: "deviation",
    distance: "1.5 km"
  },
];

export const PatrolPage = () => {
  const [patrols] = useState<PatrolRoute[]>(mockPatrols);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredPatrols = patrols.filter(patrol => 
    filterStatus === "all" || patrol.status === filterStatus
  );

  const stats = {
    active: patrols.filter(p => p.status === "active").length,
    completed: patrols.filter(p => p.status === "completed").length,
    deviations: patrols.filter(p => p.status === "deviation").length,
    totalDistance: "3.5 km"
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Navigation className="w-8 h-8 text-primary" />
              Patrol & GPS Tracking
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor patrol routes and checkpoint visits in real-time
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Patrols</p>
                <p className="text-3xl font-bold text-success mt-1">{stats.active}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <Play className="w-6 h-6 text-success" />
              </div>
            </div>
          </div>
          
          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed Today</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.completed}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Route Deviations</p>
                <p className="text-3xl font-bold text-destructive mt-1">{stats.deviations}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Distance</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.totalDistance}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>
        </div>

        {/* Map and Patrols */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live Map */}
          <div className="glass-card rounded-xl p-6 border border-border/50">
            <h3 className="font-semibold text-foreground mb-4">Live GPS Tracking</h3>
            <div className="aspect-video rounded-lg bg-gradient-to-br from-secondary/30 to-secondary/10 border border-border/50 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Map View</p>
                <p className="text-xs text-muted-foreground">Real-time guard locations</p>
              </div>
            </div>
          </div>

          {/* Patrol List */}
          <div className="glass-card rounded-xl p-6 border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Active Patrols</h3>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="deviation">Deviation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              {filteredPatrols.map((patrol) => (
                <div key={patrol.id} className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-foreground">{patrol.guardName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{patrol.id}</p>
                    </div>
                    <span className={cn(
                      "text-xs font-medium px-2 py-1 rounded-full",
                      patrolStatusConfig[patrol.status].bg,
                      patrolStatusConfig[patrol.status].color
                    )}>
                      {patrolStatusConfig[patrol.status].label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {patrol.siteName}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {patrol.startTime}
                    </div>
                    <div>
                      Checkpoints: {patrol.completedCheckpoints}/{patrol.checkpoints}
                    </div>
                    <div>
                      Distance: {patrol.distance}
                    </div>
                  </div>
                  {patrol.status === "active" && (
                    <div className="mt-3">
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${(patrol.completedCheckpoints / patrol.checkpoints) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatrolPage;