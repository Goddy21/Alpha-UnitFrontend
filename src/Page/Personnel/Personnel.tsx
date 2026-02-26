// src/pages/Personnel.tsx
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Users, UserPlus, Search, Shield, Award, Calendar,
  Edit, Eye, Trash2, CheckCircle, AlertTriangle, Download,
  X, Info, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  MoreVertical, RefreshCw, Phone, Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Certification {
  id?: string;
  name: string;
  issueDate: string;
  expiryDate: string;
  status: "valid" | "expiring" | "expired";
}

interface Guard {
  id: string;
  guard_code?: string;
  name: string;
  employeeId: string;
  phone: string;
  email: string;
  psraLicense: string;
  psraExpiry: string;
  status: "active" | "on-leave" | "inactive" | "suspended";
  currentSite: string;
  joinDate: string;
  certifications: Certification[];
  trainingHours: number;
  rating: number;
  shiftsCompleted: number;
  incidentsReported: number;
}

interface Stats {
  total: number; active: number; onLeave: number;
  inactive: number; suspended: number;
  avgRating: number; totalShifts: number; expiringCerts: number;
}

interface ToastMsg {
  id: string; type: "success" | "error" | "warning" | "info"; title: string; message: string;
}

interface ConfirmCfg {
  open: boolean; title: string; message: string; onConfirm: () => void; variant?: "danger" | "warning";
}

// ── Config ────────────────────────────────────────────────────────────────────
const statusConfig = {
  active:     { color: "text-success",          bg: "bg-success/10",     dot: "bg-success",          label: "Active" },
  "on-leave": { color: "text-warning",          bg: "bg-warning/10",     dot: "bg-warning",          label: "On Leave" },
  inactive:   { color: "text-muted-foreground", bg: "bg-muted",          dot: "bg-muted-foreground", label: "Inactive" },
  suspended:  { color: "text-destructive",      bg: "bg-destructive/10", dot: "bg-destructive",      label: "Suspended" },
};

const certStatusConfig = {
  valid:    { color: "text-success",     bg: "bg-success/10" },
  expiring: { color: "text-warning",     bg: "bg-warning/10" },
  expired:  { color: "text-destructive", bg: "bg-destructive/10" },
};

const EMPTY_GUARD = { name: "", phone: "", email: "", psraLicense: "", psraExpiry: "", joinDate: "" };

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
          <button onClick={() => onRemove(t.id)}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground mt-0.5 transition-colors">
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

// ── Star Rating ───────────────────────────────────────────────────────────────
const StarRating = ({ value }: { value: number }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map(s => (
      <div key={s} className={cn("w-2.5 h-2.5 rounded-sm", s <= Math.round(value) ? "bg-warning" : "bg-muted")} />
    ))}
    <span className="text-xs text-muted-foreground ml-1">{(value || 0).toFixed(1)}</span>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
