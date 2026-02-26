import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DollarSign, Plus, Eye, Download, RefreshCw,
  Edit, Trash2, CheckCircle, Clock, AlertTriangle, Search,
  X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
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
  paid:    { color: "text-success",         bg: "bg-success/10",     dot: "bg-success",         label: "Paid",    icon: CheckCircle },
  pending: { color: "text-warning",          bg: "bg-warning/10",     dot: "bg-warning",         label: "Pending", icon: Clock },
  overdue: { color: "text-destructive",      bg: "bg-destructive/10", dot: "bg-destructive",     label: "Overdue", icon: AlertTriangle },
  draft:   { color: "text-muted-foreground", bg: "bg-muted",          dot: "bg-muted-foreground",label: "Draft",   icon: Clock },
};

const EMPTY_FORM = {
  clientId: "", billingPeriod: "", totalAmount: 0,
  dueDate: "", issueDate: new Date().toISOString().split("T")[0],
  status: "draft", notes: "",
};

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
export const BillingPage = () => {
  const [invoices, setInvoices]   = useState<Invoice[]>([]);
  const [stats, setStats]         = useState<Stats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm]     = useState("");
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [page, setPage]           = useState(1);

  const [isAddOpen, setIsAddOpen]   = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
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
      setPage(1);
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
    try { await api.delete(`/billing/${id}`); fetchInvoices(); fetchStats(); }
    catch (e: any) { alert(e.response?.data?.message || "Failed to delete invoice"); }
    finally { setDeleteTarget(null); }
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

  // ── derived ────────────────────────────────────────────────────────────────
  const disp = stats ?? {
    totalRevenue: invoices.reduce((s, i) => s + i.amount, 0),
    collected:    invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0),
    pending:      invoices.filter(i => i.status === "pending").length,
    overdue:      invoices.filter(i => i.status === "overdue").length,
    outstanding:  invoices.filter(i => i.status !== "paid").reduce((s, i) => s + i.balance, 0),
  };

  const paged = invoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background px-3 py-4 sm:px-6 sm:py-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
              <DollarSign className="w-5 h-5 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
              <span className="truncate">Billing & Invoices</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              Manage client invoices and payments
            </p>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <Button variant="outline" size="icon" title="Refresh"
              onClick={() => { fetchInvoices(); fetchStats(); }}>
              <RefreshCw className="w-4 h-4" />
            </Button>

            {/* Create Invoice Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-4">
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Generate Invoice</span>
                  <span className="sm:hidden">Invoice</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100vw-2rem)] max-w-lg rounded-xl max-h-[90vh] overflow-y-auto">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => setIsAddOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                  <Button onClick={handleCreate} className="w-full sm:w-auto">Create Invoice</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats — 2 col mobile, 4 col md+ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          {[
            { label: "Total Revenue",    value: `KES ${((disp.totalRevenue ?? 0) / 1000).toFixed(0)}K`, color: "text-foreground",  bg: "bg-primary/10",     icon: DollarSign },
            { label: "Collected",        value: `KES ${((disp.collected    ?? 0) / 1000).toFixed(0)}K`, color: "text-success",     bg: "bg-success/10",     icon: CheckCircle },
            { label: "Pending Invoices", value: disp.pending ?? 0,                                       color: "text-warning",     bg: "bg-warning/10",     icon: Clock },
            { label: "Overdue",          value: disp.overdue ?? 0,                                       color: "text-destructive", bg: "bg-destructive/10", icon: AlertTriangle },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} className="glass-card rounded-xl p-3 sm:p-5 border border-border/50">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{label}</p>
                  <p className={cn("text-lg sm:text-2xl font-bold mt-0.5 truncate", color)}>{value}</p>
                </div>
                <div className={cn("w-9 h-9 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0", bg)}>
                  <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5", color)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Outstanding banner */}
        {(disp.outstanding ?? 0) > 0 && (
          <div className="glass-card rounded-xl p-3 sm:p-4 border border-warning/30 bg-warning/5">
            <p className="text-xs sm:text-sm font-medium text-warning">
              Outstanding balance: KES {((disp.outstanding ?? 0) / 1000).toFixed(1)}K across{" "}
              {(disp.pending ?? 0) + (disp.overdue ?? 0)} invoice(s)
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="glass-card rounded-xl p-3 sm:p-4 border border-border/50">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search invoices..." className="pl-10" value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
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
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-border/50 flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-sm sm:text-base">Invoices</h3>
            <span className="text-xs text-muted-foreground">{invoices.length} record(s)</span>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-muted-foreground text-sm">Loading invoices...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">No invoices found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead className="bg-secondary/30 border-b border-border/50">
                    <tr>
                      {["Invoice","Client","Period","Amount","Paid","Balance","Due Date","Status","Actions"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {paged.map(invoice => {
                      const sc = statusConfig[invoice.status] ?? statusConfig.draft;
                      const StatusIcon = sc.icon;
                      return (
                        <tr key={invoice.id} className="hover:bg-secondary/20 transition-colors">
                          {/* Invoice code */}
                          <td className="px-4 py-3 font-mono text-xs text-foreground whitespace-nowrap">
                            {invoice.invoiceCode}
                          </td>
                          {/* Client */}
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground truncate max-w-[130px]">{invoice.clientName}</p>
                          </td>
                          {/* Period */}
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {invoice.period || "—"}
                          </td>
                          {/* Amount */}
                          <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                            KES {invoice.amount.toLocaleString()}
                          </td>
                          {/* Paid */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {invoice.amountPaid > 0
                              ? <span className="text-success text-xs">KES {invoice.amountPaid.toLocaleString()}</span>
                              : <span className="text-muted-foreground text-xs">—</span>}
                          </td>
                          {/* Balance */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {invoice.balance > 0
                              ? <span className="text-destructive text-xs font-medium">KES {invoice.balance.toLocaleString()}</span>
                              : <span className="text-success text-xs">Settled</span>}
                          </td>
                          {/* Due Date */}
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {invoice.dueDate || "—"}
                          </td>
                          {/* Status */}
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap", sc.bg, sc.color)}>
                              <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", sc.dot)} />
                              {sc.label}
                            </span>
                          </td>
                          {/* Actions */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-0.5">
                              <Button variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => { setSelectedInvoice(invoice); setIsViewOpen(true); }} title="View">
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => handleOpenEdit(invoice)} title="Edit">
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              {invoice.status !== "paid" && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" title="Mark as Paid"
                                  onClick={() => handleMarkPaid(invoice)}>
                                  <CheckCircle className="w-3.5 h-3.5 text-success" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteTarget(invoice)} title="Delete">
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
              {invoices.length > PAGE_SIZE && (
                <Pagination page={page} total={invoices.length} pageSize={PAGE_SIZE} onChange={setPage} />
              )}
            </>
          )}
        </div>

        {/* View Modal */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-lg rounded-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Invoice Details</DialogTitle>
              <DialogDescription>{selectedInvoice?.invoiceCode}</DialogDescription>
            </DialogHeader>
            {selectedInvoice && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  ["Invoice Code", selectedInvoice.invoiceCode],
                  ["Client",       selectedInvoice.clientName],
                  ["Period",       selectedInvoice.period || "—"],
                  ["Status",       selectedInvoice.status],
                  ["Issue Date",   selectedInvoice.issueDate || "—"],
                  ["Due Date",     selectedInvoice.dueDate || "—"],
                  ["Total Amount", `KES ${selectedInvoice.amount.toLocaleString()}`],
                  ["Amount Paid",  `KES ${selectedInvoice.amountPaid.toLocaleString()}`],
                  ["Balance",      `KES ${selectedInvoice.balance.toLocaleString()}`],
                ] as [string, string][]).map(([label, val]) => (
                  <div key={label}>
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <p className="text-sm mt-1 font-medium">{val}</p>
                  </div>
                ))}
                {selectedInvoice.notes && (
                  <div className="col-span-1 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Notes</Label>
                    <p className="text-sm mt-1 p-3 rounded-lg bg-secondary/30">{selectedInvoice.notes}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsViewOpen(false)} className="w-full sm:w-auto">Close</Button>
              {selectedInvoice && selectedInvoice.status !== "paid" && (
                <Button className="w-full sm:w-auto"
                  onClick={() => { setIsViewOpen(false); handleMarkPaid(selectedInvoice); }}>
                  <CheckCircle className="w-4 h-4 mr-2" /> Mark as Paid
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Update Invoice</DialogTitle>
              <DialogDescription>{editingInvoice?.invoiceCode} — {editingInvoice?.clientName}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)} className="w-full sm:w-auto">Cancel</Button>
              <Button onClick={handleUpdate} className="w-full sm:w-auto">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Modal */}
        <ConfirmModal
          open={deleteTarget !== null}
          title="Delete Invoice"
          description={`Are you sure you want to delete invoice "${deleteTarget?.invoiceCode}" for ${deleteTarget?.clientName}? This action cannot be undone.`}
          onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />

      </div>
    </div>
  );
};

export default BillingPage;