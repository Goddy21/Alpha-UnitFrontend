// src/pages/Leave.tsx
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  CalendarDays, Clock, CheckCircle, XCircle, AlertTriangle,
  Plus, Eye, X, Info, RefreshCw, MessageSquare, ChevronLeft,
  ChevronRight, Send, Ban, ThumbsUp, ShieldCheck,
} from 'lucide-react';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge }    from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/usePermissions';

// ── Types ────────────────────────────────────────────────────────────────────
interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  department: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'first_approved' | 'approved' | 'rejected' | 'cancelled';
  firstApproverName?: string;
  firstApprovedAt?: string;
  firstComment?: string;
  finalApproverName?: string;
  finalApprovedAt?: string;
  finalComment?: string;
  createdAt: string;
}

interface Comment {
  id: string;
  comment: string;
  authorName: string;
  authorRole: string;
  createdAt: string;
}

interface Stats {
  total: number; pending: number; firstApproved: number;
  approved: number; rejected: number; cancelled: number;
  totalDaysApproved: number;
}

interface Toast {
  id: string; type: 'success' | 'error' | 'warning' | 'info'; title: string; message: string;
}

// ── Config ───────────────────────────────────────────────────────────────────
const LEAVE_TYPES = [
  { value: 'annual',        label: 'Annual Leave' },
  { value: 'sick',          label: 'Sick Leave' },
  { value: 'maternity',     label: 'Maternity Leave' },
  { value: 'paternity',     label: 'Paternity Leave' },
  { value: 'compassionate', label: 'Compassionate Leave' },
  { value: 'study',         label: 'Study Leave' },
  { value: 'unpaid',        label: 'Unpaid Leave' },
  { value: 'other',         label: 'Other' },
];

const STATUS_CONFIG = {
  pending:        { label: 'Pending',         color: 'text-warning',          bg: 'bg-warning/10',      dot: 'bg-warning',          icon: Clock },
  first_approved: { label: 'Supervisor Approved', color: 'text-primary',      bg: 'bg-primary/10',      dot: 'bg-primary',          icon: ThumbsUp },
  approved:       { label: 'Approved',        color: 'text-success',          bg: 'bg-success/10',      dot: 'bg-success',          icon: CheckCircle },
  rejected:       { label: 'Rejected',        color: 'text-destructive',      bg: 'bg-destructive/10',  dot: 'bg-destructive',      icon: XCircle },
  cancelled:      { label: 'Cancelled',       color: 'text-muted-foreground', bg: 'bg-muted',           dot: 'bg-muted-foreground', icon: Ban },
};

const EMPTY_FORM = {
  leaveType: 'annual', startDate: '', endDate: '', reason: '',
};

const PAGE_SIZE = 15;

