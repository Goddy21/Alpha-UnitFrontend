import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  User, Building2, Shield, FileText, MessageSquare,
  Eye, Lock, Unlock, Mail, Key, Clock, CheckCircle,
  AlertTriangle, Settings, Loader2, RefreshCw, XCircle,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X,
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientPortalUser {
  id: string; name: string; email: string;
  company_name: string; client_id: string;
  role: "primary" | "secondary" | "viewer";
  status: "active" | "inactive" | "suspended";
  last_login: string; created_at: string;
  permissions: {
    viewIncidents: boolean; viewCCTV: boolean; viewInvoices: boolean;
    viewReports: boolean; submitRequests: boolean; viewPersonnel: boolean;
  };
  access_level: "full" | "limited" | "read-only";
  two_factor_enabled: boolean;
}

interface ServiceRequest {
  id: string; client_name: string; client_id: string;
  type: "incident" | "complaint" | "additional-service" | "maintenance" | "general";
  subject: string; description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in-progress" | "resolved" | "closed";
  submitted_date: string; resolved_date?: string; assigned_to?: string;
}

interface PortalStats {
  total_users: number; active_users: number;
  total_requests: number; open_requests: number; avg_response_time: string;
}

interface NewUserForm {
  name: string; email: string; client_id: string;
  role: "primary" | "secondary" | "viewer";
  two_factor_enabled: boolean;
  permissions: ClientPortalUser["permissions"];
}

// ─── Config ───────────────────────────────────────────────────────────────────

const userStatusConfig = {
  active:    { color: "text-success",          bg: "bg-success/10",     dot: "bg-success",         label: "Active" },
  inactive:  { color: "text-muted-foreground", bg: "bg-muted",          dot: "bg-muted-foreground",label: "Inactive" },
  suspended: { color: "text-destructive",      bg: "bg-destructive/10", dot: "bg-destructive",     label: "Suspended" },
};

const requestTypeConfig = {
  incident:             { color: "text-destructive",      icon: AlertTriangle, label: "Incident" },
  complaint:            { color: "text-warning",          icon: MessageSquare, label: "Complaint" },
  "additional-service": { color: "text-primary",          icon: Shield,        label: "Add. Service" },
  maintenance:          { color: "text-warning",          icon: Settings,      label: "Maintenance" },
  general:              { color: "text-muted-foreground", icon: FileText,      label: "General" },
};

const requestStatusConfig = {
  open:          { color: "text-destructive",      bg: "bg-destructive/10", dot: "bg-destructive",     label: "Open" },
  "in-progress": { color: "text-warning",          bg: "bg-warning/10",     dot: "bg-warning",         label: "In Progress" },
  resolved:      { color: "text-success",          bg: "bg-success/10",     dot: "bg-success",         label: "Resolved" },
  closed:        { color: "text-muted-foreground", bg: "bg-muted",          dot: "bg-muted-foreground",label: "Closed" },
};

const DEFAULT_PERMISSIONS: ClientPortalUser["permissions"] = {
  viewIncidents: false, viewCCTV: false, viewInvoices: false,
  viewReports: false, submitRequests: false, viewPersonnel: false,
};

const PAGE_SIZE = 10;

