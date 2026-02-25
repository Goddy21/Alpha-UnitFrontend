// src/components/Sidebar.tsx
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Shield, LayoutDashboard, Users, Building2, UserCog, Calendar,
  AlertTriangle, MapPin, Video, Plane, Package, CreditCard,
  BarChart3, Globe, Bell, ChevronLeft, ChevronRight, Settings, LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBadges } from "@/context/BadgeContext"; // ← shared context, no extra fetch

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badgeKey?: "notifications" | "incidents";
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard",           href: "/" },
  { icon: Users,           label: "User & Roles",        href: "/users" },
  { icon: Building2,       label: "Clients & Contracts", href: "/clients" },
  { icon: UserCog,         label: "Personnel",           href: "/personnel" },
  { icon: Calendar,        label: "Scheduling",          href: "/scheduling" },
  { icon: AlertTriangle,   label: "Incidents",           href: "/incidents",     badgeKey: "incidents" },
  { icon: MapPin,          label: "Patrol & GPS",        href: "/patrol" },
  { icon: Video,           label: "CCTV & Alarms",       href: "/cctv" },
  { icon: Plane,           label: "Drone Ops",           href: "/drones" },
  { icon: Package,         label: "Inventory",           href: "/inventory" },
  { icon: CreditCard,      label: "Billing & Payroll",   href: "/billing" },
  { icon: BarChart3,       label: "Reports",             href: "/reports" },
  { icon: Globe,           label: "Client Portal",       href: "/portal" },
  { icon: Bell,            label: "Notifications",       href: "/notifications", badgeKey: "notifications" },
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { badges } = useBadges(); // no fetch here — BadgeProvider handles it once
  const location   = useLocation();
  const navigate   = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-primary">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="font-bold text-foreground">ISMS</h1>
              <p className="text-xs text-muted-foreground">Security Platform</p>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon     = item.icon;
          const isActive = location.pathname === item.href;
          const count    = item.badgeKey ? badges[item.badgeKey] : 0;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary")} />

              {!collapsed && (
                <>
                  <span className="text-sm font-medium truncate">{item.label}</span>
                  {count > 0 && (
                    <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </>
              )}

              {/* Collapsed badge dot */}
              {collapsed && count > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                  {count > 9 ? "9+" : count}
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
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <button
          onClick={() => navigate("/settings")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
        >
          <Settings className="w-5 h-5" />
          {!collapsed && <span className="text-sm font-medium">Settings</span>}
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
};