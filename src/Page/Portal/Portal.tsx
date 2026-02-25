import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  User, Building2, Shield, FileText, MessageSquare,
  Eye, Lock, Unlock, Mail, Key, Clock, CheckCircle,
  AlertTriangle, Settings, Loader2, RefreshCw, XCircle,
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
import api from "@/lib/api";   // ← your existing axios instance

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientPortalUser {
  id: string;
  name: string;
  email: string;
  company_name: string;
  client_id: string;
  role: "primary" | "secondary" | "viewer";
  status: "active" | "inactive" | "suspended";
  last_login: string;
  created_at: string;
  permissions: {
    viewIncidents: boolean;
    viewCCTV: boolean;
    viewInvoices: boolean;
    viewReports: boolean;
    submitRequests: boolean;
    viewPersonnel: boolean;
  };
  access_level: "full" | "limited" | "read-only";
  two_factor_enabled: boolean;
}

interface ServiceRequest {
  id: string;
  client_name: string;
  client_id: string;
  type: "incident" | "complaint" | "additional-service" | "maintenance" | "general";
  subject: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in-progress" | "resolved" | "closed";
  submitted_date: string;
  resolved_date?: string;
  assigned_to?: string;
}

interface PortalStats {
  total_users: number;
  active_users: number;
  total_requests: number;
  open_requests: number;
  avg_response_time: string;
}

interface NewUserForm {
  name: string;
  email: string;
  client_id: string;
  role: "primary" | "secondary" | "viewer";
  two_factor_enabled: boolean;
  permissions: ClientPortalUser["permissions"];
}

// ─── Config ───────────────────────────────────────────────────────────────────

const userStatusConfig = {
  active:    { color: "text-success",          bg: "bg-success/10",     label: "Active" },
  inactive:  { color: "text-muted-foreground", bg: "bg-muted",          label: "Inactive" },
  suspended: { color: "text-destructive",      bg: "bg-destructive/10", label: "Suspended" },
};

const requestTypeConfig = {
  incident:             { color: "text-destructive",      icon: AlertTriangle, label: "Incident" },
  complaint:            { color: "text-warning",          icon: MessageSquare, label: "Complaint" },
  "additional-service": { color: "text-primary",          icon: Shield,        label: "Additional Service" },
  maintenance:          { color: "text-warning",          icon: Settings,      label: "Maintenance" },
  general:              { color: "text-muted-foreground", icon: FileText,      label: "General" },
};

const requestStatusConfig = {
  open:          { color: "text-destructive",      bg: "bg-destructive/10", label: "Open" },
  "in-progress": { color: "text-warning",          bg: "bg-warning/10",     label: "In Progress" },
  resolved:      { color: "text-success",          bg: "bg-success/10",     label: "Resolved" },
  closed:        { color: "text-muted-foreground", bg: "bg-muted",          label: "Closed" },
};

const DEFAULT_PERMISSIONS: ClientPortalUser["permissions"] = {
  viewIncidents: false, viewCCTV: false, viewInvoices: false,
  viewReports: false, submitRequests: false, viewPersonnel: false,
};

// ─── Helper: unwrap axios response → data array / object ─────────────────────
// Your backend returns { success: true, data: [...] }
// axios wraps that in response.data, so we need response.data.data

