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
  Bell
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

interface ClientPortalUser {
  id: string;
  name: string;
  email: string;
  company: string;
  companyId: string;
  role: "primary" | "secondary" | "viewer";
  status: "active" | "inactive" | "suspended";
  lastLogin: string;
  createdDate: string;
  permissions: {
    viewIncidents: boolean;
    viewCCTV: boolean;
    viewInvoices: boolean;
    viewReports: boolean;
    submitRequests: boolean;
    viewPersonnel: boolean;
  };
  accessLevel: "full" | "limited" | "read-only";
  twoFactorEnabled: boolean;
  loginAttempts: number;
}

interface ServiceRequest {
  id: string;
  clientName: string;
  clientId: string;
  type: "incident" | "complaint" | "additional-service" | "maintenance" | "general";
  subject: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in-progress" | "resolved" | "closed";
  submittedDate: string;
  resolvedDate?: string;
  assignedTo?: string;
  responseTime?: string;
}

const userStatusConfig = {
  active: { color: "text-success", bg: "bg-success/10", label: "Active" },
  inactive: { color: "text-muted-foreground", bg: "bg-muted", label: "Inactive" },
  suspended: { color: "text-destructive", bg: "bg-destructive/10", label: "Suspended" },
};

const requestTypeConfig = {
  incident: { color: "text-destructive", icon: AlertTriangle, label: "Incident" },
  complaint: { color: "text-warning", icon: MessageSquare, label: "Complaint" },
  "additional-service": { color: "text-primary", icon: Shield, label: "Additional Service" },
  maintenance: { color: "text-warning", icon: Settings, label: "Maintenance" },
  general: { color: "text-muted-foreground", icon: FileText, label: "General" },
};

const requestStatusConfig = {
  open: { color: "text-destructive", bg: "bg-destructive/10", label: "Open" },
  "in-progress": { color: "text-warning", bg: "bg-warning/10", label: "In Progress" },
  resolved: { color: "text-success", bg: "bg-success/10", label: "Resolved" },
  closed: { color: "text-muted-foreground", bg: "bg-muted", label: "Closed" },
};

const mockPortalUsers: ClientPortalUser[] = [
  {
    id: "CPU001",
    name: "Patricia Mwangi",
    email: "patricia@westgate.co.ke",
    company: "Westgate Shopping Mall",
    companyId: "CLI001",
    role: "primary",
    status: "active",
    lastLogin: "2026-01-19 14:30",
    createdDate: "2024-01-15",
    permissions: {
      viewIncidents: true,
      viewCCTV: true,
      viewInvoices: true,
      viewReports: true,
      submitRequests: true,
      viewPersonnel: true
    },
    accessLevel: "full",
    twoFactorEnabled: true,
    loginAttempts: 0
  },
  {
    id: "CPU002",
    name: "James Kimani",
    email: "j.kimani@safaricom.co.ke",
    company: "SafariCom HQ",
    companyId: "CLI002",
    role: "primary",
    status: "active",
    lastLogin: "2026-01-19 10:15",
    createdDate: "2024-02-20",
    permissions: {
      viewIncidents: true,
      viewCCTV: true,
      viewInvoices: true,
      viewReports: true,
      submitRequests: true,
      viewPersonnel: true
    },
    accessLevel: "full",
    twoFactorEnabled: true,
    loginAttempts: 0
  },
  {
    id: "CPU003",
    name: "Emily Odhiambo",
    email: "e.odhiambo@kempinski.com",
    company: "Villa Rosa Kempinski",
    companyId: "CLI003",
    role: "secondary",
    status: "active",
    lastLogin: "2026-01-18 16:45",
    createdDate: "2023-06-10",
    permissions: {
      viewIncidents: true,
      viewCCTV: true,
      viewInvoices: false,
      viewReports: true,
      submitRequests: true,
      viewPersonnel: false
    },
    accessLevel: "limited",
    twoFactorEnabled: false,
    loginAttempts: 0
  },
  {
    id: "CPU004",
    name: "David Wanjiru",
    email: "d.wanjiru@kenyapower.co.ke",
    company: "Kenya Power Industrial Park",
    companyId: "CLI004",
    role: "viewer",
    status: "active",
    lastLogin: "2026-01-17 09:20",
    createdDate: "2024-01-01",
    permissions: {
      viewIncidents: true,
      viewCCTV: false,
      viewInvoices: false,
      viewReports: true,
      submitRequests: false,
      viewPersonnel: false
    },
    accessLevel: "read-only",
    twoFactorEnabled: false,
    loginAttempts: 0
  },
];

