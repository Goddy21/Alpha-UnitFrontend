import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  BarChart3, Download, RefreshCw, TrendingDown, TrendingUp,
  Users, Shield, AlertTriangle, Clock, MapPin, DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

// ── types ────────────────────────────────────────────────────────────────────
interface KPIs {
  incidentsThisMonth: number; incidentTrend: number;
  avgResponseTime: number; guardAttendance: number;
  totalPersonnel: number; totalSites: number;
  totalRevenue: number; collected: number; overdueInvoices: number;
}
interface IncidentTrend {
  month: string; total: number; critical: number; high: number; resolved: number; avg_response: number;
}
interface GuardPerf {
  id: string; name: string; guard_code: string;
  total_shifts: number; completed_shifts: number;
  incidents_reported: number; attendance_rate: number;
}
interface SiteCoverage {
  id: string; name: string; status: string;
  total_shifts: number; active_shifts: number;
  incident_count: number; camera_count: number;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--warning))", "hsl(var(--success))"];

// ── component ─────────────────────────────────────────────────────────────────
export const ReportsPage = () => {
  const [kpis, setKpis]               = useState<KPIs | null>(null);
  const [trends, setTrends]           = useState<IncidentTrend[]>([]);
  const [guardPerf, setGuardPerf]     = useState<GuardPerf[]>([]);
  const [siteCoverage, setSiteCoverage] = useState<SiteCoverage[]>([]);
  const [loading, setLoading]         = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [summaryRes, trendsRes, guardsRes, sitesRes] = await Promise.allSettled([
        api.get("/reports"),
        api.get("/reports/incident-trends"),
        api.get("/reports/guard-performance"),
        api.get("/reports/site-coverage"),
      ]);

      if (summaryRes.status === "fulfilled") setKpis(summaryRes.value.data.data.kpis);
      if (trendsRes.status  === "fulfilled") setTrends(trendsRes.value.data.data);
      if (guardsRes.status  === "fulfilled") setGuardPerf(guardsRes.value.data.data);
      if (sitesRes.status   === "fulfilled") setSiteCoverage(sitesRes.value.data.data);
    } catch (e) { console.error("Reports fetch error:", e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  // Incident severity breakdown for pie
  const severityPie = trends.length > 0 ? [
    { name: "Critical", value: trends.reduce((s, t) => s + parseInt(String(t.critical)), 0) },
    { name: "High",     value: trends.reduce((s, t) => s + parseInt(String(t.high)), 0) },
    { name: "Other",    value: trends.reduce((s, t) => s + Math.max(0, parseInt(String(t.total)) - parseInt(String(t.critical)) - parseInt(String(t.high))), 0) },
  ] : [];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-primary" />
              Reports & Analytics
            </h1>
            <p className="text-muted-foreground mt-1">Comprehensive insights and performance metrics</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={fetchAll}>
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
            <Button className="gap-2">
              <Download className="w-4 h-4" /> Export Report
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Incidents */}
              <div className="glass-card rounded-xl p-5 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  {kpis && kpis.incidentTrend <= 0
                    ? <TrendingDown className="w-4 h-4 text-success" />
                    : <TrendingUp className="w-4 h-4 text-destructive" />}
                </div>
                <p className="text-sm text-muted-foreground">Incidents This Month</p>
                <p className="text-3xl font-bold text-foreground mt-1">{kpis?.incidentsThisMonth ?? 0}</p>
                {kpis && (
                  <p className={cn("text-xs mt-1", kpis.incidentTrend <= 0 ? "text-success" : "text-destructive")}>
                    {kpis.incidentTrend > 0 ? "↑" : "↓"} {Math.abs(kpis.incidentTrend)}% vs last month
                  </p>
                )}
              </div>

              {/* Response Time */}
              <div className="glass-card rounded-xl p-5 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Avg Response Time</p>
                <p className="text-3xl font-bold text-foreground mt-1">{kpis?.avgResponseTime ?? 0}m</p>
                <p className="text-xs text-muted-foreground mt-1">Across all incidents</p>
              </div>

              {/* Attendance */}
              <div className="glass-card rounded-xl p-5 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-5 h-5 text-success" />
                </div>
                <p className="text-sm text-muted-foreground">Guard Attendance</p>
                <p className="text-3xl font-bold text-foreground mt-1">{kpis?.guardAttendance ?? 0}%</p>
                <p className="text-xs text-muted-foreground mt-1">{kpis?.totalPersonnel ?? 0} active personnel</p>
              </div>

              {/* Revenue */}
              <div className="glass-card rounded-xl p-5 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5 text-success" />
                </div>
                <p className="text-sm text-muted-foreground">Revenue Collected</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  KES {(((kpis?.collected ?? 0)) / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  of KES {((kpis?.totalRevenue ?? 0) / 1000).toFixed(0)}K total
                </p>
              </div>
            </div>

            {/* Charts row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Incident Trends Line Chart */}
              <div className="glass-card rounded-xl p-6 border border-border/50">
                <h3 className="font-semibold text-foreground mb-4">Incident Trends (6 months)</h3>
                {trends.length === 0 ? (
                  <div className="h-64 bg-secondary/30 rounded-lg flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">No incident data yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={256}>
                    <LineChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Line type="monotone" dataKey="total"    name="Total"    stroke="hsl(var(--primary))"     strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="critical" name="Critical" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="resolved" name="Resolved" stroke="hsl(var(--success))"     strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Incident Severity Pie */}
              <div className="glass-card rounded-xl p-6 border border-border/50">
                <h3 className="font-semibold text-foreground mb-4">Incidents by Severity</h3>
                {severityPie.every(s => s.value === 0) ? (
                  <div className="h-64 bg-secondary/30 rounded-lg flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">No incident data yet</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="60%" height={256}>
                      <PieChart>
                        <Pie data={severityPie} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                          dataKey="value" paddingAngle={3}>
                          {severityPie.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3">
                      {severityPie.map((s, i) => (
                        <div key={s.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                          <span className="text-sm text-muted-foreground">{s.name}</span>
                          <span className="text-sm font-semibold ml-auto">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Charts row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Guard Performance */}
              <div className="glass-card rounded-xl p-6 border border-border/50">
                <h3 className="font-semibold text-foreground mb-4">Top Guard Performance</h3>
                {guardPerf.length === 0 ? (
                  <div className="h-64 bg-secondary/30 rounded-lg flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">No guard data yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={256}>
                    <BarChart data={guardPerf.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      />
                      <Bar dataKey="completed_shifts" name="Shifts Done" fill="hsl(var(--primary))" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Site Coverage */}
              <div className="glass-card rounded-xl p-6 border border-border/50">
                <h3 className="font-semibold text-foreground mb-4">Site Coverage</h3>
                {siteCoverage.length === 0 ? (
                  <div className="h-64 bg-secondary/30 rounded-lg flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">No site data yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={256}>
                    <BarChart data={siteCoverage.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      />
                      <Bar dataKey="total_shifts"   name="Total Shifts"   fill="hsl(var(--primary))"  radius={[4,4,0,0]} />
                      <Bar dataKey="incident_count" name="Incidents"      fill="hsl(var(--warning))"  radius={[4,4,0,0]} />
                      <Bar dataKey="camera_count"   name="Cameras"        fill="hsl(var(--success))"  radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Guard Performance Table */}
            {guardPerf.length > 0 && (
              <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
                <div className="px-5 py-4 border-b border-border/50">
                  <h3 className="font-semibold text-foreground">Guard Performance Detail</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-secondary/30 border-b border-border/50">
                      <tr>
                        {["Guard","Code","Total Shifts","Completed","Attendance","Incidents Reported"].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-sm font-semibold text-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {guardPerf.map(g => (
                        <tr key={g.id} className="border-b border-border/30 hover:bg-secondary/20">
                          <td className="px-5 py-3 text-sm font-medium">{g.name}</td>
                          <td className="px-5 py-3 text-xs font-mono text-muted-foreground">{g.guard_code}</td>
                          <td className="px-5 py-3 text-sm">{g.total_shifts}</td>
                          <td className="px-5 py-3 text-sm">{g.completed_shifts}</td>
                          <td className="px-5 py-3 text-sm">
                            <span className={cn("font-semibold",
                              parseFloat(String(g.attendance_rate)) >= 90 ? "text-success" :
                              parseFloat(String(g.attendance_rate)) >= 70 ? "text-warning" : "text-destructive"
                            )}>
                              {g.attendance_rate ?? 0}%
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm">{g.incidents_reported}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;