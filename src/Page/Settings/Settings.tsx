import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  User, Lock, Bell, Palette, Shield, Globe, Database,
  Save, Eye, EyeOff, Upload, Loader2, CheckCircle,
  AlertTriangle, Monitor, Moon, Sun, Smartphone,
  Mail, MessageSquare, Volume2, Building2, Clock,
  Key, RefreshCw, Trash2, LogOut, ChevronRight, X,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string; name: string; email: string; phone?: string;
  role: string; avatar?: string; department?: string;
  employee_id?: string; timezone?: string; language?: string;
}

interface SystemSettings {
  company_name: string; company_email: string; company_phone: string;
  company_address: string; session_timeout: number; max_login_attempts: number;
  password_expiry_days: number; two_factor_enabled: boolean;
  audit_log_retention: number; timezone: string; date_format: string; currency: string;
}

interface NotificationPrefs {
  email_incidents: boolean; email_system: boolean; email_reports: boolean;
  push_incidents: boolean; push_alerts: boolean; sms_critical: boolean;
  digest_frequency: string;
}

// ── Tabs config ───────────────────────────────────────────────────────────────

const tabs = [
  { id: "profile",       label: "Profile",       icon: User },
  { id: "security",      label: "Security",      icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "system",        label: "System",        icon: Building2 },
  { id: "appearance",    label: "Appearance",    icon: Palette },
  { id: "sessions",      label: "Sessions",      icon: Monitor },
] as const;

type TabId = typeof tabs[number]["id"];

// ── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({ open, title, description, confirmLabel = "Confirm", confirmVariant = "destructive", onConfirm, onCancel }: {
  open: boolean; title: string; description: string;
  confirmLabel?: string; confirmVariant?: "destructive" | "default";
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
          <Button variant={confirmVariant} onClick={onConfirm} className="w-full sm:w-auto">{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────

const Toggle = ({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) => (
  <div className="flex items-center justify-between py-3 gap-4">
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0",
        checked ? "bg-primary" : "bg-border"
      )}
    >
      <span className={cn(
        "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200",
        checked && "translate-x-5"
      )} />
    </button>
  </div>
);

// ── Section wrapper ───────────────────────────────────────────────────────────

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="glass-card rounded-xl border border-border/50 overflow-hidden mb-4 sm:mb-6">
    <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border/50 bg-secondary/20">
      <h3 className="font-semibold text-foreground text-xs sm:text-sm tracking-wide uppercase">{title}</h3>
    </div>
    <div className="px-4 sm:px-6 py-4 sm:py-5">{children}</div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

