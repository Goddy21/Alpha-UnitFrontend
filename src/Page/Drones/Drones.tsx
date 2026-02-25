import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Plane, Plus, Search, MapPin, Clock, Video, Download,
  Eye, Play, Upload, Calendar, Battery, AlertTriangle,
  CheckCircle, Map, FileText, Image as ImageIcon, RefreshCw,
  Edit, Trash2,
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

interface SiteOption   { id: string; name: string; }
interface PersonnelOption { id: string; name: string; guard_code: string; }

// ── configs ───────────────────────────────────────────────────────────────────
const flightStatusConfig = {
  scheduled:  { color: "text-primary",          bg: "bg-primary/10",     label: "Scheduled",  icon: Clock },
  "in-flight":{ color: "text-warning",           bg: "bg-warning/10",     label: "In Flight",  icon: Plane },
  completed:  { color: "text-success",           bg: "bg-success/10",     label: "Completed",  icon: CheckCircle },
  aborted:    { color: "text-destructive",       bg: "bg-destructive/10", label: "Aborted",    icon: AlertTriangle },
  reviewing:  { color: "text-muted-foreground",  bg: "bg-muted",          label: "Reviewing",  icon: Eye },
};
const droneStatusConfig = {
  available:   { color: "text-success",          bg: "bg-success/10",     label: "Available" },
  "in-flight": { color: "text-warning",          bg: "bg-warning/10",     label: "In Flight" },
  maintenance: { color: "text-destructive",      bg: "bg-destructive/10", label: "Maintenance" },
  charging:    { color: "text-primary",          bg: "bg-primary/10",     label: "Charging" },
};

const EMPTY_FLIGHT = { missionName: "", droneId: "", pilotId: "", siteId: "",
                        flightDate: "", takeoffTime: "", purpose: "", notes: "" };
