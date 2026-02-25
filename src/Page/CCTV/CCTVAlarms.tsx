import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Video, Bell, CheckCircle, AlertTriangle,
  RefreshCw, Plus, Edit, Trash2, MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

// ── types ────────────────────────────────────────────────────────────────────
interface Camera {
  id: string;
  cameraCode: string;
  name: string;
  siteId: string;
  siteName: string;
  siteCode: string;
  location: string;
  status: "online" | "offline" | "motion-detected" | "maintenance";
  recordingEnabled: boolean;
  streamUrl: string | null;
  lastActivity: string | null;
}

interface Stats {
  total: number;
  online: number;
  offline: number;
  motionDetected: number;
  maintenance: number;
  alerts: number;
}

interface SiteOption { id: string; name: string; site_code: string; }

const statusConfig = {
  online:           { color: "text-success",           bg: "bg-success/10",     label: "Online" },
  offline:          { color: "text-destructive",        bg: "bg-destructive/10", label: "Offline" },
  "motion-detected":{ color: "text-warning",            bg: "bg-warning/10",     label: "Motion Detected" },
  maintenance:      { color: "text-muted-foreground",   bg: "bg-muted",          label: "Maintenance" },
};

const EMPTY_FORM = { name: "", siteId: "", location: "", status: "online", recordingEnabled: true, streamUrl: "" };

