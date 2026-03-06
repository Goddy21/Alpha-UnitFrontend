import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  CalendarDays, Plus, Search, Filter, Edit, Trash2, Eye,
  AlertTriangle, CheckCircle, Clock, XCircle, Users, MapPin,
  Ambulance, Flame, Shield, Car, Radio, Camera, Video,
  Image as ImageIcon, Package, FileText, RefreshCw, Download,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  X, Star, TrendingUp, Zap, Building2, Lock, Unlock,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import api from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
interface EquipmentItem { name: string; quantity: number; status: string; }
interface MediaFile { url: string; name: string; type: string; uploadedAt: string; }

interface EventRecord {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  status: string;
  priority: string;
  start_date: string;
  end_date: string;
  venue_name: string | null;
  address: string | null;
  coordinates: string | null;
  site_id: string | null;
  site_name: string | null;
  client_id: string | null;
  client_name: string | null;
  expected_attendance: number;
  actual_attendance: number;
  max_capacity: number;
  ambulances_deployed: number;
  ambulances_required: number;
  fire_engines_deployed: number;
  fire_engines_required: number;
  police_officers: number;
  police_units: number;
  security_guards: number;
  supervisors: number;
  vehicles_deployed: number;
  communication_devices: number;
  first_aid_stations: number;
  evacuation_routes: string | null;
  briefing_notes: string | null;
  logistics_notes: string | null;
  images: MediaFile[];
  videos: MediaFile[];
  equipment_list: EquipmentItem[];
  risk_level: string;
  risk_notes: string | null;
  permits_required: boolean;
  permits_obtained: boolean;
  created_by_name: string | null;
  created_at: string;
}

interface Stats {
  total: number; active: number; planned: number; completed: number;
  cancelled: number; critical: number;
  total_expected: number; total_actual: number;
  total_ambulances: number; total_fire_engines: number;
  total_police: number; total_guards: number;
  byType: { event_type: string; count: number }[];
  upcoming: EventRecord[];
}

// ── Config ────────────────────────────────────────────────────────────────────
const EVENT_TYPES = [
  "general","security","emergency","public","vip","corporate","sports","concert","political"
] as const;

const STATUSES  = ["planned","active","completed","cancelled","postponed"] as const;
const PRIORITIES = ["low","medium","high","critical"] as const;
const RISK_LEVELS = ["low","medium","high","critical"] as const;

const statusConfig: Record<string, { color: string; bg: string; dot: string; icon: any; label: string }> = {
  planned:   { color: "text-primary",          bg: "bg-primary/10",     dot: "bg-primary",         icon: Clock,        label: "Planned" },
  active:    { color: "text-success",           bg: "bg-success/10",     dot: "bg-success",         icon: Activity,     label: "Active" },
  completed: { color: "text-muted-foreground",  bg: "bg-muted",          dot: "bg-muted-foreground",icon: CheckCircle,  label: "Completed" },
  cancelled: { color: "text-destructive",       bg: "bg-destructive/10", dot: "bg-destructive",     icon: XCircle,      label: "Cancelled" },
  postponed: { color: "text-warning",           bg: "bg-warning/10",     dot: "bg-warning",         icon: Clock,        label: "Postponed" },
};

const priorityConfig: Record<string, { color: string; bg: string; label: string }> = {
  low:      { color: "text-muted-foreground", bg: "bg-muted",          label: "Low" },
  medium:   { color: "text-primary",          bg: "bg-primary/10",     label: "Medium" },
  high:     { color: "text-warning",          bg: "bg-warning/10",     label: "High" },
  critical: { color: "text-destructive",      bg: "bg-destructive/10", label: "Critical" },
};

const typeIcons: Record<string, any> = {
  general: CalendarDays, security: Shield, emergency: AlertTriangle,
  public: Users, vip: Star, corporate: Building2,
  sports: Activity, concert: Zap, political: FileText,
};