const mockServiceRequests: ServiceRequest[] = [
  {
    id: "SR001",
    clientName: "Westgate Shopping Mall",
    clientId: "CLI001",
    type: "additional-service",
    subject: "Request for Additional Guards During Peak Season",
    description: "We anticipate higher foot traffic during the holiday season and require 4 additional guards for the parking areas.",
    priority: "high",
    status: "in-progress",
    submittedDate: "2026-01-18 10:30",
    assignedTo: "Lisa Wang"
  },
  {
    id: "SR002",
    clientName: "SafariCom HQ",
    clientId: "CLI002",
    type: "incident",
    subject: "Report: Suspicious Activity Near Server Room",
    description: "Staff reported seeing an unauthorized individual near the server room entrance on Level 3. CCTV footage attached.",
    priority: "urgent",
    status: "resolved",
    submittedDate: "2026-01-17 14:15",
    resolvedDate: "2026-01-17 15:45",
    assignedTo: "Michael Okonkwo",
    responseTime: "1h 30min"
  },
  {
    id: "SR003",
    clientName: "Villa Rosa Kempinski",
    clientId: "CLI003",
    type: "complaint",
    subject: "Guard Not at Assigned Post",
    description: "Main entrance guard was not visible at post between 2:00 PM - 2:15 PM today.",
    priority: "medium",
    status: "closed",
    submittedDate: "2026-01-16 14:20",
    resolvedDate: "2026-01-16 16:00",
    assignedTo: "Sarah Johnson",
    responseTime: "1h 40min"
  },
  {
    id: "SR004",
    clientName: "Kenya Power Industrial Park",
    clientId: "CLI004",
    type: "maintenance",
    subject: "CCTV Camera Malfunction - Warehouse Entrance",
    description: "Camera #7 at warehouse entrance is showing a black screen. Requires inspection.",
    priority: "high",
    status: "open",
    submittedDate: "2026-01-19 08:00",
    assignedTo: "Tech Support"
  },
  {
    id: "SR005",
    clientName: "Westgate Shopping Mall",
    clientId: "CLI001",
    type: "general",
    subject: "Monthly Security Report Request",
    description: "Please provide the detailed security report for December 2025.",
    priority: "low",
    status: "resolved",
    submittedDate: "2026-01-15 11:00",
    resolvedDate: "2026-01-15 15:30",
    responseTime: "4h 30min"
  },
];

