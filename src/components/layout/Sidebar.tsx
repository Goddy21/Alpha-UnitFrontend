// src/components/Sidebar.tsx
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Shield, LayoutDashboard, Users, Building2, UserCog,
  Calendar, AlertTriangle, MapPin, Map, Video, Plane,
  Package, CreditCard, BarChart3, Globe, Bell, ChevronLeft,
  ChevronRight, Settings, LogOut, X, CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";

// ── Nav item definition ───────────────────────────────────────────────────────
interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  /** Permission key used in NAV_ACCESS (from usePermissions) */
  navKey: string;
  badge?: number;
}

/**
 * Master nav list.
 * Each item carries a `navKey` that maps to the NAV_ACCESS config
 * in usePermissions — items are shown only when canAccessNav(navKey) is true.
 */
const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard",        href: "/",            navKey: "dashboard" },
  { icon: Users,           label: "User & Roles",     href: "/users",       navKey: "users" },
  { icon: Building2,       label: "Clients & Contracts", href: "/clients",  navKey: "clients" },
  { icon: Map,             label: "Sites",             href: "/sites",       navKey: "sites" },
  { icon: UserCog,         label: "Personnel",         href: "/personnel",   navKey: "personnel" },
  { icon: Calendar,        label: "Scheduling",        href: "/scheduling",  navKey: "schedules" },
  { icon: CalendarDays,    label: "Events",            href: "/events",      navKey: "events" },
  { icon: CalendarDays,    label: "Leave",             href: "/leave",       navKey: "leave" },
  { icon: AlertTriangle,   label: "Incidents",         href: "/incidents",   navKey: "incidents",     badge: 3 },
  { icon: MapPin,          label: "Patrol & GPS",      href: "/patrol",      navKey: "patrol" },
  { icon: Video,           label: "CCTV & Alarms",     href: "/cctv",        navKey: "cctv" },
  { icon: Plane,           label: "Drone Ops",         href: "/drones",      navKey: "drones" },
  { icon: Package,         label: "Inventory",         href: "/inventory",   navKey: "inventory" },
  { icon: CreditCard,      label: "Billing & Payroll", href: "/billing",     navKey: "finance" },
  { icon: BarChart3,       label: "Reports",           href: "/reports",     navKey: "reports" },
  { icon: Globe,           label: "Client Portal",     href: "/portal",      navKey: "portal" },
  { icon: Bell,            label: "Notifications",     href: "/notifications", navKey: "notifications", badge: 12 },
];

// ── Role display config ───────────────────────────────────────────────────────
const ROLE_BADGE_COLORS: Record<string, string> = {
  "Admin":               "bg-destructive/15 text-destructive border-destructive/30",
  "Managing Director":   "bg-purple-500/15 text-purple-400 border-purple-500/30",
  "Director Logistics":  "bg-primary/15 text-primary border-primary/30",
  "HR Manager":          "bg-pink-500/15 text-pink-400 border-pink-500/30",
  "Finance Manager":     "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "Operations Manager":  "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "Supervisor":          "bg-success/15 text-success border-success/30",
  "Guard":               "bg-secondary text-muted-foreground border-border",
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const Sidebar = ({ mobileOpen = false, onMobileClose }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const location  = useLocation();
  const navigate  = useNavigate();
  const { role, user, canAccessNav } = usePermissions();

  // Filter nav items to only those the current role may see
  const visibleItems = NAV_ITEMS.filter(item => canAccessNav(item.navKey));

  // Close mobile drawer on route change
  useEffect(() => { onMobileClose?.(); }, [location.pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // ── Shared nav content ──────────────────────────────────────────────────────
  const NavContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const showLabel = !collapsed || isMobile;

    return (
      <>
        {/* ── Logo / brand ── */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-primary flex-shrink-0">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            {showLabel && (
              <div className="animate-fade-in">
                <h1 className="font-bold text-foreground">ISMS</h1>
                <p className="text-xs text-muted-foreground">Security Platform</p>
              </div>
            )}
          </div>

          {isMobile ? (
            <Button variant="ghost" size="icon" onClick={onMobileClose}
              className="text-muted-foreground hover:text-foreground" aria-label="Close menu">
              <X className="w-5 h-5" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => setCollapsed(c => !c)}
              className="text-muted-foreground hover:text-foreground">
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          )}
        </div>

        {/* ── Role badge ── */}
        {showLabel && role && (
          <div className="px-4 pt-3 pb-1">
            <span className={cn(
              "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border",
              ROLE_BADGE_COLORS[role] ?? ROLE_BADGE_COLORS["Guard"]
            )}>
              {role}
            </span>
            {user?.name && (
              <p className="text-xs text-muted-foreground mt-1.5 truncate">{user.name}</p>
            )}
          </div>
        )}

        {/* ── Navigation ── */}
        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {visibleItems.map((item) => {
            const Icon     = item.icon;
            const isActive = location.pathname === item.href ||
              (item.href !== "/" && location.pathname.startsWith(item.href));

            return (
              <Link key={item.href} to={item.href}
                className={cn(
                  "w-full flex items-center gap-3 px-3 rounded-lg transition-all duration-200 relative",
                  isMobile ? "py-3" : "py-2.5",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                )}>
                <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary")} />

                {showLabel && (
                  <>
                    <span className="text-sm font-medium truncate">{item.label}</span>
                    {item.badge != null && (
                      <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}

                {/* Badge in collapsed desktop mode */}
                {!showLabel && item.badge != null && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}

                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Footer ── */}
        <div className="p-3 border-t border-sidebar-border space-y-0.5 flex-shrink-0">
          <button onClick={() => navigate("/settings")}
            className={cn(
              "w-full flex items-center gap-3 px-3 rounded-lg transition-all text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
              isMobile ? "py-3" : "py-2.5"
            )}>
            <Settings className="w-5 h-5 flex-shrink-0" />
            {showLabel && <span className="text-sm font-medium">Settings</span>}
          </button>

          <button onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-3 rounded-lg transition-all text-destructive hover:bg-destructive/10",
              isMobile ? "py-3" : "py-2.5"
            )}>
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {showLabel && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Desktop sidebar (lg+) */}
      <aside className={cn(
        "hidden lg:flex h-screen bg-sidebar border-r border-sidebar-border flex-col transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}>
        <NavContent isMobile={false} />
      </aside>

      {/* Mobile drawer (< lg) */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onMobileClose} aria-hidden="true" />
          {/* Drawer panel */}
          <aside className="relative z-10 w-72 h-full bg-sidebar border-r border-sidebar-border flex flex-col animate-in slide-in-from-left duration-300">
            <NavContent isMobile={true} />
          </aside>
        </div>
      )}
    </>
  );
};