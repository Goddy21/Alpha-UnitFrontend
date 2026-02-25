// src/pages/Clients.tsx
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { cn } from "@/lib/utils";
import {
  Building2, Plus, Search, MapPin, Phone, Mail, Calendar,
  DollarSign, AlertCircle, CheckCircle, Clock, TrendingUp,
  Edit, Eye, Trash2, Download, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown,
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
  contract: raw.contract_id
    ? {
        id: raw.contract_id,
        clientId: raw.id,
        status: raw.contract_status || "pending",
        startDate: raw.start_date || "",
        endDate:   raw.end_date   || "",
        value:     raw.contract_value ?? 0,
        billingCycle: raw.billing_cycle || "monthly",
        slaResponse:  raw.sla_response  || "",
        autoRenew:    raw.auto_renew    ?? false,
      }
    : null,
  created_at:    raw.created_at,
  total_guards:  raw.total_guards  || 0,
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
  contract: raw.contract
    ? {
        id: raw.contract.id,
        clientId: raw.id,
        status:       raw.contract.status       || "pending",
        startDate:    raw.contract.start_date   || raw.contract.startDate   || "",
        endDate:      raw.contract.end_date     || raw.contract.endDate     || "",
        value:        raw.contract.value        ?? 0,
        billingCycle: raw.contract.billing_cycle || raw.contract.billingCycle || "monthly",
        slaResponse:  raw.contract.sla_response  || raw.contract.slaResponse  || "",
        autoRenew:    raw.contract.auto_renew    ?? raw.contract.autoRenew    ?? false,
      }
    : null,
  created_at:    raw.created_at,
  total_guards:  raw.total_guards  || 0,
  monthly_value: raw.monthly_value || 0,
});

// ── Sub-components ────────────────────────────────────────────────────────────

