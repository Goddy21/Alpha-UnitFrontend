import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DollarSign, Plus, Eye, Download, RefreshCw,
  Edit, Trash2, CheckCircle, Clock, AlertTriangle, Search,
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
import api from "@/lib/api";

// ── types ────────────────────────────────────────────────────────────────────
interface Invoice {
  id: string; invoiceCode: string; clientId: string; clientName: string;
  amount: number; amountPaid: number; balance: number;
  dueDate: string | null; issueDate: string | null;
  status: "paid" | "pending" | "overdue" | "draft";
  period: string | null; notes: string | null;
}

interface Stats {
  total: number; paid: number; pending: number; overdue: number;
  totalRevenue: number; collected: number; outstanding: number;
}

interface ClientOption { id: string; name: string; }

const statusConfig = {
  paid:    { color: "text-success",         bg: "bg-success/10",     label: "Paid",    icon: CheckCircle },
  pending: { color: "text-warning",          bg: "bg-warning/10",     label: "Pending", icon: Clock },
  overdue: { color: "text-destructive",      bg: "bg-destructive/10", label: "Overdue", icon: AlertTriangle },
  draft:   { color: "text-muted-foreground", bg: "bg-muted",          label: "Draft",   icon: Clock },
};

const EMPTY_FORM = {
  clientId: "", billingPeriod: "", totalAmount: 0,
  dueDate: "", issueDate: new Date().toISOString().split("T")[0],
  status: "draft", notes: "",
};

