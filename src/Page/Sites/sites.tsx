// src/pages/Sites.tsx
import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  MapPin, Plus, RefreshCw, Edit, Trash2, Eye,
  Building2, Users, Search, CheckCircle, AlertTriangle,
  XCircle, X, Info, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import api from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Site {
  id: string;
  name: string;
  siteCode: string;
  status: "active" | "inactive" | "suspended";
  address: string;
  county?: string;
  clientId?: string;
  clientName?: string;
  contactPerson?: string;
  contactPhone?: string;
  guardCount?: number;
  cameraCount?: number;
  riskLevel?: "low" | "medium" | "high" | "critical";
  notes?: string;
  createdAt?: string;
}

interface Stats { total: number; active: number; inactive: number; suspended: number; }
interface ClientOption { id: string; name: string; }
interface ToastMsg { id: string; type: "success" | "error" | "warning" | "info"; title: string; message: string; }
interface ConfirmCfg { open: boolean; title: string; message: string; onConfirm: () => void; variant?: "danger" | "warning"; }

// ── Config ────────────────────────────────────────────────────────────────────
const statusConfig = {
  active:    { color: "text-success",          bg: "bg-success/10",     label: "Active",    dot: "bg-success",          icon: CheckCircle },
  inactive:  { color: "text-muted-foreground", bg: "bg-muted",          label: "Inactive",  dot: "bg-muted-foreground", icon: XCircle },
  suspended: { color: "text-destructive",      bg: "bg-destructive/10", label: "Suspended", dot: "bg-destructive",      icon: AlertTriangle },
};

const riskConfig = {
  low:      { color: "text-success",     bg: "bg-success/10" },
  medium:   { color: "text-warning",     bg: "bg-warning/10" },
  high:     { color: "text-orange-400",  bg: "bg-orange-400/10" },
  critical: { color: "text-destructive", bg: "bg-destructive/10" },
};

const EMPTY_FORM = {
  name: "", address: "", county: "", clientId: "",
  contactPerson: "", contactPhone: "",
  status: "active" as const, riskLevel: "medium", notes: "",
};

const PAGE_SIZE = 15;