const SortIcon = ({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) => {
  if (field !== current) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
  return dir === "asc"
    ? <ArrowUp   className="w-3 h-3 text-primary" />
    : <ArrowDown className="w-3 h-3 text-primary" />;
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

  const [newClient, setNewClient] = useState({
    name: "", industry: "", contactPerson: "", email: "", phone: "", address: "",
  });

  // ── Data fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetchClients();
  }, [searchTerm, filterIndustry, filterStatus, pagination.page, sortField, sortDir]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page:  pagination.page,
        limit: pagination.limit,
        sort:  `${sortField}:${sortDir}`,
      };
      if (searchTerm)              params.search   = searchTerm;
      if (filterIndustry !== "all") params.industry = filterIndustry;
      if (filterStatus   !== "all") params.status   = filterStatus;

      const response = await api.get("/clients", { params });
      setClients(response.data.data.clients.map(mapClient));
      setPagination(prev => ({ ...prev, ...response.data.data.pagination }));
    } catch (error) {
      console.error("Error fetching clients:", error);
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
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPagination(p => ({ ...p, page: 1 }));
  };

  const handleAddClient = async () => {
    try {
      await api.post("/clients", {
        name:          newClient.name,
        industry:      newClient.industry,
        contactPerson: newClient.contactPerson,
        email:         newClient.email,
        phone:         newClient.phone,
        address:       newClient.address,
      });
      setIsAddClientOpen(false);
      setNewClient({ name: "", industry: "", contactPerson: "", email: "", phone: "", address: "" });
      fetchClients();
      fetchStats();
    } catch (error: any) {
      console.error("Error creating client:", error);
      alert(error.response?.data?.message || "Failed to create client");
    }
  };

  const handleViewClient = async (clientId: string) => {
    try {
      const response = await api.get(`/clients/${clientId}`);
      setSelectedClient(mapClientDetail(response.data.data));
      setIsViewModalOpen(true);
    } catch (error) {
      console.error("Error fetching client details:", error);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm("Are you sure you want to delete this client?")) return;
    try {
      await api.delete(`/clients/${clientId}`);
      fetchClients();
      fetchStats();
    } catch (error: any) {
      console.error("Error deleting client:", error);
      alert(error.response?.data?.message || "Failed to delete client");
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(p => ({ ...p, page: newPage }));
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const displayStats = stats || {
    total_clients:          clients.length,
    active_contracts:       clients.filter(c => c.contract?.status === "active").length,
    total_monthly_revenue:  clients.reduce((s, c) => s + (c.monthly_value || 0), 0),
    total_guards_deployed:  clients.reduce((s, c) => s + (c.total_guards  || 0), 0),
  };

  const startRow = (pagination.page - 1) * pagination.limit + 1;
  const endRow   = Math.min(pagination.page * pagination.limit, pagination.total);

  // ── Column definitions ─────────────────────────────────────────────────────

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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" />
              Clients & Contracts
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage client relationships and service contracts
            </p>
          </div>

          <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
                <DialogDescription>Register a new client and configure their service details</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} placeholder="ABC Corporation" />
                  </div>
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Input value={newClient.industry} onChange={e => setNewClient({ ...newClient, industry: e.target.value })} placeholder="Retail & Commercial" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contact Person</Label>
                    <Input value={newClient.contactPerson} onChange={e => setNewClient({ ...newClient, contactPerson: e.target.value })} placeholder="John Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} placeholder="contact@company.com" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} placeholder="+254 712 345 678" />
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input value={newClient.address} onChange={e => setNewClient({ ...newClient, address: e.target.value })} placeholder="Westlands, Nairobi" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddClientOpen(false)}>Cancel</Button>
                <Button onClick={handleAddClient}>Create Client</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Clients",    value: displayStats.total_clients        || 0, icon: Building2,  color: "primary",  format: (v: number) => v },
            { label: "Active Contracts", value: displayStats.active_contracts     || 0, icon: CheckCircle,color: "success",  format: (v: number) => v },
            { label: "Guards Deployed",  value: displayStats.total_guards_deployed|| 0, icon: DollarSign, color: "warning",  format: (v: number) => v },
            { label: "Monthly Revenue",  value: displayStats.total_monthly_revenue|| 0, icon: TrendingUp, color: "success",  format: (v: number) => `${(v / 1000).toFixed(0)}K` },
          ].map(({ label, value, icon: Icon, color, format }) => (
            <div key={label} className="glass-card rounded-xl p-5 border border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className={`text-3xl font-bold mt-1 text-${color}`}>{format(value)}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg bg-${color}/10 flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 text-${color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="glass-card rounded-xl p-4 border border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search clients, email, phone..."
                className="pl-10"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              />
            </div>
            <Select value={filterIndustry} onValueChange={v => { setFilterIndustry(v); setPagination(p => ({ ...p, page: 1 })); }}>
              <SelectTrigger><SelectValue placeholder="All Industries" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                <SelectItem value="Retail & Commercial">Retail & Commercial</SelectItem>
                <SelectItem value="Telecommunications">Telecommunications</SelectItem>
                <SelectItem value="Hospitality">Hospitality</SelectItem>
                <SelectItem value="Energy & Utilities">Energy & Utilities</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPagination(p => ({ ...p, page: 1 })); }}>
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

        {/* ── Table ── */}
        <div className="glass-card rounded-xl border border-border/50 overflow-hidden">

          {/* Table header row count */}
          <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between bg-secondary/20">
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading…" : pagination.total > 0
                ? `Showing ${startRow}–${endRow} of ${pagination.total} clients`
                : "No clients found"}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Rows per page:</span>
              <Select
                value={String(pagination.limit)}
                onValueChange={v => setPagination(p => ({ ...p, limit: Number(v), page: 1 }))}
              >
                <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 15, 25, 50].map(n => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/30 border-b border-border/50">
                <tr>
                  {columns.map(col => (
                    <th
                      key={col.label}
                      className={cn(
                        "px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                        col.className,
                        col.field && "cursor-pointer hover:text-foreground select-none"
                      )}
                      onClick={() => col.field && handleSort(col.field)}
                    >
                      <span className="flex items-center gap-1 justify-start">
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
                ) : (
                  clients.map((client, idx) => {
                    const contractStatus = client.contract?.status || "pending";
                    const statusConf     = contractStatusConfig[contractStatus] ?? contractStatusConfig.pending;
                    const StatusIcon     = statusConf.icon;

                    return (
                      <tr
                        key={client.id}
                        className={cn(
                          "hover:bg-secondary/20 transition-colors",
                          idx % 2 === 0 ? "bg-transparent" : "bg-secondary/5"
                        )}
                      >
                        {/* Client */}
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

                        {/* Industry */}
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">{client.industry || "—"}</span>
                        </td>

                        {/* Contact */}
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <p className="text-sm text-foreground">{client.contact_person}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              <span className="truncate max-w-[140px]">{client.email}</span>
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {client.phone}
                            </p>
                          </div>
                        </td>

                        {/* Contract status */}
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={cn("gap-1 text-xs font-medium", statusConf.color, statusConf.bg, "border-0")}
                          >
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

                        {/* Sites */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm text-foreground font-medium">
                              {client.sites?.length || 0}
                            </span>
                            <span className="text-xs text-muted-foreground">sites</span>
                          </div>
                        </td>

                        {/* Guards */}
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-semibold text-foreground">{client.total_guards || 0}</span>
                        </td>

                        {/* Monthly value */}
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-success">
                            {(client.monthly_value || 0).toLocaleString()}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="View details"
                              onClick={() => handleViewClient(client.id)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit">
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              title="Delete"
                              onClick={() => handleDeleteClient(client.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination controls ── */}
          {!loading && pagination.pages > 1 && (
            <div className="px-5 py-3 border-t border-border/50 flex items-center justify-between bg-secondary/10">
              <p className="text-xs text-muted-foreground">
                Page {pagination.page} of {pagination.pages}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={pagination.page === 1}
                  onClick={() => handlePageChange(1)}
                  title="First page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={pagination.page === 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  title="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>

                {/* Page number pills */}
                <div className="flex gap-1 mx-1">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    let page: number;
                    if (pagination.pages <= 5) {
                      page = i + 1;
                    } else if (pagination.page <= 3) {
                      page = i + 1;
                    } else if (pagination.page >= pagination.pages - 2) {
                      page = pagination.pages - 4 + i;
                    } else {
                      page = pagination.page - 2 + i;
                    }
                    return (
                      <Button
                        key={page}
                        variant={page === pagination.page ? "default" : "outline"}
                        size="icon"
                        className="h-7 w-7 text-xs"
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={pagination.page === pagination.pages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                  title="Next page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={pagination.page === pagination.pages}
                  onClick={() => handlePageChange(pagination.pages)}
                  title="Last page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Detail Modal ── */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      ["Client ID",        selectedClient.client_code || selectedClient.id],
                      ["Industry",         selectedClient.industry],
                      ["Contact Person",   selectedClient.contact_person],
                      ["Email",            selectedClient.email],
                      ["Phone",            selectedClient.phone],
                      ["Address",          selectedClient.address],
                      ["Created",          new Date(selectedClient.created_at).toLocaleDateString()],
                      ["Guards Deployed",  String(selectedClient.total_guards)],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <Label className="text-muted-foreground text-xs">{label}</Label>
                        <p className="text-sm mt-1">{val || "—"}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="sites" className="space-y-3">
                  {selectedClient.sites?.length > 0 ? selectedClient.sites.map(site => (
                    <div key={site.id} className="p-4 rounded-lg bg-secondary/30 border border-border/50 flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{site.name}</p>
                        <p className="text-xs font-mono text-muted-foreground">{site.id}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" /> {site.address}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{site.guardsRequired || 0}</p>
                        <p className="text-xs text-muted-foreground">Guards Required</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-center text-muted-foreground py-8">No sites configured</p>
                  )}
                </TabsContent>

                <TabsContent value="contract" className="space-y-4">
                  {selectedClient.contract ? (
                    <div className="grid grid-cols-2 gap-4">
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
                        <div key={label}>
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

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
              <Button>
                <Download className="w-4 h-4 mr-2" /> Export Contract
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default ClientsPage;