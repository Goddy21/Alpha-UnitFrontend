import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  User, Building2, FileText, MessageSquare, Eye, Download,
  Clock, CheckCircle, AlertTriangle, Settings, Bell, Trash2,
  Loader2, RefreshCw, Mail, X,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: "incident" | "system" | "personnel" | "client" | "maintenance" | "alert";
  title: string; message: string; timestamp: string;
  read: boolean; priority: "low" | "medium" | "high" | "critical";
  category: string; action_required: boolean; link?: string;
  recipient_type: "all" | "admins" | "operations" | "guards" | "clients";
}

interface NotificationStats {
  total: number; unread: number; critical: number; action_required: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const notificationTypeConfig = {
  incident:    { color: "text-destructive", icon: AlertTriangle, bg: "bg-destructive/10" },
  system:      { color: "text-primary",     icon: Settings,      bg: "bg-primary/10"     },
  personnel:   { color: "text-primary",     icon: User,          bg: "bg-primary/10"     },
  client:      { color: "text-warning",     icon: Building2,     bg: "bg-warning/10"     },
  maintenance: { color: "text-warning",     icon: Settings,      bg: "bg-warning/10"     },
  alert:       { color: "text-destructive", icon: Bell,          bg: "bg-destructive/10" },
};

const priorityConfig: Record<string, { bg: string; color: string; dot: string }> = {
  critical: { bg: "bg-destructive/10", color: "text-destructive",      dot: "bg-destructive"      },
  high:     { bg: "bg-warning/10",     color: "text-warning",          dot: "bg-warning"          },
  medium:   { bg: "bg-primary/10",     color: "text-primary",          dot: "bg-primary"          },
  low:      { bg: "bg-muted",          color: "text-muted-foreground", dot: "bg-muted-foreground" },
};

const PAGE_SIZE = 10;

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({ open, title, description, onConfirm, onCancel }: {
  open: boolean; title: string; description: string;
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
          <Button variant="destructive" onClick={onConfirm} className="w-full sm:w-auto">Delete</Button>
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

export const NotificationsPage = () => {
  const { toast } = useToast();

  const [notifications,  setNotifications]  = useState<Notification[]>([]);
  const [stats,          setStats]          = useState<NotificationStats>({ total: 0, unread: 0, critical: 0, action_required: 0 });
  const [loading,        setLoading]        = useState(true);
  const [filterType,     setFilterType]     = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [page,           setPage]           = useState(1);

  const [deleteTarget, setDeleteTarget] = useState<Notification | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType     !== "all") params.set("type",     filterType);
      if (filterPriority !== "all") params.set("priority", filterPriority);
      if (showUnreadOnly)           params.set("read",     "false");

      const [notifRes, statsRes] = await Promise.all([
        api.get(`/notifications?${params}`),
        api.get("/notifications/stats"),
      ]);

      setNotifications(notifRes.data.data ?? []);
      setStats(statsRes.data.data ?? { total: 0, unread: 0, critical: 0, action_required: 0 });
      setPage(1);
    } catch (err: any) {
      toast({
        title: "Failed to load notifications",
        description: err.response?.data?.message ?? err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filterType, filterPriority, showUnreadOnly, toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}`, { read: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
    } catch (err: any) {
      toast({ title: "Failed to mark as read", description: err.response?.data?.message ?? err.message, variant: "destructive" });
    }
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    try {
      await Promise.all(unread.map(n => api.put(`/notifications/${n.id}`, { read: true })));
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setStats(prev => ({ ...prev, unread: 0, action_required: 0 }));
      toast({ title: "All notifications marked as read" });
    } catch (err: any) {
      toast({ title: "Failed to mark all as read", description: err.response?.data?.message ?? err.message, variant: "destructive" });
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      const removed = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setStats(prev => ({
        ...prev,
        total:  prev.total - 1,
        unread: removed && !removed.read ? Math.max(0, prev.unread - 1) : prev.unread,
      }));
    } catch (err: any) {
      toast({ title: "Failed to delete notification", description: err.response?.data?.message ?? err.message, variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const displayStats = {
    total:           stats.total           ?? notifications.length,
    unread:          stats.unread          ?? notifications.filter(n => !n.read).length,
    critical:        stats.critical        ?? notifications.filter(n => n.priority === "critical").length,
    action_required: stats.action_required ?? notifications.filter(n => n.action_required && !n.read).length,
  };

  const paged = notifications.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background px-3 py-4 sm:px-6 sm:py-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
              <Bell className="w-5 h-5 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
              <span className="truncate">Notifications Center</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              Stay updated on incidents, alerts, and system notifications
            </p>
          </div>
          <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
            <Button variant="outline" size="icon" onClick={fetchAll} title="Refresh">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              title="Mark All Read"
              disabled={displayStats.unread === 0}
              onClick={handleMarkAllAsRead}
            >
              <CheckCircle className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" title="Preferences">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats — 2 col mobile, 4 col md+ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          {[
            { label: "Total",           value: displayStats.total,           icon: Bell,          color: "primary"     },
            { label: "Unread",          value: displayStats.unread,           icon: Mail,          color: "warning"     },
            { label: "Critical",        value: displayStats.critical,         icon: AlertTriangle, color: "destructive" },
            { label: "Action Required", value: displayStats.action_required,  icon: Clock,         color: "warning"     },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass-card rounded-xl p-3 sm:p-5 border border-border/50">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{label}</p>
                  <p className={cn("text-2xl sm:text-3xl font-bold mt-0.5", `text-${color}`)}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : value}
                  </p>
                </div>
                <div className={cn("w-9 h-9 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0", `bg-${color}/10`)}>
                  <Icon className={cn("w-4 h-4 sm:w-6 sm:h-6", `text-${color}`)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="glass-card rounded-xl p-3 sm:p-5 border border-border/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select value={filterType} onValueChange={v => { setFilterType(v); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Filter by type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="incident">Incidents</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="personnel">Personnel</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="alert">Alerts</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={v => { setFilterPriority(v); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Filter by priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <span className="text-sm">Unread Only</span>
              <Switch checked={showUnreadOnly} onCheckedChange={v => { setShowUnreadOnly(v); setPage(1); }} />
            </div>

            <Button variant="outline" className="w-full gap-2">
              <Download className="w-4 h-4" /> Export Log
            </Button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="glass-card rounded-xl p-12 sm:p-16 border border-border/50 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No notifications found.</p>
          </div>
        ) : (
          <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-secondary/30 border-b border-border/50">
                  <tr>
                    {["Notification", "Type", "Priority", "Category", "Recipient", "Time", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {paged.map(notification => {
                    const cfg = notificationTypeConfig[notification.type] ?? notificationTypeConfig.system;
                    const TypeIcon = cfg.icon;
                    const pc = priorityConfig[notification.priority] ?? priorityConfig.low;

                    return (
                      <tr
                        key={notification.id}
                        className={cn(
                          "hover:bg-secondary/20 transition-colors",
                          !notification.read && "bg-primary/5"
                        )}
                      >
                        {/* Notification title + message */}
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2.5">
                            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", cfg.bg)}>
                              <TypeIcon className={cn("w-3.5 h-3.5", cfg.color)} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium text-foreground truncate max-w-[180px]">
                                  {notification.title}
                                </p>
                                {!notification.read && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                                {notification.message}
                              </p>
                              {notification.action_required && (
                                <Badge variant="destructive" className="text-xs mt-0.5">Action Required</Badge>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-4 py-3">
                          <span className={cn("text-xs font-medium capitalize whitespace-nowrap", cfg.color)}>
                            {notification.type}
                          </span>
                        </td>

                        {/* Priority */}
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full capitalize whitespace-nowrap", pc.bg, pc.color)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", pc.dot)} />
                            {notification.priority}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3">
                          {notification.category
                            ? <Badge variant="outline" className="text-xs whitespace-nowrap">{notification.category}</Badge>
                            : <span className="text-muted-foreground text-xs">—</span>}
                        </td>

                        {/* Recipient */}
                        <td className="px-4 py-3 text-xs text-muted-foreground capitalize whitespace-nowrap">
                          {notification.recipient_type}
                        </td>

                        {/* Time */}
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {notification.timestamp
                            ? new Date(notification.timestamp).toLocaleString([], {
                                month: "short", day: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })
                            : "—"}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-0.5">
                            {notification.link && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" asChild title="View">
                                <a href={notification.link}><Eye className="w-3.5 h-3.5" /></a>
                              </Button>
                            )}
                            {!notification.read && (
                              <Button variant="ghost" size="icon" className="h-7 w-7"
                                title="Mark as read"
                                onClick={() => handleMarkAsRead(notification.id)}>
                                <CheckCircle className="w-3.5 h-3.5 text-success" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Delete"
                              onClick={() => setDeleteTarget(notification)}>
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
            {notifications.length > PAGE_SIZE && (
              <Pagination page={page} total={notifications.length} pageSize={PAGE_SIZE} onChange={setPage} />
            )}
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete Notification"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        onConfirm={() => deleteTarget && handleDeleteNotification(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default NotificationsPage;