export const SettingsPage = () => {
  const { toast } = useToast();
  const [activeTab,   setActiveTab]   = useState<TabId>("profile");
  const [saving,      setSaving]      = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // confirm modals
  const [revokeTarget,    setRevokeTarget]    = useState<string | null>(null);
  const [revokeAllOpen,   setRevokeAllOpen]   = useState(false);

  // Profile
  const [profile, setProfile] = useState<UserProfile>({
    id: "", name: "", email: "", phone: "", role: "",
    department: "", timezone: "Africa/Nairobi", language: "en",
  });

  // Password
  const [pwForm,     setPwForm]     = useState({ current: "", next: "", confirm: "" });
  const [showPw,     setShowPw]     = useState({ current: false, next: false, confirm: false });
  const [pwStrength, setPwStrength] = useState(0);

  // System
  const [system, setSystem] = useState<SystemSettings>({
    company_name: "ISMS Security", company_email: "", company_phone: "",
    company_address: "", session_timeout: 60, max_login_attempts: 5,
    password_expiry_days: 90, two_factor_enabled: false,
    audit_log_retention: 365, timezone: "Africa/Nairobi",
    date_format: "DD/MM/YYYY", currency: "KES",
  });

  // Notifications
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    email_incidents: true, email_system: true, email_reports: false,
    push_incidents: true, push_alerts: true, sms_critical: false,
    digest_frequency: "daily",
  });

  // Appearance
  const [theme,   setTheme]   = useState("dark");
  const [density, setDensity] = useState("comfortable");

  // Sessions
  const [sessions, setSessions] = useState<any[]>([]);

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const stored = localStorage.getItem("user");
        if (stored) setProfile(prev => ({ ...prev, ...JSON.parse(stored) }));

        const [profileRes, settingsRes] = await Promise.allSettled([
          api.get("/users/profile"),
          api.get("/settings"),
        ]);

        if (profileRes.status === "fulfilled" && profileRes.value.data.success)
          setProfile(profileRes.value.data.data);
        if (settingsRes.status === "fulfilled" && settingsRes.value.data.success) {
          const d = settingsRes.value.data.data;
          if (d.system)        setSystem(s => ({ ...s, ...d.system }));
          if (d.notifications) setNotifPrefs(n => ({ ...n, ...d.notifications }));
          if (d.appearance)    { setTheme(d.appearance.theme || "dark"); setDensity(d.appearance.density || "comfortable"); }
        }
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    const p = pwForm.next;
    let s = 0;
    if (p.length >= 8)           s++;
    if (/[A-Z]/.test(p))         s++;
    if (/[0-9]/.test(p))         s++;
    if (/[^A-Za-z0-9]/.test(p))  s++;
    if (p.length >= 12)           s++;
    setPwStrength(s);
  }, [pwForm.next]);

  // ── Saves ─────────────────────────────────────────────────────────────────

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.put("/users/profile", { name: profile.name, phone: profile.phone, department: profile.department, timezone: profile.timezone, language: profile.language });
      const stored = localStorage.getItem("user");
      if (stored) localStorage.setItem("user", JSON.stringify({ ...JSON.parse(stored), name: profile.name, email: profile.email }));
      toast({ title: "Profile saved", description: "Your profile has been updated." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.response?.data?.message ?? e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (!pwForm.current || !pwForm.next) return toast({ title: "Fill all fields", variant: "destructive" });
    if (pwForm.next !== pwForm.confirm)  return toast({ title: "Passwords don't match", variant: "destructive" });
    if (pwStrength < 3)                  return toast({ title: "Password too weak", description: "Use 8+ chars with uppercase, number and symbol.", variant: "destructive" });
    setSaving(true);
    try {
      await api.put("/users/password", { currentPassword: pwForm.current, newPassword: pwForm.next });
      setPwForm({ current: "", next: "", confirm: "" });
      toast({ title: "Password changed" });
    } catch (e: any) {
      toast({ title: "Change failed", description: e.response?.data?.message ?? e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const saveSystem = async () => {
    setSaving(true);
    try { await api.put("/settings/system", system); toast({ title: "System settings saved" }); }
    catch (e: any) { toast({ title: "Save failed", description: e.response?.data?.message ?? e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const saveNotifications = async () => {
    setSaving(true);
    try { await api.put("/settings/notifications", notifPrefs); toast({ title: "Notification preferences saved" }); }
    catch (e: any) { toast({ title: "Save failed", description: e.response?.data?.message ?? e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const saveAppearance = async () => {
    setSaving(true);
    try { await api.put("/settings/appearance", { theme, density }); toast({ title: "Appearance saved" }); }
    catch (e: any) { toast({ title: "Save failed", description: e.response?.data?.message ?? e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      await api.delete(`/settings/sessions/${sessionId}`);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast({ title: "Session revoked" });
    } catch { toast({ title: "Failed to revoke session", variant: "destructive" }); }
    finally { setRevokeTarget(null); }
  };

  const revokeAllSessions = async () => {
    try {
      await api.delete("/settings/sessions");
      setSessions([]);
      toast({ title: "All other sessions revoked" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setRevokeAllOpen(false); }
  };

  const strengthLabel = ["", "Very Weak", "Weak", "Fair", "Strong", "Very Strong"][pwStrength];
  const strengthColor = ["", "bg-destructive", "bg-orange-500", "bg-yellow-500", "bg-success", "bg-success"][pwStrength];

  const handleTabSelect = (id: TabId) => {
    setActiveTab(id);
    setSidebarOpen(false);
  };

  // ── Sidebar content ───────────────────────────────────────────────────────

  const SidebarNav = () => (
    <nav className="space-y-1">
      {tabs.map(tab => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => handleTabSelect(tab.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {tab.label}
            {activeTab === tab.id && <ChevronRight className="w-3 h-3 ml-auto" />}
          </button>
        );
      })}
    </nav>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background px-3 py-4 sm:px-6 sm:py-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-5 sm:mb-8 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
              <Shield className="w-5 h-5 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
              <span className="truncate">Settings</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              Manage your account, security, and system preferences
            </p>
          </div>
          {/* Mobile menu toggle */}
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden flex-shrink-0"
            onClick={() => setSidebarOpen(v => !v)}
          >
            <Menu className="w-4 h-4" />
          </Button>
        </div>

        {/* Mobile: current tab label pill */}
        <div className="lg:hidden mb-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 w-fit">
            {(() => { const t = tabs.find(t => t.id === activeTab)!; const Icon = t.icon; return <><Icon className="w-4 h-4 text-primary" /><span className="text-sm font-medium text-primary">{t.label}</span></>; })()}
          </div>
        </div>

        {/* Mobile slide-in sidebar */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <div className="relative z-50 w-64 bg-background border-r border-border h-full p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-foreground text-sm">Navigation</p>
                <button onClick={() => setSidebarOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <SidebarNav />
            </div>
          </div>
        )}

        <div className="flex gap-4 sm:gap-6">

          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="sticky top-6">
              <SidebarNav />
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">

            {/* ══ PROFILE ══════════════════════════════════════════════════ */}
            {activeTab === "profile" && (
              <div>
                <Section title="Personal Information">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-5 pb-5 border-b border-border/50">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-xl sm:text-2xl font-bold text-primary">
                        {profile.name?.charAt(0)?.toUpperCase() || "?"}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{profile.name || "—"}</p>
                      <p className="text-sm text-muted-foreground">{profile.role} · {profile.employee_id || "No ID"}</p>
                      <Button variant="outline" size="sm" className="mt-2 gap-2 text-xs" disabled>
                        <Upload className="w-3 h-3" /> Upload Photo
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Full Name</Label>
                      <Input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email Address</Label>
                      <Input value={profile.email} disabled className="opacity-60" />
                      <p className="text-xs text-muted-foreground">Contact admin to change email</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone Number</Label>
                      <Input value={profile.phone || ""} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+254 7XX XXX XXX" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Department</Label>
                      <Input value={profile.department || ""} onChange={e => setProfile(p => ({ ...p, department: e.target.value }))} placeholder="e.g. Operations" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Timezone</Label>
                      <Select value={profile.timezone} onValueChange={v => setProfile(p => ({ ...p, timezone: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Africa/Nairobi">Africa/Nairobi (EAT)</SelectItem>
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                          <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                          <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Language</Label>
                      <Select value={profile.language} onValueChange={v => setProfile(p => ({ ...p, language: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="sw">Swahili</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end">
                    <Button onClick={saveProfile} disabled={saving} className="gap-2 w-full sm:w-auto">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Profile
                    </Button>
                  </div>
                </Section>
              </div>
            )}

            {/* ══ SECURITY ═════════════════════════════════════════════════ */}
            {activeTab === "security" && (
              <div>
                <Section title="Change Password">
                  <div className="space-y-4 max-w-full sm:max-w-md">
                    {(["current", "next", "confirm"] as const).map(field => (
                      <div key={field} className="space-y-1.5">
                        <Label>
                          {field === "current" ? "Current Password" : field === "next" ? "New Password" : "Confirm New Password"}
                        </Label>
                        <div className="relative">
                          <Input
                            type={showPw[field] ? "text" : "password"}
                            value={pwForm[field]}
                            onChange={e => setPwForm(p => ({ ...p, [field]: e.target.value }))}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPw(s => ({ ...s, [field]: !s[field] }))}
                          >
                            {showPw[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    ))}
                    {pwForm.next && (
                      <div>
                        <div className="flex gap-1 mb-1">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= pwStrength ? strengthColor : "bg-border")} />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">{strengthLabel}</p>
                      </div>
                    )}
                    <Button onClick={changePassword} disabled={saving} className="gap-2 w-full">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                      Update Password
                    </Button>
                  </div>
                </Section>

                <Section title="Two-Factor Authentication">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">Authenticator App</p>
                      <p className="text-sm text-muted-foreground mt-1">Use an authenticator app like Google Authenticator or Authy for an extra layer of security.</p>
                      <Button variant="outline" size="sm" className="mt-3 gap-2">
                        <Shield className="w-3 h-3" /> Enable 2FA
                      </Button>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground whitespace-nowrap">Not enabled</span>
                  </div>
                </Section>

                <Section title="Login History">
                  <div className="space-y-2 sm:space-y-3">
                    {[
                      { device: "Chrome on Windows", location: "Nairobi, KE", time: "Just now", current: true },
                      { device: "Mobile App (Android)", location: "Nairobi, KE", time: "2 hours ago", current: false },
                      { device: "Firefox on macOS", location: "Mombasa, KE", time: "Yesterday", current: false },
                    ].map((entry, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20">
                        <Monitor className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{entry.device}</p>
                          <p className="text-xs text-muted-foreground">{entry.location} · {entry.time}</p>
                        </div>
                        {entry.current
                          ? <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success whitespace-nowrap">Current</span>
                          : <button className="text-xs text-destructive hover:underline whitespace-nowrap">Revoke</button>
                        }
                      </div>
                    ))}
                  </div>
                </Section>
              </div>
            )}

            {/* ══ NOTIFICATIONS ════════════════════════════════════════════ */}
            {activeTab === "notifications" && (
              <div>
                <Section title="Email Notifications">
                  <div className="divide-y divide-border/30">
                    <Toggle checked={notifPrefs.email_incidents} onChange={v => setNotifPrefs(n => ({ ...n, email_incidents: v }))} label="Incident Alerts" description="Receive emails for new and updated incidents" />
                    <Toggle checked={notifPrefs.email_system}    onChange={v => setNotifPrefs(n => ({ ...n, email_system: v }))}    label="System Notifications" description="Server alerts, maintenance windows, and system updates" />
                    <Toggle checked={notifPrefs.email_reports}   onChange={v => setNotifPrefs(n => ({ ...n, email_reports: v }))}   label="Scheduled Reports" description="Automated report delivery via email" />
                  </div>
                </Section>
                <Section title="Push Notifications">
                  <div className="divide-y divide-border/30">
                    <Toggle checked={notifPrefs.push_incidents} onChange={v => setNotifPrefs(n => ({ ...n, push_incidents: v }))} label="Incident Push Alerts" description="Browser push notifications for critical incidents" />
                    <Toggle checked={notifPrefs.push_alerts}    onChange={v => setNotifPrefs(n => ({ ...n, push_alerts: v }))}    label="Security Alerts" description="Real-time push for alarms and breaches" />
                  </div>
                </Section>
                <Section title="SMS Notifications">
                  <div className="divide-y divide-border/30">
                    <Toggle checked={notifPrefs.sms_critical} onChange={v => setNotifPrefs(n => ({ ...n, sms_critical: v }))} label="Critical Alerts via SMS" description="SMS for P1 incidents only (charges may apply)" />
                  </div>
                </Section>
                <Section title="Digest Settings">
                  <div className="space-y-1.5 max-w-full sm:max-w-xs">
                    <Label>Email Digest Frequency</Label>
                    <Select value={notifPrefs.digest_frequency} onValueChange={v => setNotifPrefs(n => ({ ...n, digest_frequency: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">Real-time</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="never">Never</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mt-5 flex justify-end">
                    <Button onClick={saveNotifications} disabled={saving} className="gap-2 w-full sm:w-auto">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Preferences
                    </Button>
                  </div>
                </Section>
              </div>
            )}

            {/* ══ SYSTEM ═══════════════════════════════════════════════════ */}
            {activeTab === "system" && (
              <div>
                {profile.role !== "Admin" ? (
                  <div className="glass-card rounded-xl border border-border/50 p-10 sm:p-12 text-center">
                    <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                    <p className="font-medium text-foreground">Admin Access Required</p>
                    <p className="text-sm text-muted-foreground mt-1">Only administrators can manage system settings.</p>
                  </div>
                ) : (
                  <>
                    <Section title="Company Information">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>Company Name</Label>
                          <Input value={system.company_name} onChange={e => setSystem(s => ({ ...s, company_name: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Company Email</Label>
                          <Input type="email" value={system.company_email} onChange={e => setSystem(s => ({ ...s, company_email: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Company Phone</Label>
                          <Input value={system.company_phone} onChange={e => setSystem(s => ({ ...s, company_phone: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Currency</Label>
                          <Select value={system.currency} onValueChange={v => setSystem(s => ({ ...s, currency: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="KES">KES — Kenyan Shilling</SelectItem>
                              <SelectItem value="USD">USD — US Dollar</SelectItem>
                              <SelectItem value="GBP">GBP — British Pound</SelectItem>
                              <SelectItem value="EUR">EUR — Euro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-1 sm:col-span-2 space-y-1.5">
                          <Label>Company Address</Label>
                          <Textarea value={system.company_address} onChange={e => setSystem(s => ({ ...s, company_address: e.target.value }))} rows={2} />
                        </div>
                      </div>
                    </Section>

                    <Section title="Security Policy">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>Session Timeout (minutes)</Label>
                          <Input type="number" min={5} max={480} value={system.session_timeout}
                            onChange={e => setSystem(s => ({ ...s, session_timeout: parseInt(e.target.value) }))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Max Login Attempts</Label>
                          <Input type="number" min={3} max={20} value={system.max_login_attempts}
                            onChange={e => setSystem(s => ({ ...s, max_login_attempts: parseInt(e.target.value) }))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Password Expiry (days)</Label>
                          <Input type="number" min={0} max={365} value={system.password_expiry_days}
                            onChange={e => setSystem(s => ({ ...s, password_expiry_days: parseInt(e.target.value) }))} />
                          <p className="text-xs text-muted-foreground">Set to 0 to disable expiry</p>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Audit Log Retention (days)</Label>
                          <Input type="number" min={30} value={system.audit_log_retention}
                            onChange={e => setSystem(s => ({ ...s, audit_log_retention: parseInt(e.target.value) }))} />
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <Toggle checked={system.two_factor_enabled} onChange={v => setSystem(s => ({ ...s, two_factor_enabled: v }))}
                          label="Require 2FA for All Users"
                          description="Force all staff accounts to set up two-factor authentication" />
                      </div>
                    </Section>

                    <Section title="Regional Settings">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>System Timezone</Label>
                          <Select value={system.timezone} onValueChange={v => setSystem(s => ({ ...s, timezone: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Africa/Nairobi">Africa/Nairobi (EAT +3)</SelectItem>
                              <SelectItem value="UTC">UTC</SelectItem>
                              <SelectItem value="Europe/London">Europe/London</SelectItem>
                              <SelectItem value="America/New_York">America/New_York</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Date Format</Label>
                          <Select value={system.date_format} onValueChange={v => setSystem(s => ({ ...s, date_format: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                              <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                              <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </Section>

                    <div className="flex justify-end">
                      <Button onClick={saveSystem} disabled={saving} className="gap-2 w-full sm:w-auto">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save System Settings
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ══ APPEARANCE ═══════════════════════════════════════════════ */}
            {activeTab === "appearance" && (
              <div>
                <Section title="Theme">
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { id: "dark",   label: "Dark",   icon: Moon },
                      { id: "light",  label: "Light",  icon: Sun },
                      { id: "system", label: "System", icon: Monitor },
                    ].map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => setTheme(id)}
                        className={cn(
                          "p-3 sm:p-4 rounded-xl border-2 flex flex-col items-center gap-1.5 sm:gap-2 transition-all",
                          theme === id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                        <span className="text-xs sm:text-sm font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </Section>

                <Section title="Density">
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {["compact", "comfortable", "spacious"].map(d => (
                      <button
                        key={d}
                        onClick={() => setDensity(d)}
                        className={cn(
                          "p-3 sm:p-4 rounded-xl border-2 flex flex-col items-center gap-1.5 sm:gap-2 transition-all capitalize",
                          density === d
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        <div className={cn("flex flex-col gap-1 w-7 sm:w-8", d === "compact" && "gap-0.5", d === "spacious" && "gap-2")}>
                          {[1,2,3].map(i => <div key={i} className="h-1.5 bg-current rounded opacity-60" />)}
                        </div>
                        <span className="text-xs sm:text-sm font-medium">{d}</span>
                      </button>
                    ))}
                  </div>
                </Section>

                <div className="flex justify-end">
                  <Button onClick={saveAppearance} disabled={saving} className="gap-2 w-full sm:w-auto">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Appearance
                  </Button>
                </div>
              </div>
            )}

            {/* ══ SESSIONS ═════════════════════════════════════════════════ */}
            {activeTab === "sessions" && (
              <div>
                <Section title="Active Sessions">
                  <p className="text-sm text-muted-foreground mb-4">
                    These are all devices currently signed into your account. Revoke any sessions you don't recognise.
                  </p>

                  {/* Sessions table */}
                  <div className="glass-card rounded-xl border border-border/50 overflow-hidden mb-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[420px]">
                        <thead className="bg-secondary/30 border-b border-border/50">
                          <tr>
                            {["Device","Location","Last Active","Actions"].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {sessions.length === 0
                            ? [
                                { id: "s1", device: "Chrome on Windows 11", location: "Nairobi, Kenya", ip: "196.201.x.x", time: "Active now", current: true },
                                { id: "s2", device: "ISMS Mobile (Android)", location: "Nairobi, Kenya", ip: "196.201.x.x", time: "1 hour ago", current: false },
                              ].map(s => (
                                <tr key={s.id} className="hover:bg-secondary/20 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2.5">
                                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                                        s.current ? "bg-success/10" : "bg-secondary")}>
                                        <Monitor className={cn("w-3.5 h-3.5", s.current ? "text-success" : "text-muted-foreground")} />
                                      </div>
                                      <span className="font-medium text-foreground text-xs sm:text-sm truncate max-w-[140px]">{s.device}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{s.location}</td>
                                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{s.time}</td>
                                  <td className="px-4 py-3">
                                    {s.current
                                      ? <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium whitespace-nowrap">This device</span>
                                      : <Button variant="outline" size="sm"
                                          className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1 h-7 text-xs px-2"
                                          onClick={() => setRevokeTarget(s.id)}>
                                          <LogOut className="w-3 h-3" /> Revoke
                                        </Button>
                                    }
                                  </td>
                                </tr>
                              ))
                            : sessions.map(s => (
                                <tr key={s.id} className="hover:bg-secondary/20 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2.5">
                                      <Monitor className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                      <span className="font-medium text-foreground text-xs sm:text-sm truncate max-w-[140px]">{s.device}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{s.ip}</td>
                                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{s.last_active}</td>
                                  <td className="px-4 py-3">
                                    {!s.current && (
                                      <Button variant="outline" size="sm"
                                        className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1 h-7 text-xs px-2"
                                        onClick={() => setRevokeTarget(s.id)}>
                                        <LogOut className="w-3 h-3" /> Revoke
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              ))
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setRevokeAllOpen(true)}
                      className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 w-full sm:w-auto"
                    >
                      <LogOut className="w-4 h-4" /> Revoke All Other Sessions
                    </Button>
                  </div>
                </Section>
              </div>
            )}

          </main>
        </div>
      </div>

      {/* Revoke single session confirm */}
      <ConfirmModal
        open={revokeTarget !== null}
        title="Revoke Session"
        description="Are you sure you want to revoke this session? The device will be signed out immediately."
        confirmLabel="Revoke"
        onConfirm={() => revokeTarget && revokeSession(revokeTarget)}
        onCancel={() => setRevokeTarget(null)}
      />

      {/* Revoke all sessions confirm */}
      <ConfirmModal
        open={revokeAllOpen}
        title="Revoke All Other Sessions"
        description="This will sign out all devices except your current one. Are you sure?"
        confirmLabel="Revoke All"
        onConfirm={revokeAllSessions}
        onCancel={() => setRevokeAllOpen(false)}
      />
    </div>
  );
};

export default SettingsPage;