import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Package, Plus, Search, Filter, Edit, Trash2, Eye,
  AlertTriangle, CheckCircle, User, MapPin, Wrench,
  Shield, Car, Radio, Camera, Download, TrendingUp,
  TrendingDown, RefreshCw,
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
  available:   { color: "text-success",         bg: "bg-success/10",     label: "Available" },
  assigned:    { color: "text-primary",          bg: "bg-primary/10",     label: "Assigned" },
  maintenance: { color: "text-warning",          bg: "bg-warning/10",     label: "Maintenance" },
  retired:     { color: "text-muted-foreground", bg: "bg-muted",          label: "Retired" },
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

  // modals
  const [isAddOpen, setIsAddOpen]     = useState(false);
  const [isEditOpen, setIsEditOpen]   = useState(false);
  const [isViewOpen, setIsViewOpen]   = useState(false);
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

  // ── tab filter (client-side on top of server filters) ─────────────────────
  const displayed = activeTab === "all"
    ? inventory
    : inventory.filter(i => i.category === activeTab);

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
      assignedToId: item.assignedToId || "", location: item.location,
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
      await api.put(`/inventory/${editingItem.id}`, editForm);
      setIsEditOpen(false); fetchInventory(); fetchStats();
    } catch (e: any) { alert(e.response?.data?.message || "Failed to update item"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this inventory item?")) return;
    try { await api.delete(`/inventory/${id}`); fetchInventory(); fetchStats(); }
    catch (e: any) { alert(e.response?.data?.message || "Failed to delete item"); }
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Package className="w-8 h-8 text-primary" />
              Equipment & Inventory
            </h1>
            <p className="text-muted-foreground mt-1">Track assets, equipment, vehicles, and maintenance</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2"
              onClick={() => { fetchInventory(); fetchStats(); }}>
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" /> Export Report
            </Button>

            {/* Add Item Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" /> Add Item</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Inventory Item</DialogTitle>
                  <DialogDescription>Register new equipment, asset, or supply</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
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
                          {["Uniform","Equipment","Vehicle","Firearm","Communication","Technology"].map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Condition</Label>
                      <Select value={form.condition} onValueChange={v => setForm({ ...form, condition: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="fair">Fair</SelectItem>
                          <SelectItem value="poor">Poor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="assigned">Assigned</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="retired">Retired</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-2 gap-4">
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
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate}>Add to Inventory</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { label: "Total Items",        value: disp.totalItems,                     color: "text-foreground", bg: "bg-primary/10",     icon: Package,     format: (v: number) => v },
            { label: "Total Value",        value: disp.totalValue / 1_000_000,         color: "text-success",    bg: "bg-success/10",     icon: TrendingUp,  format: (v: number) => `KES ${v.toFixed(1)}M` },
            { label: "Assigned",           value: disp.assigned,                        color: "text-primary",    bg: "bg-primary/10",     icon: User,        format: (v: number) => v },
            { label: "In Maintenance",     value: disp.maintenance,                     color: "text-warning",    bg: "bg-warning/10",     icon: Wrench,      format: (v: number) => v },
            { label: "Depreciation",       value: disp.totalDepreciation / 1000,        color: "text-destructive",bg: "bg-destructive/10", icon: TrendingDown,format: (v: number) => `-${v.toFixed(0)}K` },
          ].map(({ label, value, color, bg, icon: Icon, format }) => (
            <div key={label} className="glass-card rounded-xl p-5 border border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className={cn("text-2xl font-bold mt-1", color)}>{format(value)}</p>
                </div>
                <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", bg)}>
                  <Icon className={cn("w-6 h-6", color)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Category Overview */}
        <div className="glass-card rounded-xl p-6 border border-border/50">
          <h3 className="font-semibold text-foreground mb-4">Inventory by Category</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {(["Uniform","Equipment","Vehicle","Firearm","Communication","Technology"] as const).map(cat => {
              const Icon = categoryIcons[cat];
              return (
                <div key={cat} className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-sm font-medium">{cat}</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{categoryStats[cat] ?? 0}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card rounded-xl p-5 border border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search inventory..." className="pl-10" value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger><SelectValue placeholder="Filter by category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {["Uniform","Equipment","Vehicle","Firearm","Communication","Technology"].map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue placeholder="Filter by status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" /> More Filters
            </Button>
          </div>
        </div>

        {/* Tabs + Table */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="all">All</TabsTrigger>
            {["Uniform","Equipment","Vehicle","Firearm","Communication","Technology"].map(c => (
              <TabsTrigger key={c} value={c}>
                {c === "Communication" ? "Comms" : c === "Technology" ? "Tech" : c}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-muted-foreground">Loading inventory...</p>
              </div>
            ) : displayed.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No items found</p>
              </div>
            ) : (
              <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-secondary/30 border-b border-border/50">
                      <tr>
                        {["Item","Serial/Qty","Status","Condition","Location","Value","Actions"].map(h => (
                          <th key={h} className="px-5 py-4 text-left text-sm font-semibold text-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayed.map(item => {
                        const Icon = categoryIcons[item.category] ?? Package;
                        const sc = statusConfig[item.status] ?? statusConfig.available;
                        const cc = conditionConfig[item.condition] ?? conditionConfig.good;
                        return (
                          <tr key={item.id}
                            className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center">
                                  <Icon className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">{item.name}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{item.itemCode}</p>
                                  <Badge variant="outline" className="text-xs mt-1">{item.category}</Badge>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              {item.serialNumber
                                ? <p className="font-mono text-sm">{item.serialNumber}</p>
                                : <p className="text-sm">Qty: {item.quantity}</p>}
                            </td>
                            <td className="px-5 py-4">
                              <span className={cn("text-xs font-medium px-3 py-1.5 rounded-full", sc.bg, sc.color)}>
                                {sc.label}
                              </span>
                              {item.assignedTo && (
                                <p className="text-xs text-muted-foreground mt-1">→ {item.assignedTo}</p>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <span className={cn("text-xs font-medium px-2 py-1 rounded-full", cc.bg, cc.color)}>
                                {cc.label}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="w-3 h-3" /> {item.location}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-sm font-semibold">KES {item.currentValue.toLocaleString()}</p>
                              {item.purchasePrice !== item.currentValue && (
                                <p className="text-xs text-muted-foreground">Was: {item.purchasePrice.toLocaleString()}</p>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedItem(item); setIsViewOpen(true); }}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(item)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
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
            )}
          </TabsContent>
        </Tabs>

        {/* View Modal */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Item Details</DialogTitle>
              <DialogDescription>{selectedItem?.name}</DialogDescription>
            </DialogHeader>
            {selectedItem && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ["Item Code",      selectedItem.itemCode],
                    ["Category",       selectedItem.category],
                    ["Name",           selectedItem.name],
                    ["Serial Number",  selectedItem.serialNumber || "—"],
                    ["Quantity",       selectedItem.quantity.toString()],
                    ["Status",         selectedItem.status],
                    ["Condition",      selectedItem.condition],
                    ["Location",       selectedItem.location],
                    ["Assigned To",    selectedItem.assignedTo || "—"],
                    ["Purchase Date",  selectedItem.purchaseDate || "—"],
                    ["Supplier",       selectedItem.supplier],
                    ["Purchase Price", `KES ${selectedItem.purchasePrice.toLocaleString()}`],
                    ["Current Value",  `KES ${selectedItem.currentValue.toLocaleString()}`],
                    ["Last Maintenance", selectedItem.lastMaintenance || "—"],
                    ["Next Maintenance", selectedItem.nextMaintenance || "—"],
                    ["Warranty Expiry",  selectedItem.warrantyExpiry || "—"],
                  ].map(([label, val]) => (
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
              <Button onClick={() => { setIsViewOpen(false); if (selectedItem) handleOpenEdit(selectedItem); }}>
                <Edit className="w-4 h-4 mr-2" /> Edit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
              <DialogDescription>{editingItem?.name}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
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
                      {["Uniform","Equipment","Vehicle","Firearm","Communication","Technology"].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select value={editForm.condition} onValueChange={v => setEditForm({ ...editForm, condition: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Assign To (Personnel)</Label>
                  <Select value={editForm.assignedToId}
                    onValueChange={v => setEditForm({ ...editForm, assignedToId: v })}>
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
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
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
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

export default EquipmentPage;