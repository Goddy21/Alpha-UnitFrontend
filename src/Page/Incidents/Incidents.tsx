// src/pages/Incidents.tsx
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Plus,
  Search,
  MapPin,
  Clock,
  User,
  Eye,
  Edit,
  Trash2,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  AlertCircle as AlertIcon,
  RefreshCw,
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
import { Textarea } from "@/components/ui/textarea";

interface Incident {
  id: string;
  incident_code?: string;
  title: string;
  description: string;
  siteId: string;
  siteName: string;
  reportedBy: string;
  reportedById: string;
  timestamp: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "resolved" | "closed";
  category: string;
  location: string;
  gpsCoords: string | null;
  hasAttachments: boolean;
  attachmentCount: number;
  assignedTo?: string | null;
  resolvedAt?: string | null;
  responseTime?: string | null;
  notes?: string | null;
}

interface Stats {
  total: number;
  open: number;
  investigating: number;
  resolved: number;
  closed: number;
  critical: number;
  high: number;
  last30Days: number;
  avgResponseTime: string;
}

interface SiteOption { id: string; name: string; site_code: string; }
interface GuardOption { id: string; name: string; guard_code: string; }

const severityConfig = {
  low: { color: "text-muted-foreground", bg: "bg-muted", label: "Low", border: "border-muted" },
  medium: { color: "text-warning", bg: "bg-warning/10", label: "Medium", border: "border-warning/30" },
  high: { color: "text-destructive", bg: "bg-destructive/10", label: "High", border: "border-destructive/30" },
  critical: { color: "text-destructive", bg: "bg-destructive/20", label: "Critical", border: "border-destructive" },
};

const statusConfig = {
  open: { color: "text-destructive", bg: "bg-destructive/10", label: "Open", icon: AlertIcon },
  investigating: { color: "text-warning", bg: "bg-warning/10", label: "Investigating", icon: Clock },
  resolved: { color: "text-success", bg: "bg-success/10", label: "Resolved", icon: CheckCircle },
  closed: { color: "text-muted-foreground", bg: "bg-muted", label: "Closed", icon: XCircle },
};

const CATEGORIES = [
  "Security Breach",
  "Suspicious Activity",
  "Medical",
  "Fire/Safety",
  "Theft/Vandalism",
  "Property Damage",
  "Other",
];

