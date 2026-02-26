import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  MapPin, Navigation, Play, Pause, Clock, AlertTriangle,
  CheckCircle, RefreshCw, Plus, User, ChevronRight, Loader2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Checkpoint {
  id: string;
  name: string;
  location?: string;
  sequence_order: number;
  status: "pending" | "completed" | "missed";
  visited_at?: string;
}

interface PatrolRoute {
  id: string;
  guard_id: string;
  guard_name: string;
  guard_employee_id?: string;
  site_id: string;
  site_name: string;
  site_code?: string;
  route_name?: string;
  start_time: string;
  end_time?: string;
  status: "active" | "completed" | "deviation" | "delayed";
  distance_covered?: number;
  notes?: string;
  total_checkpoints: number;
  completed_checkpoints: number;
}

interface PatrolStats {
  active: number;
  completed_today: number;
  deviations: number;
  delayed: number;
  total_distance: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const patrolStatusConfig = {
  active:    { color: "text-success",          bg: "bg-success/10",     dot: "bg-success",          label: "Active" },
  completed: { color: "text-muted-foreground", bg: "bg-muted",          dot: "bg-muted-foreground", label: "Completed" },
  deviation: { color: "text-destructive",      bg: "bg-destructive/10", dot: "bg-destructive",      label: "Route Deviation" },
  delayed:   { color: "text-warning",          bg: "bg-warning/10",     dot: "bg-warning",          label: "Delayed" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtTime = (iso?: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const fmtDate = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const elapsed = (start: string, end?: string) => {
  const from = new Date(start).getTime();
  const to   = end ? new Date(end).getTime() : Date.now();
  const mins = Math.floor((to - from) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

// ── Confirm Modal ─────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal = ({
  open, title, description, confirmLabel = "Confirm", onConfirm, onCancel,
}: ConfirmModalProps) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-background border border-border shadow-xl p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={onConfirm} className="w-full sm:w-auto">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Checkpoint Detail Sheet (mobile) ──────────────────────────────────────────

const CheckpointPanel = ({
  patrol,
  checkpoints,
  onClose,
  onToggle,
}: {
  patrol: PatrolRoute | null;
  checkpoints: Checkpoint[];
  onClose: () => void;
  onToggle: (id: string, status: string) => void;
}) => {
  if (!patrol) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-background border-t border-border shadow-xl max-h-[75vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">
            Checkpoints — {patrol.guard_name}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {checkpoints.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No checkpoints defined for this patrol
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {checkpoints.map((cp, idx) => (
                <div key={cp.id} className="px-4 py-3 flex items-center gap-3 hover:bg-secondary/20 transition-colors">
                  <span className="text-xs text-muted-foreground w-5 text-center font-mono">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{cp.name}</p>
                    {cp.location && <p className="text-xs text-muted-foreground truncate">{cp.location}</p>}
                    {cp.visited_at && <p className="text-xs text-success">{fmtTime(cp.visited_at)}</p>}
                  </div>
                  <button
                    className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                      cp.status === "completed" ? "bg-success border-success text-white"
                        : cp.status === "missed" ? "bg-destructive/20 border-destructive"
                        : "border-border hover:border-primary"
                    )}
                    onClick={() => onToggle(cp.id, cp.status)}
                    title={cp.status === "completed" ? "Mark pending" : "Mark completed"}
                  >
                    {cp.status === "completed" && <CheckCircle className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ── Sub-component: patrol card ────────────────────────────────────────────────

const PatrolCard = ({
  patrol,
  onUpdateStatus,
  onSelect,
  selected,
}: {
  patrol: PatrolRoute;
  onUpdateStatus: (id: string, status: string) => void;
  onSelect: (p: PatrolRoute) => void;
  selected: boolean;
}) => {
  const conf     = patrolStatusConfig[patrol.status] ?? patrolStatusConfig.active;
  const progress = patrol.total_checkpoints > 0
    ? Math.round((patrol.completed_checkpoints / patrol.total_checkpoints) * 100)
    : 0;

  const [confirm, setConfirm] = useState<{ status: string; label: string } | null>(null);

  const requestStatusChange = (e: React.MouseEvent, status: string, label: string) => {
    e.stopPropagation();
    setConfirm({ status, label });
  };

  return (
    <>
      <ConfirmModal
        open={confirm !== null}
        title="Update Patrol Status"
        description={`Are you sure you want to mark this patrol as "${confirm?.label}"?`}
        confirmLabel={confirm?.label}
        onConfirm={() => {
          if (confirm) onUpdateStatus(patrol.id, confirm.status);
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />

      <div
        className={cn(
          "p-3 sm:p-4 rounded-xl border transition-all duration-200 cursor-pointer",
          selected
            ? "border-primary/50 bg-primary/5"
            : "border-border/50 bg-secondary/20 hover:border-primary/30 hover:bg-secondary/30"
        )}
        onClick={() => onSelect(patrol)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{patrol.guard_name}</p>
              <p className="text-xs text-muted-foreground font-mono">{patrol.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", conf.dot,
              patrol.status === "active" && "animate-pulse")} />
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap", conf.bg, conf.color)}>
              {conf.label}
            </span>
          </div>
        </div>

        {/* Info grid — stacks to 2-col on all sizes, readable on small screens */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1 truncate col-span-2 sm:col-span-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{patrol.site_name}</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 flex-shrink-0" /> {fmtTime(patrol.start_time)}
            {patrol.status === "active" && (
              <span className="text-primary ml-0.5">· {elapsed(patrol.start_time)}</span>
            )}
          </span>
          <span>
            Checkpoints:{" "}
            <span className="text-foreground font-medium">
              {patrol.completed_checkpoints}/{patrol.total_checkpoints}
            </span>
          </span>
          <span>
            Distance:{" "}
            <span className="text-foreground font-medium">
              {patrol.distance_covered ? `${patrol.distance_covered} km` : "—"}
            </span>
          </span>
        </div>

        {/* Progress bar */}
        {patrol.total_checkpoints > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-1.5">
              <div
                className={cn("h-1.5 rounded-full transition-all",
                  patrol.status === "deviation" ? "bg-destructive" :
                  patrol.status === "delayed"   ? "bg-warning"     : "bg-primary"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions for active patrols */}
        {patrol.status === "active" && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 text-xs gap-1 min-w-0"
              onClick={e => requestStatusChange(e, "delayed", "Delayed")}
            >
              <Pause className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">Mark Delayed</span>
            </Button>
            <Button
              size="sm"
              className="flex-1 h-8 text-xs gap-1 min-w-0"
              onClick={e => requestStatusChange(e, "completed", "Completed")}
            >
              <CheckCircle className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">Complete</span>
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const PatrolPage = () => {
  const { toast } = useToast();

  const [patrols,        setPatrols]        = useState<PatrolRoute[]>([]);
  const [stats,          setStats]          = useState<PatrolStats | null>(null);
  const [selectedPatrol, setSelectedPatrol] = useState<PatrolRoute | null>(null);
  const [checkpoints,    setCheckpoints]    = useState<Checkpoint[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [filterStatus,   setFilterStatus]   = useState("all");
  const [sheetOpen,      setSheetOpen]      = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterStatus !== "all") params.status = filterStatus;

      const [patrolsRes, statsRes] = await Promise.all([
        api.get("/patrol", { params }),
        api.get("/patrol/stats"),
      ]);

      if (patrolsRes.data.success) setPatrols(patrolsRes.data.data);
      if (statsRes.data.success)   setStats(statsRes.data.data);
    } catch (err: any) {
      toast({
        title: "Failed to load patrol data",
        description: err.response?.data?.message ?? err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!selectedPatrol) return;
    api.get(`/patrol/${selectedPatrol.id}`)
      .then(res => setCheckpoints(res.data.data?.checkpoints ?? []))
      .catch(() => setCheckpoints([]));
  }, [selectedPatrol]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const body: Record<string, string> = { status };
      if (status === "completed") body.end_time = new Date().toISOString();

      await api.put(`/patrol/${id}`, body);
      toast({ title: "Patrol updated", description: `Status set to ${status}` });
      fetchAll();
      if (selectedPatrol?.id === id) setSelectedPatrol(null);
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err.response?.data?.message ?? err.message,
        variant: "destructive",
      });
    }
  };

  const handleCheckpointToggle = async (checkpointId: string, current: string) => {
    if (!selectedPatrol) return;
    const newStatus = current === "completed" ? "pending" : "completed";
    try {
      await api.put(`/patrol/${selectedPatrol.id}`, {
        checkpoint_id:     checkpointId,
        checkpoint_status: newStatus,
      });
      setCheckpoints(prev => prev.map(cp =>
        cp.id === checkpointId ? { ...cp, status: newStatus as Checkpoint["status"] } : cp
      ));
    } catch (err: any) {
      toast({
        title: "Checkpoint update failed",
        description: err.response?.data?.message ?? err.message,
        variant: "destructive",
      });
    }
  };

  const handleSelectPatrol = (patrol: PatrolRoute) => {
    setSelectedPatrol(patrol);
    setSheetOpen(true); // open bottom sheet on mobile
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const filteredPatrols = patrols.filter(p =>
    filterStatus === "all" || p.status === filterStatus
  );

  const displayStats = stats ?? {
    active:          patrols.filter(p => p.status === "active").length,
    completed_today: patrols.filter(p => p.status === "completed").length,
    deviations:      patrols.filter(p => p.status === "deviation").length,
    delayed:         patrols.filter(p => p.status === "delayed").length,
    total_distance:  "—",
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background px-3 py-4 sm:px-6 sm:py-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
              <Navigation className="w-5 h-5 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
              <span className="truncate">Patrol & GPS Tracking</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              Monitor patrol routes and checkpoint visits in real-time
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={fetchAll} title="Refresh" className="flex-shrink-0">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>

        {/* Stats — 2 cols on mobile, 4 on md+ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          {[
            { label: "Active Patrols",   value: displayStats.active,         icon: Play,          color: "success" },
            { label: "Completed Today",  value: displayStats.completed_today, icon: CheckCircle,   color: "primary" },
            { label: "Route Deviations", value: displayStats.deviations,      icon: AlertTriangle, color: "destructive" },
            { label: "Total Distance",   value: displayStats.total_distance,  icon: MapPin,        color: "primary", isText: true },
          ].map(({ label, value, icon: Icon, color, isText }) => (
            <div key={label} className="glass-card rounded-xl p-3 sm:p-5 border border-border/50">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{label}</p>
                  <p className={cn("font-bold mt-0.5", isText ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl", `text-${color}`)}>
                    {loading ? "—" : value}
                  </p>
                </div>
                <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-lg bg-${color}/10 flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 sm:w-6 sm:h-6 text-${color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

          {/* ── Patrol list ── */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            {/* Filter bar */}
            <div className="flex items-center gap-3">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36 sm:w-44">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="deviation">Deviation</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs sm:text-sm text-muted-foreground ml-auto">
                {filteredPatrols.length} patrol{filteredPatrols.length !== 1 ? "s" : ""}
              </span>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredPatrols.length === 0 ? (
              <div className="glass-card rounded-xl p-10 sm:p-12 border border-border/50 text-center">
                <Navigation className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">No patrols found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPatrols.map(patrol => (
                  <PatrolCard
                    key={patrol.id}
                    patrol={patrol}
                    onUpdateStatus={handleUpdateStatus}
                    onSelect={handleSelectPatrol}
                    selected={selectedPatrol?.id === patrol.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Right panel — hidden on mobile (replaced by bottom sheet) ── */}
          <div className="hidden lg:flex flex-col space-y-4">
            {/* GPS Map placeholder */}
            <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/50">
                <h3 className="font-semibold text-sm text-foreground">Live GPS Tracking</h3>
              </div>
              <div className="aspect-video bg-gradient-to-br from-secondary/30 to-secondary/10 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-10 h-10 text-primary mx-auto mb-2 opacity-60" />
                  <p className="text-xs text-muted-foreground">Real-time guard locations</p>
                  {selectedPatrol && (
                    <p className="text-xs text-primary mt-1 font-medium">{selectedPatrol.guard_name}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Checkpoint panel */}
            <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/50">
                <h3 className="font-semibold text-sm text-foreground">
                  {selectedPatrol ? `Checkpoints — ${selectedPatrol.guard_name}` : "Checkpoints"}
                </h3>
              </div>
              {!selectedPatrol ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Select a patrol to view checkpoints
                </div>
              ) : checkpoints.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No checkpoints defined for this patrol
                </div>
              ) : (
                <div className="divide-y divide-border/30 max-h-72 overflow-y-auto">
                  {checkpoints.map((cp, idx) => (
                    <div key={cp.id} className="px-4 py-3 flex items-center gap-3 hover:bg-secondary/20 transition-colors">
                      <span className="text-xs text-muted-foreground w-5 text-center font-mono">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{cp.name}</p>
                        {cp.location && <p className="text-xs text-muted-foreground truncate">{cp.location}</p>}
                        {cp.visited_at && <p className="text-xs text-success">{fmtTime(cp.visited_at)}</p>}
                      </div>
                      <button
                        className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                          cp.status === "completed" ? "bg-success border-success text-white"
                            : cp.status === "missed" ? "bg-destructive/20 border-destructive"
                            : "border-border hover:border-primary"
                        )}
                        onClick={() => handleCheckpointToggle(cp.id, cp.status)}
                        title={cp.status === "completed" ? "Mark pending" : "Mark completed"}
                      >
                        {cp.status === "completed" && <CheckCircle className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile bottom sheet for checkpoints ── */}
      <div className="lg:hidden">
        <CheckpointPanel
          patrol={sheetOpen ? selectedPatrol : null}
          checkpoints={checkpoints}
          onClose={() => setSheetOpen(false)}
          onToggle={handleCheckpointToggle}
        />
      </div>
    </div>
  );
};

export default PatrolPage;