export const PersonnelPage = () => {
  const [guards,       setGuards]       = useState<Guard[]>([]);
  const [stats,        setStats]        = useState<Stats | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [searchTerm,   setSearchTerm]   = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isAddOpen,    setIsAddOpen]    = useState(false);
  const [selectedGuard, setSelectedGuard] = useState<Guard | null>(null);
  const [isViewOpen,   setIsViewOpen]   = useState(false);
  const [expandedRow,  setExpandedRow]  = useState<string | null>(null);
  const [pagination,   setPagination]   = useState({ page: 1, limit: 10, total: 0, pages: 0 });

  const [newGuard, setNewGuard] = useState({ ...EMPTY_GUARD });
  const [toasts,   setToasts]  = useState<ToastMsg[]>([]);
  const [confirm,  setConfirm] = useState<ConfirmCfg>({ open: false, title: "", message: "", onConfirm: () => {} });

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const addToast = useCallback((type: ToastMsg["type"], title: string, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, type, title, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500);
  }, []);
  const removeToast = useCallback((id: string) => setToasts(t => t.filter(x => x.id !== id)), []);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => { fetchGuards(); fetchStats(); }, [searchTerm, filterStatus, pagination.page]);

  const fetchGuards = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page, limit: pagination.limit,
        ...(searchTerm && { search: searchTerm }),
        ...(filterStatus !== "all" && { status: filterStatus }),
      };
      const response = await api.get("/personnel", { params });
      setGuards(response.data.data.personnel);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error("Error fetching personnel:", error);
      addToast("error", "Failed to load personnel", "Could not fetch guard list.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get("/personnel/stats");
      setStats(response.data.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleAddGuard = async () => {
    if (!newGuard.name) {
      addToast("warning", "Missing field", "Full name is required.");
      return;
    }
    try {
      await api.post("/personnel", {
        name: newGuard.name, phone: newGuard.phone, email: newGuard.email,
        psraLicense: newGuard.psraLicense, psraExpiry: newGuard.psraExpiry, joinDate: newGuard.joinDate,
      });
      setIsAddOpen(false);
      setNewGuard({ ...EMPTY_GUARD });
      fetchGuards(); fetchStats();
      addToast("success", "Guard added", `${newGuard.name} has been registered successfully.`);
    } catch (error: any) {
      console.error("Error creating guard:", error);
      addToast("error", "Create failed", error.response?.data?.message || "Failed to create guard.");
    }
  };

  const handleViewGuard = async (guardId: string) => {
    try {
      const response = await api.get(`/personnel/${guardId}`);
      setSelectedGuard(response.data.data);
      setIsViewOpen(true);
    } catch (error) {
      console.error("Error fetching guard details:", error);
      addToast("error", "Load failed", "Failed to load guard details.");
    }
  };

  const handleDeleteGuard = (guard: Guard) => {
    setConfirm({
      open: true, variant: "danger",
      title: "Delete Guard",
      message: `Are you sure you want to delete ${guard.name}? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await api.delete(`/personnel/${guard.id}`);
          fetchGuards(); fetchStats();
          addToast("success", "Guard deleted", `${guard.name} has been removed.`);
        } catch (error: any) {
          console.error("Error deleting guard:", error);
          addToast("error", "Delete failed", error.response?.data?.message || "Failed to delete guard.");
        }
      },
    });
  };

  // ── Derived stats ──────────────────────────────────────────────────────────
  const displayStats = stats ?? {
    total: guards.length,
    active: guards.filter(g => g.status === "active").length,
    onLeave: guards.filter(g => g.status === "on-leave").length,
    expiringCerts: guards.filter(g => g.certifications?.some(c => c.status === "expiring" || c.status === "expired")).length,
    inactive: 0, suspended: 0, avgRating: 0, totalShifts: 0,
  };

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
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
                <span>Personnel Management</span>
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Manage guard records, certifications, and compliance
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" className="gap-1.5"
                onClick={() => { fetchGuards(); fetchStats(); }}>
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    <span>Add Guard</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Guard</DialogTitle>
                    <DialogDescription>Register a new security guard and their credentials</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="guardName">Full Name *</Label>
                        <Input id="guardName" placeholder="John Doe" value={newGuard.name}
                          onChange={e => setNewGuard({ ...newGuard, name: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="guardPhone">Phone Number</Label>
                        <Input id="guardPhone" placeholder="+254 712 345 678" value={newGuard.phone}
                          onChange={e => setNewGuard({ ...newGuard, phone: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="guardEmail">Email</Label>
                        <Input id="guardEmail" type="email" placeholder="guard@example.com" value={newGuard.email}
                          onChange={e => setNewGuard({ ...newGuard, email: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="joinDate">Join Date</Label>
                        <Input id="joinDate" type="date" value={newGuard.joinDate}
                          onChange={e => setNewGuard({ ...newGuard, joinDate: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="psraLicense">PSRA License Number</Label>
                        <Input id="psraLicense" placeholder="PSRA/2024/XXXXXX" value={newGuard.psraLicense}
                          onChange={e => setNewGuard({ ...newGuard, psraLicense: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="psraExpiry">PSRA Expiry Date</Label>
                        <Input id="psraExpiry" type="date" value={newGuard.psraExpiry}
                          onChange={e => setNewGuard({ ...newGuard, psraExpiry: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="gap-2 flex-col sm:flex-row">
                    <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                    <Button className="w-full sm:w-auto" onClick={handleAddGuard}>Add Guard</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* ── Stats Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: "Total Guards",    value: displayStats.total,         color: "text-foreground",    bg: "bg-primary/10",     iconColor: "text-primary",     icon: Users },
              { label: "Active On Duty",  value: displayStats.active,        color: "text-success",       bg: "bg-success/10",     iconColor: "text-success",     icon: CheckCircle },
              { label: "On Leave",        value: displayStats.onLeave,       color: "text-warning",       bg: "bg-warning/10",     iconColor: "text-warning",     icon: Calendar },
              { label: "Expiring Certs",  value: displayStats.expiringCerts, color: "text-destructive",   bg: "bg-destructive/10", iconColor: "text-destructive", icon: AlertTriangle },
            ].map(({ label, value, color, bg, iconColor, icon: Icon }) => (
              <div key={label} className="glass-card rounded-xl p-4 sm:p-5 border border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
                    <p className={cn("text-2xl sm:text-3xl font-bold mt-1", color)}>{value}</p>
                  </div>
                  <div className={cn("w-9 h-9 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0", bg)}>
                    <Icon className={cn("w-4 h-4 sm:w-6 sm:h-6", iconColor)} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Filters ── */}
          <div className="glass-card rounded-xl p-3 sm:p-5 border border-border/50">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="sm:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by name, employee ID, or PSRA license..."
                  className="pl-10" value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} />
              </div>
              <Select value={filterStatus}
                onValueChange={v => { setFilterStatus(v); setPagination(p => ({ ...p, page: 1 })); }}>
                <SelectTrigger><SelectValue placeholder="Filter by status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on-leave">On Leave</SelectItem>
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
              <h3 className="font-semibold text-foreground text-sm">Guards</h3>
              <span className="text-xs text-muted-foreground">
                {loading ? "Loading…" : `${pagination.total ?? 0} total`}
              </span>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-muted-foreground text-sm">Loading personnel...</p>
              </div>
            ) : guards.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                <p className="font-medium text-foreground">No personnel found</p>
                <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or add a new guard</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-secondary/30 border-b border-border/50">
                      <tr>
                        {["Guard", "PSRA License", "Status", "Current Site", "Rating", "Actions"].map(h => (
                          <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {guards.map((guard, idx) => {
                        const conf = statusConfig[guard.status] ?? statusConfig.inactive;
                        return (
                          <tr key={guard.id}
                            className={cn("hover:bg-secondary/20 transition-colors",
                              idx % 2 === 0 ? "bg-transparent" : "bg-secondary/5")}>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-success/20 to-primary/20 border border-success/30 flex items-center justify-center flex-shrink-0">
                                  <Shield className="w-5 h-5 text-success" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground truncate">{guard.name}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{guard.employeeId}</p>
                                  <p className="text-xs text-muted-foreground truncate">{guard.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-sm font-mono text-foreground">{guard.psraLicense || "—"}</p>
                              <p className="text-xs text-muted-foreground">Exp: {guard.psraExpiry || "—"}</p>
                            </td>
                            <td className="px-5 py-4">
                              <span className={cn("text-xs font-medium px-2.5 py-1.5 rounded-full", conf.bg, conf.color)}>
                                {conf.label}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-sm text-muted-foreground">{guard.currentSite || "—"}</span>
                            </td>
                            <td className="px-5 py-4">
                              <StarRating value={guard.rating || 0} />
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleViewGuard(guard.id)}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteGuard(guard)}>
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
                  {guards.map(guard => {
                    const conf = statusConfig[guard.status] ?? statusConfig.inactive;
                    const expanded = expandedRow === guard.id;
                    return (
                      <div key={guard.id}>
                        {/* Summary row */}
                        <div
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/20 transition-colors"
                          onClick={() => setExpandedRow(expanded ? null : guard.id)}>
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-success/20 to-primary/20 border border-success/30 flex items-center justify-center flex-shrink-0">
                            <Shield className="w-4 h-4 text-success" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{guard.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{guard.employeeId}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className={cn("w-2 h-2 rounded-full", conf.dot)} />
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {expanded && (
                          <div className="px-4 pb-4 bg-secondary/10 border-t border-border/30 space-y-3">
                            <div className="grid grid-cols-2 gap-3 pt-3">
                              <div>
                                <p className="text-xs text-muted-foreground">Status</p>
                                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full inline-block mt-0.5", conf.bg, conf.color)}>
                                  {conf.label}
                                </span>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Rating</p>
                                <div className="mt-0.5"><StarRating value={guard.rating || 0} /></div>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">PSRA License</p>
                                <p className="text-xs font-mono mt-0.5">{guard.psraLicense || "—"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">PSRA Expiry</p>
                                <p className="text-sm mt-0.5">{guard.psraExpiry || "—"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Current Site</p>
                                <p className="text-sm mt-0.5">{guard.currentSite || "—"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Join Date</p>
                                <p className="text-sm mt-0.5">{guard.joinDate || "—"}</p>
                              </div>
                              {guard.phone && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Phone</p>
                                  <p className="text-sm mt-0.5">{guard.phone}</p>
                                </div>
                              )}
                              {guard.email && (
                                <div className="min-w-0">
                                  <p className="text-xs text-muted-foreground">Email</p>
                                  <p className="text-xs mt-0.5 truncate text-muted-foreground">{guard.email}</p>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 pt-1">
                              <Button variant="outline" size="sm" className="flex-1 text-xs"
                                onClick={() => { setExpandedRow(null); handleViewGuard(guard.id); }}>
                                <Eye className="w-3.5 h-3.5 mr-1" /> View
                              </Button>
                              <Button variant="outline" size="sm" className="flex-1 text-xs">
                                <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                              </Button>
                              <Button variant="outline" size="sm"
                                className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={() => { setExpandedRow(null); handleDeleteGuard(guard); }}>
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
                {pagination.pages > 1 && (
                  <div className="px-4 sm:px-5 py-3 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3 bg-secondary/10">
                    <p className="text-xs text-muted-foreground order-2 sm:order-1">
                      Page {pagination.page} of {pagination.pages} · {pagination.total} total
                    </p>
                    <div className="flex items-center gap-1 order-1 sm:order-2">
                      <Button variant="outline" size="icon" className="h-7 w-7"
                        disabled={pagination.page === 1}
                        onClick={() => setPagination(p => ({ ...p, page: 1 }))} title="First">
                        <ChevronsLeft className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-7 w-7"
                        disabled={pagination.page === 1}
                        onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} title="Prev">
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                      <div className="flex gap-1 mx-1">
                        {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                          let pg: number;
                          if (pagination.pages <= 5)                    pg = i + 1;
                          else if (pagination.page <= 3)                pg = i + 1;
                          else if (pagination.page >= pagination.pages - 2) pg = pagination.pages - 4 + i;
                          else                                          pg = pagination.page - 2 + i;
                          return (
                            <Button key={pg}
                              variant={pg === pagination.page ? "default" : "outline"}
                              size="icon" className="h-7 w-7 text-xs"
                              onClick={() => setPagination(p => ({ ...p, page: pg }))}>
                              {pg}
                            </Button>
                          );
                        })}
                      </div>
                      <Button variant="outline" size="icon" className="h-7 w-7"
                        disabled={pagination.page === pagination.pages}
                        onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} title="Next">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-7 w-7"
                        disabled={pagination.page === pagination.pages}
                        onClick={() => setPagination(p => ({ ...p, page: p.pages }))} title="Last">
                        <ChevronsRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Guard Details Modal ── */}
          <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Guard Profile</DialogTitle>
                <DialogDescription>Complete details for {selectedGuard?.name}</DialogDescription>
              </DialogHeader>
              {selectedGuard && (
                <Tabs defaultValue="personal" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="personal">Personal</TabsTrigger>
                    <TabsTrigger value="certifications">
                      Certs ({selectedGuard.certifications?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                  </TabsList>

                  {/* Personal Info */}
                  <TabsContent value="personal" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        ["Guard Code",   selectedGuard.guard_code || selectedGuard.id],
                        ["Employee ID",  selectedGuard.employeeId],
                        ["Full Name",    selectedGuard.name],
                        ["Phone",        selectedGuard.phone || "—"],
                        ["Email",        selectedGuard.email],
                        ["Join Date",    selectedGuard.joinDate || "—"],
                        ["PSRA License", selectedGuard.psraLicense],
                        ["PSRA Expiry",  selectedGuard.psraExpiry || "—"],
                        ["Current Site", selectedGuard.currentSite],
                        ["Status",       selectedGuard.status],
                      ].map(([label, val]) => (
                        <div key={label} className="p-3 rounded-lg bg-secondary/20 border border-border/30">
                          <Label className="text-muted-foreground text-xs">{label}</Label>
                          <p className="text-sm mt-1 font-medium capitalize break-words">{val || "—"}</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* Certifications */}
                  <TabsContent value="certifications" className="space-y-3 mt-4">
                    {selectedGuard.certifications?.length > 0 ? (
                      selectedGuard.certifications.map((cert, idx) => {
                        const certConf = certStatusConfig[cert.status] ?? certStatusConfig.valid;
                        return (
                          <div key={cert.id || idx}
                            className="p-4 rounded-lg bg-secondary/30 border border-border/50 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-sm">{cert.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">Issued: {cert.issueDate}</p>
                              <p className="text-xs text-muted-foreground">Expires: {cert.expiryDate}</p>
                            </div>
                            <Badge className={cn(certConf.bg, certConf.color, "flex-shrink-0 self-start")}>
                              {cert.status}
                            </Badge>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No certifications on record</p>
                    )}
                  </TabsContent>

                  {/* Performance */}
                  <TabsContent value="performance" className="mt-4">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      {[
                        { label: "Training Hours",    value: selectedGuard.trainingHours,    suffix: "hrs", color: "text-primary" },
                        { label: "Rating",            value: `${(selectedGuard.rating || 0).toFixed(1)} / 5.0`, suffix: "", color: "text-warning" },
                        { label: "Shifts Completed",  value: selectedGuard.shiftsCompleted,  suffix: "",    color: "text-success" },
                        { label: "Incidents Reported",value: selectedGuard.incidentsReported,suffix: "",    color: "text-foreground" },
                      ].map(({ label, value, suffix, color }) => (
                        <div key={label} className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                          <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
                          <p className={cn("text-2xl sm:text-3xl font-bold mt-1", color)}>
                            {value}{suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
                          </p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
              <DialogFooter className="gap-2 flex-col sm:flex-row mt-4">
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsViewOpen(false)}>Close</Button>
                <Button className="w-full sm:w-auto">
                  <Download className="w-4 h-4 mr-2" /> Export Profile
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </div>
    </>
  );
};

export default PersonnelPage;