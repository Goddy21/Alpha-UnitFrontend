// src/pages/Clients.tsx
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { cn } from "@/lib/utils";
import {
  Building2, Plus, Search, MapPin, Phone, Mail, Calendar,
  DollarSign, AlertCircle, CheckCircle, Clock, TrendingUp,
  Edit, Eye, Trash2, Download, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown,
  X, RefreshCw, MoreVertical, Info,
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

interface Site {
  id: string;
  name: string;
  address: string;
  guardsRequired: number;
  guards_required?: number;
}

interface Contract {
  id: string;
  clientId: string;
  startDate: string;
  endDate: string;
  value: number;
  status: "active" | "pending" | "expired" | "terminated";
  billingCycle: "monthly" | "quarterly" | "annually";
  slaResponse: string;
  autoRenew: boolean;
}

interface Client {
  id: string;
  client_code?: string;
  name: string;
  industry: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  sites: Site[];
  contract: Contract | null;
  created_at: string;
  total_guards: number;
  monthly_value: number;
}

interface ToastMsg {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
}

interface ConfirmCfg {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  variant?: "danger" | "warning";
}

type SortField = "name" | "industry" | "total_guards" | "monthly_value" | "created_at";
type SortDir   = "asc" | "desc";

// ── Config ────────────────────────────────────────────────────────────────────

const contractStatusConfig = {
  active:     { color: "text-success",          bg: "bg-success/10",     icon: CheckCircle, label: "Active" },
  pending:    { color: "text-warning",          bg: "bg-warning/10",     icon: Clock,       label: "Pending" },
  expired:    { color: "text-destructive",      bg: "bg-destructive/10", icon: AlertCircle, label: "Expired" },
  terminated: { color: "text-muted-foreground", bg: "bg-muted",          icon: AlertCircle, label: "Terminated" },
};

// ── Mappers ───────────────────────────────────────────────────────────────────

const mapClient = (raw: any): Client => ({
  id: raw.id,
  client_code: raw.client_code,
  name: raw.name,
  industry: raw.industry,
  contact_person: raw.contact_person,
  email: raw.email,
  phone: raw.phone,
  address: raw.address,
  sites: raw.sites || [],
  contract: raw.contract_id ? {
    id: raw.contract_id,
    clientId: raw.id,
    status: raw.contract_status || "pending",
    startDate: raw.start_date || "",
    endDate: raw.end_date || "",
    value: raw.contract_value ?? 0,
    billingCycle: raw.billing_cycle || "monthly",
    slaResponse: raw.sla_response || "",
    autoRenew: raw.auto_renew ?? false,
  } : null,
  created_at: raw.created_at,
  total_guards: raw.total_guards || 0,
  monthly_value: raw.monthly_value || 0,
});

const mapClientDetail = (raw: any): Client => ({
  id: raw.id,
  client_code: raw.client_code,
  name: raw.name,
  industry: raw.industry,
  contact_person: raw.contact_person,
  email: raw.email,
  phone: raw.phone,
  address: raw.address,
  sites: (raw.sites || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    address: s.address,
    guardsRequired: s.guards_required || s.guardsRequired || 0,
    guards_required: s.guards_required,
  })),
  contract: raw.contract ? {
    id: raw.contract.id,
    clientId: raw.id,
    status: raw.contract.status || "pending",
    startDate: raw.contract.start_date || raw.contract.startDate || "",
    endDate: raw.contract.end_date || raw.contract.endDate || "",
    value: raw.contract.value ?? 0,
    billingCycle: raw.contract.billing_cycle || raw.contract.billingCycle || "monthly",
    slaResponse: raw.contract.sla_response || raw.contract.slaResponse || "",
    autoRenew: raw.contract.auto_renew ?? raw.contract.autoRenew ?? false,
  } : null,
  created_at: raw.created_at,
  total_guards: raw.total_guards || 0,
  monthly_value: raw.monthly_value || 0,
});

// ── Toast Component ───────────────────────────────────────────────────────────