export const IncidentsPage = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const [siteOptions, setSiteOptions] = useState<SiteOption[]>([]);
  const [guardOptions, setGuardOptions] = useState<GuardOption[]>([]);

  const [pagination, setPagination] = useState({
    page: 1, limit: 10, total: 0, pages: 0,
  });

  const [newIncident, setNewIncident] = useState({
    title: "",
    description: "",
    siteId: "",
    reportedById: "",
    severity: "" as Incident["severity"] | "",
    category: "",
    location: "",
    gpsCoords: "",
    assignedTo: "",
  });

  const [editForm, setEditForm] = useState({
    status: "" as Incident["status"] | "",
    severity: "" as Incident["severity"] | "",
    assignedTo: "",
    resolvedAt: "",
    responseTime: "",
    notes: "",
  });

  useEffect(() => {
    fetchIncidents();
    fetchStats();
  }, [searchTerm, filterSeverity, filterStatus, pagination.page]);

  useEffect(() => {
    fetchSiteOptions();
    fetchGuardOptions();
  }, []);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(searchTerm && { search: searchTerm }),
        ...(filterSeverity !== "all" && { severity: filterSeverity }),
        ...(filterStatus !== "all" && { status: filterStatus }),
      };
      const response = await api.get("/incidents", { params });
      setIncidents(response.data.data.incidents);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error("Error fetching incidents:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get("/incidents/stats");
      setStats(response.data.data);
    } catch (error) {
      console.error("Error fetching incident stats:", error);
    }
  };

  const fetchSiteOptions = async () => {
    try {
      const response = await api.get("/sites", { params: { limit: 200 } });
      setSiteOptions(response.data.data.sites || []);
    } catch (error) {
      console.error("Error fetching sites:", error);
    }
  };

  const fetchGuardOptions = async () => {
    try {
      const response = await api.get("/personnel", { params: { status: "active", limit: 200 } });
      setGuardOptions(
        response.data.data.personnel.map((p: any) => ({
          id: p.id,
          name: p.name,
          guard_code: p.guard_code || "",
        }))
      );
    } catch (error) {
      console.error("Error fetching guards:", error);
    }
  };

  const handleCreate = async () => {
    if (!newIncident.title || !newIncident.siteId || !newIncident.severity || !newIncident.category) {
      alert("Title, site, severity, and category are required.");
      return;
    }
    try {
      await api.post("/incidents", {
        title: newIncident.title,
        description: newIncident.description || undefined,
        siteId: newIncident.siteId,
        reportedById: newIncident.reportedById || undefined,
        severity: newIncident.severity,
        category: newIncident.category,
        location: newIncident.location || undefined,
        gpsCoords: newIncident.gpsCoords || undefined,
        assignedTo: newIncident.assignedTo || undefined,
      });
      setIsAddOpen(false);
      setNewIncident({
        title: "", description: "", siteId: "", reportedById: "",
        severity: "", category: "", location: "", gpsCoords: "", assignedTo: "",
      });
      fetchIncidents();
      fetchStats();
    } catch (error: any) {
      console.error("Error creating incident:", error);
      alert(error.response?.data?.message || "Failed to report incident");
    }
  };

  const handleOpenView = async (incidentId: string) => {
    try {
      const response = await api.get(`/incidents/${incidentId}`);
      setSelectedIncident(response.data.data);
      setIsViewOpen(true);
    } catch (error) {
      console.error("Error fetching incident:", error);
      alert("Failed to load incident details");
    }
  };

  const handleOpenEdit = (incident: Incident) => {
    setSelectedIncident(incident);
    setEditForm({
      status: incident.status,
      severity: incident.severity,
      assignedTo: incident.assignedTo || "",
      resolvedAt: incident.resolvedAt || "",
      responseTime: incident.responseTime || "",
      notes: incident.notes || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedIncident) return;
    try {
      await api.put(`/incidents/${selectedIncident.id}`, {
        status: editForm.status || undefined,
        severity: editForm.severity || undefined,
        assignedTo: editForm.assignedTo || undefined,
        resolvedAt: editForm.resolvedAt || undefined,
        responseTime: editForm.responseTime || undefined,
        notes: editForm.notes || undefined,
      });
      setIsEditOpen(false);
      setSelectedIncident(null);
      fetchIncidents();
      fetchStats();
    } catch (error: any) {
      console.error("Error updating incident:", error);
      alert(error.response?.data?.message || "Failed to update incident");
    }
  };

  const handleDelete = async (incidentId: string) => {
    if (!confirm("Are you sure you want to delete this incident?")) return;
    try {
      await api.delete(`/incidents/${incidentId}`);
      fetchIncidents();
      fetchStats();
    } catch (error: any) {
      console.error("Error deleting incident:", error);
      alert(error.response?.data?.message || "Failed to delete incident");
    }
  };

  const displayStats = stats ?? {
    total: incidents.length,
    open: incidents.filter((i) => i.status === "open").length,
    critical: incidents.filter((i) => i.severity === "critical").length,
    avgResponseTime: "—",
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-primary" />
              Incident Reporting
            </h1>
            <p className="text-muted-foreground mt-1">
              Track and manage security incidents in real-time
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => { fetchIncidents(); fetchStats(); }}
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Report Incident
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Report New Incident</DialogTitle>
                  <DialogDescription>
                    Document a security incident with location and details
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Incident Title <span className="text-destructive">*</span></Label>
                      <Input
                        placeholder="Brief description of incident"
                        value={newIncident.title}
                        onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category <span className="text-destructive">*</span></Label>
                      <Select
                        value={newIncident.category}
                        onValueChange={(v) => setNewIncident({ ...newIncident, category: v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Site <span className="text-destructive">*</span></Label>
                      <Select
                        value={newIncident.siteId}
                        onValueChange={(v) => setNewIncident({ ...newIncident, siteId: v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
                        <SelectContent>
                          {siteOptions.length === 0 ? (
                            <SelectItem value="_empty" disabled>No sites found</SelectItem>
                          ) : siteOptions.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Severity <span className="text-destructive">*</span></Label>
                      <Select
                        value={newIncident.severity}
                        onValueChange={(v) => setNewIncident({ ...newIncident, severity: v as Incident["severity"] })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select severity" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Specific Location</Label>
                      <Input
                        placeholder="Gate B, Level 2"
                        value={newIncident.location}
                        onChange={(e) => setNewIncident({ ...newIncident, location: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Reported By (Guard)</Label>
                      <Select
                        value={newIncident.reportedById}
                        onValueChange={(v) => setNewIncident({ ...newIncident, reportedById: v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select guard" /></SelectTrigger>
                        <SelectContent>
                          {guardOptions.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name}{g.guard_code ? ` (${g.guard_code})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>GPS Coordinates</Label>
                      <Input
                        placeholder="-1.2693, 36.8103"
                        value={newIncident.gpsCoords}
                        onChange={(e) => setNewIncident({ ...newIncident, gpsCoords: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Detailed Description</Label>
                    <Textarea
                      placeholder="Provide comprehensive details of the incident..."
                      rows={4}
                      value={newIncident.description}
                      onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate}>Submit Report</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Incidents</p>
                <p className="text-3xl font-bold text-foreground mt-1">{displayStats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Cases</p>
                <p className="text-3xl font-bold text-destructive mt-1">{displayStats.open}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertIcon className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-3xl font-bold text-destructive mt-1">{(displayStats as any).critical ?? 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive animate-pulse" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Response</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {displayStats.avgResponseTime}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-success" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card rounded-xl p-5 border border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search incidents..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              />
            </div>
            <Select value={filterSeverity} onValueChange={(v) => {
              setFilterSeverity(v);
              setPagination((p) => ({ ...p, page: 1 }));
            }}>
              <SelectTrigger><SelectValue placeholder="Filter by severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => {
              setFilterStatus(v);
              setPagination((p) => ({ ...p, page: 1 }));
            }}>
              <SelectTrigger><SelectValue placeholder="Filter by status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Incidents List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground">Loading incidents...</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No incidents found</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {incidents.map((incident) => {
                const sevConf = severityConfig[incident.severity] ?? severityConfig.low;
                const stConf = statusConfig[incident.status] ?? statusConfig.open;
                const StatusIcon = stConf.icon;

                return (
                  <div
                    key={incident.id}
                    className={cn(
                      "glass-card rounded-xl p-5 border transition-all duration-300 hover:border-primary/30",
                      sevConf.border
                    )}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={cn(
                          "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
                          sevConf.bg
                        )}>
                          <AlertTriangle className={cn("w-6 h-6", sevConf.color)} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-foreground">{incident.title}</h3>
                            <span className={cn(
                              "text-xs font-medium px-2 py-1 rounded-full",
                              sevConf.bg, sevConf.color
                            )}>
                              {sevConf.label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono mb-2">
                            {incident.incident_code || incident.id}
                          </p>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {incident.description}
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span>{incident.siteName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(incident.timestamp).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>{incident.reportedBy}</span>
                            </div>
                            {incident.hasAttachments && (
                              <div className="flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" />
                                <span>{incident.attachmentCount} files</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3 ml-4">
                        <span className={cn(
                          "text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1",
                          stConf.bg, stConf.color
                        )}>
                          <StatusIcon className="w-3 h-3" />
                          {stConf.label}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenView(incident.id)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(incident)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(incident.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {incident.resolvedAt && (
                      <div className="border-t border-border/50 pt-3 mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <div><span className="font-medium">Resolved:</span> {incident.resolvedAt}</div>
                        {incident.responseTime && (
                          <div><span className="font-medium">Response Time:</span> {incident.responseTime}</div>
                        )}
                        {incident.assignedTo && (
                          <div><span className="font-medium">Assigned to:</span> {incident.assignedTo}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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

        {/* View Modal */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Incident Details</DialogTitle>
              <DialogDescription>
                Complete information for {selectedIncident?.incident_code || selectedIncident?.id}
              </DialogDescription>
            </DialogHeader>
            {selectedIncident && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Incident ID</Label>
                    <p className="font-mono text-sm mt-1">
                      {selectedIncident.incident_code || selectedIncident.id}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Severity</Label>
                    <p className="text-sm mt-1 capitalize">{selectedIncident.severity}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <p className="text-sm mt-1 capitalize">{selectedIncident.status}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Category</Label>
                    <p className="text-sm mt-1">{selectedIncident.category}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Site</Label>
                    <p className="text-sm mt-1">{selectedIncident.siteName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Location</Label>
                    <p className="text-sm mt-1">{selectedIncident.location || '—'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Reported By</Label>
                    <p className="text-sm mt-1">{selectedIncident.reportedBy}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Timestamp</Label>
                    <p className="text-sm mt-1">
                      {new Date(selectedIncident.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {selectedIncident.gpsCoords && (
                    <div>
                      <Label className="text-muted-foreground">GPS Coordinates</Label>
                      <p className="text-sm font-mono mt-1">{selectedIncident.gpsCoords}</p>
                    </div>
                  )}
                  {selectedIncident.assignedTo && (
                    <div>
                      <Label className="text-muted-foreground">Assigned To</Label>
                      <p className="text-sm mt-1">{selectedIncident.assignedTo}</p>
                    </div>
                  )}
                  {selectedIncident.resolvedAt && (
                    <div>
                      <Label className="text-muted-foreground">Resolved At</Label>
                      <p className="text-sm mt-1">{selectedIncident.resolvedAt}</p>
                    </div>
                  )}
                  {selectedIncident.responseTime && (
                    <div>
                      <Label className="text-muted-foreground">Response Time</Label>
                      <p className="text-sm mt-1">{selectedIncident.responseTime}</p>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm mt-2 p-3 rounded-lg bg-secondary/30">
                    {selectedIncident.description || '—'}
                  </p>
                </div>
                {selectedIncident.notes && (
                  <div>
                    <Label className="text-muted-foreground">Notes</Label>
                    <p className="text-sm mt-2 p-3 rounded-lg bg-secondary/30">
                      {selectedIncident.notes}
                    </p>
                  </div>
                )}
                {selectedIncident.hasAttachments && (
                  <div>
                    <Label className="text-muted-foreground">
                      Attachments ({selectedIncident.attachmentCount})
                    </Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {[...Array(selectedIncident.attachmentCount)].map((_, idx) => (
                        <div
                          key={idx}
                          className="aspect-video rounded-lg bg-secondary/30 flex items-center justify-center"
                        >
                          <ImageIcon className="w-8 h-8 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
              <Button onClick={() => {
                setIsViewOpen(false);
                if (selectedIncident) handleOpenEdit(selectedIncident);
              }}>
                <Edit className="w-4 h-4 mr-2" />
                Update Status
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit / Update Status Modal */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Update Incident</DialogTitle>
              <DialogDescription>
                Update status, assignment, or resolution details for{" "}
                {selectedIncident?.incident_code || selectedIncident?.id}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(v) => setEditForm({ ...editForm, status: v as Incident["status"] })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <Select
                    value={editForm.severity}
                    onValueChange={(v) => setEditForm({ ...editForm, severity: v as Incident["severity"] })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select severity" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Assigned To</Label>
                <Input
                  placeholder="Supervisor or team name"
                  value={editForm.assignedTo}
                  onChange={(e) => setEditForm({ ...editForm, assignedTo: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Resolved At</Label>
                  <Input
                    type="datetime-local"
                    value={editForm.resolvedAt}
                    onChange={(e) => setEditForm({ ...editForm, resolvedAt: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Response Time</Label>
                  <Input
                    placeholder="e.g. 25min or 1h 30min"
                    value={editForm.responseTime}
                    onChange={(e) => setEditForm({ ...editForm, responseTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Investigation notes or follow-up actions..."
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdate}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default IncidentsPage;
