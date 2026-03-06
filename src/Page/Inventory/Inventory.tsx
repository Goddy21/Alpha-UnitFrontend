import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Package, Plus, Search, Filter, Edit, Trash2, Eye,
  AlertTriangle, CheckCircle, User, MapPin, Wrench,
  Shield, Car, Radio, Camera, Download, TrendingUp,
  TrendingDown, RefreshCw, X, ChevronLeft, ChevronRight,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";

// ── types ────────────────────────────────────────────────────────────────────
interface InventoryItem {
  id: string; itemCode: string; name: string;
  category: "Uniform" | "Equipment" | "Vehicle" | "Firearm" | "Communication" | "Technology";
  serialNumber: string | null; quantity: number;
  status: "available" | "assigned" | "maintenance" | "retired";
  condition: "new" | "good" | "fair" | "poor";
  assignedTo: string | null; assignedToId: string | null;
  location: string; purchaseDate: string | null;
  purchasePrice: number; currentValue: number;
  lastMaintenance: string | null; nextMaintenance: string | null;
  warrantyExpiry: string | null; supplier: string; notes: string | null;
}

interface Stats {
  totalItems: number; totalValue: number; totalDepreciation: number;
  available: number; assigned: number; maintenance: number; retired: number;
  byCategory: Record<string, number>;
}

interface PersonnelOption { id: string; name: string; }

// ── configs ───────────────────────────────────────────────────────────────────
const statusConfig = {
  available:   { color: "text-success",         bg: "bg-success/10",     dot: "bg-success",         label: "Available" },
  assigned:    { color: "text-primary",          bg: "bg-primary/10",     dot: "bg-primary",         label: "Assigned" },
  maintenance: { color: "text-warning",          bg: "bg-warning/10",     dot: "bg-warning",         label: "Maintenance" },
  retired:     { color: "text-muted-foreground", bg: "bg-muted",          dot: "bg-muted-foreground",label: "Retired" },
};
const conditionConfig = {
  new:  { color: "text-success",     bg: "bg-success/10",     label: "New" },
  good: { color: "text-primary",     bg: "bg-primary/10",     label: "Good" },
  fair: { color: "text-warning",     bg: "bg-warning/10",     label: "Fair" },
  poor: { color: "text-destructive", bg: "bg-destructive/10", label: "Poor" },
};
const categoryIcons = {
  Uniform: Shield, Equipment: Package, Vehicle: Car,
  Firearm: AlertTriangle, Communication: Radio, Technology: Camera,
};

const EMPTY_FORM = {
  name: "", category: "Equipment", serialNumber: "", quantity: 1,
  location: "", purchaseDate: "", purchasePrice: 0, supplier: "",
  condition: "new", status: "available", notes: "",
};