const EMPTY_FORM = {
  title: "", description: "", event_type: "general", status: "planned", priority: "medium",
  start_date: "", end_date: "",
  venue_name: "", address: "", coordinates: "",
  site_id: "none", client_id: "none",
  expected_attendance: 0, actual_attendance: 0, max_capacity: 0,
  ambulances_deployed: 0, ambulances_required: 0,
  fire_engines_deployed: 0, fire_engines_required: 0,
  police_officers: 0, police_units: 0,
  security_guards: 0, supervisors: 0,
  vehicles_deployed: 0, communication_devices: 0,
  first_aid_stations: 0, evacuation_routes: "", briefing_notes: "", logistics_notes: "",
  images: [] as MediaFile[], videos: [] as MediaFile[], equipment_list: [] as EquipmentItem[],
  risk_level: "low", risk_notes: "",
  permits_required: false, permits_obtained: false,
};

const PAGE_SIZE = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (d: string) => new Date(d).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
const fmtDT = (d: string) => new Date(d).toLocaleString("en-KE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, bg }: any) {
  return (
    <div className="glass-card rounded-xl p-3 sm:p-5 border border-border/50">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className={cn("text-lg sm:text-2xl font-bold mt-0.5 truncate", color)}>{value}</p>
        </div>
        <div className={cn("w-9 h-9 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0", bg)}>
          <Icon className={cn("w-4 h-4 sm:w-6 sm:h-6", color)} />
        </div>
      </div>
    </div>
  );
}

function NumField({ label, field, form, setForm }: any) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={0}
        value={form[field] ?? ""}                          
        onChange={e => {
          const val = e.target.value;
          setForm({ ...form, [field]: val === "" ? 0 : parseInt(val) || 0 });
        }}
        className="h-8 text-sm"
      />
    </div>
  );
}

