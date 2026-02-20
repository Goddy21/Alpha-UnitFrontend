import { useEffect, useState } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { IncidentCard } from "@/components/dashboard/IncidentCard";
import { PersonnelStatus } from "@/components/dashboard/PersonnelStatus";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { SiteMap } from "@/components/dashboard/SiteMap";
import {
  Shield,
  AlertTriangle,
  Users,
  MapPin,
  Video,
  CheckCircle,
} from "lucide-react";
import api from "@/lib/api";

// ── types ────────────────────────────────────────────────────────────────────
interface DashboardStats {
  activeSites: number;
  guardsOnDuty: number;
  openIncidents: number;
  activePatrols: number;
  camerasOnline: number;
  resolvedToday: number;
}

interface Incident {
  id: string;
  title: string;
  location: string;
  time: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "resolved" | "closed";
}

// ── fallback data (shown while loading or if API not ready) ──────────────────
const FALLBACK_STATS: DashboardStats = {
  activeSites: 0,
  guardsOnDuty: 0,
  openIncidents: 0,
  activePatrols: 0,
  camerasOnline: 0,
  resolvedToday: 0,
};

const FALLBACK_INCIDENTS: Incident[] = [];

// ── component ────────────────────────────────────────────────────────────────
const Index = () => {
  const [stats, setStats] = useState<DashboardStats>(FALLBACK_STATS);
  const [incidents, setIncidents] = useState<Incident[]>(FALLBACK_INCIDENTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        // Fetch stats and recent incidents in parallel
        const [statsRes, incidentsRes] = await Promise.allSettled([
          api.get("/dashboard/stats"),
          api.get("/incidents?status=open&limit=3&sort=timestamp:desc"),
        ]);

        if (statsRes.status === "fulfilled") {
          setStats(statsRes.value.data.data);
        }

        if (incidentsRes.status === "fulfilled") {
          const raw = incidentsRes.value.data.data.incidents ?? [];
          const mapped: Incident[] = raw.map((inc: any) => ({
            id: inc.incident_code ?? inc.id,
            title: inc.title,
            location: inc.location ?? "Unknown location",
            time: formatTime(inc.timestamp ?? inc.created_at),
            severity: inc.severity,
            status: inc.status,
          }));
          setIncidents(mapped);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  return (
    // ⚠️  No <Sidebar /> or <Header /> here — Layout in App.tsx provides them
    <main className="flex-1 overflow-y-auto p-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Operations Dashboard
        </h1>
        <p className="text-muted-foreground text-sm">
          Real-time security operations overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <StatCard
          title="Active Sites"
          value={loading ? "—" : stats.activeSites}
          change="+2 this month"
          changeType="positive"
          icon={MapPin}
          variant="primary"
        />
        <StatCard
          title="Guards On Duty"
          value={loading ? "—" : stats.guardsOnDuty}
          change="92% coverage"
          changeType="positive"
          icon={Users}
          variant="success"
        />
        <StatCard
          title="Open Incidents"
          value={loading ? "—" : stats.openIncidents}
          change="+3 today"
          changeType="negative"
          icon={AlertTriangle}
          variant="destructive"
        />
        <StatCard
          title="Patrols Active"
          value={loading ? "—" : stats.activePatrols}
          icon={Shield}
        />
        <StatCard
          title="Cameras Online"
          value={loading ? "—" : stats.camerasOnline}
          change="2 offline"
          changeType="negative"
          icon={Video}
          variant="warning"
        />
        <StatCard
          title="Resolved Today"
          value={loading ? "—" : stats.resolvedToday}
          change="+15%"
          changeType="positive"
          icon={CheckCircle}
          variant="success"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <div className="xl:col-span-2 space-y-6">
          <SiteMap />
          <QuickActions />
        </div>
        <div>
          <ActivityFeed />
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Incidents */}
        <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h3 className="font-semibold text-foreground">Recent Incidents</h3>
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-destructive/10 text-destructive">
              {loading ? "…" : `${stats.openIncidents} Open`}
            </span>
          </div>
          <div className="p-4 space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Loading incidents…
              </p>
            ) : incidents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No open incidents
              </p>
            ) : (
              incidents.map((incident) => (
                <IncidentCard key={incident.id} {...incident} />
              ))
            )}
          </div>
        </div>

        {/* Personnel Status */}
        <PersonnelStatus />
      </div>
    </main>
  );
};

// ── helpers ──────────────────────────────────────────────────────────────────
function formatTime(isoString: string): string {
  if (!isoString) return "Unknown";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) > 1 ? "s" : ""} ago`;
}

export default Index;