// ── Toast ─────────────────────────────────────────────────────────────────────
const ToastContainer = ({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-success" />,
    error:   <XCircle     className="w-5 h-5 text-destructive" />,
    warning: <AlertTriangle className="w-5 h-5 text-warning" />,
    info:    <Info        className="w-5 h-5 text-primary" />,
  };
  const borders = { success: 'border-l-success', error: 'border-l-destructive', warning: 'border-l-warning', info: 'border-l-primary' };
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[min(380px,calc(100vw-2rem))]">
      {toasts.map(t => (
        <div key={t.id} className={cn(
          'glass-card rounded-xl border border-border/50 border-l-4 p-4 shadow-lg',
          'flex items-start gap-3 animate-in slide-in-from-right-5 duration-300',
          borders[t.type])}>
          <div className="flex-shrink-0 mt-0.5">{icons[t.type]}</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{t.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t.message}</p>
          </div>
          <button onClick={() => onRemove(t.id)} className="flex-shrink-0 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

// ── Approval Action Modal ─────────────────────────────────────────────────────
const ApprovalModal = ({
  open, onClose, onConfirm, title, description, actionLabel, variant,
}: {
  open: boolean; onClose: () => void;
  onConfirm: (comment: string) => void;
  title: string; description: string; actionLabel: string;
  variant: 'approve' | 'reject';
}) => {
  const [comment, setComment] = useState('');
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {variant === 'approve'
              ? <CheckCircle className="w-5 h-5 text-success" />
              : <XCircle className="w-5 h-5 text-destructive" />}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label>Comment {variant === 'reject' && <span className="text-destructive">*</span>}</Label>
          <Textarea
            placeholder={variant === 'approve' ? 'Optional approval note…' : 'Reason for rejection (required)'}
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant={variant === 'approve' ? 'default' : 'destructive'}
            onClick={() => { onConfirm(comment); onClose(); setComment(''); }}
            disabled={variant === 'reject' && !comment.trim()}
          >
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export const LeavePage = () => {
  const { role, user, can, canFirstApproveLeave, canFinalApproveLeave } = usePermissions();

  const [requests,  setRequests]  = useState<LeaveRequest[]>([]);
  const [stats,     setStats]     = useState<Stats | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [toasts,    setToasts]    = useState<Toast[]>([]);
  const [page,      setPage]      = useState(1);
  const [total,     setTotal]     = useState(0);

  // Filters
  const [filterStatus,    setFilterStatus]    = useState('all');
  const [filterLeaveType, setFilterLeaveType] = useState('all');

  // Apply leave form
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [form,        setForm]        = useState({ ...EMPTY_FORM });
  const [submitting,  setSubmitting]  = useState(false);

  // View modal
  const [selected,    setSelected]    = useState<LeaveRequest | null>(null);
  const [comments,    setComments]    = useState<Comment[]>([]);
  const [newComment,  setNewComment]  = useState('');
  const [isViewOpen,  setIsViewOpen]  = useState(false);

  // Approval modal state
  const [approvalModal, setApprovalModal] = useState<{
    open: boolean; type: 'first' | 'final'; action: 'approve' | 'reject';
    leaveId: string; leaveName: string;
  }>({ open: false, type: 'first', action: 'approve', leaveId: '', leaveName: '' });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Toast helpers ─────────────────────────────────────────────────────────
  const addToast = useCallback((type: Toast['type'], title: string, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, type, title, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500);
  }, []);
  const removeToast = useCallback((id: string) => setToasts(t => t.filter(x => x.id !== id)), []);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchRequests = useCallback(async (p = page) => {
    try {
      setLoading(true);
      const params: Record<string, any> = { page: p, limit: PAGE_SIZE };
      if (filterStatus    !== 'all') params.status    = filterStatus;
      if (filterLeaveType !== 'all') params.leaveType = filterLeaveType;
      const res = await api.get('/leave', { params });
      setRequests(res.data.data.requests || []);
      setTotal(res.data.data.pagination?.total ?? 0);
    } catch {
      addToast('error', 'Failed to load', 'Could not fetch leave requests.');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterLeaveType, addToast]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/leave/stats');
      setStats(res.data.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { setPage(1); }, [filterStatus, filterLeaveType]);
  useEffect(() => { fetchRequests(page); }, [page, filterStatus, filterLeaveType]);
  useEffect(() => { fetchStats(); }, []);

  // ── Apply leave ────────────────────────────────────────────────────────────
  const handleApply = async () => {
    if (!form.startDate || !form.endDate || !form.reason.trim()) {
      addToast('warning', 'Missing fields', 'Start date, end date, and reason are required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/leave', form);
      setIsApplyOpen(false);
      setForm({ ...EMPTY_FORM });
      fetchRequests(1); fetchStats();
      addToast('success', 'Leave submitted', 'Your leave request has been submitted.');
    } catch (e: any) {
      addToast('error', 'Submit failed', e.response?.data?.message || 'Failed to submit leave.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── View + comments ────────────────────────────────────────────────────────
  const handleView = async (req: LeaveRequest) => {
    setSelected(req);
    setIsViewOpen(true);
    try {
      const res = await api.get(`/leave/${req.id}/comments`);
      setComments(res.data.data || []);
    } catch { setComments([]); }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selected) return;
    try {
      await api.post(`/leave/${selected.id}/comments`, { comment: newComment });
      setNewComment('');
      const res = await api.get(`/leave/${selected.id}/comments`);
      setComments(res.data.data || []);
    } catch {
      addToast('error', 'Comment failed', 'Could not add comment.');
    }
  };

  // ── Approval ───────────────────────────────────────────────────────────────
  const triggerApproval = (
    req: LeaveRequest, type: 'first' | 'final', action: 'approve' | 'reject'
  ) => {
    setApprovalModal({ open: true, type, action, leaveId: req.id, leaveName: req.userName });
  };

  const handleApproval = async (comment: string) => {
    const { type, action, leaveId } = approvalModal;
    const endpoint = type === 'first'
      ? `/leave/${leaveId}/first-approval`
      : `/leave/${leaveId}/final-approval`;
    try {
      await api.put(endpoint, { action, comment });
      fetchRequests(); fetchStats();
      if (isViewOpen && selected?.id === leaveId) {
        const res = await api.get(`/leave/${leaveId}`);
        setSelected(res.data.data);
      }
      addToast(
        action === 'approve' ? 'success' : 'warning',
        action === 'approve' ? 'Leave approved' : 'Leave rejected',
        `${approvalModal.leaveName}'s request has been ${action === 'approve' ? 'approved' : 'rejected'}.`
      );
    } catch (e: any) {
      addToast('error', 'Action failed', e.response?.data?.message || 'Could not process approval.');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.put(`/leave/${id}/cancel`);
      fetchRequests(); fetchStats();
      setIsViewOpen(false);
      addToast('info', 'Cancelled', 'Your leave request has been cancelled.');
    } catch (e: any) {
      addToast('error', 'Cancel failed', e.response?.data?.message || 'Could not cancel leave.');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Approval Modal */}
      <ApprovalModal
        open={approvalModal.open}
        onClose={() => setApprovalModal(m => ({ ...m, open: false }))}
        onConfirm={handleApproval}
        title={approvalModal.action === 'approve'
          ? `${approvalModal.type === 'first' ? 'First-Level' : 'Final'} Approve`
          : 'Reject Leave'}
        description={approvalModal.action === 'approve'
          ? `Approve ${approvalModal.leaveName}'s leave request?`
          : `Reject ${approvalModal.leaveName}'s leave request?`}
        actionLabel={approvalModal.action === 'approve' ? 'Approve' : 'Reject'}
        variant={approvalModal.action}
      />

      <div className="min-h-screen bg-background p-3 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <CalendarDays className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
                <span>Leave Management</span>
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {canFirstApproveLeave()
                  ? 'Review and manage leave requests for your team'
                  : 'Apply for leave and track your requests'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5"
                onClick={() => { fetchRequests(); fetchStats(); }}>
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              {can('leave:apply') && (
                <Button className="gap-2" onClick={() => setIsApplyOpen(true)}>
                  <Plus className="w-4 h-4" />
                  <span>Apply for Leave</span>
                </Button>
              )}
            </div>
          </div>

          {/* ── Stats ── */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Pending',       value: stats.pending,          color: 'text-warning',    bg: 'bg-warning/10',     icon: Clock },
                { label: 'Supervisor OK', value: stats.firstApproved,    color: 'text-primary',    bg: 'bg-primary/10',     icon: ThumbsUp },
                { label: 'Approved',      value: stats.approved,         color: 'text-success',    bg: 'bg-success/10',     icon: CheckCircle },
                { label: 'Days Approved', value: stats.totalDaysApproved, color: 'text-foreground', bg: 'bg-secondary',     icon: CalendarDays },
              ].map(({ label, value, color, bg, icon: Icon }) => (
                <div key={label} className="glass-card rounded-xl p-4 sm:p-5 border border-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
                      <p className={cn('text-2xl sm:text-3xl font-bold mt-1', color)}>{value}</p>
                    </div>
                    <div className={cn('w-9 h-9 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
                      <Icon className={cn('w-4 h-4 sm:w-6 sm:h-6', color)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Filters ── */}
          <div className="glass-card rounded-xl p-4 border border-border/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select value={filterStatus} onValueChange={v => setFilterStatus(v)}>
                <SelectTrigger><SelectValue placeholder="Filter by status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterLeaveType} onValueChange={v => setFilterLeaveType(v)}>
                <SelectTrigger><SelectValue placeholder="Filter by type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {LEAVE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Table ── */}
          <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/30 border-b border-border/50">
                  <tr>
                    {[
                      'Employee', 'Leave Type', 'Dates', 'Days', 'Status',
                      ...(canFirstApproveLeave() ? ['Actions'] : []),
                    ].map(h => (
                      <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                          <p className="text-muted-foreground text-sm">Loading requests…</p>
                        </div>
                      </td>
                    </tr>
                  ) : requests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-muted-foreground">
                        <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-40" />
                        <p>No leave requests found</p>
                      </td>
                    </tr>
                  ) : requests.map(req => {
                    const sc = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending;
                    const Icon = sc.icon;
                    const isOwn = req.userId === user?.id;
                    return (
                      <tr key={req.id}
                        className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-medium text-sm">{req.userName}</p>
                            <p className="text-xs text-muted-foreground">{req.userRole}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm capitalize">
                            {LEAVE_TYPES.find(t => t.value === req.leaveType)?.label ?? req.leaveType}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm">{req.startDate}</p>
                          <p className="text-xs text-muted-foreground">to {req.endDate}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-semibold text-sm">{req.totalDays}</span>
                          <span className="text-xs text-muted-foreground ml-1">days</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className={cn('flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full w-fit', sc.bg, sc.color)}>
                            <Icon className="w-3.5 h-3.5" />
                            {sc.label}
                          </div>
                        </td>
                        {canFirstApproveLeave() && (
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleView(req)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              {/* First-level approve buttons */}
                              {canFirstApproveLeave() && req.status === 'pending' && !isOwn && (
                                <>
                                  <Button variant="ghost" size="sm"
                                    onClick={() => triggerApproval(req, 'first', 'approve')}>
                                    <ThumbsUp className="w-4 h-4 text-success" />
                                  </Button>
                                  <Button variant="ghost" size="sm"
                                    onClick={() => triggerApproval(req, 'first', 'reject')}>
                                    <XCircle className="w-4 h-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                              {/* Final approve buttons */}
                              {canFinalApproveLeave() && req.status === 'first_approved' && !isOwn && (
                                <>
                                  <Button variant="ghost" size="sm"
                                    onClick={() => triggerApproval(req, 'final', 'approve')}>
                                    <ShieldCheck className="w-4 h-4 text-success" />
                                  </Button>
                                  <Button variant="ghost" size="sm"
                                    onClick={() => triggerApproval(req, 'final', 'reject')}>
                                    <XCircle className="w-4 h-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                              {/* Cancel own pending leave */}
                              {isOwn && ['pending', 'first_approved'].includes(req.status) && (
                                <Button variant="ghost" size="sm"
                                  onClick={() => handleCancel(req.id)}>
                                  <Ban className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border/30">
              {loading ? (
                <div className="py-16 flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-muted-foreground text-sm">Loading…</p>
                </div>
              ) : requests.map(req => {
                const sc = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending;
                const Icon = sc.icon;
                const isOwn = req.userId === user?.id;
                return (
                  <div key={req.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{req.userName}</p>
                        <p className="text-xs text-muted-foreground">{req.userRole}</p>
                        <p className="text-xs mt-1 capitalize">
                          {LEAVE_TYPES.find(t => t.value === req.leaveType)?.label ?? req.leaveType} ·{' '}
                          <span className="font-medium">{req.totalDays} days</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{req.startDate} – {req.endDate}</p>
                      </div>
                      <div className={cn('flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full shrink-0', sc.bg, sc.color)}>
                        <Icon className="w-3 h-3" /> {sc.label}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => handleView(req)}>
                        <Eye className="w-3.5 h-3.5" /> View
                      </Button>
                      {canFirstApproveLeave() && req.status === 'pending' && !isOwn && (
                        <>
                          <Button variant="outline" size="sm" className="text-xs text-success border-success/30"
                            onClick={() => triggerApproval(req, 'first', 'approve')}>
                            <ThumbsUp className="w-3.5 h-3.5 mr-1" /> Approve
                          </Button>
                          <Button variant="outline" size="sm" className="text-xs text-destructive border-destructive/30"
                            onClick={() => triggerApproval(req, 'first', 'reject')}>
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                      {canFinalApproveLeave() && req.status === 'first_approved' && !isOwn && (
                        <>
                          <Button variant="outline" size="sm" className="text-xs text-success border-success/30"
                            onClick={() => triggerApproval(req, 'final', 'approve')}>
                            <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Final Approve
                          </Button>
                          <Button variant="outline" size="sm" className="text-xs text-destructive border-destructive/30"
                            onClick={() => triggerApproval(req, 'final', 'reject')}>
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                      {isOwn && ['pending', 'first_approved'].includes(req.status) && (
                        <Button variant="outline" size="sm" className="text-xs text-muted-foreground"
                          onClick={() => handleCancel(req.id)}>
                          <Ban className="w-3.5 h-3.5 mr-1" /> Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {!loading && total > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground order-2 sm:order-1">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                </p>
                <div className="flex items-center gap-1 order-1 sm:order-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-xs px-2">{page} / {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Apply Leave Dialog ── */}
      <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
            <DialogDescription>Fill in the details for your leave request</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select value={form.leaveType} onValueChange={v => setForm({ ...form, leaveType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input type="date" value={form.startDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input type="date" value={form.endDate}
                  min={form.startDate || new Date().toISOString().split('T')[0]}
                  onChange={e => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea placeholder="Describe the reason for your leave…" rows={3}
                value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsApplyOpen(false)}>Cancel</Button>
            <Button onClick={handleApply} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Leave Dialog ── */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
            <DialogDescription>{selected?.userName} · {selected?.userRole}</DialogDescription>
          </DialogHeader>
          {selected && (() => {
            const sc = STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.pending;
            const Icon = sc.icon;
            const isOwn = selected.userId === user?.id;
            return (
              <Tabs defaultValue="details">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="comments">
                    Comments ({comments.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  {/* Status banner */}
                  <div className={cn('flex items-center gap-2 p-3 rounded-lg', sc.bg)}>
                    <Icon className={cn('w-5 h-5', sc.color)} />
                    <span className={cn('font-semibold', sc.color)}>{sc.label}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Leave Type',  LEAVE_TYPES.find(t => t.value === selected.leaveType)?.label ?? selected.leaveType],
                      ['Total Days',  `${selected.totalDays} working days`],
                      ['Start Date',  selected.startDate],
                      ['End Date',    selected.endDate],
                      ['Department',  selected.department || '—'],
                      ['Submitted',   new Date(selected.createdAt).toLocaleDateString()],
                    ].map(([label, val]) => (
                      <div key={label} className="p-3 rounded-lg bg-secondary/20 border border-border/30">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-medium mt-0.5">{val}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-lg bg-secondary/20 border border-border/30">
                    <p className="text-xs text-muted-foreground mb-1">Reason</p>
                    <p className="text-sm">{selected.reason}</p>
                  </div>

                  {/* Approval trail */}
                  {(selected.firstApproverName || selected.finalApproverName) && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Approval Trail</p>
                      {selected.firstApproverName && (
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                          <p className="text-xs text-muted-foreground">First Approval</p>
                          <p className="text-sm font-medium">{selected.firstApproverName}</p>
                          {selected.firstComment && <p className="text-xs mt-1 italic">"{selected.firstComment}"</p>}
                          {selected.firstApprovedAt && <p className="text-xs text-muted-foreground mt-0.5">{new Date(selected.firstApprovedAt).toLocaleString()}</p>}
                        </div>
                      )}
                      {selected.finalApproverName && (
                        <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                          <p className="text-xs text-muted-foreground">Final Approval</p>
                          <p className="text-sm font-medium">{selected.finalApproverName}</p>
                          {selected.finalComment && <p className="text-xs mt-1 italic">"{selected.finalComment}"</p>}
                          {selected.finalApprovedAt && <p className="text-xs text-muted-foreground mt-0.5">{new Date(selected.finalApprovedAt).toLocaleString()}</p>}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action buttons inside modal */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {canFirstApproveLeave() && selected.status === 'pending' && !isOwn && (
                      <>
                        <Button size="sm" className="gap-1"
                          onClick={() => triggerApproval(selected, 'first', 'approve')}>
                          <ThumbsUp className="w-3.5 h-3.5" /> First Approve
                        </Button>
                        <Button size="sm" variant="destructive" className="gap-1"
                          onClick={() => triggerApproval(selected, 'first', 'reject')}>
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </Button>
                      </>
                    )}
                    {canFinalApproveLeave() && selected.status === 'first_approved' && !isOwn && (
                      <>
                        <Button size="sm" className="gap-1 bg-success hover:bg-success/90"
                          onClick={() => triggerApproval(selected, 'final', 'approve')}>
                          <ShieldCheck className="w-3.5 h-3.5" /> Final Approve
                        </Button>
                        <Button size="sm" variant="destructive" className="gap-1"
                          onClick={() => triggerApproval(selected, 'final', 'reject')}>
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </Button>
                      </>
                    )}
                    {isOwn && ['pending', 'first_approved'].includes(selected.status) && (
                      <Button size="sm" variant="outline" className="gap-1"
                        onClick={() => handleCancel(selected.id)}>
                        <Ban className="w-3.5 h-3.5" /> Cancel Request
                      </Button>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="comments" className="mt-4 space-y-4">
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {comments.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-8">No comments yet</p>
                    ) : comments.map(c => (
                      <div key={c.id} className="p-3 rounded-lg bg-secondary/20 border border-border/30">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold">{c.authorName}</p>
                          <p className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</p>
                        </div>
                        <Badge variant="outline" className="text-xs mb-2">{c.authorRole}</Badge>
                        <p className="text-sm">{c.comment}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border/30">
                    <Input
                      placeholder="Add a comment…"
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            );
          })()}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LeavePage;
