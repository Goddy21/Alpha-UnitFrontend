// src/pages/Users.tsx
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { cn } from "@/lib/utils";
import {
  Users, UserPlus, Search, Shield, Edit, Trash2,
  Lock, Unlock, Eye, Activity, Clock, CheckCircle,
  XCircle, ChevronLeft, ChevronRight, X, AlertTriangle,
  Info, RefreshCw, MoreVertical,
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

// ── Types ────────────────────────────────────────────────────────────────────
interface User {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Operations Manager" | "Guard" | "Client";
  status: "active" | "inactive" | "suspended";
  lastActive: string;
  department?: string;
  phone: string;
  createdAt: string;
  permissions: string[];
}

interface ToastMessage {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
}

interface ConfirmDialog {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  variant?: "danger" | "warning";
}

// ── Configs ──────────────────────────────────────────────────────────────────
const roleColors = {
  "Admin": "text-destructive bg-destructive/10 border-destructive/30",
  "Operations Manager": "text-primary bg-primary/10 border-primary/30",
  "Guard": "text-success bg-success/10 border-success/30",
  "Client": "text-warning bg-warning/10 border-warning/30",
};

const statusConfig = {
  active:    { color: "text-success",          dot: "bg-success",          label: "Active",    icon: CheckCircle },
  inactive:  { color: "text-muted-foreground", dot: "bg-muted-foreground", label: "Inactive",  icon: XCircle },
  suspended: { color: "text-destructive",      dot: "bg-destructive",      label: "Suspended", icon: Lock },
};

const rolePermissions: Record<string, string[]> = {
  "Admin": ["all", "manage_users", "manage_roles", "system_settings"],
  "Operations Manager": ["view_reports", "manage_personnel", "create_deployments"],
  "Guard": ["report_incidents", "view_schedule", "patrol_tracking"],
  "Client": ["view_incidents", "view_cctv", "view_invoices"],
};

const EMPTY_USER = {
  name: "", email: "", password: "", phone: "",
  role: "Guard" as User["role"], department: "", status: "active" as User["status"],
};

const PAGE_SIZE = 10;

// ── Toast Component ───────────────────────────────────────────────────────────
const ToastContainer = ({ toasts, onRemove }: { toasts: ToastMessage[]; onRemove: (id: string) => void }) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-success" />,
    error:   <XCircle className="w-5 h-5 text-destructive" />,
    warning: <AlertTriangle className="w-5 h-5 text-warning" />,
    info:    <Info className="w-5 h-5 text-primary" />,
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
          <div className="flex-shrink-0 mt-0.5">{icons[t.type]}</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">{t.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 break-words">{t.message}</p>
          </div>
          <button onClick={() => onRemove(t.id)} className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

// ── Confirm Dialog Component ──────────────────────────────────────────────────
const ConfirmDialogModal = ({ config, onClose }: { config: ConfirmDialog; onClose: () => void }) => (
  <Dialog open={config.open} onOpenChange={onClose}>
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {config.variant === "danger"
            ? <XCircle className="w-5 h-5 text-destructive" />
            : <AlertTriangle className="w-5 h-5 text-warning" />}
          {config.title}
        </DialogTitle>
        <DialogDescription>{config.message}</DialogDescription>
      </DialogHeader>
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          variant={config.variant === "danger" ? "destructive" : "default"}
          onClick={() => { config.onConfirm(); onClose(); }}>
          Confirm
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// ── Pagination Component ──────────────────────────────────────────────────────
const Pagination = ({
  page, totalPages, total, pageSize, onPage,
}: { page: number; totalPages: number; total: number; pageSize: number; onPage: (p: number) => void }) => {
  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-border/50">
      <p className="text-xs text-muted-foreground order-2 sm:order-1">
        Showing <span className="font-medium text-foreground">{from}–{to}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span> users
      </p>
      <div className="flex items-center gap-1 order-1 sm:order-2">
        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline ml-1">Prev</span>
        </Button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let p: number;
          if (totalPages <= 5) p = i + 1;
          else if (page <= 3) p = i + 1;
          else if (page >= totalPages - 2) p = totalPages - 4 + i;
          else p = page - 2 + i;
          return (
            <Button key={p} variant={p === page ? "default" : "outline"} size="sm"
              className="w-8 h-8 p-0 text-xs" onClick={() => onPage(p)}>
              {p}
            </Button>
          );
        })}
        <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => onPage(page + 1)}>
          <span className="hidden sm:inline mr-1">Next</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export const UsersPage = () => {
  const [users, setUsers]       = useState<User[]>([]);
  const [stats, setStats]       = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [searchTerm, setSearchTerm]     = useState("");
  const [filterRole, setFilterRole]     = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);

  // Modals
  const [isAddOpen, setIsAddOpen]       = useState(false);
  const [isViewOpen, setIsViewOpen]     = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUser, setNewUser]           = useState({ ...EMPTY_USER });

  // Toast & confirm
  const [toasts, setToasts]         = useState<ToastMessage[]>([]);
  const [confirm, setConfirm]       = useState<ConfirmDialog>({
    open: false, title: "", message: "", onConfirm: () => {}, variant: "danger",
  });

  // Mobile row expand
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const addToast = useCallback((type: ToastMessage["type"], title: string, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, type, title, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async (p = page) => {
    try {
      setLoading(true);
      const params: Record<string, any> = { page: p, limit: PAGE_SIZE };
      if (searchTerm)          params.search = searchTerm;
      if (filterRole !== "all")   params.role   = filterRole;
      if (filterStatus !== "all") params.status = filterStatus;
      const res = await api.get("/users", { params });
      setUsers(res.data.data.users || []);
      setTotal(res.data.data.pagination?.total ?? res.data.data.users?.length ?? 0);
    } catch (e) {
      addToast("error", "Failed to load users", "Could not fetch user list.");
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, filterRole, filterStatus, addToast]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/users/stats");
      setStats(res.data.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { setPage(1); }, [searchTerm, filterRole, filterStatus]);
  useEffect(() => { fetchUsers(page); }, [page, searchTerm, filterRole, filterStatus]);
  useEffect(() => { fetchStats(); }, []);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      addToast("warning", "Missing fields", "Name, email, and password are required.");
      return;
    }
    try {
      await api.post("/users", { ...newUser, permissions: rolePermissions[newUser.role] || [] });
      setIsAddOpen(false);
      setNewUser({ ...EMPTY_USER });
      fetchUsers(1); fetchStats();
      addToast("success", "User created", `${newUser.name} has been added successfully.`);
    } catch (e: any) {
      addToast("error", "Create failed", e.response?.data?.message || "Failed to create user.");
    }
  };

  const handleToggleStatus = (user: User) => {
    const next = user.status === "active" ? "inactive" : "active";
    setConfirm({
      open: true,
      variant: next === "inactive" ? "warning" : "danger",
      title: next === "active" ? "Activate User" : "Deactivate User",
      message: `Are you sure you want to ${next === "active" ? "activate" : "deactivate"} ${user.name}?`,
      onConfirm: async () => {
        try {
          await api.put(`/users/${user.id}/status`, { status: next });
          fetchUsers(); fetchStats();
          addToast("success", "Status updated", `${user.name} is now ${next}.`);
        } catch (e: any) {
          addToast("error", "Update failed", e.response?.data?.message || "Failed to update status.");
        }
      },
    });
  };

  const handleDeleteUser = (user: User) => {
    setConfirm({
      open: true, variant: "danger",
      title: "Delete User",
      message: `This will permanently delete ${user.name}'s account. This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await api.delete(`/users/${user.id}`);
          fetchUsers(); fetchStats();
          addToast("success", "User deleted", `${user.name} has been removed.`);
        } catch (e: any) {
          addToast("error", "Delete failed", e.response?.data?.message || "Failed to delete user.");
        }
      },
    });
  };

  const handleViewUser = async (userId: string) => {
    try {
      const res = await api.get(`/users/${userId}`);
      setSelectedUser(res.data.data);
      setIsViewOpen(true);
    } catch {
      addToast("error", "Load failed", "Could not fetch user details.");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <ConfirmDialogModal config={confirm} onClose={() => setConfirm(c => ({ ...c, open: false }))} />

      <div className="min-h-screen bg-background p-3 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
                <span>User & Role Management</span>
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Manage user accounts, roles, and permissions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5"
                onClick={() => { fetchUsers(); fetchStats(); }}>
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    <span>Add User</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>Create a new user account and assign role permissions</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name *</Label>
                        <Input placeholder="John Doe" value={newUser.name}
                          onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Email *</Label>
                        <Input type="email" placeholder="john@example.com" value={newUser.email}
                          onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Password *</Label>
                        <Input type="password" placeholder="••••••••" value={newUser.password}
                          onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input placeholder="+254 712 345 678" value={newUser.phone}
                          onChange={e => setNewUser({ ...newUser, phone: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={newUser.role}
                          onValueChange={v => setNewUser({ ...newUser, role: v as User["role"] })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["Admin","Operations Manager","Guard","Client"].map(r => (
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Department</Label>
                        <Input placeholder="Operations" value={newUser.department}
                          onChange={e => setNewUser({ ...newUser, department: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Permissions for {newUser.role}</Label>
                      <div className="p-3 rounded-lg bg-secondary/30 flex flex-wrap gap-2">
                        {rolePermissions[newUser.role]?.map((perm, idx) => (
                          <span key={idx}
                            className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                            {perm.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddUser}>Create User</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* ── Stats Cards ── */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label: "Total Users",    value: stats.total,   color: "text-foreground", bg: "bg-primary/10",     icon: Users,    iconColor: "text-primary" },
                { label: "Active Users",   value: stats.active,  color: "text-success",    bg: "bg-success/10",     icon: Activity, iconColor: "text-success" },
                { label: "Administrators", value: stats.admins,  color: "text-destructive", bg: "bg-destructive/10", icon: Shield,   iconColor: "text-destructive" },
                { label: "Field Guards",   value: stats.guards,  color: "text-foreground", bg: "bg-secondary",       icon: Users,    iconColor: "text-muted-foreground" },
              ].map(({ label, value, color, bg, icon: Icon, iconColor }) => (
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
          )}

          {/* ── Filters ── */}
          <div className="glass-card rounded-xl p-4 sm:p-5 border border-border/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="sm:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by name or email..." className="pl-10" value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <Select value={filterRole} onValueChange={v => { setFilterRole(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Filter by role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {["Admin","Operations Manager","Guard","Client"].map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Filter by status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Table ── */}
          <div className="glass-card rounded-xl border border-border/50 overflow-hidden">

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/30 border-b border-border/50">
                  <tr>
                    {["User","Role","Status","Department","Last Active","Actions"].map(h => (
                      <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                          <p className="text-muted-foreground text-sm">Loading users...</p>
                        </div>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No users found</p>
                      </td>
                    </tr>
                  ) : users.map(user => {
                    const sc = statusConfig[user.status] ?? statusConfig.active;
                    return (
                      <tr key={user.id}
                        className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-primary">
                                {user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground text-sm truncate">{user.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full border whitespace-nowrap", roleColors[user.role])}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full flex-shrink-0", sc.dot)} />
                            <span className={cn("text-sm font-medium", sc.color)}>{sc.label}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-muted-foreground">{user.department || "—"}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            {user.lastActive || "—"}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" title="View" onClick={() => handleViewUser(user.id)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm"
                              title={user.status === "active" ? "Deactivate" : "Activate"}
                              onClick={() => handleToggleStatus(user)}>
                              {user.status === "active"
                                ? <Lock className="w-4 h-4 text-warning" />
                                : <Unlock className="w-4 h-4 text-success" />}
                            </Button>
                            <Button variant="ghost" size="sm" title="Delete" onClick={() => handleDeleteUser(user)}>
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
            <div className="md:hidden">
              {loading ? (
                <div className="py-16 flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-muted-foreground text-sm">Loading users...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="py-16 text-center">
                  <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No users found</p>
                </div>
              ) : users.map(user => {
                const sc = statusConfig[user.status] ?? statusConfig.active;
                const expanded = expandedRow === user.id;
                return (
                  <div key={user.id} className="border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-3 px-4 py-3"
                      onClick={() => setExpandedRow(expanded ? null : user.id)}>
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className={cn("w-2 h-2 rounded-full", sc.dot)} />
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                    {expanded && (
                      <div className="px-4 pb-4 bg-secondary/10 border-t border-border/30 space-y-3">
                        <div className="grid grid-cols-2 gap-3 pt-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Role</p>
                            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border inline-block mt-1", roleColors[user.role])}>
                              {user.role}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Status</p>
                            <p className={cn("text-sm font-medium mt-1", sc.color)}>{sc.label}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Department</p>
                            <p className="text-sm mt-1">{user.department || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Last Active</p>
                            <p className="text-xs mt-1 text-muted-foreground">{user.lastActive || "—"}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button variant="outline" size="sm" className="flex-1 text-xs"
                            onClick={() => { setExpandedRow(null); handleViewUser(user.id); }}>
                            <Eye className="w-3.5 h-3.5 mr-1" /> View
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 text-xs"
                            onClick={() => { setExpandedRow(null); handleToggleStatus(user); }}>
                            {user.status === "active"
                              ? <><Lock className="w-3.5 h-3.5 mr-1 text-warning" /> Deactivate</>
                              : <><Unlock className="w-3.5 h-3.5 mr-1 text-success" /> Activate</>}
                          </Button>
                          <Button variant="outline" size="sm" className="text-xs text-destructive border-destructive/30"
                            onClick={() => { setExpandedRow(null); handleDeleteUser(user); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {!loading && total > 0 && (
              <Pagination page={page} totalPages={totalPages} total={total}
                pageSize={PAGE_SIZE} onPage={p => setPage(p)} />
            )}
          </div>

          {/* ── View User Modal ── */}
          <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>User Details</DialogTitle>
                <DialogDescription>{selectedUser?.email}</DialogDescription>
              </DialogHeader>
              {selectedUser && (
                <div className="space-y-5">
                  {/* Avatar + name block */}
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 border border-border/50">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-primary">
                        {selectedUser.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{selectedUser.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full border", roleColors[selectedUser.role])}>
                          {selectedUser.role}
                        </span>
                        <div className={cn("flex items-center gap-1 text-xs", statusConfig[selectedUser.status]?.color)}>
                          <div className={cn("w-1.5 h-1.5 rounded-full", statusConfig[selectedUser.status]?.dot)} />
                          {statusConfig[selectedUser.status]?.label}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      ["Phone",      selectedUser.phone || "—"],
                      ["Department", selectedUser.department || "—"],
                      ["Last Active", selectedUser.lastActive || "—"],
                      ["Created At", selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : "—"],
                    ].map(([label, val]) => (
                      <div key={label} className="p-3 rounded-lg bg-secondary/20 border border-border/30">
                        <Label className="text-xs text-muted-foreground">{label}</Label>
                        <p className="text-sm font-medium mt-1">{val}</p>
                      </div>
                    ))}
                  </div>

                  {selectedUser.permissions?.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Permissions</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedUser.permissions.map((perm, idx) => (
                          <span key={idx}
                            className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {perm.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
                {selectedUser && selectedUser.status !== "active" && (
                  <Button onClick={() => { setIsViewOpen(false); if (selectedUser) handleToggleStatus(selectedUser); }}>
                    <Unlock className="w-4 h-4 mr-2" /> Activate
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </div>
    </>
  );
};

export default UsersPage;