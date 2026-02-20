import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  Plane,
  Plus,
  Search,
  Filter,
  MapPin,
  Clock,
  Video,
  Download,
  Eye,
  Play,
  Pause,
  Upload,
  Calendar,
  Battery,
  AlertTriangle,
  CheckCircle,
  Map,
  FileText,
  Image as ImageIcon
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface FlightLog {
  id: string;
  missionName: string;
  droneId: string;
  droneName: string;
  pilotName: string;
  pilotId: string;
  siteId: string;
  siteName: string;
  flightDate: string;
  takeoffTime: string;
  landingTime?: string;
  duration?: string;
  status: "scheduled" | "in-flight" | "completed" | "aborted" | "reviewing";
  purpose: string;
  altitude: string;
  distance: string;
  batteryUsed: number;
  videoFootage: boolean;
  photoCount: number;
  incidentLinked?: string;
  flightPath?: string;
  weather: string;
  notes?: string;
}

const flightStatusConfig = {
  scheduled: { color: "text-primary", bg: "bg-primary/10", label: "Scheduled", icon: Clock },
  "in-flight": { color: "text-warning", bg: "bg-warning/10", label: "In Flight", icon: Plane },
  completed: { color: "text-success", bg: "bg-success/10", label: "Completed", icon: CheckCircle },
  aborted: { color: "text-destructive", bg: "bg-destructive/10", label: "Aborted", icon: AlertTriangle },
  reviewing: { color: "text-muted-foreground", bg: "bg-muted", label: "Reviewing", icon: Eye },
};

const mockFlights: FlightLog[] = [
  {
    id: "FLT001",
    missionName: "Perimeter Security Sweep",
    droneId: "DRN001",
    droneName: "DJI Matrice 300 RTK",
    pilotName: "James Wilson",
    pilotId: "PLT001",
    siteId: "SITE001",
    siteName: "Westgate Mall - Main Complex",
    flightDate: "2026-01-19",
    takeoffTime: "06:15",
    landingTime: "06:45",
    duration: "30 min",
    status: "completed",
    purpose: "Routine Surveillance",
    altitude: "120m",
    distance: "2.5 km",
    batteryUsed: 68,
    videoFootage: true,
    photoCount: 45,
    weather: "Clear, 22°C, Wind 5 km/h",
    notes: "All areas inspected. No anomalies detected."
  },
  {
    id: "FLT002",
    missionName: "Incident Response - Unauthorized Access",
    droneId: "DRN002",
    droneName: "DJI Mavic 3 Enterprise",
    pilotName: "Sarah Chen",
    pilotId: "PLT002",
    siteId: "SITE003",
    siteName: "SafariCom HQ - Data Center",
    flightDate: "2026-01-19",
    takeoffTime: "14:30",
    status: "in-flight",
    purpose: "Incident Investigation",
    altitude: "80m",
    distance: "1.2 km",
    batteryUsed: 35,
    videoFootage: true,
    photoCount: 0,
    incidentLinked: "INC001",
    weather: "Partly cloudy, 24°C, Wind 8 km/h"
  },
  {
    id: "FLT003",
    missionName: "Night Patrol - Industrial Zone",
    droneId: "DRN001",
    droneName: "DJI Matrice 300 RTK",
    pilotName: "James Wilson",
    pilotId: "PLT001",
    siteId: "SITE006",
    siteName: "Kenya Power Industrial Park",
    flightDate: "2026-01-18",
    takeoffTime: "22:00",
    landingTime: "22:40",
    duration: "40 min",
    status: "reviewing",
    purpose: "Night Surveillance",
    altitude: "150m",
    distance: "3.8 km",
    batteryUsed: 72,
    videoFootage: true,
    photoCount: 68,
    weather: "Clear, 18°C, Wind 3 km/h",
    notes: "Thermal imaging captured. Footage under review."
  },
  {
    id: "FLT004",
    missionName: "Parking Structure Inspection",
    droneId: "DRN003",
    droneName: "Autel EVO II Pro",
    pilotName: "Michael Torres",
    pilotId: "PLT003",
    siteId: "SITE002",
    siteName: "Westgate Mall - Parking",
    flightDate: "2026-01-18",
    takeoffTime: "10:00",
    landingTime: "10:15",
    duration: "15 min",
    status: "aborted",
    purpose: "Structural Inspection",
    altitude: "45m",
    distance: "0.6 km",
    batteryUsed: 25,
    videoFootage: false,
    photoCount: 12,
    weather: "Windy, 23°C, Wind 25 km/h",
    notes: "Mission aborted due to high winds exceeding safe operating limits."
  },
  {
    id: "FLT005",
    missionName: "Morning Patrol - Scheduled",
    droneId: "DRN002",
    droneName: "DJI Mavic 3 Enterprise",
    pilotName: "Sarah Chen",
    pilotId: "PLT002",
    siteId: "SITE005",
    siteName: "Villa Rosa Kempinski Hotel",
    flightDate: "2026-01-20",
    takeoffTime: "07:00",
    status: "scheduled",
    purpose: "Routine Surveillance",
    altitude: "100m",
    distance: "1.8 km",
    batteryUsed: 0,
    videoFootage: false,
    photoCount: 0,
    weather: "Forecast: Clear"
  },
];

