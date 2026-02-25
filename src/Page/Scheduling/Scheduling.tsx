// src/pages/Scheduling.tsx
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Calendar as CalIcon,
  Plus,
  Clock,
  MapPin,
  User,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Trash2,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";

interface Shift {
  id: string;
  shift_code?: string;
  guardId: string;
  guardName: string;
  guardEmployeeId: string;
  guardCode: string;
  siteId: string;
  siteName: string;
  siteCode: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "scheduled" | "ongoing" | "completed" | "missed";
  checkInTime: string | null;
  checkOutTime: string | null;
  notes: string | null;
}

interface Stats {
  date: string;
  today: number;
  ongoing: number;
  completed: number;
  missed: number;
  scheduled: number;
  weekTotal: number;
}

interface GuardOption {
  id: string;
  name: string;
  guard_code: string;
  employeeId: string;
}

interface SiteOption {
  id: string;
  name: string;
  site_code: string;
}

const shiftStatusConfig = {
  scheduled: { color: "text-primary", bg: "bg-primary/10", label: "Scheduled" },
  ongoing: { color: "text-warning", bg: "bg-warning/10", label: "Ongoing" },
  completed: { color: "text-success", bg: "bg-success/10", label: "Completed" },
  missed: { color: "text-destructive", bg: "bg-destructive/10", label: "Missed" },
};

const today = new Date().toISOString().split("T")[0];

