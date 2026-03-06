import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, Plus, Search, Filter, Edit, Trash2, Eye,
  CheckCircle, Clock, XCircle, MapPin, User, RefreshCw,
  Download, ChevronLeft, ChevronRight, ChevronsLeft,
  ChevronsRight, X, Shield, Zap, Activity, TrendingUp,
  FileText, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import api from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Incident {
  id: string;
  incident_code: string;
  title: string;
  description: string | null;
  siteId: string | null;
  siteName: string;
  siteCode: string;
  reportedBy: string;
  reportedById: string | null;
  timestamp: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "resolved" | "closed";
  category: string;
  location: string | null;
  gpsCoords: string | null;
  attachmentCount: number;
  assignedTo: string | null;
  resolvedAt: string | null;
  responseTime: string | null;
  notes: string | null;
}

interface Stats {
  total: number; open: number; investigating: number;
  resolved: number; closed: number;
  critical: number; high: number;
  last30Days: number; avgResponseTime: string;
}

interface Site { id: string; name: string; }
interface Personnel { id: string; name: string; }

// ── Config ────────────────────────────────────────────────────────────────────
const SEVERITIES = ["low", "medium", "high", "critical"] as const;
const STATUSES   = ["open", "investigating", "resolved", "closed"] as const;
const CATEGORIES = [
  "Theft", "Vandalism", "Trespassing", "Fire", "Medical",
  "Assault", "Suspicious Activity", "Equipment Failure",
  "Access Violation", "Other",
];

const severityConfig: Record<string, { color: string; bg: string; dot: string; label: string }> = {
  low:      { color: "text-muted-foreground", bg: "bg-muted",          dot: "bg-muted-foreground", label: "Low" },
  medium:   { color: "text-warning",          bg: "bg-warning/10",     dot: "bg-warning",          label: "Medium" },
  high:     { color: "text-orange-500",        bg: "bg-orange-500/10",  dot: "bg-orange-500",       label: "High" },
  critical: { color: "text-destructive",       bg: "bg-destructive/10", dot: "bg-destructive",      label: "Critical" },
};

const statusConfig: Record<string, { color: string; bg: string; dot: string; icon: any; label: string }> = {
  open:          { color: "text-destructive",      bg: "bg-destructive/10", dot: "bg-destructive",      icon: AlertTriangle, label: "Open" },
  investigating: { color: "text-warning",           bg: "bg-warning/10",     dot: "bg-warning",          icon: Activity,      label: "Investigating" },
  resolved:      { color: "text-success",           bg: "bg-success/10",     dot: "bg-success",          icon: CheckCircle,   label: "Resolved" },
  closed:        { color: "text-muted-foreground",  bg: "bg-muted",          dot: "bg-muted-foreground", icon: XCircle,       label: "Closed" },
};

const EMPTY_FORM = {
  title: "", description: "", siteId: "none", reportedById: "none",
  severity: "medium", category: "Other", location: "", gpsCoords: "", assignedTo: "",
};

const PAGE_SIZE = 10;

const fmt = (d: string) => new Date(d).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
const fmtDT = (d: string) => new Date(d).toLocaleString("en-KE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, bg }: any) {
  return (
    <div className="glass-card rounded-xl p-3 sm:p-5 border border-border/50">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className={cn("text-lg sm:text-2xl font-bold mt-0.5 truncate", color)}>{value}</p>
        </div>
        <div className={cn("w-9 h-9 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0", bg)}>
          <Icon className={cn("w-4 h-4 sm:w-6 sm:h-6", color)} />
        </div>
      </div>
    </div>
  );
}

function Pagination({ page, total, pageSize, onChange }: any) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/30">
      <p className="text-xs text-muted-foreground order-2 sm:order-1">
        Showing {Math.min(total, (page - 1) * pageSize + 1)}–{Math.min(total, page * pageSize)} of {total}
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