const ToastContainer = ({ toasts, onRemove }: { toasts: ToastMsg[]; onRemove: (id: string) => void }) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />,
    error:   <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />,
    warning: <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />,
    info:    <Info className="w-5 h-5 text-primary flex-shrink-0" />,
  };
  const borders = {
    success: "border-l-success", error: "border-l-destructive",
    warning: "border-l-warning", info: "border-l-primary",
  };
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[min(380px,calc(100vw-2rem))]">
      {toasts.map(t => (
        <div key={t.id}
          className={cn(
            "glass-card rounded-xl border border-border/50 border-l-4 p-4 shadow-lg",
            "flex items-start gap-3 animate-in slide-in-from-right-5 duration-300",
            borders[t.type]
          )}>
          {icons[t.type]}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">{t.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 break-words">{t.message}</p>
          </div>
          <button onClick={() => onRemove(t.id)}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5">
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
          <AlertCircle className={cn("w-5 h-5", config.variant === "danger" ? "text-destructive" : "text-warning")} />
          {config.title}
        </DialogTitle>
        <DialogDescription>{config.message}</DialogDescription>
      </DialogHeader>
      <DialogFooter className="gap-2 flex-col sm:flex-row">
        <Button variant="outline" className="w-full sm:w-auto" onClick={onClose}>Cancel</Button>
        <Button
          variant={config.variant === "danger" ? "destructive" : "default"}
          className="w-full sm:w-auto"
          onClick={() => { config.onConfirm(); onClose(); }}>
          Confirm
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// ── Sort Icon ─────────────────────────────────────────────────────────────────

const SortIcon = ({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) => {
  if (field !== current) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
  return dir === "asc" ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />;
};

// ── Main Component ────────────────────────────────────────────────────────────

export const ClientsPage = () => {
  const [clients,         setClients]         = useState<Client[]>([]);
  const [stats,           setStats]           = useState<any>(null);
  const [loading,         setLoading]         = useState(true);
  const [searchTerm,      setSearchTerm]      = useState("");
  const [filterIndustry,  setFilterIndustry]  = useState("all");
  const [filterStatus,    setFilterStatus]    = useState("all");
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [selectedClient,  setSelectedClient]  = useState<Client | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [sortField,       setSortField]       = useState<SortField>("name");
  const [sortDir,         setSortDir]         = useState<SortDir>("asc");
  const [pagination,      setPagination]      = useState({ page: 1, limit: 15, total: 0, pages: 0 });
  const [expandedRow,     setExpandedRow]     = useState<string | null>(null);

  const [toasts,  setToasts]  = useState<ToastMsg[]>([]);
  const [confirm, setConfirm] = useState<ConfirmCfg>({
    open: false, title: "", message: "", onConfirm: () => {}, variant: "danger",
  });

  const [newClient, setNewClient] = useState({
    name: "", industry: "", contactPerson: "", email: "", phone: "", address: "",
  });

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const addToast = useCallback((type: ToastMsg["type"], title: string, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, type, title, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500);
  }, []);

  const removeToast = useCallback((id: string) => setToasts(t => t.filter(x => x.id !== id)), []);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => { fetchClients(); }, [searchTerm, filterIndustry, filterStatus, pagination.page, pagination.limit, sortField, sortDir]);
  useEffect(() => { fetchStats(); }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page:  pagination.page,
        limit: pagination.limit,
        sort:  `${sortField}:${sortDir}`,
      };
      if (searchTerm)               params.search   = searchTerm;
      if (filterIndustry !== "all") params.industry = filterIndustry;
      if (filterStatus   !== "all") params.status   = filterStatus;

      const response = await api.get("/clients", { params });
      setClients(response.data.data.clients.map(mapClient));
      setPagination(prev => ({ ...prev, ...response.data.data.pagination }));
    } catch (error) {
      console.error("Error fetching clients:", error);
      addToast("error", "Failed to load clients", "Could not fetch client list.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get("/clients/stats");
      setStats(response.data.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
    setPagination(p => ({ ...p, page: 1 }));
  };

  const handleAddClient = async () => {
    if (!newClient.name) {
      addToast("warning", "Missing field", "Company name is required.");
      return;
    }
    try {
      await api.post("/clients", {
        name: newClient.name, industry: newClient.industry,
        contactPerson: newClient.contactPerson, email: newClient.email,
        phone: newClient.phone, address: newClient.address,
      });
      setIsAddClientOpen(false);
      setNewClient({ name: "", industry: "", contactPerson: "", email: "", phone: "", address: "" });
      fetchClients(); fetchStats();
      addToast("success", "Client created", `${newClient.name} has been added successfully.`);
    } catch (error: any) {
      console.error("Error creating client:", error);
      addToast("error", "Create failed", error.response?.data?.message || "Failed to create client.");
    }
  };

  const handleViewClient = async (clientId: string) => {
    try {
      const response = await api.get(`/clients/${clientId}`);
      setSelectedClient(mapClientDetail(response.data.data));
      setIsViewModalOpen(true);
    } catch (error) {
      console.error("Error fetching client details:", error);
      addToast("error", "Load failed", "Could not fetch client details.");
    }
  };

  const handleDeleteClient = (client: Client) => {
    setConfirm({
      open: true, variant: "danger",
      title: "Delete Client",
      message: `This will permanently delete "${client.name}" and all associated data. This cannot be undone.`,
      onConfirm: async () => {
        try {
          await api.delete(`/clients/${client.id}`);
          fetchClients(); fetchStats();
          addToast("success", "Client deleted", `${client.name} has been removed.`);
        } catch (error: any) {
          console.error("Error deleting client:", error);
          addToast("error", "Delete failed", error.response?.data?.message || "Failed to delete client.");
        }
      },
    });
  };

  const handlePageChange = (newPage: number) => setPagination(p => ({ ...p, page: newPage }));

  // ── Derived ────────────────────────────────────────────────────────────────
  const displayStats = stats || {
    total_clients:          clients.length,
    active_contracts:       clients.filter(c => c.contract?.status === "active").length,
    total_monthly_revenue:  clients.reduce((s, c) => s + (c.monthly_value || 0), 0),
    total_guards_deployed:  clients.reduce((s, c) => s + (c.total_guards  || 0), 0),
  };
  const startRow = (pagination.page - 1) * pagination.limit + 1;
  const endRow   = Math.min(pagination.page * pagination.limit, pagination.total);

  const columns: { label: string; field?: SortField; className?: string }[] = [
    { label: "Client",        field: "name" },
    { label: "Industry",      field: "industry" },
    { label: "Contact" },
    { label: "Contract" },
    { label: "Sites" },
    { label: "Guards",        field: "total_guards",  className: "text-center" },
    { label: "Monthly (KES)", field: "monthly_value", className: "text-right" },
    { label: "Actions",                                className: "text-center" },
  ];

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
                <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
                <span>Clients & Contracts</span>
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Manage client relationships and service contracts
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" className="gap-1.5"
                onClick={() => { fetchClients(); fetchStats(); }}>
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    <span>Add Client</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Client</DialogTitle>
                    <DialogDescription>Register a new client and configure their service details</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Company Name *</Label>
                        <Input value={newClient.name}
                          onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                          placeholder="ABC Corporation" />
                      </div>
                      <div className="space-y-2">
                        <Label>Industry</Label>
                        <Input value={newClient.industry}
                          onChange={e => setNewClient({ ...newClient, industry: e.target.value })}
                          placeholder="Retail & Commercial" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Contact Person</Label>
                        <Input value={newClient.contactPerson}
                          onChange={e => setNewClient({ ...newClient, contactPerson: e.target.value })}
                          placeholder="John Doe" />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" value={newClient.email}
                          onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                          placeholder="contact@company.com" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input value={newClient.phone}
                          onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                          placeholder="+254 712 345 678" />
                      </div>
                      <div className="space-y-2">
                        <Label>Address</Label>
                        <Input value={newClient.address}
                          onChange={e => setNewClient({ ...newClient, address: e.target.value })}
                          placeholder="Westlands, Nairobi" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="gap-2 flex-col sm:flex-row">
                    <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsAddClientOpen(false)}>Cancel</Button>
                    <Button className="w-full sm:w-auto" onClick={handleAddClient}>Create Client</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* ── Stats ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: "Total Clients",    value: displayStats.total_clients         || 0, icon: Building2,   colorClass: "text-primary",     bgClass: "bg-primary/10",     format: (v: number) => v },
              { label: "Active Contracts", value: displayStats.active_contracts      || 0, icon: CheckCircle, colorClass: "text-success",     bgClass: "bg-success/10",     format: (v: number) => v },
              { label: "Guards Deployed",  value: displayStats.total_guards_deployed || 0, icon: DollarSign,  colorClass: "text-warning",     bgClass: "bg-warning/10",     format: (v: number) => v },
              { label: "Monthly Revenue",  value: displayStats.total_monthly_revenue || 0, icon: TrendingUp,  colorClass: "text-success",     bgClass: "bg-success/10",     format: (v: number) => `${(v / 1000).toFixed(0)}K` },
            ].map(({ label, value, icon: Icon, colorClass, bgClass, format }) => (
              <div key={label} className="glass-card rounded-xl p-4 sm:p-5 border border-border/50">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{label}</p>
                    <p className={cn("text-2xl sm:text-3xl font-bold mt-1", colorClass)}>{format(value)}</p>
                  </div>
                  <div className={cn("w-9 h-9 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ml-2", bgClass)}>
                    <Icon className={cn("w-4 h-4 sm:w-6 sm:h-6", colorClass)} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Filters ── */}
          <div className="glass-card rounded-xl p-3 sm:p-4 border border-border/50">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative sm:col-span-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search clients, email, phone..."
                  className="pl-10" value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} />
              </div>
              <Select value={filterIndustry}
                onValueChange={v => { setFilterIndustry(v); setPagination(p => ({ ...p, page: 1 })); }}>
                <SelectTrigger><SelectValue placeholder="All Industries" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  <SelectItem value="Retail & Commercial">Retail & Commercial</SelectItem>
                  <SelectItem value="Telecommunications">Telecommunications</SelectItem>
                  <SelectItem value="Hospitality">Hospitality</SelectItem>
                  <SelectItem value="Energy & Utilities">Energy & Utilities</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus}
                onValueChange={v => { setFilterStatus(v); setPagination(p => ({ ...p, page: 1 })); }}>
                <SelectTrigger><SelectValue placeholder="Contract Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Table Card ── */}
          <div className="glass-card rounded-xl border border-border/50 overflow-hidden">

            {/* Table toolbar */}
            <div className="px-4 sm:px-5 py-3 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-secondary/20">
              <p className="text-sm text-muted-foreground">
                {loading ? "Loading…" : pagination.total > 0
                  ? `Showing ${startRow}–${endRow} of ${pagination.total} clients`
                  : "No clients found"}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-xs">Rows:</span>
                <Select
                  value={String(pagination.limit)}
                  onValueChange={v => setPagination(p => ({ ...p, limit: Number(v), page: 1 }))}>
                  <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[10, 15, 25, 50].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/30 border-b border-border/50">
                  <tr>
                    {columns.map(col => (
                      <th key={col.label}
                        className={cn(
                          "px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                          col.className,
                          col.field && "cursor-pointer hover:text-foreground select-none"
                        )}
                        onClick={() => col.field && handleSort(col.field)}>
                        <span className="flex items-center gap-1">
                          {col.label}
                          {col.field && <SortIcon field={col.field} current={sortField} dir={sortDir} />}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center">
                        <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                        <p className="text-sm text-muted-foreground">Loading clients…</p>
                      </td>
                    </tr>
                  ) : clients.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center">
                        <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                        <p className="text-sm text-muted-foreground">No clients match your filters</p>
                      </td>
                    </tr>
                  ) : clients.map((client, idx) => {
                    const contractStatus = client.contract?.status || "pending";
                    const statusConf = contractStatusConfig[contractStatus] ?? contractStatusConfig.pending;
                    const StatusIcon = statusConf.icon;
                    return (
                      <tr key={client.id}
                        className={cn("hover:bg-secondary/20 transition-colors",
                          idx % 2 === 0 ? "bg-transparent" : "bg-secondary/5")}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate max-w-[160px]">{client.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{client.client_code || client.id.slice(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">{client.industry || "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <p className="text-sm text-foreground">{client.contact_person}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate max-w-[140px]">{client.email}</span>
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3 flex-shrink-0" /> {client.phone}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline"
                            className={cn("gap-1 text-xs font-medium border-0", statusConf.color, statusConf.bg)}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConf.label}
                          </Badge>
                          {client.contract?.endDate && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Ends {new Date(client.contract.endDate).toLocaleDateString()}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm font-medium">{client.sites?.length || 0}</span>
                            <span className="text-xs text-muted-foreground">sites</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-semibold">{client.total_guards || 0}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-success">
                            {(client.monthly_value || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="View details"
                              onClick={() => handleViewClient(client.id)}>
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit">
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive" title="Delete"
                              onClick={() => handleDeleteClient(client)}>
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

            {/* Tablet/Mobile card list */}
            <div className="lg:hidden">
              {loading ? (
                <div className="py-16 flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-muted-foreground text-sm">Loading clients…</p>
                </div>
              ) : clients.length === 0 ? (
                <div className="py-16 text-center">
                  <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-muted-foreground text-sm">No clients match your filters</p>
                </div>
              ) : clients.map(client => {
                const contractStatus = client.contract?.status || "pending";
                const statusConf = contractStatusConfig[contractStatus] ?? contractStatusConfig.pending;
                const StatusIcon = statusConf.icon;
                const expanded = expandedRow === client.id;
                return (
                  <div key={client.id} className="border-b border-border/30 last:border-0">
                    {/* Row summary — always visible */}
                    <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/20 transition-colors"
                      onClick={() => setExpandedRow(expanded ? null : client.id)}>
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{client.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{client.industry || "—"}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline"
                          className={cn("gap-1 text-xs border-0 hidden sm:flex", statusConf.color, statusConf.bg)}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConf.label}
                        </Badge>
                        <div className={cn("w-2 h-2 rounded-full sm:hidden flex-shrink-0",
                          contractStatus === "active" ? "bg-success" :
                          contractStatus === "pending" ? "bg-warning" : "bg-destructive")} />
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {expanded && (
                      <div className="px-4 pb-4 bg-secondary/10 border-t border-border/30 space-y-3">
                        <div className="grid grid-cols-2 gap-3 pt-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Contact</p>
                            <p className="text-sm font-medium mt-0.5">{client.contact_person || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Contract</p>
                            <Badge variant="outline"
                              className={cn("gap-1 text-xs border-0 mt-0.5 inline-flex", statusConf.color, statusConf.bg)}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConf.label}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Email</p>
                            <p className="text-xs mt-0.5 text-muted-foreground break-all">{client.email || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Phone</p>
                            <p className="text-sm mt-0.5">{client.phone || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Sites</p>
                            <p className="text-sm font-semibold mt-0.5">{client.sites?.length || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Guards</p>
                            <p className="text-sm font-semibold mt-0.5">{client.total_guards || 0}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground">Monthly Revenue</p>
                            <p className="text-sm font-semibold text-success mt-0.5">
                              KES {(client.monthly_value || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button variant="outline" size="sm" className="flex-1 text-xs"
                            onClick={() => { setExpandedRow(null); handleViewClient(client.id); }}>
                            <Eye className="w-3.5 h-3.5 mr-1" /> View
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 text-xs">
                            <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                          </Button>
                          <Button variant="outline" size="sm"
                            className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => { setExpandedRow(null); handleDeleteClient(client); }}>
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
            {!loading && pagination.pages > 1 && (
              <div className="px-4 sm:px-5 py-3 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3 bg-secondary/10">
                <p className="text-xs text-muted-foreground order-2 sm:order-1">
                  Page {pagination.page} of {pagination.pages}
                </p>
                <div className="flex items-center gap-1 order-1 sm:order-2">
                  <Button variant="outline" size="icon" className="h-7 w-7"
                    disabled={pagination.page === 1} onClick={() => handlePageChange(1)} title="First page">
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7"
                    disabled={pagination.page === 1} onClick={() => handlePageChange(pagination.page - 1)} title="Previous">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <div className="flex gap-1 mx-1">
                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                      let page: number;
                      if (pagination.pages <= 5)            page = i + 1;
                      else if (pagination.page <= 3)         page = i + 1;
                      else if (pagination.page >= pagination.pages - 2) page = pagination.pages - 4 + i;
                      else                                   page = pagination.page - 2 + i;
                      return (
                        <Button key={page}
                          variant={page === pagination.page ? "default" : "outline"}
                          size="icon" className="h-7 w-7 text-xs"
                          onClick={() => handlePageChange(page)}>
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  <Button variant="outline" size="icon" className="h-7 w-7"
                    disabled={pagination.page === pagination.pages}
                    onClick={() => handlePageChange(pagination.page + 1)} title="Next">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7"
                    disabled={pagination.page === pagination.pages}
                    onClick={() => handlePageChange(pagination.pages)} title="Last page">
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── Detail Modal ── */}
          <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Client & Contract Details</DialogTitle>
                <DialogDescription>Complete information for {selectedClient?.name}</DialogDescription>
              </DialogHeader>
              {selectedClient && (
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="sites">Sites ({selectedClient.sites?.length || 0})</TabsTrigger>
                    <TabsTrigger value="contract">Contract</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        ["Client ID",       selectedClient.client_code || selectedClient.id],
                        ["Industry",        selectedClient.industry],
                        ["Contact Person",  selectedClient.contact_person],
                        ["Email",           selectedClient.email],
                        ["Phone",           selectedClient.phone],
                        ["Address",         selectedClient.address],
                        ["Created",         new Date(selectedClient.created_at).toLocaleDateString()],
                        ["Guards Deployed", String(selectedClient.total_guards)],
                      ].map(([label, val]) => (
                        <div key={label} className="p-3 rounded-lg bg-secondary/20 border border-border/30">
                          <Label className="text-muted-foreground text-xs">{label}</Label>
                          <p className="text-sm mt-1 break-words">{val || "—"}</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="sites" className="space-y-3 mt-4">
                    {selectedClient.sites?.length > 0 ? selectedClient.sites.map(site => (
                      <div key={site.id}
                        className="p-4 rounded-lg bg-secondary/30 border border-border/50 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{site.name}</p>
                          <p className="text-xs font-mono text-muted-foreground">{site.id}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" /> {site.address}
                          </p>
                        </div>
                        <div className="text-left sm:text-right flex-shrink-0">
                          <p className="text-2xl font-bold">{site.guardsRequired || 0}</p>
                          <p className="text-xs text-muted-foreground">Guards Required</p>
                        </div>
                      </div>
                    )) : (
                      <p className="text-center text-muted-foreground py-8">No sites configured</p>
                    )}
                  </TabsContent>
                  <TabsContent value="contract" className="space-y-4 mt-4">
                    {selectedClient.contract ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          ["Contract ID",   selectedClient.contract.id],
                          ["Status",        selectedClient.contract.status],
                          ["Start Date",    selectedClient.contract.startDate || "—"],
                          ["End Date",      selectedClient.contract.endDate   || "—"],
                          ["Value",         `KES ${selectedClient.contract.value?.toLocaleString() || 0}`],
                          ["Billing Cycle", selectedClient.contract.billingCycle],
                          ["SLA Response",  selectedClient.contract.slaResponse || "—"],
                          ["Auto Renew",    selectedClient.contract.autoRenew ? "Yes" : "No"],
                        ].map(([label, val]) => (
                          <div key={label} className="p-3 rounded-lg bg-secondary/20 border border-border/30">
                            <Label className="text-muted-foreground text-xs">{label}</Label>
                            <p className="text-sm mt-1 capitalize">{val}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No contract configured</p>
                    )}
                  </TabsContent>
                </Tabs>
              )}
              <DialogFooter className="gap-2 flex-col sm:flex-row mt-4">
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsViewModalOpen(false)}>Close</Button>
                <Button className="w-full sm:w-auto">
                  <Download className="w-4 h-4 mr-2" /> Export Contract
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </div>
    </>
  );
};

export default ClientsPage;