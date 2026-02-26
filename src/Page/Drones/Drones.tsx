import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Plane, Plus, Search, Clock, Video, Download,
  Eye, Play, Calendar, Battery, AlertTriangle,
  CheckCircle, FileText, Image as ImageIcon, RefreshCw,
  Edit, Trash2, X, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight,
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";

// ── types ────────────────────────────────────────────────────────────────────
interface Drone {
  id: string; droneCode: string; name: string; model: string;
  serialNumber: string; status: "available" | "in-flight" | "maintenance" | "charging";
  batteryLevel: number; flightHours: number;
  lastMaintenance: string | null; nextMaintenance: string | null;
  features: string[]; notes: string | null;
}

interface FlightLog {
  id: string; flightCode: string; missionName: string;
  droneId: string; droneName: string; droneModel: string;
  pilotId: string; pilotName: string;
  siteId: string; siteName: string;
  flightDate: string; takeoffTime: string; landingTime: string | null;
  duration: string | null; status: "scheduled" | "in-flight" | "completed" | "aborted" | "reviewing";
  purpose: string; altitude: string | null; distance: string | null;
  batteryUsed: number; videoFootage: boolean; photoCount: number;
  incidentLinked: string | null; weather: string | null; notes: string | null;
}

interface Stats {
  drones: { total: number; available: number; inFlight: number; maintenance: number; charging: number; };
  flights: { total: number; active: number; completed: number; aborted: number; };
}

interface SiteOption      { id: string; name: string; }
interface PersonnelOption { id: string; name: string; guard_code: string; }

// ── configs ───────────────────────────────────────────────────────────────────
const flightStatusConfig = {
  scheduled:   { color: "text-primary",         bg: "bg-primary/10",     dot: "bg-primary",         label: "Scheduled",  icon: Clock },
  "in-flight": { color: "text-warning",          bg: "bg-warning/10",     dot: "bg-warning",         label: "In Flight",  icon: Plane },
  completed:   { color: "text-success",          bg: "bg-success/10",     dot: "bg-success",         label: "Completed",  icon: CheckCircle },
  aborted:     { color: "text-destructive",      bg: "bg-destructive/10", dot: "bg-destructive",     label: "Aborted",    icon: AlertTriangle },
  reviewing:   { color: "text-muted-foreground", bg: "bg-muted",          dot: "bg-muted-foreground",label: "Reviewing",  icon: Eye },
};
const droneStatusConfig = {
  available:   { color: "text-success",          bg: "bg-success/10",     dot: "bg-success",         label: "Available" },
  "in-flight": { color: "text-warning",          bg: "bg-warning/10",     dot: "bg-warning",         label: "In Flight" },
  maintenance: { color: "text-destructive",      bg: "bg-destructive/10", dot: "bg-destructive",     label: "Maintenance" },
  charging:    { color: "text-primary",          bg: "bg-primary/10",     dot: "bg-primary",         label: "Charging" },
};

const EMPTY_FLIGHT = { missionName: "", droneId: "", pilotId: "", siteId: "",
                        flightDate: "", takeoffTime: "", purpose: "", notes: "" };
const EMPTY_DRONE  = { name: "", model: "", serialNumber: "", status: "available",
                        batteryLevel: 100, features: "", lastMaintenance: "", nextMaintenance: "", notes: "" };
