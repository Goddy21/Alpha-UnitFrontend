import React, { useState } from "react";
import { CreditCard, DollarSign, Download, Eye, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Invoice {
  id: string;
  clientName: string;
  amount: number;
  dueDate: string;
  status: "paid" | "pending" | "overdue";
  period: string;
}

const invoiceStatusConfig = {
  paid: { color: "text-success", bg: "bg-success/10", label: "Paid" },
  pending: { color: "text-warning", bg: "bg-warning/10", label: "Pending" },
  overdue: { color: "text-destructive", bg: "bg-destructive/10", label: "Overdue" },
};

const mockInvoices: Invoice[] = [
  {
    id: "INV001",
    clientName: "Westgate Shopping Mall",
    amount: 200000,
    dueDate: "2026-01-31",
    status: "pending",
    period: "January 2026"
  },
  {
    id: "INV002",
    clientName: "SafariCom HQ",
    amount: 180000,
    dueDate: "2026-01-25",
    status: "paid",
    period: "January 2026"
  },
  {
    id: "INV003",
    clientName: "Kenya Power",
    amount: 180000,
    dueDate: "2026-01-15",
    status: "overdue",
    period: "January 2026"
  },
];

export const BillingPage = () => {
  const [invoices] = useState<Invoice[]>(mockInvoices);

  const stats = {
    totalRevenue: invoices.reduce((sum, inv) => sum + inv.amount, 0),
    pending: invoices.filter(i => i.status === "pending").length,
    overdue: invoices.filter(i => i.status === "overdue").length,
    collected: invoices.filter(i => i.status === "paid").reduce((sum, inv) => sum + inv.amount, 0),
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-primary" />
              Billing & Payroll
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage invoices, payments, and guard payroll
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Generate Invoice
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                KES {(stats.totalRevenue / 1000).toFixed(0)}K
              </p>
            </div>
          </div>
          
          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div>
              <p className="text-sm text-muted-foreground">Collected</p>
              <p className="text-2xl font-bold text-success mt-1">
                KES {(stats.collected / 1000).toFixed(0)}K
              </p>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div>
              <p className="text-sm text-muted-foreground">Pending Invoices</p>
              <p className="text-3xl font-bold text-warning mt-1">{stats.pending}</p>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-3xl font-bold text-destructive mt-1">{stats.overdue}</p>
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50">
            <h3 className="font-semibold text-foreground">Recent Invoices</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/30 border-b border-border/50">
                <tr>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Invoice ID</th>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Client</th>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Period</th>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Amount</th>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Due Date</th>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-border/30 hover:bg-secondary/20">
                    <td className="px-5 py-4 font-mono text-sm">{invoice.id}</td>
                    <td className="px-5 py-4 text-sm">{invoice.clientName}</td>
                    <td className="px-5 py-4 text-sm">{invoice.period}</td>
                    <td className="px-5 py-4 text-sm font-semibold">
                      KES {invoice.amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-sm">{invoice.dueDate}</td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        "text-xs font-medium px-3 py-1.5 rounded-full",
                        invoiceStatusConfig[invoice.status].bg,
                        invoiceStatusConfig[invoice.status].color
                      )}>
                        {invoiceStatusConfig[invoice.status].label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;