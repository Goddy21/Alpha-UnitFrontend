// src/hooks/usePermissions.ts
/**
 * Hook for role-based UI access control.
 * Mirrors the server-side ROLE_PERMISSIONS config.
 */

export const ROLES = {
  ADMIN:               'Admin',
  MANAGING_DIRECTOR:   'Managing Director',
  DIRECTOR_LOGISTICS:  'Director Logistics',
  HR_MANAGER:          'HR Manager',
  FINANCE_MANAGER:     'Finance Manager',
  OPERATIONS_MANAGER:  'Operations Manager',
  SUPERVISOR:          'Supervisor',
  GUARD:               'Guard',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

/** Full permission map per role — mirrors server roles.config.js */
const ROLE_PERMISSIONS: Record<Role, string[]> = {
  [ROLES.ADMIN]: ['*'],
  [ROLES.MANAGING_DIRECTOR]: ['*'],

  [ROLES.DIRECTOR_LOGISTICS]: [
    'users:view', 'personnel:view', 'personnel:create', 'personnel:edit',
    'sites:view', 'sites:create', 'sites:edit', 'sites:delete',
    'deployments:view', 'deployments:manage',
    'incidents:view', 'incidents:manage',
    'schedules:view', 'schedules:create', 'schedules:edit',
    'leave:view_all', 'leave:approve',
    'reports:view', 'reports:export', 'reports:advanced',
    'cctv:view', 'patrol:tracking', 'system:audit_logs',
  ],

  [ROLES.HR_MANAGER]: [
    'users:view', 'users:create', 'users:edit',
    'personnel:view', 'personnel:create', 'personnel:edit', 'personnel:delete',
    'leave:view_all', 'leave:approve', 'leave:final_approve', 'leave:manage',
    'schedules:view', 'schedules:create', 'schedules:edit',
    'reports:view', 'reports:export',
  ],

  [ROLES.FINANCE_MANAGER]: [
    'users:view',
    'finance:view', 'finance:manage',
    'invoices:view', 'invoices:create',
    'reports:view', 'reports:export',
    'leave:view_all',
  ],

  [ROLES.OPERATIONS_MANAGER]: [
    'users:view',
    'personnel:view', 'personnel:create', 'personnel:edit',
    'sites:view', 'sites:create', 'sites:edit',
    'deployments:view', 'deployments:manage',
    'incidents:view', 'incidents:manage',
    'schedules:view', 'schedules:create', 'schedules:edit',
    'leave:view_team', 'leave:approve',
    'reports:view', 'reports:export',
    'cctv:view', 'patrol:tracking',
  ],

  [ROLES.SUPERVISOR]: [
    'personnel:view',
    'sites:view',
    'deployments:view',
    'incidents:view', 'incidents:report', 'incidents:manage',
    'schedules:view', 'schedules:edit',
    'leave:view_own', 'leave:apply', 'leave:view_team', 'leave:approve',
    'reports:view',
    'cctv:view', 'patrol:tracking',
  ],

  [ROLES.GUARD]: [
    'incidents:report',
    'schedules:view',
    'leave:view_own', 'leave:apply',
    'patrol:tracking',
  ],
};

/** Nav items visible to each role */
/** Nav items visible to each role — keys must match `navKey` in Sidebar's NAV_ITEMS */
export const NAV_ACCESS: Record<Role, string[]> = {
  [ROLES.ADMIN]: [
    'dashboard', 'users', 'clients', 'sites', 'personnel', 'schedules',
    'events', 'leave', 'incidents', 'patrol', 'cctv', 'drones',
    'inventory', 'finance', 'reports', 'portal', 'notifications', 'settings',
  ],
  [ROLES.MANAGING_DIRECTOR]: [
    'dashboard', 'users', 'clients', 'sites', 'personnel', 'schedules',
    'events', 'leave', 'incidents', 'patrol', 'cctv', 'drones',
    'inventory', 'finance', 'reports', 'portal', 'notifications', 'settings',
  ],
  [ROLES.DIRECTOR_LOGISTICS]: [
    'dashboard', 'personnel', 'clients', 'sites', 'schedules', 'events',
    'leave', 'incidents', 'patrol', 'cctv', 'drones', 'inventory',
    'reports', 'notifications',
  ],
  [ROLES.HR_MANAGER]: [
    'dashboard', 'users', 'personnel', 'schedules', 'leave',
    'reports', 'notifications',
  ],
  [ROLES.FINANCE_MANAGER]: [
    'dashboard', 'finance', 'clients', 'leave', 'reports', 'notifications',
  ],
  [ROLES.OPERATIONS_MANAGER]: [
    'dashboard', 'personnel', 'sites', 'schedules', 'events', 'leave',
    'incidents', 'patrol', 'cctv', 'reports', 'notifications',
  ],
  [ROLES.SUPERVISOR]: [
    'dashboard', 'personnel', 'sites', 'schedules', 'events', 'leave',
    'incidents', 'patrol', 'cctv', 'reports', 'notifications',
  ],
  [ROLES.GUARD]: [
    'dashboard', 'schedules', 'leave', 'incidents', 'patrol', 'notifications',
  ],
};

/** Roles that can approve leave at first level */
export const LEAVE_FIRST_APPROVERS: Role[] = [
  ROLES.SUPERVISOR, ROLES.OPERATIONS_MANAGER, ROLES.DIRECTOR_LOGISTICS,
  ROLES.HR_MANAGER, ROLES.MANAGING_DIRECTOR, ROLES.ADMIN,
];

/** Roles that can give final leave approval */
export const LEAVE_FINAL_APPROVERS: Role[] = [
  ROLES.HR_MANAGER, ROLES.MANAGING_DIRECTOR, ROLES.ADMIN,
];

// ─────────────────────────────────────────────────────────────────────────────

export function usePermissions() {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const role: Role = user?.role ?? ROLES.GUARD;

  const permissions = ROLE_PERMISSIONS[role] ?? [];
  const isSenior    = role === ROLES.ADMIN || role === ROLES.MANAGING_DIRECTOR;

  /**
   * Check if the current user has a given permission.
   * Senior roles (Admin, MD) always return true.
   */
  const can = (permission: string): boolean => {
    if (isSenior) return true;
    if (permissions.includes('*')) return true;
    // Support wildcard prefix: e.g. can('personnel:*') matches 'personnel:view', 'personnel:edit' …
    return permissions.some(p => {
      if (p === permission) return true;
      if (p.endsWith(':*')) {
        const prefix = p.slice(0, -2);
        return permission.startsWith(prefix + ':');
      }
      return false;
    });
  };

  /** Check if a nav section should be visible */
  const canAccessNav = (navKey: string): boolean => {
    return isSenior || (NAV_ACCESS[role]?.includes(navKey) ?? false);
  };

  /** Check if the user is in a given role or above */
  const isRole = (...roles: Role[]): boolean => roles.includes(role);

  /** Can the user approve leave at first level? */
  const canFirstApproveLeave = (): boolean =>
    LEAVE_FIRST_APPROVERS.includes(role);

  /** Can the user give final leave approval? */
  const canFinalApproveLeave = (): boolean =>
    LEAVE_FINAL_APPROVERS.includes(role);

  return {
    role,
    user,
    can,
    canAccessNav,
    isRole,
    canFirstApproveLeave,
    canFinalApproveLeave,
    isSenior,
  };
}
