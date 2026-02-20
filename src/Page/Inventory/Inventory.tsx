import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  Package,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  MapPin,
  Wrench,
  Shield,
  Car,
  Radio,
  Camera,
  Download,
  TrendingUp,
  TrendingDown
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface InventoryItem {
  id: string;
  name: string;
  category: "Uniform" | "Equipment" | "Vehicle" | "Firearm" | "Communication" | "Technology";
  serialNumber?: string;
  quantity?: number;
  status: "available" | "assigned" | "maintenance" | "retired";
  condition: "new" | "good" | "fair" | "poor";
  assignedTo?: string;
  assignedToId?: string;
  location: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  lastMaintenance?: string;
  nextMaintenance?: string;
  warrantyExpiry?: string;
  supplier: string;
  notes?: string;
}

const statusConfig = {
  available: { color: "text-success", bg: "bg-success/10", label: "Available" },
  assigned: { color: "text-primary", bg: "bg-primary/10", label: "Assigned" },
  maintenance: { color: "text-warning", bg: "bg-warning/10", label: "Maintenance" },
  retired: { color: "text-muted-foreground", bg: "bg-muted", label: "Retired" },
};

const conditionConfig = {
  new: { color: "text-success", bg: "bg-success/10", label: "New" },
  good: { color: "text-primary", bg: "bg-primary/10", label: "Good" },
  fair: { color: "text-warning", bg: "bg-warning/10", label: "Fair" },
  poor: { color: "text-destructive", bg: "bg-destructive/10", label: "Poor" },
};

const categoryIcons = {
  Uniform: Shield,
  Equipment: Package,
  Vehicle: Car,
  Firearm: AlertTriangle,
  Communication: Radio,
  Technology: Camera,
};

const mockInventory: InventoryItem[] = [
  {
    id: "INV001",
    name: "Security Uniform - Complete Set",
    category: "Uniform",
    quantity: 45,
    status: "available",
    condition: "new",
    location: "Main Warehouse - Section A",
    purchaseDate: "2025-12-15",
    purchasePrice: 5500,
    currentValue: 5500,
    supplier: "ProGuard Uniforms Ltd",
    notes: "Includes jacket, trousers, cap, and badge"
  },
  {
    id: "INV002",
    name: "Patrol Vehicle - Toyota Hilux",
    category: "Vehicle",
    serialNumber: "VH-2024-001",
    status: "assigned",
    condition: "good",
    assignedTo: "John Martinez",
    assignedToId: "GRD001",
    location: "Westgate Mall",
    purchaseDate: "2024-03-10",
    purchasePrice: 3500000,
    currentValue: 3200000,
    lastMaintenance: "2026-01-05",
    nextMaintenance: "2026-04-05",
    supplier: "Toyota Kenya",
    notes: "Regular patrol vehicle for site operations"
  },
  {
    id: "INV003",
    name: "Motorola Two-Way Radio DP4800",
    category: "Communication",
    serialNumber: "MTR-2024-045",
    quantity: 25,
    status: "available",
    condition: "good",
    location: "Communications Room",
    purchaseDate: "2024-06-20",
    purchasePrice: 35000,
    currentValue: 32000,
    warrantyExpiry: "2027-06-20",
    supplier: "Motorola Solutions Kenya",
    notes: "UHF digital radio with 16 channels"
  },
  {
    id: "INV004",
    name: "Glock 19 Service Pistol",
    category: "Firearm",
    serialNumber: "GLK-19-2024-012",
    status: "assigned",
    condition: "good",
    assignedTo: "Michael Ochieng",
    assignedToId: "GRD004",
    location: "Armory - Vault 1",
    purchaseDate: "2024-02-15",
    purchasePrice: 85000,
    currentValue: 80000,
    lastMaintenance: "2025-12-20",
    nextMaintenance: "2026-03-20",
    supplier: "Approved Firearms Dealer",
    notes: "Licensed firearm with serial tracking"
  },
  {
    id: "INV005",
    name: "Metal Detector Wand",
    category: "Equipment",
    serialNumber: "MDW-2024-078",
    quantity: 15,
    status: "available",
    condition: "good",
    location: "Equipment Storage",
    purchaseDate: "2024-08-10",
    purchasePrice: 12000,
    currentValue: 11000,
    supplier: "Security Equipment Co.",
    notes: "Hand-held metal detector for entrance screening"
  },
  {
    id: "INV006",
    name: "Body Armor Vest - Level IIIA",
    category: "Equipment",
    serialNumber: "BAV-2024-023",
    quantity: 30,
    status: "assigned",
    condition: "good",
    assignedTo: "Multiple Guards",
    location: "Various Sites",
    purchaseDate: "2024-05-15",
    purchasePrice: 45000,
    currentValue: 43000,
    warrantyExpiry: "2029-05-15",
    supplier: "SafeGuard Armor",
    notes: "NIJ certified ballistic vest"
  },
  {
    id: "INV007",
    name: "Flashlight - Tactical LED",
    category: "Equipment",
    quantity: 60,
    status: "available",
    condition: "new",
    location: "Equipment Storage",
    purchaseDate: "2026-01-10",
    purchasePrice: 3500,
    currentValue: 3500,
    supplier: "TacLight Solutions",
    notes: "Rechargeable tactical flashlight - 1000 lumens"
  },
  {
    id: "INV008",
    name: "Patrol Motorcycle - Yamaha",
    category: "Vehicle",
    serialNumber: "PM-2024-003",
    status: "maintenance",
    condition: "fair",
    location: "Maintenance Bay",
    purchaseDate: "2023-09-20",
    purchasePrice: 450000,
    currentValue: 380000,
    lastMaintenance: "2026-01-15",
    nextMaintenance: "2026-02-15",
    supplier: "Yamaha Kenya",
    notes: "Undergoing scheduled maintenance - clutch replacement"
  },
  {
    id: "INV009",
    name: "First Aid Kit - Professional",
    category: "Equipment",
    quantity: 20,
    status: "available",
    condition: "new",
    location: "Medical Supplies",
    purchaseDate: "2025-11-25",
    purchasePrice: 8500,
    currentValue: 8500,
    supplier: "MediSupply Kenya",
    notes: "Comprehensive first aid kit with emergency supplies"
  },
  {
    id: "INV010",
    name: "CCTV Camera - IP PTZ",
    category: "Technology",
    serialNumber: "CAM-IP-2024-089",
    quantity: 12,
    status: "assigned",
    condition: "good",
    location: "Various Client Sites",
    purchaseDate: "2024-04-10",
    purchasePrice: 55000,
    currentValue: 50000,
    warrantyExpiry: "2027-04-10",
    supplier: "SecureTech Systems",
    notes: "Pan-tilt-zoom IP camera with night vision"
  },
];