interface Drone {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  status: "available" | "in-flight" | "maintenance" | "charging";
  batteryLevel: number;
  flightHours: number;
  lastMaintenance: string;
  nextMaintenance: string;
  features: string[];
}

const droneStatusConfig = {
  available: { color: "text-success", bg: "bg-success/10", label: "Available" },
  "in-flight": { color: "text-warning", bg: "bg-warning/10", label: "In Flight" },
  maintenance: { color: "text-destructive", bg: "bg-destructive/10", label: "Maintenance" },
  charging: { color: "text-primary", bg: "bg-primary/10", label: "Charging" },
};

const mockDrones: Drone[] = [
  {
    id: "DRN001",
    name: "Alpha",
    model: "DJI Matrice 300 RTK",
    serialNumber: "M300-2024-001",
    status: "available",
    batteryLevel: 100,
    flightHours: 245,
    lastMaintenance: "2026-01-10",
    nextMaintenance: "2026-02-10",
    features: ["Thermal Imaging", "Zoom Camera", "RTK GPS", "Obstacle Avoidance"]
  },
  {
    id: "DRN002",
    name: "Bravo",
    model: "DJI Mavic 3 Enterprise",
    serialNumber: "M3E-2024-002",
    status: "in-flight",
    batteryLevel: 65,
    flightHours: 180,
    lastMaintenance: "2026-01-05",
    nextMaintenance: "2026-02-05",
    features: ["4K Camera", "Night Vision", "GPS", "Follow Mode"]
  },
  {
    id: "DRN003",
    name: "Charlie",
    model: "Autel EVO II Pro",
    serialNumber: "AEP-2024-003",
    status: "charging",
    batteryLevel: 45,
    flightHours: 320,
    lastMaintenance: "2025-12-28",
    nextMaintenance: "2026-01-28",
    features: ["6K Camera", "Thermal", "GPS", "Long Range"]
  },
];