function unwrap<T>(res: { data: { data: T } }): T {
  return res.data.data;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PortalPage = () => {
  const { toast } = useToast();

  const [portalUsers,      setPortalUsers]      = useState<ClientPortalUser[]>([]);
  const [serviceRequests,  setServiceRequests]  = useState<ServiceRequest[]>([]);
  const [stats,            setStats]            = useState<PortalStats | null>(null);
  const [clients,          setClients]          = useState<{ id: string; name: string }[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [saving,           setSaving]           = useState(false);
  const [activeTab,        setActiveTab]        = useState("users");

  const [isAddUserOpen,          setIsAddUserOpen]          = useState(false);
  const [selectedUser,           setSelectedUser]           = useState<ClientPortalUser | null>(null);
  const [isViewUserModalOpen,    setIsViewUserModalOpen]    = useState(false);
  const [selectedRequest,        setSelectedRequest]        = useState<ServiceRequest | null>(null);
  const [isViewRequestModalOpen, setIsViewRequestModalOpen] = useState(false);

  const [newUser, setNewUser] = useState<NewUserForm>({
    name: "", email: "", client_id: "", role: "viewer",
    two_factor_enabled: false, permissions: { ...DEFAULT_PERMISSIONS },
  });

  // ── Fetch ────────────────────────────────────────────────────────────────────

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
      toast({
        title: "Failed to load portal data",
        description: err.response?.data?.message ?? err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

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

  // ── Render ───────────────────────────────────────────────────────────────────

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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" />
              Client Portal Access
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage client portal users, permissions, and service requests
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchAll} title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </Button>

            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><User className="w-4 h-4" />Add Portal User</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Client Portal Account</DialogTitle>
                  <DialogDescription>Grant client access to the secure portal</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-2 gap-4">
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
                          <SelectItem value="primary">Primary Contact (Full Access)</SelectItem>
                          <SelectItem value="secondary">Secondary Contact (Limited)</SelectItem>
                          <SelectItem value="viewer">Viewer (Read-Only)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Portal Permissions</Label>
                    <div className="grid grid-cols-2 gap-3">
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

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateUser} disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Account & Send Invite
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { label: "Portal Users",     value: displayStats.total_users,       icon: User,         color: "primary" },
            { label: "Active Accounts",  value: displayStats.active_users,      icon: CheckCircle,  color: "success" },
            { label: "Service Requests", value: displayStats.total_requests,    icon: MessageSquare,color: "primary" },
            { label: "Open Requests",    value: displayStats.open_requests,     icon: Clock,        color: "warning" },
            { label: "Avg Response",     value: displayStats.avg_response_time, icon: Clock,        color: "success", isText: true },
          ].map(({ label, value, icon: Icon, color, isText }) => (
            <div key={label} className="glass-card rounded-xl p-5 border border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className={cn("font-bold mt-1", isText ? "text-2xl" : "text-3xl", `text-${color}`)}>{value}</p>
                </div>
                <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", `bg-${color}/10`)}>
                  <Icon className={cn("w-6 h-6", `text-${color}`)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">Portal Users ({portalUsers.length})</TabsTrigger>
            <TabsTrigger value="requests">Service Requests ({serviceRequests.length})</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
          </TabsList>

          {/* ── Users Tab ── */}
          <TabsContent value="users" className="space-y-4">
            {portalUsers.length === 0 ? (
              <div className="glass-card rounded-xl p-12 border border-border/50 text-center">
                <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No portal users found. Add one above.</p>
              </div>
            ) : (
              <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-secondary/30 border-b border-border/50">
                      <tr>
                        {["User", "Company", "Role", "Access Level", "Status", "Last Login", "Actions"].map(h => (
                          <th key={h} className="px-5 py-4 text-left text-sm font-semibold text-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {portalUsers.map(user => (
                        <tr key={user.id} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center">
                                <User className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                                <p className="text-xs text-muted-foreground font-mono">{user.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-sm">{user.company_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{user.client_id}</p>
                          </td>
                          <td className="px-5 py-4">
                            <Badge variant="outline" className="capitalize">{user.role}</Badge>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <Key className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm capitalize">{user.access_level}</span>
                            </div>
                            {user.two_factor_enabled && (
                              <Badge variant="secondary" className="text-xs mt-1">2FA Enabled</Badge>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className={cn(
                              "text-xs font-medium px-3 py-1.5 rounded-full",
                              userStatusConfig[user.status]?.bg,
                              userStatusConfig[user.status]?.color
                            )}>
                              {userStatusConfig[user.status]?.label}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {user.last_login ? new Date(user.last_login).toLocaleString() : "Never"}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(user); setIsViewUserModalOpen(true); }}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleToggleUserStatus(user)}>
                                {user.status === "active" ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Mail className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Requests Tab ── */}
          <TabsContent value="requests" className="space-y-4">
            {serviceRequests.length === 0 ? (
              <div className="glass-card rounded-xl p-12 border border-border/50 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No service requests found.</p>
              </div>
            ) : (
              serviceRequests.map(request => {
                const TypeIcon = requestTypeConfig[request.type]?.icon ?? FileText;
                return (
                  <div key={request.id} className="glass-card rounded-xl p-5 border border-border/50 hover:border-primary/30 transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                          <TypeIcon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-foreground">{request.subject}</h3>
                            <Badge className={requestTypeConfig[request.type]?.color}>
                              {requestTypeConfig[request.type]?.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono mb-3">{request.id}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                            <div><p className="text-muted-foreground text-xs">Client</p><p className="font-medium">{request.client_name}</p></div>
                            <div><p className="text-muted-foreground text-xs">Priority</p><p className="font-medium capitalize">{request.priority}</p></div>
                            <div><p className="text-muted-foreground text-xs">Submitted</p><p className="font-medium">{new Date(request.submitted_date).toLocaleString()}</p></div>
                            {request.assigned_to && (
                              <div><p className="text-muted-foreground text-xs">Assigned To</p><p className="font-medium">{request.assigned_to}</p></div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{request.description}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <span className={cn(
                          "text-xs font-medium px-3 py-1.5 rounded-full",
                          requestStatusConfig[request.status]?.bg,
                          requestStatusConfig[request.status]?.color
                        )}>
                          {requestStatusConfig[request.status]?.label}
                        </span>
                        <Button variant="outline" size="sm"
                          onClick={() => { setSelectedRequest(request); setIsViewRequestModalOpen(true); }}>
                          <Eye className="w-4 h-4 mr-1" /> View
                        </Button>
                      </div>
                    </div>
                    {request.resolved_date && (
                      <div className="border-t border-border/50 pt-3 mt-3 text-xs text-muted-foreground">
                        <span className="font-medium">Resolved:</span> {new Date(request.resolved_date).toLocaleString()}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* ── Activity Tab ── */}
          <TabsContent value="activity" className="space-y-4">
            <ActivityLog />
          </TabsContent>
        </Tabs>

        {/* View User Modal */}
        <Dialog open={isViewUserModalOpen} onOpenChange={setIsViewUserModalOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Portal User Details</DialogTitle>
              <DialogDescription>Complete information for {selectedUser?.name}</DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {([
                    ["User ID",        selectedUser.id],
                    ["Name",           selectedUser.name],
                    ["Email",          selectedUser.email],
                    ["Company",        selectedUser.company_name],
                    ["Role",           selectedUser.role],
                    ["Access Level",   selectedUser.access_level],
                    ["Status",         selectedUser.status],
                    ["Two-Factor Auth",selectedUser.two_factor_enabled ? "Enabled" : "Disabled"],
                    ["Last Login",     selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleString() : "Never"],
                    ["Created",        new Date(selectedUser.created_at).toLocaleDateString()],
                  ] as [string, string][]).map(([label, val]) => (
                    <div key={label}>
                      <Label className="text-muted-foreground">{label}</Label>
                      <p className="text-sm mt-1 capitalize">{val}</p>
                    </div>
                  ))}
                </div>
                {selectedUser.permissions && (
                  <div>
                    <Label className="text-muted-foreground">Portal Permissions</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {Object.entries(selectedUser.permissions).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
                          {value
                            ? <CheckCircle className="w-4 h-4 text-success" />
                            : <XCircle    className="w-4 h-4 text-muted-foreground" />}
                          <span className="text-xs capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewUserModalOpen(false)}>Close</Button>
              <Button><Mail className="w-4 h-4 mr-2" />Send Email</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Request Modal */}
        <Dialog open={isViewRequestModalOpen} onOpenChange={setIsViewRequestModalOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Service Request Details</DialogTitle>
              <DialogDescription>Complete information for {selectedRequest?.id}</DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {([
                    ["Request ID", selectedRequest.id],
                    ["Type",       selectedRequest.type.replace(/-/g, ' ')],
                    ["Client",     selectedRequest.client_name],
                    ["Priority",   selectedRequest.priority],
                    ["Status",     selectedRequest.status],
                    ["Submitted",  new Date(selectedRequest.submitted_date).toLocaleString()],
                    ...(selectedRequest.assigned_to  ? [["Assigned To", selectedRequest.assigned_to]]                              : []),
                    ...(selectedRequest.resolved_date ? [["Resolved",   new Date(selectedRequest.resolved_date).toLocaleString()]] : []),
                  ] as [string, string][]).map(([label, val]) => (
                    <div key={label}>
                      <Label className="text-muted-foreground">{label}</Label>
                      <p className="text-sm mt-1 capitalize">{val}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <Label className="text-muted-foreground">Subject</Label>
                  <p className="text-sm mt-2 p-3 rounded-lg bg-secondary/30 font-medium">{selectedRequest.subject}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm mt-2 p-3 rounded-lg bg-secondary/30">{selectedRequest.description}</p>
                </div>
                {(selectedRequest.status === "open" || selectedRequest.status === "in-progress") && (
                  <div className="flex gap-2">
                    {selectedRequest.status === "open" && (
                      <Button variant="outline" size="sm"
                        onClick={() => handleUpdateRequestStatus(selectedRequest, "in-progress")}>
                        Mark In Progress
                      </Button>
                    )}
                    <Button size="sm" onClick={() => handleUpdateRequestStatus(selectedRequest, "resolved")}>
                      <CheckCircle className="w-4 h-4 mr-2" /> Mark Resolved
                    </Button>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewRequestModalOpen(false)}>Close</Button>
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
    <div className="glass-card rounded-xl p-12 border border-border/50 text-center">
      <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground">No recent portal activity.</p>
    </div>
  );

  return (
    <div className="glass-card rounded-xl p-6 border border-border/50">
      <h3 className="font-semibold text-foreground mb-4">Recent Portal Activity</h3>
      <div className="space-y-3">
        {logs.map((log, idx) => (
          <div key={log.id ?? idx} className="p-3 rounded-lg bg-secondary/30 border border-border/50 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{log.user_name ?? log.user_id ?? "System"}</p>
              <p className="text-xs text-muted-foreground">{log.action?.replace(/_/g, ' ')}</p>
            </div>
            <span className="text-xs text-muted-foreground">
              {log.created_at ? new Date(log.created_at).toLocaleTimeString() : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PortalPage;