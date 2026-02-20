// src/pages/Clients.tsx
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { cn } from "@/lib/utils";
import { 
  Building2,
  Plus,
  Search,
  MapPin,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Edit,
  Eye,
  Trash2,
  Download
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

interface Site {
  id: string;
  name: string;
  address: string;
  guardsRequired: number;
  guards_required?: number;
}

interface Contract {
  id: string;
  clientId: string;
  startDate: string;
  endDate: string;
  value: number;
  status: "active" | "pending" | "expired" | "terminated";
  billingCycle: "monthly" | "quarterly" | "annually";
  slaResponse: string;
  autoRenew: boolean;
}

interface Client {
  id: string;
  client_code?: string;
  name: string;
  industry: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  sites: Site[];
  contract: Contract | null;
  created_at: string;
  total_guards: number;
  monthly_value: number;
}

const contractStatusConfig = {
  active: { color: "text-success", bg: "bg-success/10", icon: CheckCircle, label: "Active" },
  pending: { color: "text-warning", bg: "bg-warning/10", icon: Clock, label: "Pending" },
  expired: { color: "text-destructive", bg: "bg-destructive/10", icon: AlertCircle, label: "Expired" },
  terminated: { color: "text-muted-foreground", bg: "bg-muted", icon: AlertCircle, label: "Terminated" },
};

/** Maps a raw backend client row (snake_case contract fields) to the frontend Client shape */
const mapClient = (raw: any): Client => ({
  id: raw.id,
  client_code: raw.client_code,
  name: raw.name,
  industry: raw.industry,
  contact_person: raw.contact_person,
  email: raw.email,
  phone: raw.phone,
  address: raw.address,
  sites: raw.sites || [],
  contract: raw.contract_id
    ? {
        id: raw.contract_id,
        clientId: raw.id,
        status: raw.contract_status || 'pending',
        startDate: raw.start_date || raw.contract?.start_date || '',
        endDate: raw.end_date || raw.contract?.end_date || '',
        value: raw.contract_value ?? raw.contract?.value ?? 0,
        billingCycle: raw.billing_cycle || raw.contract?.billing_cycle || 'monthly',
        slaResponse: raw.sla_response || raw.contract?.sla_response || '',
        autoRenew: raw.auto_renew ?? raw.contract?.auto_renew ?? false,
      }
    : null,
  created_at: raw.created_at,
  total_guards: raw.total_guards || 0,
  monthly_value: raw.monthly_value || 0,
});

/** Maps the full client detail response (getClientById shape) to the frontend Client shape */
const mapClientDetail = (raw: any): Client => ({
  id: raw.id,
  client_code: raw.client_code,
  name: raw.name,
  industry: raw.industry,
  contact_person: raw.contact_person,
  email: raw.email,
  phone: raw.phone,
  address: raw.address,
  sites: (raw.sites || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    address: s.address,
    guardsRequired: s.guards_required || s.guardsRequired || 0,
    guards_required: s.guards_required,
  })),
  contract: raw.contract
    ? {
        id: raw.contract.id,
        clientId: raw.id,
        status: raw.contract.status || 'pending',
        startDate: raw.contract.start_date || raw.contract.startDate || '',
        endDate: raw.contract.end_date || raw.contract.endDate || '',
        value: raw.contract.value ?? 0,
        billingCycle: raw.contract.billing_cycle || raw.contract.billingCycle || 'monthly',
        slaResponse: raw.contract.sla_response || raw.contract.slaResponse || '',
        autoRenew: raw.contract.auto_renew ?? raw.contract.autoRenew ?? false,
      }
    : null,
  created_at: raw.created_at,
  total_guards: raw.total_guards || 0,
  monthly_value: raw.monthly_value || 0,
});