export const PortalPage = () => {
  const [portalUsers, setPortalUsers] = useState<ClientPortalUser[]>(mockPortalUsers);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>(mockServiceRequests);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ClientPortalUser | null>(null);
  const [isViewUserModalOpen, setIsViewUserModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [isViewRequestModalOpen, setIsViewRequestModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("users");

  const handleViewUser = (user: ClientPortalUser) => {
    setSelectedUser(user);
    setIsViewUserModalOpen(true);
  };

  const handleViewRequest = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setIsViewRequestModalOpen(true);
  };

  const handleToggleUserStatus = (userId: string) => {
    setPortalUsers(portalUsers.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === "active" ? "inactive" : "active" as any }
        : user
    ));
  };

  const stats = {
    totalUsers: portalUsers.length,
    activeUsers: portalUsers.filter(u => u.status === "active").length,
    totalRequests: serviceRequests.length,
    openRequests: serviceRequests.filter(r => r.status === "open" || r.status === "in-progress").length,
    avgResponseTime: "2h 30min",
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
          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <User className="w-4 h-4" />
                Add Portal User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Client Portal Account</DialogTitle>
                <DialogDescription>
                  Grant client access to the secure portal
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input placeholder="John Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input type="email" placeholder="john@company.com" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Select Client Company</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose company" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CLI001">Westgate Mall</SelectItem>
                        <SelectItem value="CLI002">SafariCom HQ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>User Role</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
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
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <span className="text-sm">View Incidents</span>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <span className="text-sm">View CCTV</span>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <span className="text-sm">View Invoices</span>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <span className="text-sm">View Reports</span>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <span className="text-sm">Submit Requests</span>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <span className="text-sm">View Personnel</span>
                      <Switch />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                  <div>
                    <p className="text-sm font-medium">Require Two-Factor Authentication</p>
                    <p className="text-xs text-muted-foreground">Enhanced security for login</p>
                  </div>
                  <Switch />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                  Cancel
                </Button>
                <Button>Create Account & Send Invite</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Portal Users</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.totalUsers}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>
          
          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Accounts</p>
                <p className="text-3xl font-bold text-success mt-1">{stats.activeUsers}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Service Requests</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.totalRequests}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Requests</p>
                <p className="text-3xl font-bold text-warning mt-1">{stats.openRequests}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Response</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.avgResponseTime}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-success" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">Portal Users</TabsTrigger>
            <TabsTrigger value="requests">Service Requests</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
          </TabsList>

          {/* Portal Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary/30 border-b border-border/50">
                    <tr>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">User</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Company</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Role</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Access Level</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Last Login</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portalUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-border/30 hover:bg-secondary/20 transition-colors"
                      >
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
                          <p className="text-sm">{user.company}</p>
                          <p className="text-xs text-muted-foreground font-mono">{user.companyId}</p>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant="outline" className="capitalize">{user.role}</Badge>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Key className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm capitalize">{user.accessLevel}</span>
                          </div>
                          {user.twoFactorEnabled && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              2FA Enabled
                            </Badge>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={cn(
                            "text-xs font-medium px-3 py-1.5 rounded-full",
                            userStatusConfig[user.status].bg,
                            userStatusConfig[user.status].color
                          )}>
                            {userStatusConfig[user.status].label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {user.lastLogin}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewUser(user)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleUserStatus(user.id)}
                            >
                              {user.status === "active" ? (
                                <Lock className="w-4 h-4" />
                              ) : (
                                <Unlock className="w-4 h-4" />
                              )}
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
          </TabsContent>

          {/* Service Requests Tab */}
          <TabsContent value="requests" className="space-y-4">
            <div className="space-y-4">
              {serviceRequests.map((request) => {
                const TypeIcon = requestTypeConfig[request.type].icon;
                
                return (
                  <div
                    key={request.id}
                    className="glass-card rounded-xl p-5 border border-border/50 hover:border-primary/30 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                          <TypeIcon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-foreground">{request.subject}</h3>
                            <Badge className={cn(
                              requestTypeConfig[request.type].color
                            )}>
                              {requestTypeConfig[request.type].label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono mb-3">{request.id}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                            <div>
                              <p className="text-muted-foreground text-xs">Client</p>
                              <p className="font-medium">{request.clientName}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Priority</p>
                              <p className="font-medium capitalize">{request.priority}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Submitted</p>
                              <p className="font-medium">{request.submittedDate}</p>
                            </div>
                            {request.assignedTo && (
                              <div>
                                <p className="text-muted-foreground text-xs">Assigned To</p>
                                <p className="font-medium">{request.assignedTo}</p>
                              </div>
                            )}
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {request.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-3">
                        <span className={cn(
                          "text-xs font-medium px-3 py-1.5 rounded-full",
                          requestStatusConfig[request.status].bg,
                          requestStatusConfig[request.status].color
                        )}>
                          {requestStatusConfig[request.status].label}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewRequest(request)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>

                    {request.responseTime && (
                      <div className="border-t border-border/50 pt-3 mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium">Resolved:</span> {request.resolvedDate}
                        </div>
                        <div>
                          <span className="font-medium">Response Time:</span> {request.responseTime}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Activity Log Tab */}
          <TabsContent value="activity" className="space-y-4">
            <div className="glass-card rounded-xl p-6 border border-border/50">
              <h3 className="font-semibold text-foreground mb-4">Recent Portal Activity</h3>
              <div className="space-y-3">
                {[
                  { user: "Patricia Mwangi", action: "Viewed incident report INC001", time: "5 min ago" },
                  { user: "James Kimani", action: "Downloaded monthly security report", time: "15 min ago" },
                  { user: "Emily Odhiambo", action: "Submitted service request SR004", time: "1 hour ago" },
                  { user: "David Wanjiru", action: "Logged into portal", time: "2 hours ago" },
                ].map((activity, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-secondary/30 border border-border/50 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.user}</p>
                      <p className="text-xs text-muted-foreground">{activity.action}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* View User Modal */}
        <Dialog open={isViewUserModalOpen} onOpenChange={setIsViewUserModalOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Portal User Details</DialogTitle>
              <DialogDescription>
                Complete information for {selectedUser?.name}
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">User ID</Label>
                    <p className="font-mono text-sm mt-1">{selectedUser.id}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="text-sm mt-1">{selectedUser.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="text-sm mt-1">{selectedUser.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Company</Label>
                    <p className="text-sm mt-1">{selectedUser.company}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Role</Label>
                    <p className="text-sm mt-1 capitalize">{selectedUser.role}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Access Level</Label>
                    <p className="text-sm mt-1 capitalize">{selectedUser.accessLevel}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <p className="text-sm mt-1 capitalize">{selectedUser.status}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Two-Factor Auth</Label>
                    <p className="text-sm mt-1">{selectedUser.twoFactorEnabled ? "Enabled" : "Disabled"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Last Login</Label>
                    <p className="text-sm mt-1">{selectedUser.lastLogin}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Created Date</Label>
                    <p className="text-sm mt-1">{selectedUser.createdDate}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Portal Permissions</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {Object.entries(selectedUser.permissions).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
                        {value ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="text-xs capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewUserModalOpen(false)}>
                Close
              </Button>
              <Button>
                <Mail className="w-4 h-4 mr-2" />
                Send Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Request Modal */}
        <Dialog open={isViewRequestModalOpen} onOpenChange={setIsViewRequestModalOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Service Request Details</DialogTitle>
              <DialogDescription>
                Complete information for {selectedRequest?.id}
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Request ID</Label>
                    <p className="font-mono text-sm mt-1">{selectedRequest.id}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Type</Label>
                    <p className="text-sm mt-1 capitalize">{selectedRequest.type.replace(/-/g, ' ')}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Client</Label>
                    <p className="text-sm mt-1">{selectedRequest.clientName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Priority</Label>
                    <p className="text-sm mt-1 capitalize">{selectedRequest.priority}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <p className="text-sm mt-1 capitalize">{selectedRequest.status}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Submitted</Label>
                    <p className="text-sm mt-1">{selectedRequest.submittedDate}</p>
                  </div>
                  {selectedRequest.assignedTo && (
                    <div>
                      <Label className="text-muted-foreground">Assigned To</Label>
                      <p className="text-sm mt-1">{selectedRequest.assignedTo}</p>
                    </div>
                  )}
                  {selectedRequest.resolvedDate && (
                    <div>
                      <Label className="text-muted-foreground">Resolved Date</Label>
                      <p className="text-sm mt-1">{selectedRequest.resolvedDate}</p>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground">Subject</Label>
                  <p className="text-sm mt-2 p-3 rounded-lg bg-secondary/30 font-medium">
                    {selectedRequest.subject}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm mt-2 p-3 rounded-lg bg-secondary/30">
                    {selectedRequest.description}
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewRequestModalOpen(false)}>
                Close
              </Button>
              <Button>Update Status</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PortalPage;