function unwrap<T>(res: { data: { data: T } }): T { return res.data.data; }

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({ open, title, description, confirmLabel = "Confirm", confirmVariant = "default", onConfirm, onCancel }: {
  open: boolean; title: string; description: string;
  confirmLabel?: string; confirmVariant?: "default" | "destructive";
  onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-background border border-border shadow-xl p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">Cancel</Button>
          <Button variant={confirmVariant} onClick={onConfirm} className="w-full sm:w-auto">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, total, pageSize, onChange }: {
  page: number; total: number; pageSize: number; onChange: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = Math.min(total, (page - 1) * pageSize + 1);
  const to   = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/30">
      <p className="text-xs text-muted-foreground order-2 sm:order-1">Showing {from}–{to} of {total}</p>
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

// ─── Component ────────────────────────────────────────────────────────────────

export const PortalPage = () => {
  const { toast } = useToast();

  const [portalUsers,     setPortalUsers]     = useState<ClientPortalUser[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [stats,           setStats]           = useState<PortalStats | null>(null);
  const [clients,         setClients]         = useState<{ id: string; name: string }[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [saving,          setSaving]          = useState(false);
  const [activeTab,       setActiveTab]       = useState("users");

  const [userPage,    setUserPage]    = useState(1);
  const [requestPage, setRequestPage] = useState(1);

  const [isAddUserOpen,          setIsAddUserOpen]          = useState(false);
  const [selectedUser,           setSelectedUser]           = useState<ClientPortalUser | null>(null);
  const [isViewUserModalOpen,    setIsViewUserModalOpen]    = useState(false);
  const [selectedRequest,        setSelectedRequest]        = useState<ServiceRequest | null>(null);
  const [isViewRequestModalOpen, setIsViewRequestModalOpen] = useState(false);

  // confirm modal state
  const [toggleConfirmUser, setToggleConfirmUser] = useState<ClientPortalUser | null>(null);

  const [newUser, setNewUser] = useState<NewUserForm>({
    name: "", email: "", client_id: "", role: "viewer",
    two_factor_enabled: false, permissions: { ...DEFAULT_PERMISSIONS },
  });

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, requestsRes, statsRes, clientsRes] = await Promise.all([
        api.get("/portal?tab=users"),
        api.get("/portal?tab=requests"),
        api.get("/portal/stats"),
        api.get("/clients?fields=id,name"),
      ]);
      setPortalUsers(unwrap(usersRes));
      setServiceRequests(unwrap(requestsRes));
      setStats(unwrap(statsRes));
      const clientsData = unwrap<any>(clientsRes);
      setClients(Array.isArray(clientsData) ? clientsData : (clientsData.clients ?? []));
    } catch (err: any) {
      toast({ title: "Failed to load portal data", description: err.response?.data?.message ?? err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleToggleUserStatus = async (user: ClientPortalUser) => {
    const newStatus = user.status === "active" ? "inactive" : "active";
    try {
      await api.put(`/portal/${user.id}`, { record_type: "user", status: newStatus });
      setPortalUsers(prev => prev.map(u =>
        u.id === user.id ? { ...u, status: newStatus as ClientPortalUser["status"] } : u
      ));
      toast({ title: `User ${newStatus === "active" ? "activated" : "deactivated"}`, description: user.name });
    } catch (err: any) {
      toast({ title: "Update failed", description: err.response?.data?.message ?? err.message, variant: "destructive" });
    } finally {
      setToggleConfirmUser(null);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.client_id) {
      toast({ title: "Missing fields", description: "Name, email, and company are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await api.post("/portal", { record_type: "user", ...newUser });
      setPortalUsers(prev => [unwrap<ClientPortalUser>(res), ...prev]);
      setIsAddUserOpen(false);
      setNewUser({ name: "", email: "", client_id: "", role: "viewer", two_factor_enabled: false, permissions: { ...DEFAULT_PERMISSIONS } });
      toast({ title: "Portal user created", description: `Invite sent to ${newUser.email}` });
    } catch (err: any) {
      toast({ title: "Failed to create user", description: err.response?.data?.message ?? err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRequestStatus = async (request: ServiceRequest, newStatus: string) => {
    try {
      const res = await api.put(`/portal/${request.id}`, { record_type: "request", status: newStatus });
      const updated = unwrap<ServiceRequest>(res);
      setServiceRequests(prev => prev.map(r => r.id === request.id ? updated : r));
      if (selectedRequest?.id === request.id) setSelectedRequest(updated);
      toast({ title: "Request updated", description: `Status set to ${newStatus}` });
    } catch (err: any) {
      toast({ title: "Update failed", description: err.response?.data?.message ?? err.message, variant: "destructive" });
    }
  };

  const setPermission = (key: keyof ClientPortalUser["permissions"], value: boolean) =>
    setNewUser(prev => ({ ...prev, permissions: { ...prev.permissions, [key]: value } }));

  const handleRoleChange = (role: NewUserForm["role"]) => {
    const perms =
      role === "primary"   ? { viewIncidents: true,  viewCCTV: true,  viewInvoices: true,  viewReports: true, submitRequests: true,  viewPersonnel: true  } :
      role === "secondary" ? { viewIncidents: true,  viewCCTV: true,  viewInvoices: false, viewReports: true, submitRequests: true,  viewPersonnel: false } :
                             { viewIncidents: true,  viewCCTV: false, viewInvoices: false, viewReports: true, submitRequests: false, viewPersonnel: false };
    setNewUser(prev => ({ ...prev, role, permissions: perms }));
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayStats = stats ?? {
    total_users:      portalUsers.length,
    active_users:     portalUsers.filter(u => u.status === "active").length,
    total_requests:   serviceRequests.length,
    open_requests:    serviceRequests.filter(r => r.status === "open" || r.status === "in-progress").length,
    avg_response_time: "—",
  };

  const pagedUsers    = portalUsers.slice((userPage    - 1) * PAGE_SIZE, userPage    * PAGE_SIZE);
  const pagedRequests = serviceRequests.slice((requestPage - 1) * PAGE_SIZE, requestPage * PAGE_SIZE);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background px-3 py-4 sm:px-6 sm:py-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
              <Building2 className="w-5 h-5 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
              <span className="truncate">Client Portal Access</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              Manage client portal users, permissions, and service requests
            </p>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <Button variant="outline" size="icon" onClick={fetchAll} title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </Button>

            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-4">
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Add Portal User</span>
                  <span className="sm:hidden">Add User</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl rounded-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Client Portal Account</DialogTitle>
                  <DialogDescription>Grant client access to the secure portal</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input placeholder="John Doe" value={newUser.name}
                        onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address *</Label>
                      <Input type="email" placeholder="john@company.com" value={newUser.email}
                        onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Client Company *</Label>
                      <Select value={newUser.client_id} onValueChange={v => setNewUser(p => ({ ...p, client_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Choose company" /></SelectTrigger>
                        <SelectContent>
                          {clients.map(c => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>User Role</Label>
                      <Select value={newUser.role} onValueChange={v => handleRoleChange(v as NewUserForm["role"])}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="primary">Primary (Full Access)</SelectItem>
                          <SelectItem value="secondary">Secondary (Limited)</SelectItem>
                          <SelectItem value="viewer">Viewer (Read-Only)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Portal Permissions</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(Object.keys(DEFAULT_PERMISSIONS) as (keyof ClientPortalUser["permissions"])[]).map(key => (
                        <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                          <span className="text-sm">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <Switch checked={newUser.permissions[key]} onCheckedChange={v => setPermission(key, v)} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div>
                      <p className="text-sm font-medium">Require Two-Factor Authentication</p>
                      <p className="text-xs text-muted-foreground">Enhanced security for login</p>
                    </div>
                    <Switch checked={newUser.two_factor_enabled}
                      onCheckedChange={v => setNewUser(p => ({ ...p, two_factor_enabled: v }))} />
                  </div>
                </div>
                <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => setIsAddUserOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                  <Button onClick={handleCreateUser} disabled={saving} className="w-full sm:w-auto">
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Account & Send Invite
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats — 2 col mobile, 5 col md+ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4">
          {[
            { label: "Portal Users",     value: displayStats.total_users,       icon: User,          color: "primary", isText: false },
            { label: "Active Accounts",  value: displayStats.active_users,      icon: CheckCircle,   color: "success", isText: false },
            { label: "Service Requests", value: displayStats.total_requests,    icon: MessageSquare, color: "primary", isText: false },
            { label: "Open Requests",    value: displayStats.open_requests,     icon: Clock,         color: "warning", isText: false },
            { label: "Avg Response",     value: displayStats.avg_response_time, icon: Clock,         color: "success", isText: true  },
          ].map(({ label, value, icon: Icon, color, isText }) => (
            <div key={label} className="glass-card rounded-xl p-3 sm:p-5 border border-border/50">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{label}</p>
                  <p className={cn("font-bold mt-0.5 truncate", isText ? "text-lg sm:text-2xl" : "text-2xl sm:text-3xl", `text-${color}`)}>
                    {value}
                  </p>
                </div>
                <div className={cn("w-9 h-9 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0", `bg-${color}/10`)}>
                  <Icon className={cn("w-4 h-4 sm:w-6 sm:h-6", `text-${color}`)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setUserPage(1); setRequestPage(1); }}>
          {/* Scrollable tab list on mobile */}
          <div className="overflow-x-auto pb-1">
            <TabsList className="inline-flex w-max min-w-full sm:grid sm:w-full sm:grid-cols-3">
              <TabsTrigger value="users"    className="text-xs sm:text-sm whitespace-nowrap px-3">
                Users ({portalUsers.length})
              </TabsTrigger>
              <TabsTrigger value="requests" className="text-xs sm:text-sm whitespace-nowrap px-3">
                Requests ({serviceRequests.length})
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs sm:text-sm whitespace-nowrap px-3">
                Activity Log
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Users Tab ── */}
          <TabsContent value="users" className="space-y-4 mt-4">
            {portalUsers.length === 0 ? (
              <div className="glass-card rounded-xl p-10 sm:p-12 border border-border/50 text-center">
                <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No portal users found. Add one above.</p>
              </div>
            ) : (
              <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[680px]">
                    <thead className="bg-secondary/30 border-b border-border/50">
                      <tr>
                        {["User","Company","Role","Access Level","Status","Last Login","Actions"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {pagedUsers.map(user => {
                        const sc = userStatusConfig[user.status] ?? userStatusConfig.inactive;
                        return (
                          <tr key={user.id} className="hover:bg-secondary/20 transition-colors">
                            {/* User */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                                  <User className="w-3.5 h-3.5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground truncate max-w-[130px]">{user.name}</p>
                                  <p className="text-xs text-muted-foreground truncate max-w-[130px]">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            {/* Company */}
                            <td className="px-4 py-3">
                              <p className="text-sm text-foreground truncate max-w-[120px]">{user.company_name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{user.client_id}</p>
                            </td>
                            {/* Role */}
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="capitalize text-xs">{user.role}</Badge>
                            </td>
                            {/* Access Level */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <Key className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs capitalize">{user.access_level}</span>
                              </div>
                              {user.two_factor_enabled && (
                                <Badge variant="secondary" className="text-xs mt-1">2FA</Badge>
                              )}
                            </td>
                            {/* Status */}
                            <td className="px-4 py-3">
                              <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap", sc.bg, sc.color)}>
                                <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", sc.dot)} />
                                {sc.label}
                              </span>
                            </td>
                            {/* Last Login */}
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 flex-shrink-0" />
                                {user.last_login ? new Date(user.last_login).toLocaleDateString() : "Never"}
                              </div>
                            </td>
                            {/* Actions */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-0.5">
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => { setSelectedUser(user); setIsViewUserModalOpen(true); }} title="View">
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => setToggleConfirmUser(user)}
                                  title={user.status === "active" ? "Deactivate" : "Activate"}>
                                  {user.status === "active"
                                    ? <Lock   className="w-3.5 h-3.5 text-warning" />
                                    : <Unlock className="w-3.5 h-3.5 text-success" />}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" title="Send Email">
                                  <Mail className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {portalUsers.length > PAGE_SIZE && (
                  <Pagination page={userPage} total={portalUsers.length} pageSize={PAGE_SIZE} onChange={setUserPage} />
                )}
              </div>
            )}
          </TabsContent>

          {/* ── Requests Tab ── */}
          <TabsContent value="requests" className="space-y-4 mt-4">
            {serviceRequests.length === 0 ? (
              <div className="glass-card rounded-xl p-10 sm:p-12 border border-border/50 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No service requests found.</p>
              </div>
            ) : (
              <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[680px]">
                    <thead className="bg-secondary/30 border-b border-border/50">
                      <tr>
                        {["Subject","Client","Type","Priority","Status","Submitted","Actions"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {pagedRequests.map(request => {
                        const tc  = requestTypeConfig[request.type]   ?? requestTypeConfig.general;
                        const sc  = requestStatusConfig[request.status] ?? requestStatusConfig.open;
                        const TypeIcon = tc.icon;
                        return (
                          <tr key={request.id} className="hover:bg-secondary/20 transition-colors">
                            {/* Subject */}
                            <td className="px-4 py-3">
                              <p className="font-medium text-foreground truncate max-w-[180px]">{request.subject}</p>
                              <p className="text-xs text-muted-foreground font-mono">{request.id.slice(0,8)}</p>
                            </td>
                            {/* Client */}
                            <td className="px-4 py-3">
                              <p className="text-sm text-foreground truncate max-w-[120px]">{request.client_name}</p>
                            </td>
                            {/* Type */}
                            <td className="px-4 py-3">
                              <span className={cn("inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap", tc.color)}>
                                <TypeIcon className="w-3 h-3 flex-shrink-0" />
                                {tc.label}
                              </span>
                            </td>
                            {/* Priority */}
                            <td className="px-4 py-3">
                              <span className={cn(
                                "text-xs font-medium px-2 py-0.5 rounded-full capitalize whitespace-nowrap",
                                request.priority === "urgent" ? "bg-destructive/10 text-destructive" :
                                request.priority === "high"   ? "bg-warning/10 text-warning" :
                                request.priority === "medium" ? "bg-primary/10 text-primary" :
                                "bg-muted text-muted-foreground"
                              )}>
                                {request.priority}
                              </span>
                            </td>
                            {/* Status */}
                            <td className="px-4 py-3">
                              <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap", sc.bg, sc.color)}>
                                <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", sc.dot)} />
                                {sc.label}
                              </span>
                            </td>
                            {/* Submitted */}
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(request.submitted_date).toLocaleDateString()}
                            </td>
                            {/* Actions */}
                            <td className="px-4 py-3">
                              <Button variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => { setSelectedRequest(request); setIsViewRequestModalOpen(true); }} title="View">
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {serviceRequests.length > PAGE_SIZE && (
                  <Pagination page={requestPage} total={serviceRequests.length} pageSize={PAGE_SIZE} onChange={setRequestPage} />
                )}
              </div>
            )}
          </TabsContent>

          {/* ── Activity Tab ── */}
          <TabsContent value="activity" className="space-y-4 mt-4">
            <ActivityLog />
          </TabsContent>
        </Tabs>

        {/* ── Confirm: Toggle User Status ── */}
        <ConfirmModal
          open={toggleConfirmUser !== null}
          title={toggleConfirmUser?.status === "active" ? "Deactivate User" : "Activate User"}
          description={
            toggleConfirmUser?.status === "active"
              ? `Are you sure you want to deactivate "${toggleConfirmUser?.name}"? They will lose portal access immediately.`
              : `Are you sure you want to activate "${toggleConfirmUser?.name}"? They will regain portal access.`
          }
          confirmLabel={toggleConfirmUser?.status === "active" ? "Deactivate" : "Activate"}
          confirmVariant={toggleConfirmUser?.status === "active" ? "destructive" : "default"}
          onConfirm={() => toggleConfirmUser && handleToggleUserStatus(toggleConfirmUser)}
          onCancel={() => setToggleConfirmUser(null)}
        />

        {/* View User Modal */}
        <Dialog open={isViewUserModalOpen} onOpenChange={setIsViewUserModalOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl rounded-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Portal User Details</DialogTitle>
              <DialogDescription>Complete information for {selectedUser?.name}</DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {([
                    ["User ID",         selectedUser.id],
                    ["Name",            selectedUser.name],
                    ["Email",           selectedUser.email],
                    ["Company",         selectedUser.company_name],
                    ["Role",            selectedUser.role],
                    ["Access Level",    selectedUser.access_level],
                    ["Status",          selectedUser.status],
                    ["Two-Factor Auth", selectedUser.two_factor_enabled ? "Enabled" : "Disabled"],
                    ["Last Login",      selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleString() : "Never"],
                    ["Created",         new Date(selectedUser.created_at).toLocaleDateString()],
                  ] as [string, string][]).map(([label, val]) => (
                    <div key={label}>
                      <Label className="text-muted-foreground text-xs">{label}</Label>
                      <p className="text-sm mt-1 capitalize">{val}</p>
                    </div>
                  ))}
                </div>
                {selectedUser.permissions && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Portal Permissions</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {Object.entries(selectedUser.permissions).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
                          {value
                            ? <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                            : <XCircle    className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                          <span className="text-xs capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsViewUserModalOpen(false)} className="w-full sm:w-auto">Close</Button>
              <Button className="w-full sm:w-auto"><Mail className="w-4 h-4 mr-2" />Send Email</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Request Modal */}
        <Dialog open={isViewRequestModalOpen} onOpenChange={setIsViewRequestModalOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl rounded-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Service Request Details</DialogTitle>
              <DialogDescription>Complete information for {selectedRequest?.id}</DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {([
                    ["Request ID", selectedRequest.id],
                    ["Type",       selectedRequest.type.replace(/-/g, ' ')],
                    ["Client",     selectedRequest.client_name],
                    ["Priority",   selectedRequest.priority],
                    ["Status",     selectedRequest.status],
                    ["Submitted",  new Date(selectedRequest.submitted_date).toLocaleString()],
                    ...(selectedRequest.assigned_to   ? [["Assigned To", selectedRequest.assigned_to]]                              : []),
                    ...(selectedRequest.resolved_date ? [["Resolved",    new Date(selectedRequest.resolved_date).toLocaleString()]] : []),
                  ] as [string, string][]).map(([label, val]) => (
                    <div key={label}>
                      <Label className="text-muted-foreground text-xs">{label}</Label>
                      <p className="text-sm mt-1 capitalize">{val}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Subject</Label>
                  <p className="text-sm mt-2 p-3 rounded-lg bg-secondary/30 font-medium">{selectedRequest.subject}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Description</Label>
                  <p className="text-sm mt-2 p-3 rounded-lg bg-secondary/30">{selectedRequest.description}</p>
                </div>
                {(selectedRequest.status === "open" || selectedRequest.status === "in-progress") && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    {selectedRequest.status === "open" && (
                      <Button variant="outline" size="sm" className="w-full sm:w-auto"
                        onClick={() => handleUpdateRequestStatus(selectedRequest, "in-progress")}>
                        Mark In Progress
                      </Button>
                    )}
                    <Button size="sm" className="w-full sm:w-auto"
                      onClick={() => handleUpdateRequestStatus(selectedRequest, "resolved")}>
                      <CheckCircle className="w-4 h-4 mr-2" /> Mark Resolved
                    </Button>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsViewRequestModalOpen(false)} className="w-full sm:w-auto">Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

// ─── Activity Log sub-component ───────────────────────────────────────────────

const ActivityLog = () => {
  const [logs,    setLogs]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/activity-logs?entity_type=portal_users&limit=20")
      .then(res => setLogs(res.data.data ?? []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-8">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  if (logs.length === 0) return (
    <div className="glass-card rounded-xl p-10 sm:p-12 border border-border/50 text-center">
      <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground text-sm">No recent portal activity.</p>
    </div>
  );

  return (
    <div className="glass-card rounded-xl p-4 sm:p-6 border border-border/50">
      <h3 className="font-semibold text-foreground mb-4 text-sm sm:text-base">Recent Portal Activity</h3>
      <div className="space-y-2 sm:space-y-3">
        {logs.map((log, idx) => (
          <div key={log.id ?? idx} className="p-3 rounded-lg bg-secondary/30 border border-border/50 flex items-start gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{log.user_name ?? log.user_id ?? "System"}</p>
              <p className="text-xs text-muted-foreground">{log.action?.replace(/_/g, ' ')}</p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
              {log.created_at ? new Date(log.created_at).toLocaleTimeString() : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PortalPage;