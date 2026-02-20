// src/pages/Personnel.tsx
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Users,
  UserPlus,
  Search,
  Shield,
  Award,
  Calendar,
  Edit,
  Eye,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Download,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

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
  total: number;
  active: number;
  onLeave: number;
  inactive: number;
  suspended: number;
  avgRating: number;
  totalShifts: number;
  expiringCerts: number;
}

const statusConfig = {
  active: { color: "text-success", bg: "bg-success/10", label: "Active" },
  "on-leave": { color: "text-warning", bg: "bg-warning/10", label: "On Leave" },
  inactive: { color: "text-muted-foreground", bg: "bg-muted", label: "Inactive" },
  suspended: { color: "text-destructive", bg: "bg-destructive/10", label: "Suspended" },
};

const certStatusConfig = {
  valid: { color: "text-success", bg: "bg-success/10" },
  expiring: { color: "text-warning", bg: "bg-warning/10" },
  expired: { color: "text-destructive", bg: "bg-destructive/10" },
};

export const PersonnelPage = () => {
  const [guards, setGuards] = useState<Guard[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isAddGuardOpen, setIsAddGuardOpen] = useState(false);
  const [selectedGuard, setSelectedGuard] = useState<Guard | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  const [newGuard, setNewGuard] = useState({
    name: "",
    phone: "",
    email: "",
    psraLicense: "",
    psraExpiry: "",
    joinDate: "",
  });

  useEffect(() => {
    fetchGuards();
    fetchStats();
  }, [searchTerm, filterStatus, pagination.page]);

  const fetchGuards = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(searchTerm && { search: searchTerm }),
        ...(filterStatus !== "all" && { status: filterStatus }),
      };

      const response = await api.get("/personnel", { params });
      setGuards(response.data.data.personnel);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error("Error fetching personnel:", error);
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

  const handleAddGuard = async () => {
    try {
      await api.post("/personnel", {
        name: newGuard.name,
        phone: newGuard.phone,
        email: newGuard.email,
        psraLicense: newGuard.psraLicense,
        psraExpiry: newGuard.psraExpiry,
        joinDate: newGuard.joinDate,
      });

      setIsAddGuardOpen(false);
      setNewGuard({ name: "", phone: "", email: "", psraLicense: "", psraExpiry: "", joinDate: "" });
      fetchGuards();
      fetchStats();
    } catch (error: any) {
      console.error("Error creating guard:", error);
      alert(error.response?.data?.message || "Failed to create guard");
    }
  };

  const handleViewGuard = async (guardId: string) => {
    try {
      const response = await api.get(`/personnel/${guardId}`);
      setSelectedGuard(response.data.data);
      setIsViewModalOpen(true);
    } catch (error) {
      console.error("Error fetching guard details:", error);
      alert("Failed to load guard details");
    }
  };

  const handleDeleteGuard = async (guardId: string) => {
    if (!confirm("Are you sure you want to delete this guard?")) return;
    try {
      await api.delete(`/personnel/${guardId}`);
      fetchGuards();
      fetchStats();
    } catch (error: any) {
      console.error("Error deleting guard:", error);
      alert(error.response?.data?.message || "Failed to delete guard");
    }
  };

  // Fallback stats derived from loaded page if API stats not yet available
  const displayStats = stats ?? {
    total: guards.length,
    active: guards.filter((g) => g.status === "active").length,
    onLeave: guards.filter((g) => g.status === "on-leave").length,
    expiringCerts: guards.filter((g) =>
      g.certifications?.some((c) => c.status === "expiring" || c.status === "expired")
    ).length,
    inactive: 0,
    suspended: 0,
    avgRating: 0,
    totalShifts: 0,
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              Personnel Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage guard records, certifications, and compliance
            </p>
          </div>

          <Dialog open={isAddGuardOpen} onOpenChange={setIsAddGuardOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="w-4 h-4" />
                Add Guard
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Guard</DialogTitle>
                <DialogDescription>
                  Register a new security guard and their credentials
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="guardName">Full Name</Label>
                    <Input
                      id="guardName"
                      value={newGuard.name}
                      onChange={(e) => setNewGuard({ ...newGuard, name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guardPhone">Phone Number</Label>
                    <Input
                      id="guardPhone"
                      value={newGuard.phone}
                      onChange={(e) => setNewGuard({ ...newGuard, phone: e.target.value })}
                      placeholder="+254 712 345 678"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="guardEmail">Email</Label>
                    <Input
                      id="guardEmail"
                      type="email"
                      value={newGuard.email}
                      onChange={(e) => setNewGuard({ ...newGuard, email: e.target.value })}
                      placeholder="guard@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="joinDate">Join Date</Label>
                    <Input
                      id="joinDate"
                      type="date"
                      value={newGuard.joinDate}
                      onChange={(e) => setNewGuard({ ...newGuard, joinDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="psraLicense">PSRA License Number</Label>
                    <Input
                      id="psraLicense"
                      value={newGuard.psraLicense}
                      onChange={(e) => setNewGuard({ ...newGuard, psraLicense: e.target.value })}
                      placeholder="PSRA/2024/XXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="psraExpiry">PSRA Expiry Date</Label>
                    <Input
                      id="psraExpiry"
                      type="date"
                      value={newGuard.psraExpiry}
                      onChange={(e) => setNewGuard({ ...newGuard, psraExpiry: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddGuardOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddGuard}>Add Guard</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Guards</p>
                <p className="text-3xl font-bold text-foreground mt-1">{displayStats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active On Duty</p>
                <p className="text-3xl font-bold text-success mt-1">{displayStats.active}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">On Leave</p>
                <p className="text-3xl font-bold text-warning mt-1">{displayStats.onLeave}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-warning" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expiring Certs</p>
                <p className="text-3xl font-bold text-destructive mt-1">
                  {displayStats.expiringCerts}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card rounded-xl p-5 border border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, employee ID, or PSRA license..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
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

        {/* Guards Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground">Loading personnel...</p>
          </div>
        ) : guards.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No personnel found</p>
          </div>
        ) : (
          <>
            <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary/30 border-b border-border/50">
                    <tr>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Guard</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">PSRA License</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Current Site</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Rating</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guards.map((guard) => {
                      const conf = statusConfig[guard.status] ?? statusConfig.inactive;
                      return (
                        <tr
                          key={guard.id}
                          className="border-b border-border/30 hover:bg-secondary/20 transition-colors"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-success/20 to-primary/20 border border-success/30 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-success" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{guard.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {guard.employeeId}
                                </p>
                                <p className="text-xs text-muted-foreground">{guard.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-sm font-mono text-foreground">{guard.psraLicense}</p>
                            <p className="text-xs text-muted-foreground">Exp: {guard.psraExpiry}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={cn(
                                "text-xs font-medium px-3 py-1.5 rounded-full",
                                conf.bg,
                                conf.color
                              )}
                            >
                              {conf.label}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-sm text-muted-foreground">{guard.currentSite}</span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <Award className="w-4 h-4 text-warning" />
                              <span className="text-sm font-medium">
                                {(guard.rating || 0).toFixed(1)}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewGuard(guard.id)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteGuard(guard.id)}
                              >
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
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <Button
                  variant="outline"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                >
                  Previous
                </Button>
                <span className="px-4 py-2 text-sm">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  disabled={pagination.page === pagination.pages}
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {/* Guard Details Modal */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Guard Profile</DialogTitle>
              <DialogDescription>
                Complete details for {selectedGuard?.name}
              </DialogDescription>
            </DialogHeader>

            {selectedGuard && (
              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="personal">Personal Info</TabsTrigger>
                  <TabsTrigger value="certifications">
                    Certifications ({selectedGuard.certifications?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                </TabsList>

                {/* Personal Info Tab */}
                <TabsContent value="personal" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Guard Code</Label>
                      <p className="font-mono text-sm mt-1">
                        {selectedGuard.guard_code || selectedGuard.id}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Employee ID</Label>
                      <p className="font-mono text-sm mt-1">{selectedGuard.employeeId}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Full Name</Label>
                      <p className="text-sm mt-1">{selectedGuard.name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Phone</Label>
                      <p className="text-sm mt-1">{selectedGuard.phone || '—'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="text-sm mt-1">{selectedGuard.email}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Join Date</Label>
                      <p className="text-sm mt-1">{selectedGuard.joinDate || '—'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">PSRA License</Label>
                      <p className="text-sm font-mono mt-1">{selectedGuard.psraLicense}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">PSRA Expiry</Label>
                      <p className="text-sm mt-1">{selectedGuard.psraExpiry || '—'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Current Site</Label>
                      <p className="text-sm mt-1">{selectedGuard.currentSite}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <p className="text-sm mt-1 capitalize">{selectedGuard.status}</p>
                    </div>
                  </div>
                </TabsContent>

                {/* Certifications Tab */}
                <TabsContent value="certifications" className="space-y-4">
                  {selectedGuard.certifications && selectedGuard.certifications.length > 0 ? (
                    selectedGuard.certifications.map((cert, idx) => {
                      const certConf = certStatusConfig[cert.status] ?? certStatusConfig.valid;
                      return (
                        <div
                          key={cert.id || idx}
                          className="p-4 rounded-lg bg-secondary/30 border border-border/50"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{cert.name}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Issued: {cert.issueDate}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Expires: {cert.expiryDate}
                              </p>
                            </div>
                            <Badge className={cn(certConf.bg, certConf.color)}>
                              {cert.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No certifications on record
                    </p>
                  )}
                </TabsContent>

                {/* Performance Tab */}
                <TabsContent value="performance" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-secondary/30">
                      <p className="text-sm text-muted-foreground">Training Hours</p>
                      <p className="text-3xl font-bold text-foreground mt-1">
                        {selectedGuard.trainingHours}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/30">
                      <p className="text-sm text-muted-foreground">Rating</p>
                      <p className="text-3xl font-bold text-warning mt-1">
                        {(selectedGuard.rating || 0).toFixed(1)} / 5.0
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/30">
                      <p className="text-sm text-muted-foreground">Shifts Completed</p>
                      <p className="text-3xl font-bold text-foreground mt-1">
                        {selectedGuard.shiftsCompleted}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/30">
                      <p className="text-sm text-muted-foreground">Incidents Reported</p>
                      <p className="text-3xl font-bold text-foreground mt-1">
                        {selectedGuard.incidentsReported}
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                Close
              </Button>
              <Button>
                <Download className="w-4 h-4 mr-2" />
                Export Profile
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default PersonnelPage;