const EMPTY_DRONE  = { name: "", model: "", serialNumber: "", status: "available",
                        batteryLevel: 100, features: "", lastMaintenance: "", nextMaintenance: "", notes: "" };

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

  const [siteOptions, setSiteOptions]         = useState<SiteOption[]>([]);
  const [personnelOptions, setPersonnelOptions] = useState<PersonnelOption[]>([]);

  // modals
  const [isAddFlightOpen, setIsAddFlightOpen]   = useState(false);
  const [isAddDroneOpen, setIsAddDroneOpen]     = useState(false);
  const [isEditFlightOpen, setIsEditFlightOpen] = useState(false);
  const [isEditDroneOpen, setIsEditDroneOpen]   = useState(false);
  const [isViewOpen, setIsViewOpen]             = useState(false);
  const [selectedFlight, setSelectedFlight]     = useState<FlightLog | null>(null);
  const [editingFlight, setEditingFlight]       = useState<FlightLog | null>(null);
  const [editingDrone, setEditingDrone]         = useState<Drone | null>(null);

  const [flightForm, setFlightForm]   = useState({ ...EMPTY_FLIGHT });
  const [droneForm, setDroneForm]     = useState({ ...EMPTY_DRONE });
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
    } catch (e) { console.error("Error fetching flights:", e); }
    finally { setLoading(false); }
  };

  const fetchDrones = async () => {
    try {
      const res = await api.get("/drones");
      setDrones(res.data.data.drones);
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
    if (!confirm("Delete this flight log?")) return;
    try { await api.delete(`/drones/flights/${id}`); fetchFlights(); fetchStats(); }
    catch (e: any) { alert(e.response?.data?.message || "Failed to delete flight"); }
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
    if (!confirm("Delete this drone?")) return;
    try { await api.delete(`/drones/${id}`); fetchDrones(); fetchStats(); }
    catch (e: any) { alert(e.response?.data?.message || "Failed to delete drone"); }
  };

  // ── derived stats ─────────────────────────────────────────────────────────
  const display = {
    totalFlights:    stats?.flights.total    ?? flights.length,
    inFlight:        stats?.flights.active   ?? flights.filter(f => f.status === "in-flight").length,
    completed:       stats?.flights.completed ?? flights.filter(f => f.status === "completed").length,
    availableDrones: stats?.drones.available  ?? drones.filter(d => d.status === "available").length,
    totalDrones:     stats?.drones.total      ?? drones.length,
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Plane className="w-8 h-8 text-primary" />
              Drone Operations
            </h1>
            <p className="text-muted-foreground mt-1">Manage drone missions, flight logs, and fleet</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2"
              onClick={() => { fetchFlights(); fetchDrones(); fetchStats(); }}>
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>

            {/* Add Drone */}
            <Dialog open={isAddDroneOpen} onOpenChange={setIsAddDroneOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" /> Add Drone
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Drone to Fleet</DialogTitle>
                  <DialogDescription>Register a new drone</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Serial Number</Label>
                      <Input value={droneForm.serialNumber}
                        onChange={e => setDroneForm({ ...droneForm, serialNumber: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={droneForm.status}
                        onValueChange={v => setDroneForm({ ...droneForm, status: v })}>
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
                  <div className="grid grid-cols-2 gap-4">
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
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDroneOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateDrone}>Add Drone</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Schedule Mission */}
            <Dialog open={isAddFlightOpen} onOpenChange={setIsAddFlightOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" /> Schedule Mission</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Drone *</Label>
                      <Select value={flightForm.droneId}
                        onValueChange={v => setFlightForm({ ...flightForm, droneId: v })}>
                        <SelectTrigger><SelectValue placeholder="Choose drone" /></SelectTrigger>
                        <SelectContent>
                          {drones.filter(d => d.status === "available").map(d => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name} — {d.model} ({d.batteryLevel}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Pilot</Label>
                      <Select value={flightForm.pilotId}
                        onValueChange={v => setFlightForm({ ...flightForm, pilotId: v })}>
                        <SelectTrigger><SelectValue placeholder="Assign pilot" /></SelectTrigger>
                        <SelectContent>
                          {personnelOptions.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Site</Label>
                      <Select value={flightForm.siteId}
                        onValueChange={v => setFlightForm({ ...flightForm, siteId: v })}>
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
                      <Select value={flightForm.purpose}
                        onValueChange={v => setFlightForm({ ...flightForm, purpose: v })}>
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
                  <div className="grid grid-cols-2 gap-4">
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
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddFlightOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateFlight}>Schedule Mission</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { label: "Total Missions",    value: display.totalFlights,    color: "text-foreground", bg: "bg-primary/10",     icon: Plane },
            { label: "In Flight",         value: display.inFlight,        color: "text-warning",    bg: "bg-warning/10",     icon: Play },
            { label: "Completed",         value: display.completed,       color: "text-success",    bg: "bg-success/10",     icon: CheckCircle },
            { label: "Fleet Size",        value: display.totalDrones,     color: "text-foreground", bg: "bg-primary/10",     icon: FileText },
            { label: "Available Drones",  value: display.availableDrones, color: "text-success",    bg: "bg-success/10",     icon: Battery },
          ].map(({ label, value, color, bg, icon: Icon }) => (
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="flights">Flight Logs</TabsTrigger>
            <TabsTrigger value="drones">Drone Fleet</TabsTrigger>
            <TabsTrigger value="footage">Footage Library</TabsTrigger>
          </TabsList>

          {/* ── Flight Logs ── */}
          <TabsContent value="flights" className="space-y-4 mt-4">
            {/* Filters */}
            <div className="glass-card rounded-xl p-5 border border-border/50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
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
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" /> Export Logs
                </Button>
              </div>
            </div>

            {/* Flight list */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-muted-foreground">Loading missions...</p>
              </div>
            ) : flights.length === 0 ? (
              <div className="text-center py-12">
                <Plane className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No missions found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {flights.map(flight => {
                  const conf = flightStatusConfig[flight.status] ?? flightStatusConfig.scheduled;
                  const StatusIcon = conf.icon;
                  return (
                    <div key={flight.id}
                      className="glass-card rounded-xl p-5 border border-border/50 hover:border-primary/30 transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                            <Plane className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-semibold text-foreground">{flight.missionName}</h3>
                              <span className={cn("text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1", conf.bg, conf.color)}>
                                <StatusIcon className="w-3 h-3" /> {conf.label}
                              </span>
                              {flight.incidentLinked && (
                                <Badge variant="outline" className="text-xs">Linked: {flight.incidentLinked}</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground font-mono mb-3">{flight.flightCode}</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div><p className="text-xs text-muted-foreground">Drone</p><p className="font-medium">{flight.droneName}</p></div>
                              <div><p className="text-xs text-muted-foreground">Pilot</p><p className="font-medium">{flight.pilotName}</p></div>
                              <div><p className="text-xs text-muted-foreground">Site</p><p className="font-medium">{flight.siteName}</p></div>
                              <div><p className="text-xs text-muted-foreground">Purpose</p><p className="font-medium">{flight.purpose}</p></div>
                            </div>
                            <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{flight.flightDate}</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{flight.takeoffTime}{flight.landingTime && ` – ${flight.landingTime}`}</span>
                              {flight.duration && <span>Duration: {flight.duration}</span>}
                              <span className="flex items-center gap-1"><Battery className="w-3 h-3" />Battery: {flight.batteryUsed}%</span>
                              {flight.videoFootage && <span className="flex items-center gap-1"><Video className="w-3 h-3" />Video</span>}
                              {flight.photoCount > 0 && <span>{flight.photoCount} photos</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button variant="outline" size="sm" onClick={() => { setSelectedFlight(flight); setIsViewOpen(true); }}>
                            <Eye className="w-4 h-4 mr-1" /> Details
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEditFlight(flight)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteFlight(flight.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {flight.notes && (
                        <div className="border-t border-border/50 pt-3">
                          <p className="text-xs text-muted-foreground"><span className="font-medium">Notes:</span> {flight.notes}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Drone Fleet ── */}
          <TabsContent value="drones" className="mt-4">
            {drones.length === 0 ? (
              <div className="text-center py-12">
                <Plane className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No drones in fleet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {drones.map(drone => {
                  const conf = droneStatusConfig[drone.status] ?? droneStatusConfig.available;
                  return (
                    <div key={drone.id} className="glass-card rounded-xl border border-border/50 overflow-hidden">
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center">
                              <Plane className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">{drone.name}</h3>
                              <p className="text-xs text-muted-foreground">{drone.model}</p>
                            </div>
                          </div>
                          <span className={cn("text-xs font-medium px-2 py-1 rounded-full", conf.bg, conf.color)}>
                            {conf.label}
                          </span>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Battery</span>
                              <span className="font-medium">{drone.batteryLevel}%</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2">
                              <div className={cn("h-2 rounded-full transition-all",
                                drone.batteryLevel > 60 ? "bg-success" :
                                drone.batteryLevel > 30 ? "bg-warning" : "bg-destructive")}
                                style={{ width: `${drone.batteryLevel}%` }} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><p className="text-xs text-muted-foreground">Flight Hours</p><p className="font-medium">{drone.flightHours}h</p></div>
                            <div><p className="text-xs text-muted-foreground">Serial</p><p className="font-mono text-xs">{drone.serialNumber || '—'}</p></div>
                          </div>
                          {drone.features?.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">Features</p>
                              <div className="flex flex-wrap gap-1">
                                {drone.features.map((f, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">{f}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="pt-3 border-t border-border/50 text-xs text-muted-foreground">
                            <p>Last Maintenance: {drone.lastMaintenance || '—'}</p>
                            <p>Next Maintenance: {drone.nextMaintenance || '—'}</p>
                          </div>
                          <div className="flex gap-1 pt-1">
                            <Button variant="ghost" size="sm" className="flex-1" onClick={() => handleOpenEditDrone(drone)}>
                              <Edit className="w-3 h-3 mr-1" /> Edit
                            </Button>
                            <Button variant="ghost" size="sm" className="flex-1" onClick={() => handleDeleteDrone(drone.id)}>
                              <Trash2 className="w-3 h-3 mr-1 text-destructive" /> Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Footage Library ── */}
          <TabsContent value="footage" className="mt-4">
            <div className="glass-card rounded-xl p-6 border border-border/50">
              <h3 className="font-semibold text-foreground mb-4">Recent Footage</h3>
              {flights.filter(f => f.videoFootage || f.photoCount > 0).length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No footage available</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {flights.filter(f => f.videoFootage || f.photoCount > 0).slice(0, 6).map(f => (
                    <div key={f.id} className="rounded-lg border border-border/50 overflow-hidden">
                      <div className="aspect-video bg-secondary/30 flex items-center justify-center">
                        {f.videoFootage ? (
                          <div className="text-center">
                            <Video className="w-12 h-12 text-primary mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">Video Available</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <ImageIcon className="w-12 h-12 text-primary mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">{f.photoCount} Photos</p>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-medium text-sm mb-1">{f.missionName}</p>
                        <p className="text-xs text-muted-foreground mb-2">{f.flightDate}</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1">
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Mission Details</DialogTitle>
              <DialogDescription>{selectedFlight?.flightCode}</DialogDescription>
            </DialogHeader>
            {selectedFlight && (
              <div className="grid grid-cols-2 gap-4">
                {[
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
                ].map(([label, val]) => (
                  <div key={label}>
                    <Label className="text-muted-foreground text-xs">{label}</Label>
                    <p className="text-sm mt-1">{val}</p>
                  </div>
                ))}
                {selectedFlight.notes && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground text-xs">Notes</Label>
                    <p className="text-sm mt-1 p-3 rounded-lg bg-secondary/30">{selectedFlight.notes}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Edit Flight Modal ── */}
        <Dialog open={isEditFlightOpen} onOpenChange={setIsEditFlightOpen}>
          <DialogContent className="max-w-md">
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
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditFlightOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateFlight}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Edit Drone Modal ── */}
        <Dialog open={isEditDroneOpen} onOpenChange={setIsEditDroneOpen}>
          <DialogContent className="max-w-sm">
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDroneOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateDrone}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default DronesPage;