import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Video, Bell, CheckCircle, AlertTriangle,
  RefreshCw, Plus, Edit, Trash2, MapPin, X,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
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
  online:            { color: "text-success",         bg: "bg-success/10",     dot: "bg-success",         label: "Online" },
  offline:           { color: "text-destructive",      bg: "bg-destructive/10", dot: "bg-destructive",     label: "Offline" },
  "motion-detected": { color: "text-warning",          bg: "bg-warning/10",     dot: "bg-warning",         label: "Motion" },
  maintenance:       { color: "text-muted-foreground", bg: "bg-muted",          dot: "bg-muted-foreground",label: "Maintenance" },
};

const EMPTY_FORM = { name: "", siteId: "", location: "", status: "online", recordingEnabled: true, streamUrl: "" };
const PAGE_SIZE  = 10;

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({
  open, title, description, onConfirm, onCancel,
}: {
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

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({
  page, total, pageSize, onChange,
}: {
  page: number; total: number; pageSize: number; onChange: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = Math.min(total, (page - 1) * pageSize + 1);
  const to   = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 pt-3">
      <p className="text-xs text-muted-foreground order-2 sm:order-1">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-1 order-1 sm:order-2">
        <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => onChange(1)}>
          <ChevronsLeft className="w-3.5 h-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <span className="text-xs px-2 text-foreground font-medium">{page} / {totalPages}</span>
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

// ── component ────────────────────────────────────────────────────────────────
export const CCTVAlarms = () => {
  const [cameras, setCameras]             = useState<Camera[]>([]);
  const [stats, setStats]                 = useState<Stats | null>(null);
  const [loading, setLoading]             = useState(true);
  const [filterStatus, setFilterStatus]   = useState("all");
  const [siteOptions, setSiteOptions]     = useState<SiteOption[]>([]);
  const [page, setPage]                   = useState(1);

  const [isAddOpen, setIsAddOpen]         = useState(false);
  const [isEditOpen, setIsEditOpen]       = useState(false);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [form, setForm]                   = useState({ ...EMPTY_FORM });
  const [editForm, setEditForm]           = useState({ status: "online", location: "", recordingEnabled: true });

  const [deleteTarget, setDeleteTarget]   = useState<Camera | null>(null);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchCameras = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filterStatus !== "all") params.status = filterStatus;
      const res = await api.get("/cctv", { params });
      setCameras(res.data.data.cameras);
      setPage(1);
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
    try {
      await api.delete(`/cctv/${id}`);
      fetchCameras(); fetchStats();
    } catch (e: any) { alert(e.response?.data?.message || "Failed to delete camera"); }
    finally { setDeleteTarget(null); }
  };

  // ── derived ────────────────────────────────────────────────────────────────
  const display = stats ?? {
    total:   cameras.length,
    online:  cameras.filter(c => c.status === "online").length,
    offline: cameras.filter(c => c.status === "offline").length,
    alerts:  cameras.filter(c => c.status === "motion-detected").length,
  };

  const paginated = cameras.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background px-3 py-4 sm:px-6 sm:py-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
              <Video className="w-5 h-5 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
              <span className="truncate">CCTV & Alarm Monitoring</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              Monitor security cameras and alarm systems across all sites
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="icon" onClick={() => { fetchCameras(); fetchStats(); }} title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </Button>

            {/* Add Camera Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-1.5 text-sm px-3">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Camera</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100vw-2rem)] max-w-lg rounded-xl">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => setIsAddOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                  <Button onClick={handleCreate} className="w-full sm:w-auto">Add Camera</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats — 2 cols mobile, 4 cols md+ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          {[
            { label: "Total Cameras", value: display.total,   icon: Video,         color: "text-primary",     bg: "bg-primary/10" },
            { label: "Online",        value: display.online,   icon: CheckCircle,   color: "text-success",     bg: "bg-success/10" },
            { label: "Offline",       value: display.offline,  icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
            { label: "Active Alerts", value: display.alerts,   icon: Bell,          color: "text-warning",     bg: "bg-warning/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="glass-card rounded-xl p-3 sm:p-5 border border-border/50">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{label}</p>
                  <p className={cn("text-2xl sm:text-3xl font-bold mt-0.5", color)}>{value}</p>
                </div>
                <div className={cn("w-9 h-9 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0", bg)}>
                  <Icon className={cn("w-4 h-4 sm:w-6 sm:h-6", color)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="glass-card rounded-xl p-3 sm:p-4 border border-border/50">
          <div className="flex flex-wrap items-center gap-3">
            <Label className="text-sm shrink-0">Filter by Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40 sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cameras</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="motion-detected">Motion Detected</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs sm:text-sm text-muted-foreground">{cameras.length} camera(s)</span>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground text-sm">Loading cameras...</p>
          </div>
        ) : cameras.length === 0 ? (
          <div className="text-center py-12">
            <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">No cameras found</p>
          </div>
        ) : (
          <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
            {/* Scrollable table wrapper */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-border/50 bg-secondary/30">
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">Camera</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">Site / Location</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">Status</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">Recording</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">Last Activity</th>
                    <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {paginated.map(cam => {
                    const conf = statusConfig[cam.status] ?? statusConfig.online;
                    return (
                      <tr key={cam.id} className="hover:bg-secondary/20 transition-colors">
                        {/* Camera name + code */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-secondary/50 border border-border/50 flex items-center justify-center flex-shrink-0">
                              <Video className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate max-w-[140px]">{cam.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{cam.cameraCode}</p>
                            </div>
                          </div>
                        </td>

                        {/* Site / location */}
                        <td className="px-4 py-3">
                          <p className="text-foreground truncate max-w-[160px]">{cam.siteName}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate max-w-[160px]">
                            <MapPin className="w-3 h-3 flex-shrink-0" />{cam.location}
                          </p>
                        </td>

                        {/* Status badge */}
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap", conf.bg, conf.color)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", conf.dot,
                              cam.status === "motion-detected" && "animate-pulse")} />
                            {conf.label}
                          </span>
                        </td>

                        {/* Recording */}
                        <td className="px-4 py-3">
                          <span className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full",
                            cam.recordingEnabled
                              ? "bg-success/10 text-success"
                              : "bg-muted text-muted-foreground"
                          )}>
                            {cam.recordingEnabled ? "Enabled" : "Disabled"}
                          </span>
                        </td>

                        {/* Last activity */}
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {cam.lastActivity
                            ? <span className={cam.status === "motion-detected" ? "text-warning" : ""}>{formatTime(cam.lastActivity)}</span>
                            : "—"
                          }
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(cam)} title="Edit">
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(cam)}
                              title="Delete"
                            >
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

            {/* Pagination */}
            {cameras.length > PAGE_SIZE && (
              <div className="px-4 pb-4 border-t border-border/30 pt-1">
                <Pagination
                  page={page}
                  total={cameras.length}
                  pageSize={PAGE_SIZE}
                  onChange={setPage}
                />
              </div>
            )}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-xl">
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
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)} className="w-full sm:w-auto">Cancel</Button>
              <Button onClick={handleUpdate} className="w-full sm:w-auto">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Modal */}
        <ConfirmModal
          open={deleteTarget !== null}
          title="Delete Camera"
          description={`Are you sure you want to delete "${deleteTarget?.name}" (${deleteTarget?.cameraCode})? This action cannot be undone.`}
          onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />

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