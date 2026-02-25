import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  User, Building2, FileText, MessageSquare, Eye, Download,
  Clock, CheckCircle, AlertTriangle, Settings, Bell, Trash2,
  Loader2, RefreshCw, Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";   // ← your existing axios instance

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: "incident" | "system" | "personnel" | "client" | "maintenance" | "alert";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: "low" | "medium" | "high" | "critical";
  category: string;
  action_required: boolean;
  link?: string;
  recipient_type: "all" | "admins" | "operations" | "guards" | "clients";
}

interface NotificationStats {
  total: number;
  unread: number;
  critical: number;
  action_required: number;
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

// ─── Component ────────────────────────────────────────────────────────────────

export const NotificationsPage = () => {
  const { toast } = useToast();

  const [notifications,   setNotifications]   = useState<Notification[]>([]);
  const [stats,           setStats]           = useState<NotificationStats>({ total: 0, unread: 0, critical: 0, action_required: 0 });
  const [loading,         setLoading]         = useState(true);
  const [filterType,      setFilterType]      = useState("all");
  const [filterPriority,  setFilterPriority]  = useState("all");
  const [showUnreadOnly,  setShowUnreadOnly]  = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────────

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

  // ── Handlers ─────────────────────────────────────────────────────────────────

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
    }
  };

  // ── Derived stats (use live counts as fallback while loading) ────────────────

  const displayStats = {
    total:           stats.total           ?? notifications.length,
    unread:          stats.unread          ?? notifications.filter(n => !n.read).length,
    critical:        stats.critical        ?? notifications.filter(n => n.priority === "critical").length,
    action_required: stats.action_required ?? notifications.filter(n => n.action_required && !n.read).length,
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Bell className="w-8 h-8 text-primary" />
              Notifications Center
            </h1>
            <p className="text-muted-foreground mt-1">
              Stay updated on incidents, alerts, and system notifications
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchAll} title="Refresh">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
            <Button variant="outline" onClick={handleMarkAllAsRead} disabled={displayStats.unread === 0}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Preferences
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Total Notifications", value: displayStats.total,           icon: Bell,          color: "primary"     },
            { label: "Unread",              value: displayStats.unread,           icon: Mail,          color: "warning"     },
            { label: "Critical",            value: displayStats.critical,         icon: AlertTriangle, color: "destructive" },
            { label: "Action Required",     value: displayStats.action_required,  icon: Clock,         color: "warning"     },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass-card rounded-xl p-5 border border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className={cn("text-3xl font-bold mt-1", `text-${color}`)}>
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : value}
                  </p>
                </div>
                <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", `bg-${color}/10`)}>
                  <Icon className={cn("w-6 h-6", `text-${color}`)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="glass-card rounded-xl p-5 border border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={filterType} onValueChange={setFilterType}>
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

            <Select value={filterPriority} onValueChange={setFilterPriority}>
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
              <span className="text-sm">Show Unread Only</span>
              <Switch checked={showUnreadOnly} onCheckedChange={setShowUnreadOnly} />
            </div>

            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Log
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="glass-card rounded-xl p-16 border border-border/50 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No notifications found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const cfg = notificationTypeConfig[notification.type] ?? notificationTypeConfig.system;
              const TypeIcon = cfg.icon;

              return (
                <div
                  key={notification.id}
                  className={cn(
                    "glass-card rounded-xl p-5 border transition-all duration-300 hover:border-primary/30",
                    !notification.read ? "border-primary/50 bg-primary/5" : "border-border/50"
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0", cfg.bg)}>
                      <TypeIcon className={cn("w-6 h-6", cfg.color)} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-foreground">{notification.title}</h3>
                            {!notification.read && (
                              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">{notification.id}</p>
                        </div>
                        <Badge className={cn(
                          notification.priority === "critical" ? "bg-destructive/10 text-destructive" :
                          notification.priority === "high"     ? "bg-warning/10 text-warning"         :
                          notification.priority === "medium"   ? "bg-primary/10 text-primary"         :
                                                                 "bg-muted text-muted-foreground"
                        )}>
                          {notification.priority}
                        </Badge>
                      </div>

                      {/* Message */}
                      <p className="text-sm text-muted-foreground mb-3">{notification.message}</p>

                      {/* Footer row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {notification.timestamp
                              ? new Date(notification.timestamp).toLocaleString()
                              : "—"}
                          </div>
                          {notification.category && (
                            <Badge variant="outline" className="text-xs">{notification.category}</Badge>
                          )}
                          {notification.action_required && (
                            <Badge variant="destructive" className="text-xs">Action Required</Badge>
                          )}
                          <span className="capitalize">{notification.recipient_type}</span>
                        </div>

                        <div className="flex gap-2 flex-shrink-0">
                          {notification.link && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={notification.link}>
                                <Eye className="w-4 h-4 mr-1" /> View
                              </a>
                            </Button>
                          )}
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Mark as read"
                              onClick={() => handleMarkAsRead(notification.id)}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Delete"
                            onClick={() => handleDeleteNotification(notification.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;