// ── component ────────────────────────────────────────────────────────────────
export const BillingPage = () => {
  const [invoices, setInvoices]   = useState<Invoice[]>([]);
  const [stats, setStats]         = useState<Stats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm]     = useState("");
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);

  const [isAddOpen, setIsAddOpen]   = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice]   = useState<Invoice | null>(null);
  const [form, setForm]       = useState<any>({ ...EMPTY_FORM });
  const [editForm, setEditForm] = useState<any>({});

  // ── fetch ─────────────────────────────────────────────────────────────────
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filterStatus !== "all") params.status = filterStatus;
      if (searchTerm) params.search = searchTerm;
      const res = await api.get("/billing", { params });
      setInvoices(res.data.data.invoices);
    } catch (e) { console.error("Error fetching invoices:", e); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/billing/stats");
      setStats(res.data.data);
    } catch (e) { console.error("Error fetching billing stats:", e); }
  };

  const fetchClients = async () => {
    try {
      const res = await api.get("/clients", { params: { limit: 200 } });
      setClientOptions(res.data.data.clients || []);
    } catch (e) { console.error("Error fetching clients:", e); }
  };

  useEffect(() => { fetchInvoices(); }, [filterStatus, searchTerm]);
  useEffect(() => { fetchStats(); fetchClients(); }, []);

  // ── actions ───────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.clientId || !form.totalAmount)
      return alert("Client and amount are required.");
    try {
      await api.post("/billing", form);
      setIsAddOpen(false); setForm({ ...EMPTY_FORM });
      fetchInvoices(); fetchStats();
    } catch (e: any) { alert(e.response?.data?.message || "Failed to create invoice"); }
  };

  const handleOpenEdit = (inv: Invoice) => {
    setEditingInvoice(inv);
    setEditForm({
      status: inv.status, amountPaid: inv.amountPaid,
      dueDate: inv.dueDate || "", billingPeriod: inv.period || "",
      totalAmount: inv.amount, notes: inv.notes || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingInvoice) return;
    try {
      await api.put(`/billing/${editingInvoice.id}`, editForm);
      setIsEditOpen(false); fetchInvoices(); fetchStats();
    } catch (e: any) { alert(e.response?.data?.message || "Failed to update invoice"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this invoice?")) return;
    try { await api.delete(`/billing/${id}`); fetchInvoices(); fetchStats(); }
    catch (e: any) { alert(e.response?.data?.message || "Failed to delete invoice"); }
  };

  const handleMarkPaid = async (inv: Invoice) => {
    try {
      await api.put(`/billing/${inv.id}`, {
        status: "paid",
        paymentDate: new Date().toISOString().split("T")[0],
      });
      fetchInvoices(); fetchStats();
    } catch (e: any) { alert(e.response?.data?.message || "Failed to mark as paid"); }
  };

  // ── derived stats ─────────────────────────────────────────────────────────
  const disp = stats ?? {
    totalRevenue: invoices.reduce((s, i) => s + i.amount, 0),
    collected:    invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0),
    pending:      invoices.filter(i => i.status === "pending").length,
    overdue:      invoices.filter(i => i.status === "overdue").length,
    outstanding:  invoices.filter(i => i.status !== "paid").reduce((s, i) => s + i.balance, 0),
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-primary" />
              Billing & Invoices
            </h1>
            <p className="text-muted-foreground mt-1">Manage client invoices and payments</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2"
              onClick={() => { fetchInvoices(); fetchStats(); }}>
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>

            {/* Create Invoice Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" /> Generate Invoice</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Generate Invoice</DialogTitle>
                  <DialogDescription>Create a new client invoice</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Client *</Label>
                    <Select value={form.clientId} onValueChange={v => setForm({ ...form, clientId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                      <SelectContent>
                        {clientOptions.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Billing Period</Label>
                      <Input placeholder="e.g. January 2026" value={form.billingPeriod}
                        onChange={e => setForm({ ...form, billingPeriod: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Total Amount (KES) *</Label>
                      <Input type="number" min={0} value={form.totalAmount}
                        onChange={e => setForm({ ...form, totalAmount: parseFloat(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input type="date" value={form.dueDate}
                        onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Issue Date</Label>
                    <Input type="date" value={form.issueDate}
                      onChange={e => setForm({ ...form, issueDate: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input placeholder="Optional notes..." value={form.notes}
                      onChange={e => setForm({ ...form, notes: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate}>Create Invoice</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Total Revenue",    value: `KES ${((disp.totalRevenue ?? 0) / 1000).toFixed(0)}K`, color: "text-foreground" },
            { label: "Collected",        value: `KES ${((disp.collected ?? 0) / 1000).toFixed(0)}K`,    color: "text-success" },
            { label: "Pending Invoices", value: disp.pending,                                            color: "text-warning" },
            { label: "Overdue",          value: disp.overdue,                                            color: "text-destructive" },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass-card rounded-xl p-5 border border-border/50">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className={cn("text-2xl font-bold mt-1", color)}>{value}</p>
            </div>
          ))}
        </div>

        {/* Outstanding banner */}
        {(disp.outstanding ?? 0) > 0 && (
          <div className="glass-card rounded-xl p-4 border border-warning/30 bg-warning/5 flex items-center justify-between">
            <p className="text-sm font-medium text-warning">
              Outstanding balance: KES {((disp.outstanding ?? 0) / 1000).toFixed(1)}K across {(disp.pending ?? 0) + (disp.overdue ?? 0)} invoice(s)
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="glass-card rounded-xl p-4 border border-border/50">
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search invoices..." className="pl-10" value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Invoices</h3>
            <span className="text-xs text-muted-foreground">{invoices.length} record(s)</span>
          </div>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-muted-foreground">Loading invoices...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No invoices found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/30 border-b border-border/50">
                  <tr>
                    {["Invoice","Client","Period","Amount","Paid","Balance","Due Date","Status","Actions"].map(h => (
                      <th key={h} className="px-5 py-4 text-left text-sm font-semibold text-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(invoice => {
                    const sc = statusConfig[invoice.status] ?? statusConfig.draft;
                    const StatusIcon = sc.icon;
                    return (
                      <tr key={invoice.id}
                        className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                        <td className="px-5 py-4 font-mono text-sm">{invoice.invoiceCode}</td>
                        <td className="px-5 py-4 text-sm font-medium">{invoice.clientName}</td>
                        <td className="px-5 py-4 text-sm text-muted-foreground">{invoice.period || "—"}</td>
                        <td className="px-5 py-4 text-sm font-semibold">
                          KES {invoice.amount.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-sm text-success">
                          {invoice.amountPaid > 0 ? `KES ${invoice.amountPaid.toLocaleString()}` : "—"}
                        </td>
                        <td className="px-5 py-4 text-sm">
                          {invoice.balance > 0
                            ? <span className="text-destructive">KES {invoice.balance.toLocaleString()}</span>
                            : <span className="text-success">Settled</span>}
                        </td>
                        <td className="px-5 py-4 text-sm text-muted-foreground">
                          {invoice.dueDate || "—"}
                        </td>
                        <td className="px-5 py-4">
                          <span className={cn("text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1 w-fit", sc.bg, sc.color)}>
                            <StatusIcon className="w-3 h-3" /> {sc.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm"
                              onClick={() => { setSelectedInvoice(invoice); setIsViewOpen(true); }}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(invoice)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            {invoice.status !== "paid" && (
                              <Button variant="ghost" size="sm" title="Mark as Paid"
                                onClick={() => handleMarkPaid(invoice)}>
                                <CheckCircle className="w-4 h-4 text-success" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(invoice.id)}>
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
          )}
        </div>

        {/* View Modal */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Invoice Details</DialogTitle>
              <DialogDescription>{selectedInvoice?.invoiceCode}</DialogDescription>
            </DialogHeader>
            {selectedInvoice && (
              <div className="grid grid-cols-2 gap-4">
                {[
                  ["Invoice Code", selectedInvoice.invoiceCode],
                  ["Client",       selectedInvoice.clientName],
                  ["Period",       selectedInvoice.period || "—"],
                  ["Status",       selectedInvoice.status],
                  ["Issue Date",   selectedInvoice.issueDate || "—"],
                  ["Due Date",     selectedInvoice.dueDate || "—"],
                  ["Total Amount", `KES ${selectedInvoice.amount.toLocaleString()}`],
                  ["Amount Paid",  `KES ${selectedInvoice.amountPaid.toLocaleString()}`],
                  ["Balance",      `KES ${selectedInvoice.balance.toLocaleString()}`],
                ].map(([label, val]) => (
                  <div key={label}>
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <p className="text-sm mt-1 font-medium">{val}</p>
                  </div>
                ))}
                {selectedInvoice.notes && (
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Notes</Label>
                    <p className="text-sm mt-1 p-3 rounded-lg bg-secondary/30">{selectedInvoice.notes}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
              {selectedInvoice && selectedInvoice.status !== "paid" && (
                <Button onClick={() => { setIsViewOpen(false); handleMarkPaid(selectedInvoice); }}>
                  <CheckCircle className="w-4 h-4 mr-2" /> Mark as Paid
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update Invoice</DialogTitle>
              <DialogDescription>{editingInvoice?.invoiceCode} — {editingInvoice?.clientName}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount Paid (KES)</Label>
                  <Input type="number" min={0} value={editForm.amountPaid}
                    onChange={e => setEditForm({ ...editForm, amountPaid: parseFloat(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total Amount (KES)</Label>
                  <Input type="number" min={0} value={editForm.totalAmount}
                    onChange={e => setEditForm({ ...editForm, totalAmount: parseFloat(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={editForm.dueDate}
                    onChange={e => setEditForm({ ...editForm, dueDate: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Billing Period</Label>
                <Input placeholder="e.g. February 2026" value={editForm.billingPeriod}
                  onChange={e => setEditForm({ ...editForm, billingPeriod: e.target.value })} />
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

export default BillingPage;