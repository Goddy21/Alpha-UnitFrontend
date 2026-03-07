// ─────────────────────────────────────────────────────────────────────────────
// src/components/RoleGatedNav.tsx
// Drop this into your sidebar/navbar to show only permitted items.
// ─────────────────────────────────────────────────────────────────────────────
import {
  LayoutDashboard, Users, Shield, MapPin, Truck,
  AlertTriangle, CalendarDays, FileText, DollarSign,
  Settings, Activity,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

const NAV_ITEMS = [
  { key: 'dashboard',   label: 'Dashboard',    href: '/',              icon: LayoutDashboard },
  { key: 'users',       label: 'Users',         href: '/users',         icon: Users },
  { key: 'personnel',   label: 'Personnel',     href: '/personnel',     icon: Shield },
  { key: 'sites',       label: 'Sites',         href: '/sites',         icon: MapPin },
  { key: 'deployments', label: 'Deployments',   href: '/deployments',   icon: Truck },
  { key: 'incidents',   label: 'Incidents',     href: '/incidents',     icon: AlertTriangle },
  { key: 'schedules',   label: 'Schedules',     href: '/schedules',     icon: CalendarDays },
  { key: 'leave',       label: 'Leave',         href: '/leave',         icon: CalendarDays },
  { key: 'finance',     label: 'Finance',       href: '/finance',       icon: DollarSign },
  { key: 'invoices',    label: 'Invoices',      href: '/invoices',      icon: FileText },
  { key: 'reports',     label: 'Reports',       href: '/reports',       icon: Activity },
  { key: 'settings',    label: 'Settings',      href: '/settings',      icon: Settings },
];

export const RoleGatedNav = ({ currentPath }: { currentPath: string }) => {
  const { canAccessNav, role } = usePermissions();

  const visibleItems = NAV_ITEMS.filter(item => canAccessNav(item.key));

  return (
    <nav className="space-y-1">
      {/* Role badge */}
      <div className="px-3 py-2 mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {role}
        </span>
      </div>

      {visibleItems.map(item => {
        const Icon = item.icon;
        const isActive = currentPath === item.href ||
          (item.href !== '/' && currentPath.startsWith(item.href));
        return (
          <a key={item.key} href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            {item.label}
          </a>
        );
      })}
    </nav>
  );
};