export const DronesPage = () => {
  const [flights, setFlights] = useState<FlightLog[]>(mockFlights);
  const [drones] = useState<Drone[]>(mockDrones);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");
  const [isAddFlightOpen, setIsAddFlightOpen] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<FlightLog | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("flights");

  const [newFlight, setNewFlight] = useState({
    missionName: "",
    droneId: "",
    pilotId: "",
    siteId: "",
    flightDate: "",
    takeoffTime: "",
    purpose: "",
    notes: ""
  });

  const filteredFlights = flights.filter(flight => {
    const matchesSearch = flight.missionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         flight.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         flight.siteName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || flight.status === filterStatus;
    const matchesDate = !filterDate || flight.flightDate === filterDate;
    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleAddFlight = () => {
    const flight: FlightLog = {
      id: `FLT${String(flights.length + 1).padStart(3, '0')}`,
      ...newFlight,
      droneName: drones.find(d => d.id === newFlight.droneId)?.name || "",
      pilotName: "TBD",
      siteName: "TBD",
      status: "scheduled",
      altitude: "TBD",
      distance: "TBD",
      batteryUsed: 0,
      videoFootage: false,
      photoCount: 0,
      weather: "TBD"
    };
    setFlights([...flights, flight]);
    setIsAddFlightOpen(false);
    setNewFlight({
      missionName: "",
      droneId: "",
      pilotId: "",
      siteId: "",
      flightDate: "",
      takeoffTime: "",
      purpose: "",
      notes: ""
    });
  };

  const handleViewFlight = (flight: FlightLog) => {
    setSelectedFlight(flight);
    setIsViewModalOpen(true);
  };

  const stats = {
    totalFlights: flights.length,
    inFlight: flights.filter(f => f.status === "in-flight").length,
    completed: flights.filter(f => f.status === "completed").length,
    totalHours: flights.filter(f => f.duration).reduce((sum, f) => {
      const [hours, mins] = (f.duration || "0 min").split(" ")[0].split(":");
      return sum + (parseInt(hours) || 0) + (parseInt(mins) || 0) / 60;
    }, 0).toFixed(1),
    activeDrones: drones.filter(d => d.status === "available" || d.status === "in-flight").length,
    availableDrones: drones.filter(d => d.status === "available").length,
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
            <p className="text-muted-foreground mt-1">
              Manage drone missions, flight logs, and surveillance footage
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
              Upload Footage
            </Button>
            <Dialog open={isAddFlightOpen} onOpenChange={setIsAddFlightOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Schedule Mission
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Schedule Drone Mission</DialogTitle>
                  <DialogDescription>
                    Plan a new drone surveillance or inspection mission
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Mission Name</Label>
                    <Input
                      value={newFlight.missionName}
                      onChange={(e) => setNewFlight({...newFlight, missionName: e.target.value})}
                      placeholder="e.g., Morning Perimeter Patrol"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Select Drone</Label>
                      <Select
                        value={newFlight.droneId}
                        onValueChange={(value) => setNewFlight({...newFlight, droneId: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose drone" />
                        </SelectTrigger>
                        <SelectContent>
                          {drones.filter(d => d.status === "available").map((drone) => (
                            <SelectItem key={drone.id} value={drone.id}>
                              {drone.name} - {drone.model} (Battery: {drone.batteryLevel}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Pilot</Label>
                      <Select
                        value={newFlight.pilotId}
                        onValueChange={(value) => setNewFlight({...newFlight, pilotId: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Assign pilot" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PLT001">James Wilson</SelectItem>
                          <SelectItem value="PLT002">Sarah Chen</SelectItem>
                          <SelectItem value="PLT003">Michael Torres</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Site</Label>
                      <Select
                        value={newFlight.siteId}
                        onValueChange={(value) => setNewFlight({...newFlight, siteId: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select site" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SITE001">Westgate Mall</SelectItem>
                          <SelectItem value="SITE003">SafariCom HQ</SelectItem>
                          <SelectItem value="SITE006">Kenya Power</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Purpose</Label>
                      <Select
                        value={newFlight.purpose}
                        onValueChange={(value) => setNewFlight({...newFlight, purpose: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Mission purpose" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Routine Surveillance">Routine Surveillance</SelectItem>
                          <SelectItem value="Incident Investigation">Incident Investigation</SelectItem>
                          <SelectItem value="Structural Inspection">Structural Inspection</SelectItem>
                          <SelectItem value="Emergency Response">Emergency Response</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Flight Date</Label>
                      <Input
                        type="date"
                        value={newFlight.flightDate}
                        onChange={(e) => setNewFlight({...newFlight, flightDate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Takeoff Time</Label>
                      <Input
                        type="time"
                        value={newFlight.takeoffTime}
                        onChange={(e) => setNewFlight({...newFlight, takeoffTime: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Mission Notes</Label>
                    <Textarea
                      value={newFlight.notes}
                      onChange={(e) => setNewFlight({...newFlight, notes: e.target.value})}
                      placeholder="Additional mission details, objectives, or special instructions..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddFlightOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddFlight}>Schedule Mission</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Missions</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.totalFlights}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Plane className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>
          
          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Flight</p>
                <p className="text-3xl font-bold text-warning mt-1">{stats.inFlight}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Play className="w-6 h-6 text-warning" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold text-success mt-1">{stats.completed}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.totalHours}h</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available Drones</p>
                <p className="text-3xl font-bold text-success mt-1">{stats.availableDrones}/{stats.activeDrones}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <Battery className="w-6 h-6 text-success" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="flights">Flight Logs</TabsTrigger>
            <TabsTrigger value="drones">Drone Fleet</TabsTrigger>
            <TabsTrigger value="footage">Footage Library</TabsTrigger>
          </TabsList>

          {/* Flight Logs Tab */}
          <TabsContent value="flights" className="space-y-4">
            {/* Filters */}
            <div className="glass-card rounded-xl p-5 border border-border/50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search missions..."
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
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in-flight">In Flight</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="aborted">Aborted</SelectItem>
                    <SelectItem value="reviewing">Reviewing</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  placeholder="Filter by date"
                />
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export Logs
                </Button>
              </div>
            </div>

            {/* Flights List */}
            <div className="space-y-4">
              {filteredFlights.map((flight) => {
                const StatusIcon = flightStatusConfig[flight.status].icon;
                
                return (
                  <div
                    key={flight.id}
                    className="glass-card rounded-xl p-5 border border-border/50 hover:border-primary/30 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                          <Plane className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-foreground">{flight.missionName}</h3>
                            <span className={cn(
                              "text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1",
                              flightStatusConfig[flight.status].bg,
                              flightStatusConfig[flight.status].color
                            )}>
                              <StatusIcon className="w-3 h-3" />
                              {flightStatusConfig[flight.status].label}
                            </span>
                            {flight.incidentLinked && (
                              <Badge variant="outline" className="text-xs">
                                Linked: {flight.incidentLinked}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono mb-3">{flight.id}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground text-xs">Drone</p>
                              <p className="font-medium">{flight.droneName}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Pilot</p>
                              <p className="font-medium">{flight.pilotName}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Site</p>
                              <p className="font-medium">{flight.siteName}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Purpose</p>
                              <p className="font-medium">{flight.purpose}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {flight.flightDate}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {flight.takeoffTime} {flight.landingTime && `- ${flight.landingTime}`}
                            </div>
                            {flight.duration && (
                              <div className="flex items-center gap-1">
                                Duration: {flight.duration}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Battery className="w-3 h-3" />
                              Battery: {flight.batteryUsed}%
                            </div>
                            {flight.videoFootage && (
                              <div className="flex items-center gap-1">
                                <Video className="w-3 h-3" />
                                Video Available
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewFlight(flight)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Details
                        </Button>
                        {flight.videoFootage && (
                          <Button variant="ghost" size="sm">
                            <Video className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {flight.notes && (
                      <div className="border-t border-border/50 pt-3 mt-3">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Notes:</span> {flight.notes}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Drone Fleet Tab */}
          <TabsContent value="drones" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {drones.map((drone) => (
                <div
                  key={drone.id}
                  className="glass-card rounded-xl border border-border/50 overflow-hidden"
                >
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
                      <span className={cn(
                        "text-xs font-medium px-2 py-1 rounded-full",
                        droneStatusConfig[drone.status].bg,
                        droneStatusConfig[drone.status].color
                      )}>
                        {droneStatusConfig[drone.status].label}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Battery Level</span>
                          <span className="font-medium">{drone.batteryLevel}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className={cn(
                              "h-2 rounded-full transition-all",
                              drone.batteryLevel > 60 ? "bg-success" :
                              drone.batteryLevel > 30 ? "bg-warning" : "bg-destructive"
                            )}
                            style={{ width: `${drone.batteryLevel}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Flight Hours</p>
                          <p className="font-medium">{drone.flightHours}h</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Serial</p>
                          <p className="font-mono text-xs">{drone.serialNumber}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-muted-foreground text-xs mb-2">Features</p>
                        <div className="flex flex-wrap gap-1">
                          {drone.features.map((feature, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-border/50 text-xs text-muted-foreground">
                        <p>Last Maintenance: {drone.lastMaintenance}</p>
                        <p>Next Maintenance: {drone.nextMaintenance}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Footage Library Tab */}
          <TabsContent value="footage" className="space-y-4">
            <div className="glass-card rounded-xl p-6 border border-border/50">
              <h3 className="font-semibold text-foreground mb-4">Recent Footage</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {filteredFlights
                  .filter(f => f.videoFootage || f.photoCount > 0)
                  .slice(0, 6)
                  .map((flight) => (
                    <div key={flight.id} className="rounded-lg border border-border/50 overflow-hidden">
                      <div className="aspect-video bg-secondary/30 flex items-center justify-center">
                        {flight.videoFootage ? (
                          <div className="text-center">
                            <Video className="w-12 h-12 text-primary mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">Video Available</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <ImageIcon className="w-12 h-12 text-primary mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">{flight.photoCount} Photos</p>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-medium text-sm mb-1">{flight.missionName}</p>
                        <p className="text-xs text-muted-foreground mb-2">{flight.flightDate}</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Play className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Flight Details Modal */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Mission Details</DialogTitle>
              <DialogDescription>
                Complete flight log for {selectedFlight?.id}
              </DialogDescription>
            </DialogHeader>
            {selectedFlight && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Mission ID</Label>
                    <p className="font-mono text-sm mt-1">{selectedFlight.id}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Mission Name</Label>
                    <p className="text-sm mt-1">{selectedFlight.missionName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Drone</Label>
                    <p className="text-sm mt-1">{selectedFlight.droneName}</p>
                    <p className="text-xs text-muted-foreground">{selectedFlight.droneId}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Pilot</Label>
                    <p className="text-sm mt-1">{selectedFlight.pilotName}</p>
                    <p className="text-xs text-muted-foreground">{selectedFlight.pilotId}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Site</Label>
                    <p className="text-sm mt-1">{selectedFlight.siteName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Purpose</Label>
                    <p className="text-sm mt-1">{selectedFlight.purpose}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Flight Date</Label>
                    <p className="text-sm mt-1">{selectedFlight.flightDate}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Time</Label>
                    <p className="text-sm mt-1">
                      {selectedFlight.takeoffTime}
                      {selectedFlight.landingTime && ` - ${selectedFlight.landingTime}`}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Duration</Label>
                    <p className="text-sm mt-1">{selectedFlight.duration || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Altitude</Label>
                    <p className="text-sm mt-1">{selectedFlight.altitude}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Distance Covered</Label>
                    <p className="text-sm mt-1">{selectedFlight.distance}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Battery Used</Label>
                    <p className="text-sm mt-1">{selectedFlight.batteryUsed}%</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Weather Conditions</Label>
                    <p className="text-sm mt-1">{selectedFlight.weather}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <p className="text-sm mt-1 capitalize">{selectedFlight.status}</p>
                  </div>
                </div>

                {selectedFlight.notes && (
                  <div>
                    <Label className="text-muted-foreground">Mission Notes</Label>
                    <p className="text-sm mt-2 p-3 rounded-lg bg-secondary/30">
                      {selectedFlight.notes}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {selectedFlight.videoFootage && (
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Video className="w-4 h-4 text-primary" />
                        <p className="text-sm font-medium">Video Footage Available</p>
                      </div>
                      <Button variant="outline" size="sm" className="w-full">
                        <Play className="w-4 h-4 mr-2" />
                        Play Video
                      </Button>
                    </div>
                  )}
                  {selectedFlight.photoCount > 0 && (
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <ImageIcon className="w-4 h-4 text-primary" />
                        <p className="text-sm font-medium">{selectedFlight.photoCount} Photos Captured</p>
                      </div>
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="w-4 h-4 mr-2" />
                        View Gallery
                      </Button>
                    </div>
                  )}
                </div>

                {selectedFlight.flightPath && (
                  <div>
                    <Label className="text-muted-foreground">Flight Path</Label>
                    <div className="mt-2 aspect-video rounded-lg bg-secondary/30 border border-border/50 flex items-center justify-center">
                      <div className="text-center">
                        <Map className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Flight path visualization</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                Close
              </Button>
              <Button>
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DronesPage;