// ── Toast ─────────────────────────────────────────────────────────────────────
const ToastContainer = ({ toasts, onRemove }: { toasts: ToastMsg[]; onRemove: (id: string) => void }) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />,
    error:   <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />,
    info:    <Info className="w-5 h-5 text-primary flex-shrink-0" />,
  };
  const borders = { success: "border-l-success", error: "border-l-destructive", warning: "border-l-warning", info: "border-l-primary" };
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[min(380px,calc(100vw-2rem))]">
      {toasts.map(t => (
        <div key={t.id} className={cn(
          "glass-card rounded-xl border border-border/50 border-l-4 p-4 shadow-lg",
          "flex items-start gap-3 animate-in slide-in-from-right-5 duration-300", borders[t.type])}>
          {icons[t.type]}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">{t.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 break-words">{t.message}</p>
          </div>
          <button onClick={() => onRemove(t.id)} className="flex-shrink-0 text-muted-foreground hover:text-foreground mt-0.5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

// ── Confirm Dialog ────────────────────────────────────────────────────────────
const ConfirmDialog = ({ config, onClose }: { config: ConfirmCfg; onClose: () => void }) => (
  <Dialog open={config.open} onOpenChange={onClose}>
    <DialogContent className="w-[calc(100vw-2rem)] max-w-sm">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertTriangle className={cn("w-5 h-5", config.variant === "danger" ? "text-destructive" : "text-warning")} />
          {config.title}
        </DialogTitle>
        <DialogDescription>{config.message}</DialogDescription>
      </DialogHeader>
      <DialogFooter className="gap-2 flex-col sm:flex-row">
        <Button variant="outline" className="w-full sm:w-auto" onClick={onClose}>Cancel</Button>
        <Button variant={config.variant === "danger" ? "destructive" : "default"}
          className="w-full sm:w-auto"
          onClick={() => { config.onConfirm(); onClose(); }}>
          Confirm
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// ── Form Fields ───────────────────────────────────────────────────────────────
const SiteFormFields = ({
  data, set, clients,
}: { data: typeof EMPTY_FORM; set: (v: typeof EMPTY_FORM) => void; clients: ClientOption[] }) => (
  <div className="grid gap-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Site Name *</Label>
        <Input placeholder="e.g. Westgate Mall" value={data.name}
          onChange={e => set({ ...data, name: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={data.status} onValueChange={(v: any) => set({ ...data, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    <div className="space-y-2">
      <Label>Address *</Label>
      <Input placeholder="e.g. Westlands, Nairobi" value={data.address}
        onChange={e => set({ ...data, address: e.target.value })} />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>County / Area</Label>
        <Input placeholder="e.g. Nairobi" value={data.county}
          onChange={e => set({ ...data, county: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Risk Level</Label>
        <Select value={data.riskLevel} onValueChange={v => set({ ...data, riskLevel: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    <div className="space-y-2">
      <Label>Client (optional)</Label>
      <Select value={data.clientId || "none"} onValueChange={v => set({ ...data, clientId: v === "none" ? "" : v })}>
        <SelectTrigger><SelectValue placeholder="Assign to client" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No client assigned</SelectItem>
          {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Site Contact Person</Label>
        <Input placeholder="e.g. John Kamau" value={data.contactPerson}
          onChange={e => set({ ...data, contactPerson: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Contact Phone</Label>
        <Input placeholder="+254 7XX XXX XXX" value={data.contactPhone}
          onChange={e => set({ ...data, contactPhone: e.target.value })} />
      </div>
    </div>
    <div className="space-y-2">
      <Label>Notes</Label>
      <Textarea placeholder="Special instructions, access codes, hazards..." rows={3}
        value={data.notes} onChange={e => set({ ...data, notes: e.target.value })} />
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
export const SitesPage = () => {
  const [sites,        setSites]        = useState<Site[]>([]);
  const [stats,        setStats]        = useState<Stats | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [searchTerm,   setSearchTerm]   = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [clients,      setClients]      = useState<ClientOption[]>([]);
  const [page,         setPage]         = useState(1);
  const [total,        setTotal]        = useState(0);
  const [expandedRow,  setExpandedRow]  = useState<string | null>(null);

  const [isAddOpen,    setIsAddOpen]    = useState(false);
  const [isEditOpen,   setIsEditOpen]   = useState(false);
  const [isViewOpen,   setIsViewOpen]   = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [editingSite,  setEditingSite]  = useState<Site | null>(null);
  const [form,         setForm]         = useState<any>({ ...EMPTY_FORM });
  const [editForm,     setEditForm]     = useState<any>({});
  const [saving,       setSaving]       = useState(false);

  const [toasts,  setToasts]  = useState<ToastMsg[]>([]);
  const [confirm, setConfirm] = useState<ConfirmCfg>({ open: false, title: "", message: "", onConfirm: () => {} });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const addToast = useCallback((type: ToastMsg["type"], title: string, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, type, title, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500);
  }, []);
  const removeToast = useCallback((id: string) => setToasts(t => t.filter(x => x.id !== id)), []);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchSites = useCallback(async (p = page) => {
    try {
      setLoading(true);
      const params: Record<string, any> = { page: p, limit: PAGE_SIZE };
      if (filterStatus !== "all") params.status = filterStatus;
      if (searchTerm)             params.search = searchTerm;
      const res = await api.get("/sites", { params });
      const raw  = res.data?.data?.sites ?? res.data?.data ?? res.data?.sites ?? [];
      setSites(raw);
      const t = res.data?.data?.pagination?.total ?? res.data?.data?.total ?? raw.length;
      setTotal(t);
    } catch (e) {
      console.error("Error fetching sites:", e);
      addToast("error", "Failed to load sites", "Could not fetch site list.");
    } finally { setLoading(false); }
  }, [page, filterStatus, searchTerm, addToast]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/sites/stats");
      setStats(res.data.data);
    } catch (e) { console.error("Error fetching site stats:", e); }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const res = await api.get("/clients", { params: { limit: 200 } });
      setClients(res.data?.data?.clients ?? []);
    } catch (e) { console.error("Error fetching clients:", e); }
  }, []);

  useEffect(() => { setPage(1); }, [filterStatus, searchTerm]);
  useEffect(() => { fetchSites(page); }, [page, filterStatus, searchTerm]);
  useEffect(() => { fetchStats(); fetchClients(); }, []);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.name || !form.address) {
      addToast("warning", "Missing fields", "Site name and address are required.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/sites", form);
      setIsAddOpen(false);
      setForm({ ...EMPTY_FORM });
      fetchSites(1); fetchStats();
      addToast("success", "Site created", `"${form.name}" has been registered successfully.`);
    } catch (e: any) {
      addToast("error", "Create failed", e.response?.data?.message || "Failed to create site.");
    } finally { setSaving(false); }
  };

  const handleOpenEdit = (site: Site) => {
    setEditingSite(site);
    setEditForm({
      name:          site.name,
      address:       site.address || "",
      county:        site.county || "",
      clientId:      site.clientId || "",
      contactPerson: site.contactPerson || "",
      contactPhone:  site.contactPhone || "",
      status:        site.status,
      riskLevel:     site.riskLevel || "medium",
      notes:         site.notes || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingSite) return;
    setSaving(true);
    try {
      await api.put(`/sites/${editingSite.id}`, editForm);
      setIsEditOpen(false);
      fetchSites(); fetchStats();
      addToast("success", "Site updated", `"${editingSite.name}" has been updated.`);
    } catch (e: any) {
      addToast("error", "Update failed", e.response?.data?.message || "Failed to update site.");
    } finally { setSaving(false); }
  };

  const handleDelete = (site: Site) => {
    setConfirm({
      open: true, variant: "danger",
      title: "Delete Site",
      message: `Delete site "${site.name}"? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await api.delete(`/sites/${site.id}`);
          fetchSites(); fetchStats();
          addToast("success", "Site deleted", `"${site.name}" has been removed.`);
        } catch (e: any) {
          addToast("error", "Delete failed", e.response?.data?.message || "Failed to delete site.");
        }
      },
    });
  };

  const disp = stats ?? {
    total:     sites.length,
    active:    sites.filter(s => s.status === "active").length,
    inactive:  sites.filter(s => s.status === "inactive").length,
    suspended: sites.filter(s => s.status === "suspended").length,
  };

  const startRow = (page - 1) * PAGE_SIZE + 1;
  const endRow   = Math.min(page * PAGE_SIZE, total);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <ConfirmDialog config={confirm} onClose={() => setConfirm(c => ({ ...c, open: false }))} />

      <div className="min-h-screen bg-background p-3 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
                <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
                <span>Sites Management</span>
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">Manage all security deployment sites</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" className="gap-1.5"
                onClick={() => { fetchSites(); fetchStats(); }}>
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="w-4 h-4" /> Add Site</Button>
                </DialogTrigger>
                <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Site</DialogTitle>
                    <DialogDescription>Register a new security deployment site</DialogDescription>
                  </DialogHeader>
                  <SiteFormFields data={form} set={setForm} clients={clients} />
                  <DialogFooter className="mt-4 gap-2 flex-col sm:flex-row">
                    <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                    <Button className="w-full sm:w-auto" onClick={handleCreate} disabled={saving}>
                      {saving ? "Creating..." : "Create Site"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* ── Stats ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: "Total Sites", value: disp.total,     color: "text-foreground",          icon: Building2,      bg: "bg-primary/10",     iconColor: "text-primary" },
              { label: "Active",      value: disp.active,    color: "text-success",             icon: CheckCircle,    bg: "bg-success/10",     iconColor: "text-success" },
              { label: "Inactive",    value: disp.inactive,  color: "text-muted-foreground",    icon: XCircle,        bg: "bg-muted",          iconColor: "text-muted-foreground" },
              { label: "Suspended",   value: disp.suspended, color: "text-destructive",         icon: AlertTriangle,  bg: "bg-destructive/10", iconColor: "text-destructive" },
            ].map(({ label, value, color, icon: Icon, bg, iconColor }) => (
              <div key={label} className="glass-card rounded-xl p-4 sm:p-5 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
                  <div className={cn("w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0", bg)}>
                    <Icon className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", iconColor)} />
                  </div>
                </div>
                <p className={cn("text-2xl sm:text-3xl font-bold", color)}>{value}</p>
              </div>
            ))}
          </div>

          {/* ── Filters ── */}
          <div className="glass-card rounded-xl p-3 sm:p-4 border border-border/50">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search sites..." className="pl-10" value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setPage(1); }} />
              </div>
              <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Table Card ── */}
          <div className="glass-card rounded-xl border border-border/50 overflow-hidden">

            {/* Toolbar */}
            <div className="px-4 sm:px-5 py-3 border-b border-border/50 flex items-center justify-between bg-secondary/20">
              <h3 className="font-semibold text-foreground text-sm">Sites</h3>
              <span className="text-xs text-muted-foreground">
                {loading ? "Loading…" : total > 0 ? `${startRow}–${endRow} of ${total}` : "No sites"}
              </span>
            </div>

            {/* Empty state */}
            {!loading && sites.length === 0 ? (
              <div className="text-center py-16 px-4">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                <p className="font-medium text-foreground">No sites yet</p>
                <p className="text-sm text-muted-foreground mt-1">Click "Add Site" to register your first deployment site</p>
                <Button className="mt-4 gap-2" onClick={() => setIsAddOpen(true)}>
                  <Plus className="w-4 h-4" /> Add First Site
                </Button>
              </div>
            ) : loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-muted-foreground text-sm">Loading sites...</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-secondary/30 border-b border-border/50">
                      <tr>
                        {["Site", "Address", "Client", "Risk", "Guards", "Status", "Actions"].map(h => (
                          <th key={h} className="px-4 sm:px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {sites.map((site, idx) => {
                        const sc = statusConfig[site.status] ?? statusConfig.inactive;
                        const StatusIcon = sc.icon;
                        const rc = site.riskLevel ? riskConfig[site.riskLevel] : riskConfig.medium;
                        return (
                          <tr key={site.id}
                            className={cn("hover:bg-secondary/20 transition-colors",
                              idx % 2 === 0 ? "bg-transparent" : "bg-secondary/5")}>
                            <td className="px-4 sm:px-5 py-3">
                              <p className="text-sm font-medium">{site.name}</p>
                              <p className="text-xs font-mono text-muted-foreground">{site.siteCode}</p>
                            </td>
                            <td className="px-4 sm:px-5 py-3">
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                <p className="text-sm text-muted-foreground truncate max-w-[160px]">{site.address}</p>
                              </div>
                              {site.county && (
                                <p className="text-xs text-muted-foreground mt-0.5 pl-5">{site.county}</p>
                              )}
                            </td>
                            <td className="px-4 sm:px-5 py-3 text-sm text-muted-foreground">
                              {site.clientName || <span className="italic opacity-50">Unassigned</span>}
                            </td>
                            <td className="px-4 sm:px-5 py-3">
                              {site.riskLevel && (
                                <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full capitalize", rc.bg, rc.color)}>
                                  {site.riskLevel}
                                </span>
                              )}
                            </td>
                            <td className="px-4 sm:px-5 py-3">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Users className="w-3.5 h-3.5" />
                                {site.guardCount ?? 0}
                              </div>
                            </td>
                            <td className="px-4 sm:px-5 py-3">
                              <span className={cn("text-xs font-medium px-2.5 py-1.5 rounded-full flex items-center gap-1 w-fit", sc.bg, sc.color)}>
                                <StatusIcon className="w-3 h-3" /> {sc.label}
                              </span>
                            </td>
                            <td className="px-4 sm:px-5 py-3">
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm"
                                  onClick={() => { setSelectedSite(site); setIsViewOpen(true); }}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(site)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(site)}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list */}
                <div className="md:hidden divide-y divide-border/30">
                  {sites.map(site => {
                    const sc = statusConfig[site.status] ?? statusConfig.inactive;
                    const StatusIcon = sc.icon;
                    const rc = site.riskLevel ? riskConfig[site.riskLevel] : riskConfig.medium;
                    const expanded = expandedRow === site.id;
                    return (
                      <div key={site.id}>
                        {/* Summary row */}
                        <div
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/20 transition-colors"
                          onClick={() => setExpandedRow(expanded ? null : site.id)}>
                          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{site.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{site.address}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className={cn("w-2 h-2 rounded-full", sc.dot)} />
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>

                        {/* Expanded */}
                        {expanded && (
                          <div className="px-4 pb-4 bg-secondary/10 border-t border-border/30 space-y-3">
                            <div className="grid grid-cols-2 gap-3 pt-3">
                              <div>
                                <p className="text-xs text-muted-foreground">Site Code</p>
                                <p className="text-xs font-mono mt-0.5">{site.siteCode}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Status</p>
                                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-0.5", sc.bg, sc.color)}>
                                  <StatusIcon className="w-3 h-3" /> {sc.label}
                                </span>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Client</p>
                                <p className="text-sm mt-0.5">{site.clientName || "Unassigned"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Risk Level</p>
                                {site.riskLevel ? (
                                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full capitalize inline-block mt-0.5", rc.bg, rc.color)}>
                                    {site.riskLevel}
                                  </span>
                                ) : <p className="text-sm mt-0.5">—</p>}
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Guards</p>
                                <p className="text-sm font-semibold mt-0.5">{site.guardCount ?? 0}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">County</p>
                                <p className="text-sm mt-0.5">{site.county || "—"}</p>
                              </div>
                              {site.contactPerson && (
                                <div className="col-span-2">
                                  <p className="text-xs text-muted-foreground">Contact</p>
                                  <p className="text-sm mt-0.5">{site.contactPerson} {site.contactPhone ? `· ${site.contactPhone}` : ""}</p>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 pt-1">
                              <Button variant="outline" size="sm" className="flex-1 text-xs"
                                onClick={() => { setExpandedRow(null); setSelectedSite(site); setIsViewOpen(true); }}>
                                <Eye className="w-3.5 h-3.5 mr-1" /> View
                              </Button>
                              <Button variant="outline" size="sm" className="flex-1 text-xs"
                                onClick={() => { setExpandedRow(null); handleOpenEdit(site); }}>
                                <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                              </Button>
                              <Button variant="outline" size="sm"
                                className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={() => { setExpandedRow(null); handleDelete(site); }}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ── Pagination ── */}
                {totalPages > 1 && (
                  <div className="px-4 sm:px-5 py-3 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3 bg-secondary/10">
                    <p className="text-xs text-muted-foreground order-2 sm:order-1">
                      Page {page} of {totalPages}
                    </p>
                    <div className="flex items-center gap-1 order-1 sm:order-2">
                      <Button variant="outline" size="icon" className="h-7 w-7"
                        disabled={page === 1} onClick={() => setPage(1)} title="First">
                        <ChevronsLeft className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-7 w-7"
                        disabled={page === 1} onClick={() => setPage(p => p - 1)} title="Prev">
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                      <div className="flex gap-1 mx-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pg: number;
                          if (totalPages <= 5)        pg = i + 1;
                          else if (page <= 3)          pg = i + 1;
                          else if (page >= totalPages - 2) pg = totalPages - 4 + i;
                          else                         pg = page - 2 + i;
                          return (
                            <Button key={pg}
                              variant={pg === page ? "default" : "outline"}
                              size="icon" className="h-7 w-7 text-xs"
                              onClick={() => setPage(pg)}>
                              {pg}
                            </Button>
                          );
                        })}
                      </div>
                      <Button variant="outline" size="icon" className="h-7 w-7"
                        disabled={page === totalPages} onClick={() => setPage(p => p + 1)} title="Next">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-7 w-7"
                        disabled={page === totalPages} onClick={() => setPage(totalPages)} title="Last">
                        <ChevronsRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── View Modal ── */}
          <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="truncate">{selectedSite?.name}</span>
                </DialogTitle>
                <DialogDescription className="font-mono">{selectedSite?.siteCode}</DialogDescription>
              </DialogHeader>
              {selectedSite && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    ["Address",    selectedSite.address || "—"],
                    ["County",     selectedSite.county || "—"],
                    ["Client",     selectedSite.clientName || "Unassigned"],
                    ["Risk Level", selectedSite.riskLevel || "—"],
                    ["Status",     selectedSite.status],
                    ["Guards",     String(selectedSite.guardCount ?? 0)],
                    ["Cameras",    String(selectedSite.cameraCount ?? 0)],
                    ["Contact",    selectedSite.contactPerson || "—"],
                    ["Phone",      selectedSite.contactPhone || "—"],
                  ].map(([label, val]) => (
                    <div key={label} className="p-3 rounded-lg bg-secondary/20 border border-border/30">
                      <Label className="text-xs text-muted-foreground">{label}</Label>
                      <p className="text-sm mt-1 font-medium capitalize break-words">{val}</p>
                    </div>
                  ))}
                  {selectedSite.notes && (
                    <div className="col-span-1 sm:col-span-2 p-3 rounded-lg bg-secondary/20 border border-border/30">
                      <Label className="text-xs text-muted-foreground">Notes</Label>
                      <p className="text-sm mt-1">{selectedSite.notes}</p>
                    </div>
                  )}
                </div>
              )}
              <DialogFooter className="gap-2 flex-col sm:flex-row mt-2">
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsViewOpen(false)}>Close</Button>
                <Button className="w-full sm:w-auto"
                  onClick={() => { setIsViewOpen(false); if (selectedSite) handleOpenEdit(selectedSite); }}>
                  <Edit className="w-4 h-4 mr-2" /> Edit Site
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ── Edit Modal ── */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Site</DialogTitle>
                <DialogDescription className="truncate">
                  {editingSite?.name} — {editingSite?.siteCode}
                </DialogDescription>
              </DialogHeader>
              <SiteFormFields data={editForm} set={setEditForm} clients={clients} />
              <DialogFooter className="mt-4 gap-2 flex-col sm:flex-row">
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button className="w-full sm:w-auto" onClick={handleUpdate} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </div>
    </>
  );
};

export default SitesPage;