export const SchedulingPage = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<string>(today);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false);
  const [isEditShiftOpen, setIsEditShiftOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  // Options for dropdowns in create modal
  const [guardOptions, setGuardOptions] = useState<GuardOption[]>([]);
  const [siteOptions, setSiteOptions] = useState<SiteOption[]>([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  const [newShift, setNewShift] = useState({
    guardId: "",
    siteId: "",
    date: today,
    startTime: "",
    endTime: "",
    notes: "",
  });

  const [editForm, setEditForm] = useState({
    status: "" as Shift["status"] | "",
    checkInTime: "",
    checkOutTime: "",
    notes: "",
  });

  // Fetch shifts, stats, and dropdown options on mount and filter change
  useEffect(() => {
    fetchShifts();
  }, [filterDate, filterStatus, pagination.page]);

  useEffect(() => {
    fetchStats();
  }, [filterDate]);

  useEffect(() => {
    fetchGuardOptions();
    fetchSiteOptions();
  }, []);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filterDate && { date: filterDate }),
        ...(filterStatus !== "all" && { status: filterStatus }),
      };

      const response = await api.get("/shifts", { params });
      setShifts(response.data.data.shifts);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error("Error fetching shifts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get("/shifts/stats", {
        params: { date: filterDate || today },
      });
      setStats(response.data.data);
    } catch (error) {
      console.error("Error fetching shift stats:", error);
    }
  };

  const fetchGuardOptions = async () => {
    try {
      // Fetch active guards for the dropdown — use a large limit to get all
      const response = await api.get("/personnel", {
        params: { status: "active", limit: 200 },
      });
      setGuardOptions(
        response.data.data.personnel.map((p: any) => ({
          id: p.id,
          name: p.name,
          guard_code: p.guard_code || "",
          employeeId: p.employeeId || "",
        }))
      );
    } catch (error) {
      console.error("Error fetching guard options:", error);
    }
  };

  const fetchSiteOptions = async () => {
    try {
      const response = await api.get("/sites", { params: { limit: 200, status: "active" } });
      const raw: any[] = response.data?.data?.sites
        ?? response.data?.data       
        ?? response.data?.sites      
        ?? [];
      setSiteOptions(
        raw.map((s: any) => ({
          id: s.id,
          name: s.name,
          site_code: s.site_code || s.siteCode || "",
        }))
      );
    } catch (error) {
      console.error("Error fetching site options:", error);
    }
  };

  const handleCreateShift = async () => {
    if (!newShift.guardId || !newShift.siteId || !newShift.date || !newShift.startTime || !newShift.endTime) {
      alert("Please fill in all required fields.");
      return;
    }
    try {
      await api.post("/shifts", {
        guardId: newShift.guardId,
        siteId: newShift.siteId,
        date: newShift.date,
        startTime: newShift.startTime,
        endTime: newShift.endTime,
        notes: newShift.notes || undefined,
      });

      setIsAddShiftOpen(false);
      setNewShift({ guardId: "", siteId: "", date: today, startTime: "", endTime: "", notes: "" });
      fetchShifts();
      fetchStats();
    } catch (error: any) {
      console.error("Error creating shift:", error);
      alert(error.response?.data?.message || "Failed to create shift");
    }
  };

  const handleOpenEdit = (shift: Shift) => {
    setEditingShift(shift);
    setEditForm({
      status: shift.status,
      checkInTime: shift.checkInTime || "",
      checkOutTime: shift.checkOutTime || "",
      notes: shift.notes || "",
    });
    setIsEditShiftOpen(true);
  };

  const handleUpdateShift = async () => {
    if (!editingShift) return;
    try {
      await api.put(`/shifts/${editingShift.id}`, {
        status: editForm.status || undefined,
        checkInTime: editForm.checkInTime || undefined,
        checkOutTime: editForm.checkOutTime || undefined,
        notes: editForm.notes || undefined,
      });

      setIsEditShiftOpen(false);
      setEditingShift(null);
      fetchShifts();
      fetchStats();
    } catch (error: any) {
      console.error("Error updating shift:", error);
      alert(error.response?.data?.message || "Failed to update shift");
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm("Are you sure you want to delete this shift?")) return;
    try {
      await api.delete(`/shifts/${shiftId}`);
      fetchShifts();
      fetchStats();
    } catch (error: any) {
      console.error("Error deleting shift:", error);
      alert(error.response?.data?.message || "Failed to delete shift");
    }
  };

  // Fallback stats from loaded shifts if API stats not yet available
  const displayStats = stats ?? {
    today: shifts.filter((s) => s.date === filterDate).length,
    ongoing: shifts.filter((s) => s.status === "ongoing").length,
    completed: shifts.filter((s) => s.status === "completed").length,
    missed: shifts.filter((s) => s.status === "missed").length,
    scheduled: shifts.filter((s) => s.status === "scheduled").length,
    weekTotal: 0,
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <CalIcon className="w-8 h-8 text-primary" />
              Deployment & Scheduling
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage guard shifts and duty assignments
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => { fetchShifts(); fetchStats(); }}
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>

            {/* Create Shift Dialog */}
            <Dialog open={isAddShiftOpen} onOpenChange={setIsAddShiftOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Shift
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Shift</DialogTitle>
                  <DialogDescription>
                    Assign a guard to a site for a specific time period
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Guard</Label>
                      <Select
                        value={newShift.guardId}
                        onValueChange={(v) => setNewShift({ ...newShift, guardId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select guard" />
                        </SelectTrigger>
                        <SelectContent>
                          {guardOptions.length === 0 && (
                            <SelectItem value="_none" disabled>
                              No active guards found
                            </SelectItem>
                          )}
                          {guardOptions.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name}
                              {g.guard_code ? ` (${g.guard_code})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Site</Label>
                      <Select
                        value={newShift.siteId}
                        onValueChange={(v) => setNewShift({ ...newShift, siteId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select site" />
                        </SelectTrigger>
                        <SelectContent>
                          {siteOptions.length === 0 && (
                            <SelectItem value="_none" disabled>
                              No sites found
                            </SelectItem>
                          )}
                          {siteOptions.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                              {s.site_code ? ` (${s.site_code})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={newShift.date}
                        onChange={(e) => setNewShift({ ...newShift, date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={newShift.startTime}
                        onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={newShift.endTime}
                        onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Input
                      placeholder="Any special instructions..."
                      value={newShift.notes}
                      onChange={(e) => setNewShift({ ...newShift, notes: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddShiftOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateShift}>Create Shift</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {filterDate === today ? "Today's Shifts" : "Shifts on Date"}
                </p>
                <p className="text-3xl font-bold text-foreground mt-1">{displayStats.today}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalIcon className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ongoing Now</p>
                <p className="text-3xl font-bold text-warning mt-1">{displayStats.ongoing}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold text-success mt-1">{displayStats.completed}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Missed</p>
                <p className="text-3xl font-bold text-destructive mt-1">{displayStats.missed}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card rounded-xl p-5 border border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Filter by Date</Label>
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => {
                  setFilterDate(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Filter by Status</Label>
              <Select
                value={filterStatus}
                onValueChange={(v) => {
                  setFilterStatus(v);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Export Schedule
              </Button>
            </div>
          </div>
        </div>

        {/* Shifts Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground">Loading shifts...</p>
          </div>
        ) : shifts.length === 0 ? (
          <div className="text-center py-12">
            <CalIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No shifts found for the selected filters</p>
          </div>
        ) : (
          <>
            <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary/30 border-b border-border/50">
                    <tr>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">
                        Shift
                      </th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">
                        Guard
                      </th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">
                        Site
                      </th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">
                        Date & Time
                      </th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">
                        Check In / Out
                      </th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">
                        Status
                      </th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map((shift) => {
                      const conf =
                        shiftStatusConfig[shift.status] ?? shiftStatusConfig.scheduled;
                      return (
                        <tr
                          key={shift.id}
                          className="border-b border-border/30 hover:bg-secondary/20 transition-colors"
                        >
                          <td className="px-5 py-4">
                            <p className="font-mono text-sm">
                              {shift.shift_code || shift.id}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{shift.guardName}</p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {shift.guardEmployeeId}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm">{shift.siteName}</p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {shift.siteCode}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-sm">{shift.date}</p>
                            <p className="text-xs text-muted-foreground">
                              {shift.startTime} – {shift.endTime}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            {shift.checkInTime ? (
                              <div className="text-sm">
                                <p className="text-success">In: {shift.checkInTime}</p>
                                {shift.checkOutTime ? (
                                  <p className="text-muted-foreground">
                                    Out: {shift.checkOutTime}
                                  </p>
                                ) : null}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">—</p>
                            )}
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
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(shift)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteShift(shift.id)}
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

        {/* Edit Shift Dialog */}
        <Dialog open={isEditShiftOpen} onOpenChange={setIsEditShiftOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Update Shift</DialogTitle>
              <DialogDescription>
                Update status or check-in/out times for{" "}
                {editingShift?.guardName} — {editingShift?.date}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(v) =>
                    setEditForm({ ...editForm, status: v as Shift["status"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="missed">Missed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Check-In Time</Label>
                  <Input
                    type="time"
                    value={editForm.checkInTime}
                    onChange={(e) =>
                      setEditForm({ ...editForm, checkInTime: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Check-Out Time</Label>
                  <Input
                    type="time"
                    value={editForm.checkOutTime}
                    onChange={(e) =>
                      setEditForm({ ...editForm, checkOutTime: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  placeholder="Optional notes..."
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditShiftOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateShift}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default SchedulingPage;