// ── Incident Form ─────────────────────────────────────────────────────────────
function IncidentForm({ form, setForm, sites, personnel, isEdit = false }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Title *</Label>
          <Input placeholder="e.g. Unauthorized access at Gate B" value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Severity *</Label>
          <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SEVERITIES.map(s => <SelectItem key={s} value={s}>{capitalize(s)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Category *</Label>
          <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Site *</Label>
          <Select value={form.siteId} onValueChange={v => setForm({ ...form, siteId: v })}>
            <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Site</SelectItem>
              {sites.map((s: Site) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Reported By</Label>
          <Select value={form.reportedById} onValueChange={v => setForm({ ...form, reportedById: v })}>
            <SelectTrigger><SelectValue placeholder="Select personnel" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unknown</SelectItem>
              {personnel.map((p: Personnel) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {isEdit && (
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{capitalize(s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Location</Label>
          <Input placeholder="e.g. North Perimeter Fence" value={form.location}
            onChange={e => setForm({ ...form, location: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>GPS Coordinates</Label>
          <Input placeholder="-1.2921, 36.8219" value={form.gpsCoords}
            onChange={e => setForm({ ...form, gpsCoords: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Assigned To</Label>
          <Input placeholder="Name or ID of assignee" value={form.assignedTo}
            onChange={e => setForm({ ...form, assignedTo: e.target.value })} />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Description</Label>
          <textarea
            className="w-full px-3 py-2 rounded-lg border border-border bg-secondary text-sm resize-none h-24"
            placeholder="Describe the incident in detail..."
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
        {isEdit && (
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Notes / Updates</Label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-border bg-secondary text-sm resize-none h-20"
              placeholder="Investigation notes, updates..."
              value={form.notes ?? ""}
              onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── View Modal ────────────────────────────────────────────────────────────────
function ViewModal({ incident, onClose, onEdit }: { incident: Incident; onClose: () => void; onEdit: () => void }) {
  const sc = statusConfig[incident.status] ?? statusConfig.open;
  const sv = severityConfig[incident.severity] ?? severityConfig.medium;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", sv.bg)}>
              <AlertTriangle className={cn("w-5 h-5", sv.color)} />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg leading-tight">{incident.title}</DialogTitle>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full", sc.bg, sc.color)}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", sc.dot)} />{sc.label}
                </span>
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", sv.bg, sv.color)}>
                  {sv.label} Severity
                </span>
                <Badge variant="outline" className="text-xs">{incident.category}</Badge>
                <Badge variant="outline" className="text-xs font-mono">{incident.incident_code}</Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Site",        incident.siteName],
              ["Reported By", incident.reportedBy],
              ["Location",    incident.location || "—"],
              ["GPS",         incident.gpsCoords || "—"],
              ["Timestamp",   fmtDT(incident.timestamp)],
              ["Assigned To", incident.assignedTo || "—"],
              ["Resolved At", incident.resolvedAt ? fmtDT(incident.resolvedAt) : "—"],
              ["Response Time", incident.responseTime || "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <Label className="text-muted-foreground text-xs">{label}</Label>
                <p className="text-sm mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {incident.description && (
            <div>
              <Label className="text-muted-foreground text-xs">Description</Label>
              <p className="text-sm mt-1 p-3 rounded-lg bg-secondary/30">{incident.description}</p>
            </div>
          )}

          {incident.notes && (
            <div>
              <Label className="text-muted-foreground text-xs">Notes / Updates</Label>
              <p className="text-sm mt-1 p-3 rounded-lg bg-secondary/30">{incident.notes}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Close</Button>
          <Button onClick={onEdit} className="w-full sm:w-auto"><Edit className="w-4 h-4 mr-2" />Edit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export const IncidentsPage = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats]         = useState<Stats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [activeTab, setActiveTab] = useState("all");

  // filters
  const [search, setSearch]               = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus]   = useState("all");

  // modals
  const [isAddOpen, setIsAddOpen]     = useState(false);
  const [isEditOpen, setIsEditOpen]   = useState(false);
  const [viewItem, setViewItem]       = useState<Incident | null>(null);
  const [editItem, setEditItem]       = useState<Incident | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Incident | null>(null);

  // forms
  const [form, setForm]         = useState<any>({ ...EMPTY_FORM });
  const [editForm, setEditForm] = useState<any>({});

  // options
  const [sites, setSites]         = useState<Site[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const params: any = { page: 1, limit: 200 };
      if (filterSeverity !== "all") params.severity = filterSeverity;
      if (filterStatus   !== "all") params.status   = filterStatus;
      if (search)                   params.search   = search;
      const res = await api.get("/incidents", { params });
      setIncidents(res.data.data.incidents);
      setPage(1);
    } catch (e) { console.error("Fetch incidents:", e); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/incidents/stats");
      setStats(res.data.data);
    } catch (e) { console.error("Fetch stats:", e); }
  };

  const fetchOptions = async () => {
    try {
      const [s, p] = await Promise.all([
        api.get("/sites",     { params: { limit: 200 } }),
        api.get("/personnel", { params: { limit: 200, status: "active" } }),
      ]);
      setSites(s.data.data.sites         || []);
      setPersonnel(p.data.data.personnel || []);
    } catch (e) { console.error("Fetch options:", e); }
  };

  useEffect(() => { fetchIncidents(); }, [filterSeverity, filterStatus, search]);
  useEffect(() => { fetchStats(); fetchOptions(); }, []);

  // ── tab + pagination ───────────────────────────────────────────────────────
  const displayed = activeTab === "all"
    ? incidents
    : incidents.filter(i => i.status === activeTab);

  const paged = displayed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── actions ────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.title || !form.severity || !form.category)
      return alert("Title, severity, and category are required.");
    try {
      await api.post("/incidents", {
        ...form,
        siteId:      form.siteId      === "none" ? null : form.siteId,
        reportedById: form.reportedById === "none" ? null : form.reportedById,
      });
      setIsAddOpen(false);
      setForm({ ...EMPTY_FORM });
      fetchIncidents(); fetchStats();
    } catch (e: any) { alert(e.response?.data?.message || "Failed to create incident"); }
  };

  const openEdit = (inc: Incident) => {
    setEditItem(inc);
    setEditForm({
      title:       inc.title,
      description: inc.description || "",
      severity:    inc.severity,
      status:      inc.status,
      category:    inc.category,
      location:    inc.location    || "",
      gpsCoords:   inc.gpsCoords   || "",
      assignedTo:  inc.assignedTo  || "",
      notes:       inc.notes       || "",
      siteId:      inc.siteId      || "none",
      reportedById: "none",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    try {
      await api.put(`/incidents/${editItem.id}`, {
        ...editForm,
        siteId: editForm.siteId === "none" ? null : editForm.siteId,
      });
      setIsEditOpen(false);
      fetchIncidents(); fetchStats();
    } catch (e: any) { alert(e.response?.data?.message || "Failed to update incident"); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/incidents/${id}`);
      fetchIncidents(); fetchStats();
    } catch (e: any) { alert(e.response?.data?.message || "Failed to delete incident"); }
    finally { setDeleteTarget(null); }
  };

  const s = stats;

  return (
    <div className="min-h-screen bg-background px-3 py-4 sm:px-6 sm:py-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
              <AlertTriangle className="w-5 h-5 sm:w-8 sm:h-8 text-destructive flex-shrink-0" />
              <span className="truncate">Incidents</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              Report, track and resolve security incidents
            </p>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <Button variant="outline" size="icon" onClick={() => { fetchIncidents(); fetchStats(); }}>
              <RefreshCw className="w-4 h-4" />
            </Button>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-4">
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Report Incident</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl">
                <DialogHeader>
                  <DialogTitle>Report New Incident</DialogTitle>
                  <DialogDescription>Document a security incident or breach</DialogDescription>
                </DialogHeader>
                <IncidentForm form={form} setForm={setForm} sites={sites} personnel={personnel} />
                <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
                  <Button variant="outline" onClick={() => setIsAddOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                  <Button onClick={handleCreate} className="w-full sm:w-auto">Report Incident</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          <StatCard label="Total"          value={s?.total       ?? 0} icon={FileText}      color="text-foreground"  bg="bg-primary/10" />
          <StatCard label="Open"           value={s?.open        ?? 0} icon={AlertTriangle} color="text-destructive" bg="bg-destructive/10" />
          <StatCard label="Investigating"  value={s?.investigating ?? 0} icon={Activity}   color="text-warning"     bg="bg-warning/10" />
          <StatCard label="Resolved"       value={s?.resolved    ?? 0} icon={CheckCircle}   color="text-success"     bg="bg-success/10" />
          <StatCard label="Critical"       value={s?.critical    ?? 0} icon={Zap}           color="text-destructive" bg="bg-destructive/10" />
          <StatCard label="Last 30 Days"   value={s?.last30Days  ?? 0} icon={Calendar}      color="text-primary"     bg="bg-primary/10" />
        </div>

        {/* Avg response time banner */}
        {s?.avgResponseTime && s.avgResponseTime !== "—" && (
          <div className="glass-card rounded-xl px-4 py-3 border border-border/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Average Response Time</p>
              <p className="text-sm font-semibold text-foreground">{s.avgResponseTime}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="glass-card rounded-xl p-3 sm:p-5 border border-border/50">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search incidents..." className="pl-10" value={search}
                onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger><SelectValue placeholder="All Severities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                {SEVERITIES.map(s => <SelectItem key={s} value={s}>{capitalize(s)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{capitalize(s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs + Table */}
        <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setPage(1); }}>
          <div className="overflow-x-auto pb-1">
            <TabsList className="inline-flex w-max min-w-full sm:grid sm:w-full sm:grid-cols-5">
              <TabsTrigger value="all"          className="text-xs sm:text-sm">All</TabsTrigger>
              <TabsTrigger value="open"         className="text-xs sm:text-sm">Open</TabsTrigger>
              <TabsTrigger value="investigating" className="text-xs sm:text-sm">Investigating</TabsTrigger>
              <TabsTrigger value="resolved"     className="text-xs sm:text-sm">Resolved</TabsTrigger>
              <TabsTrigger value="closed"       className="text-xs sm:text-sm">Closed</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="mt-4">
            {loading ? (
              <div className="text-center py-16">
                <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-muted-foreground text-sm">Loading incidents...</p>
              </div>
            ) : displayed.length === 0 ? (
              <div className="text-center py-16">
                <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-sm">No incidents found</p>
              </div>
            ) : (
              <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[750px]">
                    <thead className="bg-secondary/30 border-b border-border/50">
                      <tr>
                        {["Incident", "Category", "Site / Location", "Severity", "Status", "Time", "Actions"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {paged.map(inc => {
                        const sc = statusConfig[inc.status]   ?? statusConfig.open;
                        const sv = severityConfig[inc.severity] ?? severityConfig.medium;
                        const StatusIcon = sc.icon;
                        return (
                          <tr key={inc.id} className="hover:bg-secondary/20 transition-colors">
                            {/* Incident */}
                            <td className="px-4 py-3">
                              <div className="flex items-start gap-2.5">
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", sv.bg)}>
                                  <AlertTriangle className={cn("w-3.5 h-3.5", sv.color)} />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground truncate max-w-[180px]">{inc.title}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{inc.incident_code}</p>
                                  {inc.reportedBy !== "—" && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                      <User className="w-3 h-3" />{inc.reportedBy}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            {/* Category */}
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="text-xs">{inc.category}</Badge>
                            </td>
                            {/* Site / Location */}
                            <td className="px-4 py-3">
                              <p className="text-xs font-medium text-foreground truncate max-w-[120px]">{inc.siteName}</p>
                              {inc.location && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                  <MapPin className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate max-w-[100px]">{inc.location}</span>
                                </div>
                              )}
                            </td>
                            {/* Severity */}
                            <td className="px-4 py-3">
                              <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap", sv.bg, sv.color)}>
                                <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", sv.dot)} />
                                {sv.label}
                              </span>
                            </td>
                            {/* Status */}
                            <td className="px-4 py-3">
                              <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap", sc.bg, sc.color)}>
                                <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", sc.dot)} />
                                {sc.label}
                              </span>
                            </td>
                            {/* Time */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <p className="text-xs text-foreground">{fmt(inc.timestamp)}</p>
                            </td>
                            {/* Actions */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-0.5">
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => setViewItem(inc)} title="View">
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => openEdit(inc)} title="Edit">
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeleteTarget(inc)} title="Delete">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {displayed.length > PAGE_SIZE && (
                  <Pagination page={page} total={displayed.length} pageSize={PAGE_SIZE} onChange={setPage} />
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* View Modal */}
        {viewItem && (
          <ViewModal
            incident={viewItem}
            onClose={() => setViewItem(null)}
            onEdit={() => { setViewItem(null); openEdit(viewItem); }}
          />
        )}

        {/* Edit Modal */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl">
            <DialogHeader>
              <DialogTitle>Edit Incident</DialogTitle>
              <DialogDescription>{editItem?.incident_code} — {editItem?.title}</DialogDescription>
            </DialogHeader>
            <IncidentForm form={editForm} setForm={setEditForm} sites={sites} personnel={personnel} isEdit />
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)} className="w-full sm:w-auto">Cancel</Button>
              <Button onClick={handleUpdate} className="w-full sm:w-auto">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
            <div className="relative z-10 w-full max-w-sm rounded-xl bg-background border border-border shadow-xl p-6 flex flex-col gap-4">
              <h2 className="text-base font-semibold">Delete Incident</h2>
              <p className="text-sm text-muted-foreground">
                Delete <strong>{deleteTarget.incident_code}</strong> — <strong>{deleteTarget.title}</strong>? This cannot be undone.
              </p>
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                <Button variant="destructive" onClick={() => handleDelete(deleteTarget.id)}>Delete</Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default IncidentsPage;