import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  MapPin,
  Navigation,
  Play,
  Pause,
  Clock,
  AlertTriangle,
  CheckCircle,
  Filter,
  Download,
  Video,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Camera {
  id: string;
  name: string;
  siteId: string;
  siteName: string;
  status: "online" | "offline" | "motion-detected" | "maintenance";
  location: string;
  lastActivity?: string;
  recordingEnabled: boolean;
}

const cameraStatusConfig = {
  online: { color: "text-success", bg: "bg-success/10", label: "Online" },
  offline: { color: "text-destructive", bg: "bg-destructive/10", label: "Offline" },
  "motion-detected": { color: "text-warning", bg: "bg-warning/10", label: "Motion Detected" },
  maintenance: { color: "text-muted-foreground", bg: "bg-muted", label: "Maintenance" },
};

const mockCameras: Camera[] = [
  {
    id: "CAM001",
    name: "Main Entrance",
    siteId: "SITE001",
    siteName: "Westgate Mall",
    status: "online",
    location: "Front Gate",
    recordingEnabled: true
  },
  {
    id: "CAM002",
    name: "Parking Level 1",
    siteId: "SITE002",
    siteName: "Westgate Mall - Parking",
    status: "motion-detected",
    location: "Parking Structure",
    lastActivity: "2 min ago",
    recordingEnabled: true
  },
  {
    id: "CAM003",
    name: "Server Room",
    siteId: "SITE003",
    siteName: "SafariCom HQ",
    status: "offline",
    location: "Data Center",
    recordingEnabled: false
  },
];

export const CCTVAlarms = () => {
  const [cameras] = useState<Camera[]>(mockCameras);

  const stats = {
    total: cameras.length,
    online: cameras.filter(c => c.status === "online").length,
    offline: cameras.filter(c => c.status === "offline").length,
    alerts: cameras.filter(c => c.status === "motion-detected").length,
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Video className="w-8 h-8 text-primary" />
            CCTV & Alarm Monitoring
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor security cameras and alarm systems across all sites
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Cameras</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Video className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>
          
          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Online</p>
                <p className="text-3xl font-bold text-success mt-1">{stats.online}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Offline</p>
                <p className="text-3xl font-bold text-destructive mt-1">{stats.offline}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
                <p className="text-3xl font-bold text-warning mt-1">{stats.alerts}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Bell className="w-6 h-6 text-warning" />
              </div>
            </div>
          </div>
        </div>

        {/* Camera Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cameras.map((camera) => (
            <div key={camera.id} className="glass-card rounded-xl border border-border/50 overflow-hidden">
              <div className="aspect-video bg-secondary/30 flex items-center justify-center border-b border-border/50">
                <div className="text-center">
                  <Video className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Live Feed</p>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-foreground">{camera.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{camera.id}</p>
                  </div>
                  <span className={cn(
                    "text-xs font-medium px-2 py-1 rounded-full",
                    cameraStatusConfig[camera.status].bg,
                    cameraStatusConfig[camera.status].color
                  )}>
                    {cameraStatusConfig[camera.status].label}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>{camera.siteName} - {camera.location}</p>
                  {camera.lastActivity && (
                    <p className="text-warning">Last activity: {camera.lastActivity}</p>
                  )}
                  <p>Recording: {camera.recordingEnabled ? "Enabled" : "Disabled"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


export default CCTVAlarms;