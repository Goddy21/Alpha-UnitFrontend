import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  BarChart3, Download, RefreshCw, TrendingDown, TrendingUp,
  Users, AlertTriangle, Clock, DollarSign,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
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
const PAGE_SIZE = 10;

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ page, total, pageSize, onChange }: {
  page: number; total: number; pageSize: number; onChange: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = Math.min(total, (page - 1) * pageSize + 1);
  const to   = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/30">
      <p className="text-xs text-muted-foreground order-2 sm:order-1">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-1 order-1 sm:order-2">
        <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => onChange(1)}>
          <ChevronsLeft className="w-3.5 h-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <span className="text-xs px-2 font-medium">{page} / {totalPages}</span>
        <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === totalPages} onClick={() => onChange(page + 1)}>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === totalPages} onClick={() => onChange(totalPages)}>
          <ChevronsRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── component ─────────────────────────────────────────────────────────────────
export const ReportsPage = () => {
  const [kpis, setKpis]                 = useState<KPIs | null>(null);
  const [trends, setTrends]             = useState<IncidentTrend[]>([]);
  const [guardPerf, setGuardPerf]       = useState<GuardPerf[]>([]);
  const [siteCoverage, setSiteCoverage] = useState<SiteCoverage[]>([]);
  const [loading, setLoading]           = useState(true);
  const [guardPage, setGuardPage]       = useState(1);
  const [sitePage, setSitePage]         = useState(1);

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

  const severityPie = trends.length > 0 ? [
    { name: "Critical", value: trends.reduce((s, t) => s + parseInt(String(t.critical)), 0) },
    { name: "High",     value: trends.reduce((s, t) => s + parseInt(String(t.high)), 0) },
    { name: "Other",    value: trends.reduce((s, t) => s + Math.max(0, parseInt(String(t.total)) - parseInt(String(t.critical)) - parseInt(String(t.high))), 0) },
  ] : [];

  const pagedGuards = guardPerf.slice((guardPage - 1) * PAGE_SIZE, guardPage * PAGE_SIZE);
  const pagedSites  = siteCoverage.slice((sitePage  - 1) * PAGE_SIZE, sitePage  * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-background px-3 py-4 sm:px-6 sm:py-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
              <BarChart3 className="w-5 h-5 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
              <span className="truncate">Reports & Analytics</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              Comprehensive insights and performance metrics
            </p>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <Button variant="outline" size="icon" title="Refresh" onClick={fetchAll}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button size="icon" title="Export Report">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground text-sm">Loading analytics...</p>
          </div>
        ) : (
          <>
            {/* KPI Cards — 2 col mobile, 4 col md+ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
              {/* Incidents */}
              <div className="glass-card rounded-xl p-3 sm:p-5 border border-border/50">
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
                  {kpis && kpis.incidentTrend <= 0
                    ? <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-success" />
                    : <TrendingUp   className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-destructive" />}
                </div>
                <p className="text-xs text-muted-foreground">Incidents This Month</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground mt-0.5">{kpis?.incidentsThisMonth ?? 0}</p>
                {kpis && (
                  <p className={cn("text-xs mt-1", kpis.incidentTrend <= 0 ? "text-success" : "text-destructive")}>
                    {kpis.incidentTrend > 0 ? "↑" : "↓"} {Math.abs(kpis.incidentTrend)}% vs last month
                  </p>
                )}
              </div>

              {/* Response Time */}
              <div className="glass-card rounded-xl p-3 sm:p-5 border border-border/50">
                <div className="mb-1.5 sm:mb-2">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground mt-0.5">{kpis?.avgResponseTime ?? 0}m</p>
                <p className="text-xs text-muted-foreground mt-1">Across all incidents</p>
              </div>

              {/* Attendance */}
              <div className="glass-card rounded-xl p-3 sm:p-5 border border-border/50">
                <div className="mb-1.5 sm:mb-2">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                </div>
                <p className="text-xs text-muted-foreground">Guard Attendance</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground mt-0.5">{kpis?.guardAttendance ?? 0}%</p>
                <p className="text-xs text-muted-foreground mt-1">{kpis?.totalPersonnel ?? 0} active personnel</p>
              </div>

              {/* Revenue */}
              <div className="glass-card rounded-xl p-3 sm:p-5 border border-border/50">
                <div className="mb-1.5 sm:mb-2">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                </div>
                <p className="text-xs text-muted-foreground">Revenue Collected</p>
                <p className="text-xl sm:text-3xl font-bold text-foreground mt-0.5 truncate">
                  KES {(((kpis?.collected ?? 0)) / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  of KES {((kpis?.totalRevenue ?? 0) / 1000).toFixed(0)}K total
                </p>
              </div>
            </div>

            {/* Charts row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

              {/* Incident Trends Line Chart */}
              <div className="glass-card rounded-xl p-4 sm:p-6 border border-border/50">
                <h3 className="font-semibold text-foreground mb-3 sm:mb-4 text-sm sm:text-base">
                  Incident Trends (6 months)
                </h3>
                {trends.length === 0 ? (
                  <div className="h-48 sm:h-64 bg-secondary/30 rounded-lg flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">No incident data yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={trends} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={32} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
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
              <div className="glass-card rounded-xl p-4 sm:p-6 border border-border/50">
                <h3 className="font-semibold text-foreground mb-3 sm:mb-4 text-sm sm:text-base">
                  Incidents by Severity
                </h3>
                {severityPie.every(s => s.value === 0) ? (
                  <div className="h-48 sm:h-64 bg-secondary/30 rounded-lg flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">No incident data yet</p>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={severityPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                          dataKey="value" paddingAngle={3}>
                          {severityPie.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-row sm:flex-col gap-3 sm:gap-3 flex-wrap justify-center sm:justify-start">
                      {severityPie.map((s, i) => (
                        <div key={s.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i] }} />
                          <span className="text-xs sm:text-sm text-muted-foreground">{s.name}</span>
                          <span className="text-xs sm:text-sm font-semibold ml-1">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Charts row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

              {/* Guard Performance Bar */}
              <div className="glass-card rounded-xl p-4 sm:p-6 border border-border/50">
                <h3 className="font-semibold text-foreground mb-3 sm:mb-4 text-sm sm:text-base">
                  Top Guard Performance
                </h3>
                {guardPerf.length === 0 ? (
                  <div className="h-48 sm:h-64 bg-secondary/30 rounded-lg flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">No guard data yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={guardPerf.slice(0, 8)} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      />
                      <Bar dataKey="completed_shifts" name="Shifts Done" fill="hsl(var(--primary))" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Site Coverage Bar */}
              <div className="glass-card rounded-xl p-4 sm:p-6 border border-border/50">
                <h3 className="font-semibold text-foreground mb-3 sm:mb-4 text-sm sm:text-base">
                  Site Coverage
                </h3>
                {siteCoverage.length === 0 ? (
                  <div className="h-48 sm:h-64 bg-secondary/30 rounded-lg flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">No site data yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={siteCoverage.slice(0, 8)} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={32} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      />
                      <Bar dataKey="total_shifts"   name="Total Shifts" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                      <Bar dataKey="incident_count" name="Incidents"    fill="hsl(var(--warning))" radius={[4,4,0,0]} />
                      <Bar dataKey="camera_count"   name="Cameras"      fill="hsl(var(--success))" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Guard Performance Table */}
            {guardPerf.length > 0 && (
              <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
                <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-border/50">
                  <h3 className="font-semibold text-foreground text-sm sm:text-base">Guard Performance Detail</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead className="bg-secondary/30 border-b border-border/50">
                      <tr>
                        {["Guard","Code","Total Shifts","Completed","Attendance","Incidents"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {pagedGuards.map(g => (
                        <tr key={g.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-foreground truncate max-w-[140px]">{g.name}</td>
                          <td className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">{g.guard_code}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{g.total_shifts}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{g.completed_shifts}</td>
                          <td className="px-4 py-3">
                            <span className={cn("text-sm font-semibold",
                              parseFloat(String(g.attendance_rate)) >= 90 ? "text-success" :
                              parseFloat(String(g.attendance_rate)) >= 70 ? "text-warning" : "text-destructive"
                            )}>
                              {g.attendance_rate ?? 0}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">{g.incidents_reported}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {guardPerf.length > PAGE_SIZE && (
                  <Pagination page={guardPage} total={guardPerf.length} pageSize={PAGE_SIZE} onChange={setGuardPage} />
                )}
              </div>
            )}

            {/* Site Coverage Table */}
            {siteCoverage.length > 0 && (
              <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
                <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-border/50">
                  <h3 className="font-semibold text-foreground text-sm sm:text-base">Site Coverage Detail</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead className="bg-secondary/30 border-b border-border/50">
                      <tr>
                        {["Site","Status","Total Shifts","Active Shifts","Incidents","Cameras"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {pagedSites.map(s => (
                        <tr key={s.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-foreground truncate max-w-[150px]">{s.name}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap",
                              s.status === "active"
                                ? "bg-success/10 text-success"
                                : "bg-muted text-muted-foreground"
                            )}>
                              {s.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">{s.total_shifts}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{s.active_shifts}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{s.incident_count}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{s.camera_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {siteCoverage.length > PAGE_SIZE && (
                  <Pagination page={sitePage} total={siteCoverage.length} pageSize={PAGE_SIZE} onChange={setSitePage} />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;