// ── component ────────────────────────────────────────────────────────────────
export const CCTVAlarms = () => {
  const [cameras, setCameras]           = useState<Camera[]>([]);
  const [stats, setStats]               = useState<Stats | null>(null);
  const [loading, setLoading]           = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [siteOptions, setSiteOptions]   = useState<SiteOption[]>([]);

  const [isAddOpen, setIsAddOpen]       = useState(false);
  const [isEditOpen, setIsEditOpen]     = useState(false);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [form, setForm]                 = useState({ ...EMPTY_FORM });
  const [editForm, setEditForm]         = useState({ status: "online", location: "", recordingEnabled: true });

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchCameras = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filterStatus !== "all") params.status = filterStatus;
      const res = await api.get("/cctv", { params });
      setCameras(res.data.data.cameras);
    } catch (e) { console.error("Error fetching cameras:", e); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/cctv/stats");
      setStats(res.data.data);
    } catch (e) { console.error("Error fetching camera stats:", e); }
  };

  const fetchSites = async () => {
    try {
      const res = await api.get("/sites", { params: { limit: 200 } });
      setSiteOptions(res.data.data.sites || []);
    } catch (e) { console.error("Error fetching sites:", e); }
  };

  useEffect(() => { fetchCameras(); }, [filterStatus]);
  useEffect(() => { fetchStats(); fetchSites(); }, []);

  // ── actions ────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.name || !form.siteId) return alert("Name and site are required.");
    try {
      await api.post("/cctv", form);
      setIsAddOpen(false);
      setForm({ ...EMPTY_FORM });
      fetchCameras(); fetchStats();
    } catch (e: any) { alert(e.response?.data?.message || "Failed to create camera"); }
  };

  const handleOpenEdit = (cam: Camera) => {
    setEditingCamera(cam);
    setEditForm({ status: cam.status, location: cam.location, recordingEnabled: cam.recordingEnabled });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingCamera) return;
    try {
      await api.put(`/cctv/${editingCamera.id}`, editForm);
      setIsEditOpen(false);
      fetchCameras(); fetchStats();
    } catch (e: any) { alert(e.response?.data?.message || "Failed to update camera"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this camera?")) return;
    try {
      await api.delete(`/cctv/${id}`);
      fetchCameras(); fetchStats();
    } catch (e: any) { alert(e.response?.data?.message || "Failed to delete camera"); }
  };

  // ── derived stats ──────────────────────────────────────────────────────────
  const display = stats ?? {
    total:   cameras.length,
    online:  cameras.filter(c => c.status === "online").length,
    offline: cameras.filter(c => c.status === "offline").length,
    alerts:  cameras.filter(c => c.status === "motion-detected").length,
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Video className="w-8 h-8 text-primary" />
              CCTV & Alarm Monitoring
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor security cameras and alarm systems across all sites
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => { fetchCameras(); fetchStats(); }}>
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>

            {/* Add Camera Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" /> Add Camera</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add New Camera</DialogTitle>
                  <DialogDescription>Register a new CCTV camera to a site</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Camera Name</Label>
                    <Input placeholder="e.g. Main Entrance" value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Site</Label>
                      <Select value={form.siteId} onValueChange={v => setForm({ ...form, siteId: v })}>
                        <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
                        <SelectContent>
                          {siteOptions.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="online">Online</SelectItem>
                          <SelectItem value="offline">Offline</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Location / Description</Label>
                    <Input placeholder="e.g. Front Gate" value={form.location}
                      onChange={e => setForm({ ...form, location: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Stream URL (optional)</Label>
                    <Input placeholder="rtsp://..." value={form.streamUrl}
                      onChange={e => setForm({ ...form, streamUrl: e.target.value })} />
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="rec" checked={form.recordingEnabled}
                      onChange={e => setForm({ ...form, recordingEnabled: e.target.checked })} />
                    <Label htmlFor="rec">Recording Enabled</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate}>Add Camera</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Total Cameras", value: display.total,  icon: Video,          color: "text-primary",     bg: "bg-primary/10" },
            { label: "Online",        value: display.online,  icon: CheckCircle,    color: "text-success",     bg: "bg-success/10" },
            { label: "Offline",       value: display.offline, icon: AlertTriangle,  color: "text-destructive", bg: "bg-destructive/10" },
            { label: "Active Alerts", value: display.alerts,  icon: Bell,           color: "text-warning",     bg: "bg-warning/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="glass-card rounded-xl p-5 border border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className={cn("text-3xl font-bold mt-1", color)}>{value}</p>
                </div>
                <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", bg)}>
                  <Icon className={cn("w-6 h-6", color)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="glass-card rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-4">
            <Label className="text-sm shrink-0">Filter by Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cameras</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="motion-detected">Motion Detected</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">{cameras.length} camera(s) shown</span>
          </div>
        </div>

        {/* Camera Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground">Loading cameras...</p>
          </div>
        ) : cameras.length === 0 ? (
          <div className="text-center py-12">
            <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No cameras found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cameras.map((cam) => {
              const conf = statusConfig[cam.status] ?? statusConfig.online;
              return (
                <div key={cam.id} className="glass-card rounded-xl border border-border/50 overflow-hidden">
                  {/* Feed placeholder */}
                  <div className="aspect-video bg-secondary/30 flex items-center justify-center border-b border-border/50 relative">
                    <div className="text-center">
                      <Video className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">
                        {cam.streamUrl ? "Stream Available" : "No Stream Configured"}
                      </p>
                    </div>
                    {cam.status === "motion-detected" && (
                      <span className="absolute top-2 right-2 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-warning" />
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-foreground">{cam.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{cam.cameraCode}</p>
                      </div>
                      <span className={cn("text-xs font-medium px-2 py-1 rounded-full", conf.bg, conf.color)}>
                        {conf.label}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground mb-3">
                      <p className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {cam.siteName} — {cam.location}
                      </p>
                      {cam.lastActivity && (
                        <p className="text-warning">Last activity: {formatTime(cam.lastActivity)}</p>
                      )}
                      <p>Recording: {cam.recordingEnabled ? "✅ Enabled" : "❌ Disabled"}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="flex-1" onClick={() => handleOpenEdit(cam)}>
                        <Edit className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="flex-1" onClick={() => handleDelete(cam.id)}>
                        <Trash2 className="w-3 h-3 mr-1 text-destructive" /> Delete
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update Camera</DialogTitle>
              <DialogDescription>{editingCamera?.name} — {editingCamera?.cameraCode}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="motion-detected">Motion Detected</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={editForm.location}
                  onChange={e => setEditForm({ ...editForm, location: e.target.value })} />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="edit-rec" checked={editForm.recordingEnabled}
                  onChange={e => setEditForm({ ...editForm, recordingEnabled: e.target.checked })} />
                <Label htmlFor="edit-rec">Recording Enabled</Label>
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

function formatTime(iso: string): string {
  if (!iso) return "Unknown";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
}

export default CCTVAlarms;