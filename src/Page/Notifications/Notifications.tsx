import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  User,
  Building2,
  Shield,
  Video,
  FileText,
  DollarSign,
  MessageSquare,
  Eye,
  Download,
  Lock,
  Unlock,
  Mail,
  Key,
  Clock,
  CheckCircle,
  AlertTriangle,
  Settings,
  Bell,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface Notification {
  id: string;
  type: "incident" | "system" | "personnel" | "client" | "maintenance" | "alert";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: "low" | "medium" | "high" | "critical";
  category: string;
  actionRequired: boolean;
  link?: string;
  recipientType: "all" | "admins" | "operations" | "guards" | "clients";
}

const notificationTypeConfig = {
  incident: { color: "text-destructive", icon: AlertTriangle, bg: "bg-destructive/10" },
  system: { color: "text-primary", icon: Settings, bg: "bg-primary/10" },
  personnel: { color: "text-primary", icon: User, bg: "bg-primary/10" },
  client: { color: "text-warning", icon: Building2, bg: "bg-warning/10" },
  maintenance: { color: "text-warning", icon: Settings, bg: "bg-warning/10" },
  alert: { color: "text-destructive", icon: Bell, bg: "bg-destructive/10" },
};

const mockNotifications: Notification[] = [
  {
    id: "NOT001",
    type: "incident",
    title: "Critical Incident Reported",
    message: "Unauthorized access attempt at SafariCom HQ - Data Center. Immediate response required.",
    timestamp: "2026-01-19 14:30",
    read: false,
    priority: "critical",
    category: "Security",
    actionRequired: true,
    link: "/incidents/INC001",
    recipientType: "operations"
  },
  {
    id: "NOT002",
    type: "system",
    title: "System Maintenance Scheduled",
    message: "ISMS platform will undergo scheduled maintenance on Jan 22, 2026 from 2:00 AM - 4:00 AM. Limited functionality during this period.",
    timestamp: "2026-01-19 10:00",
    read: false,
    priority: "medium",
    category: "System",
    actionRequired: false,
    recipientType: "all"
  },
  {
    id: "NOT003",
    type: "personnel",
    title: "Guard Certification Expiring",
    message: "Michael Ochieng's First Aid certification expires in 15 days. Renewal required.",
    timestamp: "2026-01-19 08:00",
    read: true,
    priority: "medium",
    category: "Personnel",
    actionRequired: true,
    link: "/personnel/GRD004",
    recipientType: "operations"
  },
  {
    id: "NOT004",
    type: "client",
    title: "New Service Request",
    message: "Westgate Shopping Mall submitted a request for additional guards during peak season.",
    timestamp: "2026-01-18 15:45",
    read: true,
    priority: "high",
    category: "Client Relations",
    actionRequired: true,
    link: "/client-portal/requests/SR001",
    recipientType: "operations"
  },
  {
    id: "NOT005",
    type: "maintenance",
    title: "Vehicle Maintenance Due",
    message: "Patrol Vehicle VH-2024-001 (Toyota Hilux) is due for scheduled maintenance on Jan 25, 2026.",
    timestamp: "2026-01-18 12:00",
    read: true,
    priority: "medium",
    category: "Equipment",
    actionRequired: true,
    link: "/inventory/INV002",
    recipientType: "operations"
  },
  {
    id: "NOT006",
    type: "alert",
    title: "CCTV Camera Offline",
    message: "Camera #7 at Kenya Power warehouse entrance is offline. Technical team notified.",
    timestamp: "2026-01-18 08:00",
    read: true,
    priority: "high",
    category: "Technology",
    actionRequired: true,
    link: "/cctv",
    recipientType: "operations"
  },
  {
    id: "NOT007",
    type: "system",
    title: "Monthly Report Generated",
    message: "December 2025 security analytics report is now available for download.",
    timestamp: "2026-01-15 09:00",
    read: true,
    priority: "low",
    category: "Reports",
    actionRequired: false,
    link: "/reports",
    recipientType: "admins"
  },
];

export const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const filteredNotifications = notifications.filter(notif => {
    const matchesType = filterType === "all" || notif.type === filterType;
    const matchesPriority = filterPriority === "all" || notif.priority === filterPriority;
    const matchesRead = !showUnreadOnly || !notif.read;
    return matchesType && matchesPriority && matchesRead;
  });

  const handleMarkAsRead = (notifId: string) => {
    setNotifications(notifications.map(n => 
      n.id === notifId ? { ...n, read: true } : n
    ));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleDeleteNotification = (notifId: string) => {
    setNotifications(notifications.filter(n => n.id !== notifId));
  };

  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    critical: notifications.filter(n => n.priority === "critical").length,
    actionRequired: notifications.filter(n => n.actionRequired && !n.read).length,
  };

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
            <Button variant="outline" onClick={handleMarkAllAsRead}>
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
          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Notifications</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bell className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>
          
          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unread</p>
                <p className="text-3xl font-bold text-warning mt-1">{stats.unread}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Mail className="w-6 h-6 text-warning" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-3xl font-bold text-destructive mt-1">{stats.critical}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Action Required</p>
                <p className="text-3xl font-bold text-warning mt-1">{stats.actionRequired}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card rounded-xl p-5 border border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
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
              <SelectTrigger>
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
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
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const TypeIcon = notificationTypeConfig[notification.type].icon;
            
            return (
              <div
                key={notification.id}
                className={cn(
                  "glass-card rounded-xl p-5 border transition-all duration-300 hover:border-primary/30",
                  !notification.read ? "border-primary/50 bg-primary/5" : "border-border/50"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
                    notificationTypeConfig[notification.type].bg
                  )}>
                    <TypeIcon className={cn("w-6 h-6", notificationTypeConfig[notification.type].color)} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
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
                        notification.priority === "high" ? "bg-warning/10 text-warning" :
                        notification.priority === "medium" ? "bg-primary/10 text-primary" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {notification.priority}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">{notification.message}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {notification.timestamp}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {notification.category}
                        </Badge>
                        {notification.actionRequired && (
                          <Badge variant="destructive" className="text-xs">
                            Action Required
                          </Badge>
                        )}
                        <span className="text-xs capitalize">{notification.recipientType}</span>
                      </div>
                      
                      <div className="flex gap-2">
                        {notification.link && (
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        )}
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
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
      </div>
    </div>
  );
};

export default NotificationsPage;