const CATEGORIES = ["Uniform","Equipment","Vehicle","Firearm","Communication","Technology"] as const;
const PAGE_SIZE = 10;

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ open, title, description, onConfirm, onCancel }: {
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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/30">
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
export const EquipmentPage = () => {
  const [inventory, setInventory]     = useState<InventoryItem[]>([]);
  const [stats, setStats]             = useState<Stats | null>(null);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState("all");
  const [searchTerm, setSearchTerm]   = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus]     = useState("all");
  const [personnelOptions, setPersonnelOptions] = useState<PersonnelOption[]>([]);
  const [page, setPage]               = useState(1);

  // modals
  const [isAddOpen, setIsAddOpen]     = useState(false);
  const [isEditOpen, setIsEditOpen]   = useState(false);
  const [isViewOpen, setIsViewOpen]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [selectedItem, setSelectedItem]   = useState<InventoryItem | null>(null);
  const [editingItem, setEditingItem]     = useState<InventoryItem | null>(null);
  const [form, setForm]               = useState<any>({ ...EMPTY_FORM });
  const [editForm, setEditForm]       = useState<any>({});

  // ── fetch ─────────────────────────────────────────────────────────────────
  const fetchInventory = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filterStatus !== "all")   params.status   = filterStatus;
      if (filterCategory !== "all") params.category = filterCategory;
      if (searchTerm)               params.search   = searchTerm;
      const res = await api.get("/inventory", { params });
      setInventory(res.data.data.inventory);
      setPage(1);
    } catch (e) { console.error("Error fetching inventory:", e); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/inventory/stats");
      setStats(res.data.data);
    } catch (e) { console.error("Error fetching stats:", e); }
  };

  const fetchPersonnel = async () => {
    try {
      const res = await api.get("/personnel", { params: { status: "active", limit: 200 } });
      setPersonnelOptions(res.data.data.personnel || []);
    } catch (e) { console.error("Error fetching personnel:", e); }
  };

  useEffect(() => { fetchInventory(); }, [filterStatus, filterCategory, searchTerm]);
  useEffect(() => { fetchStats(); fetchPersonnel(); }, []);

  // ── tab filter ────────────────────────────────────────────────────────────
  const displayed = activeTab === "all"
    ? inventory
    : inventory.filter(i => i.category === activeTab);

  const paged = displayed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // reset page when tab changes
  const handleTabChange = (val: string) => { setActiveTab(val); setPage(1); };

  // ── actions ───────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.name || !form.category) return alert("Name and category are required.");
    try {
      await api.post("/inventory", form);
      setIsAddOpen(false); setForm({ ...EMPTY_FORM });
      fetchInventory(); fetchStats();
    } catch (e: any) { alert(e.response?.data?.message || "Failed to add item"); }
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setEditForm({
      name: item.name, category: item.category, serialNumber: item.serialNumber || "",
      quantity: item.quantity, status: item.status, condition: item.condition,
      assignedToId: item.assignedToId || "unassigned", location: item.location,
      purchaseDate: item.purchaseDate || "", purchasePrice: item.purchasePrice,
      currentValue: item.currentValue, lastMaintenance: item.lastMaintenance || "",
      nextMaintenance: item.nextMaintenance || "", warrantyExpiry: item.warrantyExpiry || "",
      supplier: item.supplier, notes: item.notes || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    try {
      const payload = {
        ...editForm,
        assignedToId: editForm.assignedToId === "unassigned" ? null : editForm.assignedToId,
      };
      await api.put(`/inventory/${editingItem.id}`, payload);
      setIsEditOpen(false); fetchInventory(); fetchStats();
    } catch (e: any) { alert(e.response?.data?.message || "Failed to update item"); }
  };

  const handleDelete = async (id: string) => {
    try { await api.delete(`/inventory/${id}`); fetchInventory(); fetchStats(); }
    catch (e: any) { alert(e.response?.data?.message || "Failed to delete item"); }
    finally { setDeleteTarget(null); }
  };

  // ── derived stats ─────────────────────────────────────────────────────────
  const disp = stats ?? {
    totalItems: inventory.reduce((s, i) => s + i.quantity, 0),
    totalValue: inventory.reduce((s, i) => s + i.currentValue * i.quantity, 0),
    totalDepreciation: inventory.reduce((s, i) => s + (i.purchasePrice - i.currentValue) * i.quantity, 0),
    assigned: inventory.filter(i => i.status === "assigned").length,
    maintenance: inventory.filter(i => i.status === "maintenance").length,
    byCategory: {} as Record<string, number>,
  };

  const categoryStats: Record<string, number> = stats?.byCategory ?? {};

  return (
    <div className="min-h-screen bg-background px-3 py-4 sm:px-6 sm:py-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
              <Package className="w-5 h-5 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
              <span className="truncate">Equipment & Inventory</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              Track assets, equipment, vehicles, and maintenance
            </p>
          </div>
          <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
            <Button variant="outline" size="icon" title="Refresh"
              onClick={() => { fetchInventory(); fetchStats(); }}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" title="Export Report">
              <Download className="w-4 h-4" />
            </Button>

            {/* Add Item Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-4">
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Add Item</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl rounded-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Inventory Item</DialogTitle>
                  <DialogDescription>Register new equipment, asset, or supply</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Item Name *</Label>
                      <Input placeholder="e.g. Security Uniform" value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Category *</Label>
                      <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Serial Number</Label>
                      <Input placeholder="e.g. SN-2024-001" value={form.serialNumber}
                        onChange={e => setForm({ ...form, serialNumber: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input type="number" min={1} value={form.quantity}
                        onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Condition</Label>
                      <Select value={form.condition} onValueChange={v => setForm({ ...form, condition: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["new","good","fair","poor"].map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["available","assigned","maintenance","retired"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input placeholder="e.g. Main Warehouse" value={form.location}
                        onChange={e => setForm({ ...form, location: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Supplier</Label>
                      <Input placeholder="e.g. Equipment Co." value={form.supplier}
                        onChange={e => setForm({ ...form, supplier: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Purchase Date</Label>
                      <Input type="date" value={form.purchaseDate}
                        onChange={e => setForm({ ...form, purchaseDate: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Purchase Price (KES)</Label>
                      <Input type="number" min={0} value={form.purchasePrice}
                        onChange={e => setForm({ ...form, purchasePrice: parseFloat(e.target.value) })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input placeholder="Additional details..." value={form.notes}
                      onChange={e => setForm({ ...form, notes: e.target.value })} />
                  </div>
                </div>
                <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => setIsAddOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                  <Button onClick={handleCreate} className="w-full sm:w-auto">Add to Inventory</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats — 2 col mobile, 5 col md+ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4">
          {[
            { label: "Total Items",    value: disp.totalItems,                  color: "text-foreground",  bg: "bg-primary/10",     icon: Package,     format: (v: number) => v },
            { label: "Total Value",    value: disp.totalValue / 1_000_000,      color: "text-success",     bg: "bg-success/10",     icon: TrendingUp,  format: (v: number) => `KES ${v.toFixed(1)}M` },
            { label: "Assigned",       value: disp.assigned,                    color: "text-primary",     bg: "bg-primary/10",     icon: User,        format: (v: number) => v },
            { label: "In Maintenance", value: disp.maintenance,                 color: "text-warning",     bg: "bg-warning/10",     icon: Wrench,      format: (v: number) => v },
            { label: "Depreciation",   value: disp.totalDepreciation / 1000,    color: "text-destructive", bg: "bg-destructive/10", icon: TrendingDown,format: (v: number) => `-${v.toFixed(0)}K` },
          ].map(({ label, value, color, bg, icon: Icon, format }) => (
            <div key={label} className="glass-card rounded-xl p-3 sm:p-5 border border-border/50">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{label}</p>
                  <p className={cn("text-lg sm:text-2xl font-bold mt-0.5 truncate", color)}>{format(value)}</p>
                </div>
                <div className={cn("w-9 h-9 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0", bg)}>
                  <Icon className={cn("w-4 h-4 sm:w-6 sm:h-6", color)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Category Overview */}
        <div className="glass-card rounded-xl p-4 sm:p-6 border border-border/50">
          <h3 className="font-semibold text-foreground mb-3 sm:mb-4 text-sm sm:text-base">Inventory by Category</h3>
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-4">
            {CATEGORIES.map(cat => {
              const Icon = categoryIcons[cat];
              return (
                <div key={cat} className="p-2.5 sm:p-4 rounded-lg bg-secondary/30 border border-border/50">
                  <div className="flex items-center gap-1.5 sm:gap-3 mb-1.5 sm:mb-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                    </div>
                    <p className="text-xs sm:text-sm font-medium truncate">{cat === "Communication" ? "Comms" : cat === "Technology" ? "Tech" : cat}</p>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{categoryStats[cat] ?? 0}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card rounded-xl p-3 sm:p-5 border border-border/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search inventory..." className="pl-10" value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger><SelectValue placeholder="Filter by category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue placeholder="Filter by status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {["available","assigned","maintenance","retired"].map(s => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2 w-full">
              <Filter className="w-4 h-4" /> More Filters
            </Button>
          </div>
        </div>

        {/* Tabs + Table */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          {/* Scrollable tab list on mobile */}
          <div className="overflow-x-auto pb-1">
            <TabsList className="inline-flex w-max min-w-full sm:grid sm:w-full sm:grid-cols-7">
              <TabsTrigger value="all" className="text-xs sm:text-sm px-2 sm:px-3">All</TabsTrigger>
              {CATEGORIES.map(c => (
                <TabsTrigger key={c} value={c} className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
                  {c === "Communication" ? "Comms" : c === "Technology" ? "Tech" : c}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="mt-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-muted-foreground text-sm">Loading inventory...</p>
              </div>
            ) : displayed.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-sm">No items found</p>
              </div>
            ) : (
              <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[680px]">
                    <thead className="bg-secondary/30 border-b border-border/50">
                      <tr>
                        {["Item","Serial / Qty","Status","Condition","Location","Value","Actions"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {paged.map(item => {
                        const Icon = categoryIcons[item.category] ?? Package;
                        const sc = statusConfig[item.status] ?? statusConfig.available;
                        const cc = conditionConfig[item.condition] ?? conditionConfig.good;
                        return (
                          <tr key={item.id} className="hover:bg-secondary/20 transition-colors">
                            {/* Item */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                                  <Icon className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground truncate max-w-[140px]">{item.name}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{item.itemCode}</p>
                                  <Badge variant="outline" className="text-xs mt-0.5">{item.category}</Badge>
                                </div>
                              </div>
                            </td>
                            {/* Serial / Qty */}
                            <td className="px-4 py-3">
                              {item.serialNumber
                                ? <p className="font-mono text-xs text-foreground">{item.serialNumber}</p>
                                : <p className="text-sm text-foreground">Qty: {item.quantity}</p>
                              }
                            </td>
                            {/* Status */}
                            <td className="px-4 py-3">
                              <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap", sc.bg, sc.color)}>
                                <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", sc.dot)} />
                                {sc.label}
                              </span>
                              {item.assignedTo && (
                                <p className="text-xs text-muted-foreground mt-1 truncate max-w-[100px]">→ {item.assignedTo}</p>
                              )}
                            </td>
                            {/* Condition */}
                            <td className="px-4 py-3">
                              <span className={cn("text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap", cc.bg, cc.color)}>
                                {cc.label}
                              </span>
                            </td>
                            {/* Location */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground max-w-[120px]">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{item.location}</span>
                              </div>
                            </td>
                            {/* Value */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <p className="text-sm font-semibold text-foreground">KES {item.currentValue.toLocaleString()}</p>
                              {item.purchasePrice !== item.currentValue && (
                                <p className="text-xs text-muted-foreground">Was: {item.purchasePrice.toLocaleString()}</p>
                              )}
                            </td>
                            {/* Actions */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-0.5">
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => { setSelectedItem(item); setIsViewOpen(true); }} title="View">
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => handleOpenEdit(item)} title="Edit">
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeleteTarget(item)} title="Delete">
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
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl">
            <DialogHeader>
              <DialogTitle>Item Details</DialogTitle>
              <DialogDescription>{selectedItem?.name}</DialogDescription>
            </DialogHeader>
            {selectedItem && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {([
                    ["Item Code",        selectedItem.itemCode],
                    ["Category",         selectedItem.category],
                    ["Name",             selectedItem.name],
                    ["Serial Number",    selectedItem.serialNumber || "—"],
                    ["Quantity",         selectedItem.quantity.toString()],
                    ["Status",           selectedItem.status],
                    ["Condition",        selectedItem.condition],
                    ["Location",         selectedItem.location],
                    ["Assigned To",      selectedItem.assignedTo || "—"],
                    ["Purchase Date",    selectedItem.purchaseDate || "—"],
                    ["Supplier",         selectedItem.supplier],
                    ["Purchase Price",   `KES ${selectedItem.purchasePrice.toLocaleString()}`],
                    ["Current Value",    `KES ${selectedItem.currentValue.toLocaleString()}`],
                    ["Last Maintenance", selectedItem.lastMaintenance || "—"],
                    ["Next Maintenance", selectedItem.nextMaintenance || "—"],
                    ["Warranty Expiry",  selectedItem.warrantyExpiry || "—"],
                  ] as [string, string][]).map(([label, val]) => (
                    <div key={label}>
                      <Label className="text-muted-foreground text-xs">{label}</Label>
                      <p className="text-sm mt-1">{val}</p>
                    </div>
                  ))}
                </div>
                {selectedItem.notes && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Notes</Label>
                    <p className="text-sm mt-2 p-3 rounded-lg bg-secondary/30">{selectedItem.notes}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsViewOpen(false)} className="w-full sm:w-auto">Close</Button>
              <Button className="w-full sm:w-auto"
                onClick={() => { setIsViewOpen(false); if (selectedItem) handleOpenEdit(selectedItem); }}>
                <Edit className="w-4 h-4 mr-2" /> Edit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl">
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
              <DialogDescription>{editingItem?.name}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={editForm.category} onValueChange={v => setEditForm({ ...editForm, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["available","assigned","maintenance","retired"].map(s => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select value={editForm.condition} onValueChange={v => setEditForm({ ...editForm, condition: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["new","good","fair","poor"].map(c => (
                        <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Assign To (Personnel)</Label>
                  <Select value={editForm.assignedToId}
                    onValueChange={v => setEditForm({ ...editForm, assignedToId: v })}>
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {personnelOptions.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" min={1} value={editForm.quantity}
                    onChange={e => setEditForm({ ...editForm, quantity: parseInt(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Current Value (KES)</Label>
                  <Input type="number" min={0} value={editForm.currentValue}
                    onChange={e => setEditForm({ ...editForm, currentValue: parseFloat(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={editForm.location}
                    onChange={e => setEditForm({ ...editForm, location: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Last Maintenance</Label>
                  <Input type="date" value={editForm.lastMaintenance}
                    onChange={e => setEditForm({ ...editForm, lastMaintenance: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Next Maintenance</Label>
                  <Input type="date" value={editForm.nextMaintenance}
                    onChange={e => setEditForm({ ...editForm, nextMaintenance: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={editForm.notes}
                  onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
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
          title="Delete Inventory Item"
          description={`Are you sure you want to delete "${deleteTarget?.name}" (${deleteTarget?.itemCode})? This action cannot be undone.`}
          onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />

      </div>
    </div>
  );
};

export default EquipmentPage;