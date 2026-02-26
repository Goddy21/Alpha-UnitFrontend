import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Shield,
  LayoutDashboard,
  Users,
  Building2,
  UserCog,
  Calendar,
  AlertTriangle,
  MapPin,
  Map,
  Video,
  Plane,
  Package,
  CreditCard,
  BarChart3,
  Globe,
  Bell,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Users, label: "User & Roles", href: "/users" },
  { icon: Building2, label: "Clients & Contracts", href: "/clients" },
  { icon: Map, label: "Sites", href: "/sites" },
  { icon: UserCog, label: "Personnel", href: "/personnel" },
  { icon: Calendar, label: "Scheduling", href: "/scheduling" },
  { icon: AlertTriangle, label: "Incidents", href: "/incidents", badge: 3 },
  { icon: MapPin, label: "Patrol & GPS", href: "/patrol" },
  { icon: Video, label: "CCTV & Alarms", href: "/cctv" },
  { icon: Plane, label: "Drone Ops", href: "/drones" },
  { icon: Package, label: "Inventory", href: "/inventory" },
  { icon: CreditCard, label: "Billing & Payroll", href: "/billing" },
  { icon: BarChart3, label: "Reports", href: "/reports" },
  { icon: Globe, label: "Client Portal", href: "/portal" },
  { icon: Bell, label: "Notifications", href: "/notifications", badge: 12 },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar = ({ mobileOpen = false, onMobileClose }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close mobile sidebar on route change
  useEffect(() => {
    onMobileClose?.();
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
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

  // Shared nav content — rendered in both desktop sidebar and mobile drawer
  const NavContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-primary flex-shrink-0">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          {(!collapsed || isMobile) && (
            <div className="animate-fade-in">
              <h1 className="font-bold text-foreground">ISMS</h1>
              <p className="text-xs text-muted-foreground">Security Platform</p>
            </div>
          )}
        </div>

        {isMobile ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-muted-foreground hover:text-foreground"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "w-full flex items-center gap-3 px-3 rounded-lg transition-all duration-200 group relative",
                isMobile ? "py-3" : "py-2.5",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary")} />

              {(!collapsed || isMobile) && (
                <>
                  <span className="text-sm font-medium truncate">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}

              {/* Badge in collapsed desktop mode */}
              {collapsed && !isMobile && item.badge && (
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

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-1 flex-shrink-0">
        <button
          onClick={() => navigate("/settings")}
          className={cn(
            "w-full flex items-center gap-3 px-3 rounded-lg transition-all text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
            isMobile ? "py-3" : "py-2.5"
          )}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {(!collapsed || isMobile) && <span className="text-sm font-medium">Settings</span>}
        </button>

        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 rounded-lg transition-all text-destructive hover:bg-destructive/10",
            isMobile ? "py-3" : "py-2.5"
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {(!collapsed || isMobile) && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Desktop sidebar (lg+) ── */}
      <aside
        className={cn(
          "hidden lg:flex h-screen bg-sidebar border-r border-sidebar-border flex-col transition-all duration-300",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <NavContent isMobile={false} />
      </aside>

      {/* ── Mobile drawer (< lg) ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          {/* Drawer panel */}
          <aside className="relative z-10 w-72 h-full bg-sidebar border-r border-sidebar-border flex flex-col animate-in slide-in-from-left duration-300">
            <NavContent isMobile={true} />
          </aside>
        </div>
      )}
    </>
  );
};