function EquipmentEditor({ list, onChange }: { list: EquipmentItem[]; onChange: (l: EquipmentItem[]) => void }) {
  const [newItem, setNewItem] = useState({ name: "", quantity: 1, status: "available" });
  const add = () => {
    if (!newItem.name.trim()) return;
    onChange([...list, { ...newItem }]);
    setNewItem({ name: "", quantity: 1, status: "available" });
  };
  const remove = (i: number) => onChange(list.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input placeholder="Equipment name" value={newItem.name}
          onChange={e => setNewItem({ ...newItem, name: e.target.value })}
          className="h-8 text-sm flex-1" />
        <Input type="number" min={1} value={newItem.quantity}
          onChange={e => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
          className="h-8 text-sm w-20" />
        <Button size="sm" onClick={add} className="h-8 px-3">Add</Button>
      </div>
      {list.length > 0 && (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {list.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-secondary/30 text-sm">
              <span className="font-medium">{item.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">×{item.quantity}</span>
                <button onClick={() => remove(i)} className="text-destructive hover:text-destructive/80">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Pagination({ page, total, pageSize, onChange }: any) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/30">
      <p className="text-xs text-muted-foreground order-2 sm:order-1">
        Showing {Math.min(total, (page - 1) * pageSize + 1)}–{Math.min(total, page * pageSize)} of {total}
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

// ── Event Form ────────────────────────────────────────────────────────────────
function EventForm({ form, setForm, sites, clients }: any) {
  return (
    <div className="space-y-5">
      {/* Basic Info */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Basic Information</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Event Title *</Label>
            <Input placeholder="e.g. National Music Festival Security" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Event Type</Label>
            <Select value={form.event_type} onValueChange={v => setForm({ ...form, event_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{capitalize(t)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map(p => <SelectItem key={p} value={p}>{capitalize(p)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{capitalize(s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Risk Level</Label>
            <Select value={form.risk_level} onValueChange={v => setForm({ ...form, risk_level: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RISK_LEVELS.map(r => <SelectItem key={r} value={r}>{capitalize(r)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Start Date & Time *</Label>
            <Input type="datetime-local" value={form.start_date}
              onChange={e => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>End Date & Time *</Label>
            <Input type="datetime-local" value={form.end_date}
              onChange={e => setForm({ ...form, end_date: e.target.value })} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Description</Label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-border bg-secondary text-sm resize-none h-20"
              placeholder="Describe the event..." value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Location */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Location</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Venue Name</Label>
            <Input placeholder="e.g. Kasarani Stadium" value={form.venue_name}
              onChange={e => setForm({ ...form, venue_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Client</Label>
            <Select value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Client</SelectItem>
                {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Address</Label>
            <Input placeholder="Full address" value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Coordinates</Label>
            <Input placeholder="-1.2921, 36.8219" value={form.coordinates}
              onChange={e => setForm({ ...form, coordinates: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Linked Site</Label>
            <Select value={form.site_id} onValueChange={v => setForm({ ...form, site_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Site</SelectItem>
                {sites.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Attendance */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Population & Attendance</p>
        <div className="grid grid-cols-3 gap-3">
          <NumField label="Expected Attendance" field="expected_attendance" form={form} setForm={setForm} />
          <NumField label="Actual Attendance" field="actual_attendance" form={form} setForm={setForm} />
          <NumField label="Max Capacity" field="max_capacity" form={form} setForm={setForm} />
        </div>
      </div>

      {/* Emergency Services */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Emergency Services</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <NumField label="🚑 Ambulances Required" field="ambulances_required" form={form} setForm={setForm} />
          <NumField label="🚑 Ambulances Deployed" field="ambulances_deployed" form={form} setForm={setForm} />
          <NumField label="🚒 Fire Engines Required" field="fire_engines_required" form={form} setForm={setForm} />
          <NumField label="🚒 Fire Engines Deployed" field="fire_engines_deployed" form={form} setForm={setForm} />
          <NumField label="👮 Police Officers" field="police_officers" form={form} setForm={setForm} />
          <NumField label="🚔 Police Units" field="police_units" form={form} setForm={setForm} />
        </div>
      </div>

      {/* Security */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Security Personnel</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <NumField label="Security Guards" field="security_guards" form={form} setForm={setForm} />
          <NumField label="Supervisors" field="supervisors" form={form} setForm={setForm} />
          <NumField label="Vehicles Deployed" field="vehicles_deployed" form={form} setForm={setForm} />
          <NumField label="Comms Devices" field="communication_devices" form={form} setForm={setForm} />
        </div>
      </div>

      {/* Logistics */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Logistics</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NumField label="First Aid Stations" field="first_aid_stations" form={form} setForm={setForm} />
          <div className="space-y-1.5">
            <Label className="text-xs">Permits</Label>
            <div className="flex gap-3 pt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.permits_required}
                  onChange={e => setForm({ ...form, permits_required: e.target.checked })}
                  className="rounded" />
                Required
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.permits_obtained}
                  onChange={e => setForm({ ...form, permits_obtained: e.target.checked })}
                  className="rounded" />
                Obtained
              </label>
            </div>
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Evacuation Routes</Label>
            <Input placeholder="e.g. Gate A → Moi Avenue, Gate B → Uhuru Highway" value={form.evacuation_routes}
              onChange={e => setForm({ ...form, evacuation_routes: e.target.value })} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Briefing Notes</Label>
            <textarea className="w-full px-3 py-2 rounded-lg border border-border bg-secondary text-sm resize-none h-16"
              placeholder="Pre-event briefing notes..." value={form.briefing_notes}
              onChange={e => setForm({ ...form, briefing_notes: e.target.value })} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Logistics Notes</Label>
            <textarea className="w-full px-3 py-2 rounded-lg border border-border bg-secondary text-sm resize-none h-16"
              placeholder="Equipment transport, staging areas..." value={form.logistics_notes}
              onChange={e => setForm({ ...form, logistics_notes: e.target.value })} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Risk Notes</Label>
            <textarea className="w-full px-3 py-2 rounded-lg border border-border bg-secondary text-sm resize-none h-16"
              placeholder="Known risks and mitigations..." value={form.risk_notes}
              onChange={e => setForm({ ...form, risk_notes: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Equipment */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Equipment List</p>
        <EquipmentEditor
          list={form.equipment_list}
          onChange={(l: EquipmentItem[]) => setForm({ ...form, equipment_list: l })}
        />
      </div>

      {/* Media URLs */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Media (URLs — photos & videos)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5"><ImageIcon className="w-3 h-3" /> Add Image URL</Label>
            <div className="flex gap-2">
              <Input id="img-url" placeholder="https://..." className="h-8 text-sm" />
              <Button size="sm" className="h-8 px-3" onClick={() => {
                const el = document.getElementById("img-url") as HTMLInputElement;
                if (!el.value.trim()) return;
                setForm({ ...form, images: [...form.images, { url: el.value, name: el.value.split("/").pop() || "image", type: "image", uploadedAt: new Date().toISOString() }] });
                el.value = "";
              }}>Add</Button>
            </div>
            {form.images.length > 0 && (
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {form.images.map((img: MediaFile, i: number) => (
                  <div key={i} className="flex items-center justify-between px-2 py-1 rounded bg-secondary/30 text-xs">
                    <span className="truncate flex-1">{img.name}</span>
                    <button onClick={() => setForm({ ...form, images: form.images.filter((_: any, idx: number) => idx !== i) })}
                      className="text-destructive ml-2"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5"><Video className="w-3 h-3" /> Add Video URL</Label>
            <div className="flex gap-2">
              <Input id="vid-url" placeholder="https://..." className="h-8 text-sm" />
              <Button size="sm" className="h-8 px-3" onClick={() => {
                const el = document.getElementById("vid-url") as HTMLInputElement;
                if (!el.value.trim()) return;
                setForm({ ...form, videos: [...form.videos, { url: el.value, name: el.value.split("/").pop() || "video", type: "video", uploadedAt: new Date().toISOString() }] });
                el.value = "";
              }}>Add</Button>
            </div>
            {form.videos.length > 0 && (
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {form.videos.map((vid: MediaFile, i: number) => (
                  <div key={i} className="flex items-center justify-between px-2 py-1 rounded bg-secondary/30 text-xs">
                    <span className="truncate flex-1">{vid.name}</span>
                    <button onClick={() => setForm({ ...form, videos: form.videos.filter((_: any, idx: number) => idx !== i) })}
                      className="text-destructive ml-2"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── View Modal ────────────────────────────────────────────────────────────────
function ViewEventModal({ event, onClose, onEdit }: { event: EventRecord; onClose: () => void; onEdit: () => void }) {
  const sc = statusConfig[event.status] ?? statusConfig.planned;
  const pc = priorityConfig[event.priority] ?? priorityConfig.medium;
  const TypeIcon = typeIcons[event.event_type] ?? CalendarDays;

  const section = (title: string, icon: any, children: React.ReactNode) => (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon && <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
          {(() => { const I = icon; return <I className="w-3.5 h-3.5 text-primary" />; })()}
        </div>}
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
      </div>
      {children}
    </div>
  );

  const field = (label: string, value: any) => value ? (
    <div>
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <p className="text-sm mt-0.5">{value}</p>
    </div>
  ) : null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <TypeIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg leading-tight">{event.title}</DialogTitle>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full", sc.bg, sc.color)}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", sc.dot)} />{sc.label}
                </span>
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", pc.bg, pc.color)}>{pc.label} Priority</span>
                <Badge variant="outline" className="text-xs">{capitalize(event.event_type)}</Badge>
                <Badge variant="outline" className="text-xs">Risk: {capitalize(event.risk_level)}</Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Dates */}
          {section("Schedule", CalendarDays,
            <div className="grid grid-cols-2 gap-3">
              {field("Start", fmtDT(event.start_date))}
              {field("End", fmtDT(event.end_date))}
            </div>
          )}

          {/* Location */}
          {section("Location", MapPin,
            <div className="grid grid-cols-2 gap-3">
              {field("Venue", event.venue_name)}
              {field("Client", event.client_name)}
              {field("Address", event.address)}
              {field("Coordinates", event.coordinates)}
              {field("Site", event.site_name)}
            </div>
          )}

          {event.description && section("Description", FileText,
            <p className="text-sm text-muted-foreground p-3 rounded-lg bg-secondary/30">{event.description}</p>
          )}

          {/* Attendance */}
          {section("Population & Attendance", Users,
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-secondary/30 text-center">
                <p className="text-2xl font-bold text-foreground">{event.expected_attendance.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Expected</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30 text-center">
                <p className="text-2xl font-bold text-primary">{event.actual_attendance.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Actual</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30 text-center">
                <p className="text-2xl font-bold text-foreground">{event.max_capacity.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Capacity</p>
              </div>
            </div>
          )}

          {/* Emergency Services */}
          {section("Emergency Services", AlertTriangle,
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { icon: "🚑", label: "Ambulances", dep: event.ambulances_deployed, req: event.ambulances_required },
                { icon: "🚒", label: "Fire Engines", dep: event.fire_engines_deployed, req: event.fire_engines_required },
                { icon: "👮", label: "Police Officers", dep: event.police_officers, req: null },
                { icon: "🚔", label: "Police Units", dep: event.police_units, req: null },
                { icon: "🛡️", label: "Security Guards", dep: event.security_guards, req: null },
                { icon: "👔", label: "Supervisors", dep: event.supervisors, req: null },
              ].map(({ icon, label, dep, req }) => (
                <div key={label} className="p-2.5 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground">{icon} {label}</p>
                  <p className="font-bold text-foreground mt-0.5">
                    {dep}{req !== null ? ` / ${req}` : ""}
                    {req !== null && <span className="text-xs font-normal text-muted-foreground ml-1">dep/req</span>}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Logistics */}
          {section("Logistics", Car,
            <div className="grid grid-cols-2 gap-3">
              {field("Vehicles Deployed", event.vehicles_deployed)}
              {field("Comms Devices", event.communication_devices)}
              {field("First Aid Stations", event.first_aid_stations)}
              {field("Permits", event.permits_required
                ? (event.permits_obtained ? "Required & Obtained ✅" : "Required — NOT Obtained ⚠️")
                : "Not Required")}
              {field("Evacuation Routes", event.evacuation_routes)}
            </div>
          )}

          {event.briefing_notes && section("Briefing Notes", FileText,
            <p className="text-sm p-3 rounded-lg bg-secondary/30">{event.briefing_notes}</p>
          )}

          {event.logistics_notes && section("Logistics Notes", Package,
            <p className="text-sm p-3 rounded-lg bg-secondary/30">{event.logistics_notes}</p>
          )}

          {event.risk_notes && section("Risk Notes", AlertTriangle,
            <p className="text-sm p-3 rounded-lg bg-destructive/5 border border-destructive/20">{event.risk_notes}</p>
          )}

          {/* Equipment */}
          {event.equipment_list?.length > 0 && section("Equipment",  Package,
            <div className="space-y-1">
              {event.equipment_list.map((eq, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/30 text-sm">
                  <span className="font-medium">{eq.name}</span>
                  <span className="text-muted-foreground text-xs">×{eq.quantity}</span>
                </div>
              ))}
            </div>
          )}

          {/* Media */}
          {(event.images?.length > 0 || event.videos?.length > 0) && section("Media", Camera,
            <div className="space-y-2">
              {event.images?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Images ({event.images.length})</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {event.images.map((img, i) => (
                      <a key={i} href={img.url} target="_blank" rel="noreferrer"
                        className="block rounded-lg overflow-hidden border border-border/50 hover:border-primary/50 transition-colors">
                        <img src={img.url} alt={img.name} className="w-full h-24 object-cover"
                          onError={e => { (e.target as HTMLImageElement).src = ""; }} />
                        <p className="text-xs text-muted-foreground px-2 py-1 truncate">{img.name}</p>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {event.videos?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><Video className="w-3 h-3" /> Videos ({event.videos.length})</p>
                  <div className="space-y-1">
                    {event.videos.map((vid, i) => (
                      <a key={i} href={vid.url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors text-sm text-primary">
                        <Video className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{vid.name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-1 border-t border-border/30">
            <p className="text-xs text-muted-foreground">
              Created by {event.created_by_name || "—"} on {fmt(event.created_at)}
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Close</Button>
          <Button onClick={onEdit} className="w-full sm:w-auto"><Edit className="w-4 h-4 mr-2" />Edit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export const EventsPage = () => {
  const [events, setEvents]     = useState<EventRecord[]>([]);
  const [stats, setStats]       = useState<Stats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [activeTab, setActiveTab] = useState("all");

  // filters
  const [search, setSearch]       = useState("");
  const [filterStatus, setFilterStatus]   = useState("all");
  const [filterType, setFilterType]       = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  // modals
  const [isAddOpen, setIsAddOpen]   = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [viewEvent, setViewEvent]   = useState<EventRecord | null>(null);
  const [editEvent, setEditEvent]   = useState<EventRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventRecord | null>(null);

  // forms
  const [form, setForm]     = useState<any>({ ...EMPTY_FORM });
  const [editForm, setEditForm] = useState<any>({});

  // options
  const [sites, setSites]     = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterStatus !== "all")   params.status     = filterStatus;
      if (filterType !== "all")     params.event_type = filterType;
      if (filterPriority !== "all") params.priority   = filterPriority;
      if (search)                   params.search     = search;
      const res = await api.get("/events", { params });
      setEvents(res.data.data.events);
      setPage(1);
    } catch (e) { console.error("Fetch events:", e); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/events/stats");
      setStats(res.data.data);
    } catch (e) { console.error("Fetch stats:", e); }
  };

  const fetchOptions = async () => {
    try {
      const [s, c] = await Promise.all([
        api.get("/sites",   { params: { limit: 200 } }),
        api.get("/clients", { params: { limit: 200 } }),
      ]);
      setSites(s.data.data.sites   || []);
      setClients(c.data.data.clients || []);
    } catch (e) { console.error("Fetch options:", e); }
  };

  useEffect(() => { fetchEvents(); }, [filterStatus, filterType, filterPriority, search]);
  useEffect(() => { fetchStats(); fetchOptions(); }, []);

  // ── tab filter ─────────────────────────────────────────────────────────────
  const displayed = activeTab === "all"
    ? events
    : events.filter(e => e.status === activeTab);

  const paged = displayed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── actions ────────────────────────────────────────────────────────────────
  const normalizeForm = (f: any) => ({
    ...f,
    site_id:   f.site_id   === "none" ? null : f.site_id,
    client_id: f.client_id === "none" ? null : f.client_id,
  });

  const handleCreate = async () => {
    if (!form.title || !form.start_date || !form.end_date)
      return alert("Title, start date, and end date are required.");
    try {
      await api.post("/events", normalizeForm(form));
      setIsAddOpen(false); setForm({ ...EMPTY_FORM });
      fetchEvents(); fetchStats();
    } catch (e: any) { alert(e.response?.data?.message || "Failed to create event"); }
  };

  const openEdit = (ev: EventRecord) => {
    setEditEvent(ev);
    setEditForm({
      ...ev,
      start_date: ev.start_date.slice(0, 16),
      end_date:   ev.end_date.slice(0, 16),
      site_id:    ev.site_id   || "none",
      client_id:  ev.client_id || "none",
      equipment_list: ev.equipment_list || [],
      images:         ev.images         || [],
      videos:         ev.videos         || [],
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editEvent) return;
    try {
      await api.put(`/events/${editEvent.id}`, normalizeForm(editForm));
      setIsEditOpen(false); fetchEvents(); fetchStats();
    } catch (e: any) { alert(e.response?.data?.message || "Failed to update event"); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/events/${id}`);
      fetchEvents(); fetchStats();
    } catch (e: any) { alert(e.response?.data?.message || "Failed to delete event"); }
    finally { setDeleteTarget(null); }
  };

  // ── render ─────────────────────────────────────────────────────────────────
  const s = stats;

  return (
    <div className="min-h-screen bg-background px-3 py-4 sm:px-6 sm:py-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
              <CalendarDays className="w-5 h-5 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
              <span className="truncate">Events Management</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              Security operations, logistics & emergency deployment
            </p>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <Button variant="outline" size="icon" onClick={() => { fetchEvents(); fetchStats(); }}>
              <RefreshCw className="w-4 h-4" />
            </Button>

            {/* Add Event Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-4">
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">New Event</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl">
                <DialogHeader>
                  <DialogTitle>Create New Event</DialogTitle>
                  <DialogDescription>Register a security operation or managed event</DialogDescription>
                </DialogHeader>
                <EventForm form={form} setForm={setForm} sites={sites} clients={clients} />
                <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsAddOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                  <Button onClick={handleCreate} className="w-full sm:w-auto">Create Event</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          <StatCard label="Total Events"   value={s?.total ?? 0}     icon={CalendarDays}   color="text-foreground"  bg="bg-primary/10" />
          <StatCard label="Active"         value={s?.active ?? 0}    icon={Activity}       color="text-success"     bg="bg-success/10" />
          <StatCard label="Planned"        value={s?.planned ?? 0}   icon={Clock}          color="text-primary"     bg="bg-primary/10" />
          <StatCard label="Critical"       value={s?.critical ?? 0}  icon={AlertTriangle}  color="text-destructive" bg="bg-destructive/10" />
          <StatCard label="Ambulances"     value={s?.total_ambulances ?? 0}    icon={Ambulance}  color="text-warning"  bg="bg-warning/10" />
          <StatCard label="Police"         value={s?.total_police ?? 0}        icon={Shield}     color="text-primary"  bg="bg-primary/10" />
        </div>

        {/* Attendance overview */}
        {s && (s.total_expected > 0 || s.total_actual > 0) && (
          <div className="glass-card rounded-xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Aggregate Attendance</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Expected Total", value: Number(s.total_expected).toLocaleString(), color: "text-foreground" },
                { label: "Actual Total",   value: Number(s.total_actual).toLocaleString(),   color: "text-primary" },
                { label: "Fire Engines",   value: Number(s.total_fire_engines).toLocaleString(), color: "text-warning" },
                { label: "Security Guards",value: Number(s.total_guards).toLocaleString(),   color: "text-success" },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-3 rounded-lg bg-secondary/30 text-center">
                  <p className={cn("text-xl font-bold", color)}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="glass-card rounded-xl p-3 sm:p-5 border border-border/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search events..." className="pl-10" value={search}
                onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{capitalize(t)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{capitalize(s)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger><SelectValue placeholder="All Priorities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {PRIORITIES.map(p => <SelectItem key={p} value={p}>{capitalize(p)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs + Table */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }}>
          <div className="overflow-x-auto pb-1">
            <TabsList className="inline-flex w-max min-w-full sm:grid sm:w-full sm:grid-cols-6">
              <TabsTrigger value="all"       className="text-xs sm:text-sm">All</TabsTrigger>
              <TabsTrigger value="planned"   className="text-xs sm:text-sm">Planned</TabsTrigger>
              <TabsTrigger value="active"    className="text-xs sm:text-sm">Active</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs sm:text-sm">Completed</TabsTrigger>
              <TabsTrigger value="postponed" className="text-xs sm:text-sm">Postponed</TabsTrigger>
              <TabsTrigger value="cancelled" className="text-xs sm:text-sm">Cancelled</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="mt-4">
            {loading ? (
              <div className="text-center py-16">
                <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-muted-foreground text-sm">Loading events...</p>
              </div>
            ) : displayed.length === 0 ? (
              <div className="text-center py-16">
                <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-sm">No events found</p>
              </div>
            ) : (
              <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[800px]">
                    <thead className="bg-secondary/30 border-b border-border/50">
                      <tr>
                        {["Event","Type / Priority","Dates","Venue","Attendance","Services","Actions"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {paged.map(ev => {
                        const sc = statusConfig[ev.status] ?? statusConfig.planned;
                        const pc = priorityConfig[ev.priority] ?? priorityConfig.medium;
                        const TypeIcon = typeIcons[ev.event_type] ?? CalendarDays;
                        return (
                          <tr key={ev.id} className="hover:bg-secondary/20 transition-colors">
                            {/* Event */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                                  <TypeIcon className="w-4 h-4 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground truncate max-w-[160px]">{ev.title}</p>
                                  <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full", sc.bg, sc.color)}>
                                    <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", sc.dot)} />{sc.label}
                                  </span>
                                </div>
                              </div>
                            </td>
                            {/* Type + Priority */}
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="text-xs mb-1 block w-fit">{capitalize(ev.event_type)}</Badge>
                              <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded-full", pc.bg, pc.color)}>{pc.label}</span>
                            </td>
                            {/* Dates */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <p className="text-xs font-medium text-foreground">{fmt(ev.start_date)}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">→ {fmt(ev.end_date)}</p>
                            </td>
                            {/* Venue */}
                            <td className="px-4 py-3">
                              {ev.venue_name && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground max-w-[120px]">
                                  <MapPin className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{ev.venue_name}</span>
                                </div>
                              )}
                              {ev.client_name && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[120px]">{ev.client_name}</p>}
                            </td>
                            {/* Attendance */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <p className="text-sm font-semibold text-foreground">{ev.actual_attendance.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">/ {ev.expected_attendance.toLocaleString()} exp.</p>
                            </td>
                            {/* Services */}
                            <td className="px-4 py-3">
                              <div className="flex gap-2 text-xs text-muted-foreground">
                                {ev.ambulances_deployed > 0 && <span title="Ambulances">🚑 {ev.ambulances_deployed}</span>}
                                {ev.fire_engines_deployed > 0 && <span title="Fire Engines">🚒 {ev.fire_engines_deployed}</span>}
                                {ev.police_officers > 0 && <span title="Police">👮 {ev.police_officers}</span>}
                                {ev.security_guards > 0 && <span title="Guards">🛡️ {ev.security_guards}</span>}
                              </div>
                            </td>
                            {/* Actions */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-0.5">
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => setViewEvent(ev)} title="View">
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => openEdit(ev)} title="Edit">
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeleteTarget(ev)} title="Delete">
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
                {displayed.length > PAGE_SIZE && (
                  <Pagination page={page} total={displayed.length} pageSize={PAGE_SIZE} onChange={setPage} />
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* View Modal */}
        {viewEvent && (
          <ViewEventModal
            event={viewEvent}
            onClose={() => setViewEvent(null)}
            onEdit={() => { setViewEvent(null); openEdit(viewEvent); }}
          />
        )}

        {/* Edit Modal */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl">
            <DialogHeader>
              <DialogTitle>Edit Event</DialogTitle>
              <DialogDescription>{editEvent?.title}</DialogDescription>
            </DialogHeader>
            <EventForm form={editForm} setForm={setEditForm} sites={sites} clients={clients} />
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditOpen(false)} className="w-full sm:w-auto">Cancel</Button>
              <Button onClick={handleUpdate} className="w-full sm:w-auto">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
            <div className="relative z-10 w-full max-w-sm rounded-xl bg-background border border-border shadow-xl p-6 flex flex-col gap-4">
              <h2 className="text-base font-semibold">Delete Event</h2>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete <strong>{deleteTarget.title}</strong>? This action cannot be undone.
              </p>
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                <Button variant="destructive" onClick={() => handleDelete(deleteTarget.id)}>Delete</Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default EventsPage;