export const EquipmentPage = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>(mockInventory);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");

  const [newItem, setNewItem] = useState({
    name: "",
    category: "Equipment" as InventoryItem["category"],
    serialNumber: "",
    quantity: 1,
    location: "",
    purchaseDate: "",
    purchasePrice: 0,
    supplier: "",
    notes: ""
  });

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.serialNumber || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || item.category === filterCategory;
    const matchesStatus = filterStatus === "all" || item.status === filterStatus;
    const matchesTab = activeTab === "all" || item.category === activeTab;
    return matchesSearch && matchesCategory && matchesStatus && matchesTab;
  });

  const handleAddItem = () => {
    const item: InventoryItem = {
      id: `INV${String(inventory.length + 1).padStart(3, '0')}`,
      ...newItem,
      status: "available",
      condition: "new",
      currentValue: newItem.purchasePrice,
    };
    setInventory([...inventory, item]);
    setIsAddItemOpen(false);
    setNewItem({
      name: "",
      category: "Equipment",
      serialNumber: "",
      quantity: 1,
      location: "",
      purchaseDate: "",
      purchasePrice: 0,
      supplier: "",
      notes: ""
    });
  };

  const handleViewItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsViewModalOpen(true);
  };

  const handleDeleteItem = (itemId: string) => {
    setInventory(inventory.filter(item => item.id !== itemId));
  };

  const stats = {
    totalItems: inventory.reduce((sum, item) => sum + (item.quantity || 1), 0),
    totalValue: inventory.reduce((sum, item) => sum + (item.currentValue * (item.quantity || 1)), 0),
    assigned: inventory.filter(i => i.status === "assigned").length,
    maintenance: inventory.filter(i => i.status === "maintenance").length,
    depreciation: inventory.reduce((sum, item) => {
      const qty = item.quantity || 1;
      return sum + ((item.purchasePrice - item.currentValue) * qty);
    }, 0),
  };

  const categoryStats = {
    Uniform: inventory.filter(i => i.category === "Uniform").reduce((s, i) => s + (i.quantity || 1), 0),
    Equipment: inventory.filter(i => i.category === "Equipment").reduce((s, i) => s + (i.quantity || 1), 0),
    Vehicle: inventory.filter(i => i.category === "Vehicle").length,
    Firearm: inventory.filter(i => i.category === "Firearm").length,
    Communication: inventory.filter(i => i.category === "Communication").reduce((s, i) => s + (i.quantity || 1), 0),
    Technology: inventory.filter(i => i.category === "Technology").reduce((s, i) => s + (i.quantity || 1), 0),
  };

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
            <p className="text-muted-foreground mt-1">
              Track assets, equipment, vehicles, and maintenance schedules
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </Button>
            <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Inventory Item</DialogTitle>
                  <DialogDescription>
                    Register new equipment, asset, or supply
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Item Name</Label>
                      <Input
                        value={newItem.name}
                        onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                        placeholder="e.g., Security Uniform"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={newItem.category}
                        onValueChange={(value) => setNewItem({...newItem, category: value as InventoryItem["category"]})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Uniform">Uniform</SelectItem>
                          <SelectItem value="Equipment">Equipment</SelectItem>
                          <SelectItem value="Vehicle">Vehicle</SelectItem>
                          <SelectItem value="Firearm">Firearm</SelectItem>
                          <SelectItem value="Communication">Communication</SelectItem>
                          <SelectItem value="Technology">Technology</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Serial Number (Optional)</Label>
                      <Input
                        value={newItem.serialNumber}
                        onChange={(e) => setNewItem({...newItem, serialNumber: e.target.value})}
                        placeholder="e.g., SN-2024-001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value)})}
                        min="1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        value={newItem.location}
                        onChange={(e) => setNewItem({...newItem, location: e.target.value})}
                        placeholder="e.g., Main Warehouse"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Supplier</Label>
                      <Input
                        value={newItem.supplier}
                        onChange={(e) => setNewItem({...newItem, supplier: e.target.value})}
                        placeholder="e.g., Equipment Co."
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Purchase Date</Label>
                      <Input
                        type="date"
                        value={newItem.purchaseDate}
                        onChange={(e) => setNewItem({...newItem, purchaseDate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Purchase Price (KES)</Label>
                      <Input
                        type="number"
                        value={newItem.purchasePrice}
                        onChange={(e) => setNewItem({...newItem, purchasePrice: parseFloat(e.target.value)})}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input
                      value={newItem.notes}
                      onChange={(e) => setNewItem({...newItem, notes: e.target.value})}
                      placeholder="Additional details..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddItemOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddItem}>Add to Inventory</Button>
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
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.totalItems}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>
          
          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  KES {(stats.totalValue / 1000000).toFixed(1)}M
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Currently Assigned</p>
                <p className="text-3xl font-bold text-primary mt-1">{stats.assigned}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Maintenance</p>
                <p className="text-3xl font-bold text-warning mt-1">{stats.maintenance}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Wrench className="w-6 h-6 text-warning" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Depreciation</p>
                <p className="text-2xl font-bold text-destructive mt-1">
                  -{(stats.depreciation / 1000).toFixed(0)}K
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </div>
        </div>

        {/* Category Overview */}
        <div className="glass-card rounded-xl p-6 border border-border/50">
          <h3 className="font-semibold text-foreground mb-4">Inventory by Category</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {Object.entries(categoryStats).map(([category, count]) => {
              const Icon = categoryIcons[category as keyof typeof categoryIcons];
              return (
                <div key={category} className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-sm font-medium">{category}</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{count}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card rounded-xl p-5 border border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search inventory..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Uniform">Uniform</SelectItem>
                <SelectItem value="Equipment">Equipment</SelectItem>
                <SelectItem value="Vehicle">Vehicle</SelectItem>
                <SelectItem value="Firearm">Firearm</SelectItem>
                <SelectItem value="Communication">Communication</SelectItem>
                <SelectItem value="Technology">Technology</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              More Filters
            </Button>
          </div>
        </div>

        {/* Inventory Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="Uniform">Uniforms</TabsTrigger>
            <TabsTrigger value="Equipment">Equipment</TabsTrigger>
            <TabsTrigger value="Vehicle">Vehicles</TabsTrigger>
            <TabsTrigger value="Firearm">Firearms</TabsTrigger>
            <TabsTrigger value="Communication">Comms</TabsTrigger>
            <TabsTrigger value="Technology">Tech</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4 mt-6">
            <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary/30 border-b border-border/50">
                    <tr>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Item</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Serial/Qty</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Condition</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Location</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Value</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((item) => {
                      const Icon = categoryIcons[item.category];
                      
                      return (
                        <tr
                          key={item.id}
                          className="border-b border-border/30 hover:bg-secondary/20 transition-colors"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center">
                                <Icon className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{item.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">{item.id}</p>
                                <Badge variant="outline" className="text-xs mt-1">{item.category}</Badge>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {item.serialNumber ? (
                              <p className="font-mono text-sm">{item.serialNumber}</p>
                            ) : (
                              <p className="text-sm">Qty: {item.quantity}</p>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className={cn(
                              "text-xs font-medium px-3 py-1.5 rounded-full",
                              statusConfig[item.status].bg,
                              statusConfig[item.status].color
                            )}>
                              {statusConfig[item.status].label}
                            </span>
                            {item.assignedTo && (
                              <p className="text-xs text-muted-foreground mt-1">
                                → {item.assignedTo}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className={cn(
                              "text-xs font-medium px-2 py-1 rounded-full",
                              conditionConfig[item.condition].bg,
                              conditionConfig[item.condition].color
                            )}>
                              {conditionConfig[item.condition].label}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              {item.location}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-foreground">
                              KES {item.currentValue.toLocaleString()}
                            </p>
                            {item.purchasePrice !== item.currentValue && (
                              <p className="text-xs text-muted-foreground">
                                Was: {item.purchasePrice.toLocaleString()}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewItem(item)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteItem(item.id)}
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
          </TabsContent>
        </Tabs>

        {/* View Item Modal */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Item Details</DialogTitle>
              <DialogDescription>
                Complete information for {selectedItem?.name}
              </DialogDescription>
            </DialogHeader>
            {selectedItem && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Item ID</Label>
                    <p className="font-mono text-sm mt-1">{selectedItem.id}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Category</Label>
                    <p className="text-sm mt-1">{selectedItem.category}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="text-sm mt-1">{selectedItem.name}</p>
                  </div>
                  {selectedItem.serialNumber && (
                    <div>
                      <Label className="text-muted-foreground">Serial Number</Label>
                      <p className="font-mono text-sm mt-1">{selectedItem.serialNumber}</p>
                    </div>
                  )}
                  {selectedItem.quantity && (
                    <div>
                      <Label className="text-muted-foreground">Quantity</Label>
                      <p className="text-sm mt-1">{selectedItem.quantity}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <p className="text-sm mt-1 capitalize">{selectedItem.status}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Condition</Label>
                    <p className="text-sm mt-1 capitalize">{selectedItem.condition}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Location</Label>
                    <p className="text-sm mt-1">{selectedItem.location}</p>
                  </div>
                  {selectedItem.assignedTo && (
                    <>
                      <div>
                        <Label className="text-muted-foreground">Assigned To</Label>
                        <p className="text-sm mt-1">{selectedItem.assignedTo}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Assignee ID</Label>
                        <p className="font-mono text-sm mt-1">{selectedItem.assignedToId}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <Label className="text-muted-foreground">Purchase Date</Label>
                    <p className="text-sm mt-1">{selectedItem.purchaseDate}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Supplier</Label>
                    <p className="text-sm mt-1">{selectedItem.supplier}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Purchase Price</Label>
                    <p className="text-sm mt-1">KES {selectedItem.purchasePrice.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Current Value</Label>
                    <p className="text-sm mt-1">KES {selectedItem.currentValue.toLocaleString()}</p>
                  </div>
                  {selectedItem.lastMaintenance && (
                    <div>
                      <Label className="text-muted-foreground">Last Maintenance</Label>
                      <p className="text-sm mt-1">{selectedItem.lastMaintenance}</p>
                    </div>
                  )}
                  {selectedItem.nextMaintenance && (
                    <div>
                      <Label className="text-muted-foreground">Next Maintenance</Label>
                      <p className="text-sm mt-1">{selectedItem.nextMaintenance}</p>
                    </div>
                  )}
                  {selectedItem.warrantyExpiry && (
                    <div>
                      <Label className="text-muted-foreground">Warranty Expires</Label>
                      <p className="text-sm mt-1">{selectedItem.warrantyExpiry}</p>
                    </div>
                  )}
                </div>
                {selectedItem.notes && (
                  <div>
                    <Label className="text-muted-foreground">Notes</Label>
                    <p className="text-sm mt-2 p-3 rounded-lg bg-secondary/30">
                      {selectedItem.notes}
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                Close
              </Button>
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button>
                <Download className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default EquipmentPage;