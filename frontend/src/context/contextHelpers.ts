/**
 * context/contextHelpers.ts
 * Static configuration, route persistence, and session initializers for AppContext.
 */

import type { Teacher, UserRole, SubPage, AuthUser } from '../types';

export const API = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

// ─── Static seed data ──────────────────────────────────────────────────────────

export const SEED_TEACHERS: Teacher[] = [
  { id: 't1', name: 'Alisher Nazarov',  username: 'a.nazarov'   },
  { id: 't2', name: 'Feruza Mirzayeva', username: 'f.mirzayeva' },
  { id: 't3', name: 'Bobur Toshmatov',  username: 'b.toshmatov' },
];

// ─── ID & Date Helpers ─────────────────────────────────────────────────────────

export const nextToastId = () => `t${Date.now()}`;
export const todayISO    = () => new Date().toISOString().slice(0, 10);

// Default sub-pages per role
export const DEFAULT_SUBPAGE: Record<UserRole, SubPage> = {
  TEACHER:     'orders',
  CASHIER:     'pipeline',
  LOGISTICS:   'pipeline',
  MANAGER:     'analytics',
  SUPER_ADMIN: 'admin_console',
};

// Valid sub-pages per role
export const VALID_SUBPAGES: Record<UserRole, SubPage[]> = {
  TEACHER:     ['orders'],
  CASHIER:     ['pipeline', 'warehouse', 'management', 'payments'],
  LOGISTICS:   ['pipeline', 'supplier', 'history', 'warehouse', 'books', 'management', 'payments'],
  MANAGER:     ['analytics', 'ledger', 'groups', 'users', 'narxsozlama', 'admin_console'],
  SUPER_ADMIN: ['admin_console', 'ledger', 'analytics', 'groups', 'users', 'narxsozlama', 'supplier', 'history', 'books', 'warehouse', 'pipeline', 'orders'],
};

// ─── Route Persistence Helpers ─────────────────────────────────────────────────

export function parseHashRoute(): { role: UserRole; subPage: SubPage } | null {
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  if (!hash) return null;

  const parts = hash.split('/');
  const roleStr = parts[0]?.toUpperCase();
  const subStr = parts[1];

  const validRoles: UserRole[] = ['TEACHER', 'CASHIER', 'LOGISTICS', 'MANAGER', 'SUPER_ADMIN'];
  if (roleStr && validRoles.includes(roleStr as UserRole)) {
    const role = roleStr as UserRole;
    const defaultSub = DEFAULT_SUBPAGE[role];
    const subPage = (subStr as SubPage) || defaultSub;
    return { role, subPage };
  }
  return null;
}

export function updateHashRoute(role: UserRole, subPage: SubPage) {
  const hash = `#${role.toLowerCase()}/${subPage}`;
  if (window.location.hash !== hash) {
    window.history.replaceState(null, '', hash);
  }
  try {
    localStorage.setItem('smartbooks_route', JSON.stringify({ role, subPage }));
  } catch (e) {}
}

export function getInitialUser(): AuthUser | null {
  try {
    const saved = localStorage.getItem('smartbooks_auth_user');
    if (saved) {
      const u = JSON.parse(saved);
      if (u && (u.username === 'admin.dev' || u.username === 'superadmin')) {
        u.role = 'SUPER_ADMIN';
      }
      return u;
    }
  } catch (e) {}
  return null;
}

export function getInitialSubPage(user: AuthUser | null): SubPage {
  if (!user) return 'pipeline';
  const validSubs = VALID_SUBPAGES[user.role] || [];

  const hashRoute = parseHashRoute();
  if (hashRoute && validSubs.includes(hashRoute.subPage)) {
    return hashRoute.subPage;
  }

  try {
    const saved = localStorage.getItem('smartbooks_route');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.subPage && validSubs.includes(parsed.subPage)) {
        return parsed.subPage;
      }
    }
  } catch (e) {}

  return DEFAULT_SUBPAGE[user.role] || 'admin_console';
}