const PAGE_SIZE = 10;

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
function Pagination({ page, total, pageSize, onChange }: {
  page: number; total: number; pageSize: number; onChange: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = Math.min(total, (page - 1) * pageSize + 1);
  const to   = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 pt-3 border-t border-border/30">
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

// ── component ────────────────────────────────────────────────────────────────
export const DronesPage = () => {
  const [drones, setDrones]       = useState<Drone[]>([]);
  const [flights, setFlights]     = useState<FlightLog[]>([]);
  const [stats, setStats]         = useState<Stats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState("flights");

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate]     = useState("");
  const [searchTerm, setSearchTerm]     = useState("");

  const [flightPage, setFlightPage] = useState(1);
  const [dronePage,  setDronePage]  = useState(1);

  const [siteOptions,      setSiteOptions]      = useState<SiteOption[]>([]);
  const [personnelOptions, setPersonnelOptions] = useState<PersonnelOption[]>([]);

  // modals
  const [isAddFlightOpen,   setIsAddFlightOpen]   = useState(false);
  const [isAddDroneOpen,    setIsAddDroneOpen]     = useState(false);
  const [isEditFlightOpen,  setIsEditFlightOpen]   = useState(false);
  const [isEditDroneOpen,   setIsEditDroneOpen]    = useState(false);
  const [isViewOpen,        setIsViewOpen]         = useState(false);
  const [selectedFlight,    setSelectedFlight]     = useState<FlightLog | null>(null);
  const [editingFlight,     setEditingFlight]      = useState<FlightLog | null>(null);
  const [editingDrone,      setEditingDrone]       = useState<Drone | null>(null);

  // delete confirm
  const [deleteFlightTarget, setDeleteFlightTarget] = useState<FlightLog | null>(null);
  const [deleteDroneTarget,  setDeleteDroneTarget]  = useState<Drone | null>(null);

  const [flightForm,     setFlightForm]     = useState({ ...EMPTY_FLIGHT });
  const [droneForm,      setDroneForm]      = useState({ ...EMPTY_DRONE });
  const [editFlightForm, setEditFlightForm] = useState({
    status: "", landingTime: "", duration: "", batteryUsed: 0,
    videoFootage: false, photoCount: 0, weather: "", notes: "",
  });
  const [editDroneForm, setEditDroneForm] = useState({
    status: "", batteryLevel: 0, notes: "",
  });

  // ── fetch ─────────────────────────────────────────────────────────────────
  const fetchFlights = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filterStatus !== "all") params.status = filterStatus;
      if (filterDate)  params.date   = filterDate;
      if (searchTerm)  params.search = searchTerm;
      const res = await api.get("/drones/flights", { params });
      setFlights(res.data.data.flights);
      setFlightPage(1);
    } catch (e) { console.error("Error fetching flights:", e); }
    finally { setLoading(false); }
  };

  const fetchDrones = async () => {
    try {
      const res = await api.get("/drones");
      setDrones(res.data.data.drones);
      setDronePage(1);
    } catch (e) { console.error("Error fetching drones:", e); }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/drones/stats");
      setStats(res.data.data);
    } catch (e) { console.error("Error fetching stats:", e); }
  };

  const fetchOptions = async () => {
    try {
      const [sitesRes, personnelRes] = await Promise.allSettled([
        api.get("/sites",     { params: { limit: 200 } }),
        api.get("/personnel", { params: { status: "active", limit: 200 } }),
      ]);
      if (sitesRes.status === "fulfilled")
        setSiteOptions(sitesRes.value.data.data.sites || []);
      if (personnelRes.status === "fulfilled")
        setPersonnelOptions(personnelRes.value.data.data.personnel || []);
    } catch (e) { console.error("Error fetching options:", e); }
  };

  useEffect(() => { fetchFlights(); }, [filterStatus, filterDate, searchTerm]);
  useEffect(() => { fetchDrones(); fetchStats(); fetchOptions(); }, []);

  // ── actions ───────────────────────────────────────────────────────────────
  const handleCreateFlight = async () => {
    if (!flightForm.missionName || !flightForm.droneId || !flightForm.flightDate || !flightForm.takeoffTime || !flightForm.purpose)
      return alert("Please fill all required fields.");
    try {
      await api.post("/drones/flights", flightForm);
      setIsAddFlightOpen(false);
      setFlightForm({ ...EMPTY_FLIGHT });
      fetchFlights(); fetchStats();
    } catch (e: any) { alert(e.response?.data?.message || "Failed to schedule mission"); }
  };

  const handleCreateDrone = async () => {
    if (!droneForm.name || !droneForm.model) return alert("Name and model are required.");
    try {
      await api.post("/drones", {
        ...droneForm,
        features: droneForm.features.split(",").map(f => f.trim()).filter(Boolean),
      });
      setIsAddDroneOpen(false);
      setDroneForm({ ...EMPTY_DRONE });
      fetchDrones(); fetchStats();
    } catch (e: any) { alert(e.response?.data?.message || "Failed to add drone"); }
  };

  const handleOpenEditFlight = (f: FlightLog) => {
    setEditingFlight(f);
    setEditFlightForm({
      status: f.status, landingTime: f.landingTime || "",
      duration: f.duration || "", batteryUsed: f.batteryUsed,
      videoFootage: f.videoFootage, photoCount: f.photoCount,
      weather: f.weather || "", notes: f.notes || "",
    });
    setIsEditFlightOpen(true);
  };

  const handleUpdateFlight = async () => {
    if (!editingFlight) return;
    try {
      await api.put(`/drones/flights/${editingFlight.id}`, editFlightForm);
      setIsEditFlightOpen(false);
      fetchFlights(); fetchStats();
    } catch (e: any) { alert(e.response?.data?.message || "Failed to update flight"); }
  };

  const handleDeleteFlight = async (id: string) => {
    try { await api.delete(`/drones/flights/${id}`); fetchFlights(); fetchStats(); }
    catch (e: any) { alert(e.response?.data?.message || "Failed to delete flight"); }
    finally { setDeleteFlightTarget(null); }
  };

  const handleOpenEditDrone = (d: Drone) => {
    setEditingDrone(d);
    setEditDroneForm({ status: d.status, batteryLevel: d.batteryLevel, notes: d.notes || "" });
    setIsEditDroneOpen(true);
  };

  const handleUpdateDrone = async () => {
    if (!editingDrone) return;
    try {
      await api.put(`/drones/${editingDrone.id}`, editDroneForm);
      setIsEditDroneOpen(false);
      fetchDrones(); fetchStats();
    } catch (e: any) { alert(e.response?.data?.message || "Failed to update drone"); }
  };

  const handleDeleteDrone = async (id: string) => {
    try { await api.delete(`/drones/${id}`); fetchDrones(); fetchStats(); }
    catch (e: any) { alert(e.response?.data?.message || "Failed to delete drone"); }
    finally { setDeleteDroneTarget(null); }
  };

  // ── derived ────────────────────────────────────────────────────────────────
  const display = {
    totalFlights:    stats?.flights.total     ?? flights.length,
    inFlight:        stats?.flights.active    ?? flights.filter(f => f.status === "in-flight").length,
    completed:       stats?.flights.completed ?? flights.filter(f => f.status === "completed").length,
    availableDrones: stats?.drones.available  ?? drones.filter(d => d.status === "available").length,
    totalDrones:     stats?.drones.total      ?? drones.length,
  };

  const pagedFlights = flights.slice((flightPage - 1) * PAGE_SIZE, flightPage * PAGE_SIZE);
  const pagedDrones  = drones.slice((dronePage  - 1) * PAGE_SIZE, dronePage  * PAGE_SIZE);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background px-3 py-4 sm:px-6 sm:py-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
              <Plane className="w-5 h-5 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
              <span className="truncate">Drone Operations</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              Manage drone missions, flight logs, and fleet
            </p>
          </div>
          <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
            <Button variant="outline" size="icon" title="Refresh"
              onClick={() => { fetchFlights(); fetchDrones(); fetchStats(); }}>
              <RefreshCw className="w-4 h-4" />
            </Button>

            {/* Add Drone */}
            <Dialog open={isAddDroneOpen} onOpenChange={setIsAddDroneOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-4">
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Add Drone</span>
                  <span className="sm:hidden">Drone</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100vw-2rem)] max-w-lg rounded-xl">
                <DialogHeader>
                  <DialogTitle>Add Drone to Fleet</DialogTitle>
                  <DialogDescription>Register a new drone</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name / Call Sign *</Label>
                      <Input placeholder="e.g. Alpha" value={droneForm.name}
                        onChange={e => setDroneForm({ ...droneForm, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Model *</Label>
                      <Input placeholder="e.g. DJI Matrice 300" value={droneForm.model}
                        onChange={e => setDroneForm({ ...droneForm, model: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Serial Number</Label>
                      <Input value={droneForm.serialNumber}
                        onChange={e => setDroneForm({ ...droneForm, serialNumber: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={droneForm.status} onValueChange={v => setDroneForm({ ...droneForm, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="charging">Charging</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Features (comma-separated)</Label>
                    <Input placeholder="Thermal Imaging, 4K Camera, RTK GPS" value={droneForm.features}
                      onChange={e => setDroneForm({ ...droneForm, features: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Last Maintenance</Label>
                      <Input type="date" value={droneForm.lastMaintenance}
                        onChange={e => setDroneForm({ ...droneForm, lastMaintenance: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Next Maintenance</Label>
                      <Input type="date" value={droneForm.nextMaintenance}
                        onChange={e => setDroneForm({ ...droneForm, nextMaintenance: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={droneForm.notes} rows={2}
                      onChange={e => setDroneForm({ ...droneForm, notes: e.target.value })} />
                  </div>
                </div>
                <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => setIsAddDroneOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                  <Button onClick={handleCreateDrone} className="w-full sm:w-auto">Add Drone</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Schedule Mission */}
            <Dialog open={isAddFlightOpen} onOpenChange={setIsAddFlightOpen}>
              <DialogTrigger asChild>
                <Button className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-4">
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Schedule Mission</span>
                  <span className="sm:hidden">Mission</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl rounded-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Schedule Drone Mission</DialogTitle>
                  <DialogDescription>Plan a new drone surveillance or inspection mission</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Mission Name *</Label>
                    <Input placeholder="e.g. Morning Perimeter Patrol" value={flightForm.missionName}
                      onChange={e => setFlightForm({ ...flightForm, missionName: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Drone *</Label>
                      <Select value={flightForm.droneId} onValueChange={v => setFlightForm({ ...flightForm, droneId: v })}>
                        <SelectTrigger><SelectValue placeholder="Choose drone" /></SelectTrigger>
                        <SelectContent>
                          {drones.filter(d => d.status === "available").map(d => (
                            <SelectItem key={d.id} value={d.id}>{d.name} — {d.model} ({d.batteryLevel}%)</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Pilot</Label>
                      <Select value={flightForm.pilotId} onValueChange={v => setFlightForm({ ...flightForm, pilotId: v })}>
                        <SelectTrigger><SelectValue placeholder="Assign pilot" /></SelectTrigger>
                        <SelectContent>
                          {personnelOptions.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Site</Label>
                      <Select value={flightForm.siteId} onValueChange={v => setFlightForm({ ...flightForm, siteId: v })}>
                        <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
                        <SelectContent>
                          {siteOptions.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Purpose *</Label>
                      <Select value={flightForm.purpose} onValueChange={v => setFlightForm({ ...flightForm, purpose: v })}>
                        <SelectTrigger><SelectValue placeholder="Mission purpose" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Routine Surveillance">Routine Surveillance</SelectItem>
                          <SelectItem value="Incident Investigation">Incident Investigation</SelectItem>
                          <SelectItem value="Structural Inspection">Structural Inspection</SelectItem>
                          <SelectItem value="Emergency Response">Emergency Response</SelectItem>
                          <SelectItem value="Night Surveillance">Night Surveillance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Flight Date *</Label>
                      <Input type="date" value={flightForm.flightDate}
                        onChange={e => setFlightForm({ ...flightForm, flightDate: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Takeoff Time *</Label>
                      <Input type="time" value={flightForm.takeoffTime}
                        onChange={e => setFlightForm({ ...flightForm, takeoffTime: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Mission Notes</Label>
                    <Textarea value={flightForm.notes} rows={3}
                      placeholder="Additional mission details or special instructions..."
                      onChange={e => setFlightForm({ ...flightForm, notes: e.target.value })} />
                  </div>
                </div>
                <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => setIsAddFlightOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                  <Button onClick={handleCreateFlight} className="w-full sm:w-auto">Schedule Mission</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats — 2 col mobile, 5 col md+ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4">
          {[
            { label: "Total Missions",   value: display.totalFlights,    color: "text-foreground", bg: "bg-primary/10",  icon: Plane },
            { label: "In Flight",        value: display.inFlight,        color: "text-warning",    bg: "bg-warning/10",  icon: Play },
            { label: "Completed",        value: display.completed,       color: "text-success",    bg: "bg-success/10",  icon: CheckCircle },
            { label: "Fleet Size",       value: display.totalDrones,     color: "text-foreground", bg: "bg-primary/10",  icon: FileText },
            { label: "Available Drones", value: display.availableDrones, color: "text-success",    bg: "bg-success/10",  icon: Battery },
          ].map(({ label, value, color, bg, icon: Icon }) => (
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="flights" className="text-xs sm:text-sm">Flight Logs</TabsTrigger>
            <TabsTrigger value="drones"  className="text-xs sm:text-sm">Drone Fleet</TabsTrigger>
            <TabsTrigger value="footage" className="text-xs sm:text-sm">Footage</TabsTrigger>
          </TabsList>

          {/* ── Flight Logs ── */}
          <TabsContent value="flights" className="space-y-4 mt-4">
            {/* Filters */}
            <div className="glass-card rounded-xl p-3 sm:p-5 border border-border/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative sm:col-span-2 lg:col-span-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search missions..." className="pl-10" value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger><SelectValue placeholder="Filter by status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in-flight">In Flight</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="aborted">Aborted</SelectItem>
                    <SelectItem value="reviewing">Reviewing</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
                <Button variant="outline" className="gap-2 w-full">
                  <Download className="w-4 h-4" /> Export Logs
                </Button>
              </div>
            </div>

            {/* Flight Table */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-muted-foreground text-sm">Loading missions...</p>
              </div>
            ) : flights.length === 0 ? (
              <div className="text-center py-12">
                <Plane className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-sm">No missions found</p>
              </div>
            ) : (
              <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="border-b border-border/50 bg-secondary/30">
                        {["Mission", "Drone / Pilot", "Site", "Date & Time", "Status", "Media", "Actions"].map(h => (
                          <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {pagedFlights.map(flight => {
                        const conf = flightStatusConfig[flight.status] ?? flightStatusConfig.scheduled;
                        return (
                          <tr key={flight.id} className="hover:bg-secondary/20 transition-colors">
                            {/* Mission */}
                            <td className="px-4 py-3">
                              <p className="font-medium text-foreground truncate max-w-[160px]">{flight.missionName}</p>
                              <p className="text-xs text-muted-foreground font-mono">{flight.flightCode}</p>
                              {flight.incidentLinked && (
                                <Badge variant="outline" className="text-xs mt-0.5">Linked</Badge>
                              )}
                            </td>
                            {/* Drone / Pilot */}
                            <td className="px-4 py-3">
                              <p className="text-foreground truncate max-w-[130px]">{flight.droneName}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[130px]">{flight.pilotName}</p>
                            </td>
                            {/* Site + Purpose */}
                            <td className="px-4 py-3">
                              <p className="text-foreground truncate max-w-[120px]">{flight.siteName}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[120px]">{flight.purpose}</p>
                            </td>
                            {/* Date & Time */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <p className="text-foreground text-xs">{flight.flightDate}</p>
                              <p className="text-xs text-muted-foreground">
                                {flight.takeoffTime}{flight.landingTime && ` – ${flight.landingTime}`}
                              </p>
                              {flight.duration && <p className="text-xs text-muted-foreground">{flight.duration}</p>}
                            </td>
                            {/* Status */}
                            <td className="px-4 py-3">
                              <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap", conf.bg, conf.color)}>
                                <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", conf.dot,
                                  flight.status === "in-flight" && "animate-pulse")} />
                                {conf.label}
                              </span>
                            </td>
                            {/* Media */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {flight.videoFootage && <span className="flex items-center gap-1"><Video className="w-3 h-3" />Vid</span>}
                                {flight.photoCount > 0 && <span>{flight.photoCount}🖼</span>}
                                {!flight.videoFootage && flight.photoCount === 0 && <span>—</span>}
                              </div>
                            </td>
                            {/* Actions */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => { setSelectedFlight(flight); setIsViewOpen(true); }} title="View">
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => handleOpenEditFlight(flight)} title="Edit">
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeleteFlightTarget(flight)} title="Delete">
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
                {flights.length > PAGE_SIZE && (
                  <div className="px-4 pb-4 pt-1">
                    <Pagination page={flightPage} total={flights.length} pageSize={PAGE_SIZE} onChange={setFlightPage} />
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── Drone Fleet ── */}
          <TabsContent value="drones" className="mt-4">
            {drones.length === 0 ? (
              <div className="text-center py-12">
                <Plane className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-sm">No drones in fleet</p>
              </div>
            ) : (
              <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead>
                      <tr className="border-b border-border/50 bg-secondary/30">
                        {["Drone", "Status", "Battery", "Flight Hours", "Features", "Maintenance", "Actions"].map(h => (
                          <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {pagedDrones.map(drone => {
                        const conf = droneStatusConfig[drone.status] ?? droneStatusConfig.available;
                        return (
                          <tr key={drone.id} className="hover:bg-secondary/20 transition-colors">
                            {/* Drone */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                                  <Plane className="w-3.5 h-3.5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground truncate max-w-[120px]">{drone.name}</p>
                                  <p className="text-xs text-muted-foreground truncate max-w-[120px]">{drone.model}</p>
                                </div>
                              </div>
                            </td>
                            {/* Status */}
                            <td className="px-4 py-3">
                              <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap", conf.bg, conf.color)}>
                                <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", conf.dot)} />
                                {conf.label}
                              </span>
                            </td>
                            {/* Battery */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 min-w-[80px]">
                                <div className="flex-1 bg-secondary rounded-full h-1.5">
                                  <div
                                    className={cn("h-1.5 rounded-full",
                                      drone.batteryLevel > 60 ? "bg-success" :
                                      drone.batteryLevel > 30 ? "bg-warning" : "bg-destructive")}
                                    style={{ width: `${drone.batteryLevel}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium w-8 text-right">{drone.batteryLevel}%</span>
                              </div>
                            </td>
                            {/* Flight hours */}
                            <td className="px-4 py-3 text-sm text-foreground">{drone.flightHours}h</td>
                            {/* Features */}
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1 max-w-[180px]">
                                {drone.features?.slice(0, 2).map((f, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">{f}</Badge>
                                ))}
                                {drone.features?.length > 2 && (
                                  <Badge variant="secondary" className="text-xs">+{drone.features.length - 2}</Badge>
                                )}
                              </div>
                            </td>
                            {/* Maintenance */}
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                              <p>Last: {drone.lastMaintenance || "—"}</p>
                              <p>Next: {drone.nextMaintenance || "—"}</p>
                            </td>
                            {/* Actions */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => handleOpenEditDrone(drone)} title="Edit">
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeleteDroneTarget(drone)} title="Delete">
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
                {drones.length > PAGE_SIZE && (
                  <div className="px-4 pb-4 pt-1">
                    <Pagination page={dronePage} total={drones.length} pageSize={PAGE_SIZE} onChange={setDronePage} />
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── Footage Library ── */}
          <TabsContent value="footage" className="mt-4">
            <div className="glass-card rounded-xl p-4 sm:p-6 border border-border/50">
              <h3 className="font-semibold text-foreground mb-4">Recent Footage</h3>
              {flights.filter(f => f.videoFootage || f.photoCount > 0).length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">No footage available</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {flights.filter(f => f.videoFootage || f.photoCount > 0).slice(0, 6).map(f => (
                    <div key={f.id} className="rounded-lg border border-border/50 overflow-hidden">
                      <div className="aspect-video bg-secondary/30 flex items-center justify-center">
                        {f.videoFootage ? (
                          <div className="text-center">
                            <Video className="w-10 h-10 sm:w-12 sm:h-12 text-primary mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">Video Available</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <ImageIcon className="w-10 h-10 sm:w-12 sm:h-12 text-primary mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">{f.photoCount} Photos</p>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-medium text-sm mb-1 truncate">{f.missionName}</p>
                        <p className="text-xs text-muted-foreground mb-2">{f.flightDate}</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1 text-xs">
                            <Play className="w-3 h-3 mr-1" /> View
                          </Button>
                          <Button variant="ghost" size="sm"><Download className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* ── View Details Modal ── */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl">
            <DialogHeader>
              <DialogTitle>Mission Details</DialogTitle>
              <DialogDescription>{selectedFlight?.flightCode}</DialogDescription>
            </DialogHeader>
            {selectedFlight && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  ["Mission",   selectedFlight.missionName],
                  ["Drone",     `${selectedFlight.droneName} (${selectedFlight.droneModel})`],
                  ["Pilot",     selectedFlight.pilotName],
                  ["Site",      selectedFlight.siteName],
                  ["Purpose",   selectedFlight.purpose],
                  ["Date",      selectedFlight.flightDate],
                  ["Takeoff",   selectedFlight.takeoffTime],
                  ["Landing",   selectedFlight.landingTime || "—"],
                  ["Duration",  selectedFlight.duration || "—"],
                  ["Altitude",  selectedFlight.altitude || "—"],
                  ["Distance",  selectedFlight.distance || "—"],
                  ["Battery",   `${selectedFlight.batteryUsed}%`],
                  ["Weather",   selectedFlight.weather || "—"],
                  ["Photos",    selectedFlight.photoCount.toString()],
                ] as [string, string][]).map(([label, val]) => (
                  <div key={label}>
                    <Label className="text-muted-foreground text-xs">{label}</Label>
                    <p className="text-sm mt-1">{val}</p>
                  </div>
                ))}
                {selectedFlight.notes && (
                  <div className="col-span-1 sm:col-span-2">
                    <Label className="text-muted-foreground text-xs">Notes</Label>
                    <p className="text-sm mt-1 p-3 rounded-lg bg-secondary/30">{selectedFlight.notes}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewOpen(false)} className="w-full sm:w-auto">Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Edit Flight Modal ── */}
        <Dialog open={isEditFlightOpen} onOpenChange={setIsEditFlightOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Update Flight Log</DialogTitle>
              <DialogDescription>{editingFlight?.missionName}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editFlightForm.status}
                  onValueChange={v => setEditFlightForm({ ...editFlightForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in-flight">In Flight</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="aborted">Aborted</SelectItem>
                    <SelectItem value="reviewing">Reviewing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Landing Time</Label>
                  <Input type="time" value={editFlightForm.landingTime}
                    onChange={e => setEditFlightForm({ ...editFlightForm, landingTime: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Duration (mins)</Label>
                  <Input type="number" value={editFlightForm.duration}
                    onChange={e => setEditFlightForm({ ...editFlightForm, duration: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Battery Used (%)</Label>
                  <Input type="number" min={0} max={100} value={editFlightForm.batteryUsed}
                    onChange={e => setEditFlightForm({ ...editFlightForm, batteryUsed: parseInt(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Photo Count</Label>
                  <Input type="number" min={0} value={editFlightForm.photoCount}
                    onChange={e => setEditFlightForm({ ...editFlightForm, photoCount: parseInt(e.target.value) })} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="vid" checked={editFlightForm.videoFootage}
                  onChange={e => setEditFlightForm({ ...editFlightForm, videoFootage: e.target.checked })} />
                <Label htmlFor="vid">Video Footage Captured</Label>
              </div>
              <div className="space-y-2">
                <Label>Weather</Label>
                <Input value={editFlightForm.weather}
                  onChange={e => setEditFlightForm({ ...editFlightForm, weather: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea rows={2} value={editFlightForm.notes}
                  onChange={e => setEditFlightForm({ ...editFlightForm, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsEditFlightOpen(false)} className="w-full sm:w-auto">Cancel</Button>
              <Button onClick={handleUpdateFlight} className="w-full sm:w-auto">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Edit Drone Modal ── */}
        <Dialog open={isEditDroneOpen} onOpenChange={setIsEditDroneOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-xl">
            <DialogHeader>
              <DialogTitle>Update Drone</DialogTitle>
              <DialogDescription>{editingDrone?.name} — {editingDrone?.droneCode}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editDroneForm.status}
                  onValueChange={v => setEditDroneForm({ ...editDroneForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in-flight">In Flight</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="charging">Charging</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Battery Level (%)</Label>
                <Input type="number" min={0} max={100} value={editDroneForm.batteryLevel}
                  onChange={e => setEditDroneForm({ ...editDroneForm, batteryLevel: parseInt(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea rows={2} value={editDroneForm.notes}
                  onChange={e => setEditDroneForm({ ...editDroneForm, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsEditDroneOpen(false)} className="w-full sm:w-auto">Cancel</Button>
              <Button onClick={handleUpdateDrone} className="w-full sm:w-auto">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Delete Confirm Modals ── */}
        <ConfirmModal
          open={deleteFlightTarget !== null}
          title="Delete Flight Log"
          description={`Are you sure you want to delete mission "${deleteFlightTarget?.missionName}" (${deleteFlightTarget?.flightCode})? This action cannot be undone.`}
          onConfirm={() => deleteFlightTarget && handleDeleteFlight(deleteFlightTarget.id)}
          onCancel={() => setDeleteFlightTarget(null)}
        />
        <ConfirmModal
          open={deleteDroneTarget !== null}
          title="Delete Drone"
          description={`Are you sure you want to delete drone "${deleteDroneTarget?.name}" (${deleteDroneTarget?.droneCode})? This action cannot be undone.`}
          onConfirm={() => deleteDroneTarget && handleDeleteDrone(deleteDroneTarget.id)}
          onCancel={() => setDeleteDroneTarget(null)}
        />

      </div>
    </div>
  );
};

export default DronesPage;