export const ClientsPage = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  const [newClient, setNewClient] = useState({
    name: "",
    industry: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    fetchClients();
    fetchStats();
  }, [searchTerm, filterIndustry, filterStatus, pagination.page]);

  const fetchClients = async () => {
    try {
      setLoading(true);

      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(searchTerm && { search: searchTerm }),
        ...(filterIndustry !== 'all' && { industry: filterIndustry }),
        ...(filterStatus !== 'all' && { status: filterStatus }),
      };

      const response = await api.get('/clients', { params });
      const mappedClients = response.data.data.clients.map(mapClient);

      setClients(mappedClients);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/clients/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleAddClient = async () => {
    try {
      await api.post('/clients', {
        name: newClient.name,
        industry: newClient.industry,
        contactPerson: newClient.contactPerson,
        email: newClient.email,
        phone: newClient.phone,
        address: newClient.address,
      });

      setIsAddClientOpen(false);
      setNewClient({ name: "", industry: "", contactPerson: "", email: "", phone: "", address: "" });
      fetchClients();
      fetchStats();
    } catch (error: any) {
      console.error('Error creating client:', error);
      alert(error.response?.data?.message || 'Failed to create client');
    }
  };

  const handleViewClient = async (clientId: string) => {
    try {
      const response = await api.get(`/clients/${clientId}`);
      setSelectedClient(mapClientDetail(response.data.data));
      setIsViewModalOpen(true);
    } catch (error) {
      console.error('Error fetching client details:', error);
      alert('Failed to load client details');
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
      await api.delete(`/clients/${clientId}`);
      fetchClients();
      fetchStats();
    } catch (error: any) {
      console.error('Error deleting client:', error);
      alert(error.response?.data?.message || 'Failed to delete client');
    }
  };

  const displayStats = stats || {
    total_clients: clients.length,
    active_contracts: clients.filter(c => c.contract?.status === "active").length,
    total_monthly_revenue: clients.reduce((sum, c) => sum + (c.monthly_value || 0), 0),
    total_guards_deployed: clients.reduce((sum, c) => sum + (c.total_guards || 0), 0),
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" />
              Clients & Contracts
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage client relationships and service contracts
            </p>
          </div>

          <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
                <DialogDescription>
                  Register a new client and configure their service details
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Company Name</Label>
                    <Input
                      id="clientName"
                      value={newClient.name}
                      onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                      placeholder="ABC Corporation"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Input
                      id="industry"
                      value={newClient.industry}
                      onChange={(e) => setNewClient({ ...newClient, industry: e.target.value })}
                      placeholder="Retail & Commercial"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <Input
                      id="contactPerson"
                      value={newClient.contactPerson}
                      onChange={(e) => setNewClient({ ...newClient, contactPerson: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientEmail">Email</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      placeholder="contact@company.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientPhone">Phone Number</Label>
                    <Input
                      id="clientPhone"
                      value={newClient.phone}
                      onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                      placeholder="+254 712 345 678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientAddress">Address</Label>
                    <Input
                      id="clientAddress"
                      value={newClient.address}
                      onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                      placeholder="Westlands, Nairobi"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddClientOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddClient}>Create Client</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clients</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {displayStats.total_clients || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Contracts</p>
                <p className="text-3xl font-bold text-success mt-1">
                  {displayStats.active_contracts || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Guards</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {displayStats.total_guards_deployed || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-warning" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  KES {((displayStats.total_monthly_revenue || 0) / 1000).toFixed(0)}K
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card rounded-xl p-5 border border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterIndustry} onValueChange={setFilterIndustry}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                <SelectItem value="Retail & Commercial">Retail & Commercial</SelectItem>
                <SelectItem value="Telecommunications">Telecommunications</SelectItem>
                <SelectItem value="Hospitality">Hospitality</SelectItem>
                <SelectItem value="Energy & Utilities">Energy & Utilities</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Contract status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Clients Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground">Loading clients...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No clients found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {clients.map((client) => {
                const contractStatus = client.contract?.status || 'pending';
                const statusConf = contractStatusConfig[contractStatus] ?? contractStatusConfig.pending;
                const StatusIcon = statusConf.icon;

                return (
                  <div
                    key={client.id}
                    className="glass-card rounded-xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-300 group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{client.name}</h3>
                          <p className="text-xs text-muted-foreground font-mono">
                            {client.client_code || client.id}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        "text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1",
                        statusConf.bg,
                        statusConf.color
                      )}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConf.label}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Industry:</span> {client.industry}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        {client.email}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {client.phone}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {client.address}
                      </div>
                    </div>

                    <div className="border-t border-border/50 pt-4 mb-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold text-foreground">
                            {client.sites?.length || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">Sites</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-foreground">
                            {client.total_guards || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">Guards</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-success">
                            {((client.monthly_value || 0) / 1000).toFixed(0)}K
                          </p>
                          <p className="text-xs text-muted-foreground">Monthly</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-border/50 pt-4">
                      {client.contract && (client.contract.startDate || client.contract.endDate) && (
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Contract: {client.contract.startDate} – {client.contract.endDate}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleViewClient(client.id)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClient(client.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
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

        {/* Client Details Modal */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Client & Contract Details</DialogTitle>
              <DialogDescription>
                Complete information for {selectedClient?.name}
              </DialogDescription>
            </DialogHeader>

            {selectedClient && (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="sites">
                    Sites ({selectedClient.sites?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="contract">Contract</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Client ID</Label>
                      <p className="font-mono text-sm mt-1">
                        {selectedClient.client_code || selectedClient.id}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Industry</Label>
                      <p className="text-sm mt-1">{selectedClient.industry}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Contact Person</Label>
                      <p className="text-sm mt-1">{selectedClient.contact_person}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="text-sm mt-1">{selectedClient.email}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Phone</Label>
                      <p className="text-sm mt-1">{selectedClient.phone}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Address</Label>
                      <p className="text-sm mt-1">{selectedClient.address}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Created</Label>
                      <p className="text-sm mt-1">
                        {new Date(selectedClient.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Total Guards Deployed</Label>
                      <p className="text-sm mt-1">{selectedClient.total_guards}</p>
                    </div>
                  </div>
                </TabsContent>

                {/* Sites Tab */}
                <TabsContent value="sites" className="space-y-4">
                  {selectedClient.sites && selectedClient.sites.length > 0 ? (
                    selectedClient.sites.map((site) => (
                      <div
                        key={site.id}
                        className="p-4 rounded-lg bg-secondary/30 border border-border/50"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{site.name}</p>
                            <p className="text-sm text-muted-foreground font-mono">{site.id}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                              <MapPin className="w-4 h-4" />
                              {site.address}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-foreground">
                              {site.guardsRequired || site.guards_required || 0}
                            </p>
                            <p className="text-xs text-muted-foreground">Guards Required</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No sites configured</p>
                  )}
                </TabsContent>

                {/* Contract Tab */}
                <TabsContent value="contract" className="space-y-4">
                  {selectedClient.contract ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Contract ID</Label>
                        <p className="font-mono text-sm mt-1">{selectedClient.contract.id}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Status</Label>
                        <p className="text-sm mt-1 capitalize">{selectedClient.contract.status}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Start Date</Label>
                        <p className="text-sm mt-1">{selectedClient.contract.startDate || '—'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">End Date</Label>
                        <p className="text-sm mt-1">{selectedClient.contract.endDate || '—'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Contract Value</Label>
                        <p className="text-sm mt-1">
                          KES {selectedClient.contract.value?.toLocaleString() || 0}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Billing Cycle</Label>
                        <p className="text-sm mt-1 capitalize">
                          {selectedClient.contract.billingCycle}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">SLA Response Time</Label>
                        <p className="text-sm mt-1">{selectedClient.contract.slaResponse || '—'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Auto Renew</Label>
                        <p className="text-sm mt-1">
                          {selectedClient.contract.autoRenew ? 'Yes' : 'No'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No contract configured</p>
                  )}
                </TabsContent>
              </Tabs>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                Close
              </Button>
              <Button>
                <Download className="w-4 h-4 mr-2" />
                Export Contract
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default ClientsPage;