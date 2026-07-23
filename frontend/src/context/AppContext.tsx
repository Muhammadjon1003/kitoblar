/**
 * context/AppContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Core state engine. Holds ALL business data, authentication, and exposes every mutation.
 * Session guard: All mutations check if user is logged in.
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type {
  Teacher, Group, Student, InventoryItem, Order, OrderStatus,
  SystemNotification, AppToast, BulkOrderItem,
  UserRole, SubPage, AuthUser,
} from '../types';

const API = 'https://kitoblar-seven.vercel.app';

// ─── Static seed data (non-persisted) ─────────────────────────────────────────

export const SEED_TEACHERS: Teacher[] = [
  { id: 't1', name: 'Alisher Nazarov',  username: 'a.nazarov'   },
  { id: 't2', name: 'Feruza Mirzayeva', username: 'f.mirzayeva' },
  { id: 't3', name: 'Bobur Toshmatov',  username: 'b.toshmatov' },
];

// ─── ID helpers ────────────────────────────────────────────────────────────────

const nextToastId = () => `t${Date.now()}`;
const todayISO    = () => new Date().toISOString().slice(0, 10);

// Default sub-pages per role
const DEFAULT_SUBPAGE: Record<UserRole, SubPage> = {
  TEACHER:   'orders',
  CASHIER:   'pipeline',
  LOGISTICS: 'supplier',
  MANAGER:   'analytics',
};

// Valid sub-pages per role
const VALID_SUBPAGES: Record<UserRole, SubPage[]> = {
  TEACHER:   ['orders'],
  CASHIER:   ['pipeline', 'management', 'payments'],
  LOGISTICS: ['supplier', 'warehouse'],
  MANAGER:   ['analytics', 'ledger', 'groups', 'users', 'narxsozlama'],
};

// ─── Context interface ─────────────────────────────────────────────────────────

interface AppContextType {
  // ── Navigation
  activeRole: UserRole;
  activeSubPage: SubPage;
  setActiveRole: (r: UserRole) => void;
  setActiveSubPage: (p: SubPage) => void;

  // ── Authentication & User Accounts
  currentUser: AuthUser | null;
  users: AuthUser[];
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  createUserAccount: (data: { fullName: string; username: string; password: string; role: UserRole }) => Promise<boolean>;
  deleteUserAccount: (id: string) => Promise<boolean>;
  refreshUsers: () => Promise<void>;

  // ── Data (read-only refs)
  teachers: Teacher[];
  groups: Group[];
  students: Student[];
  inventory: InventoryItem[];
  orders: Order[];
  notifications: SystemNotification[];
  toasts: AppToast[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;

  // ── Mutations
  createBulkOrders: (items: BulkOrderItem[]) => Promise<void>;
  collectCash: (orderId: string, amount: number) => Promise<void>;
  markCoursePayment: (orderId: string) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  dispatchToSupplier: (orderIds: string[]) => Promise<void>;
  markArrived: (orderId: string, bookCost: number, newSotuvNarxi?: number) => Promise<void>;
  deliverBook: (orderId: string) => Promise<void>;
  decoupleBook: (orderId: string) => Promise<void>;
  allocateFromWarehouse: (invId: string, studentId: string, groupId: string) => void;
  addInventoryItem: (title: string, bookCost: number) => void;
  updateOrderAdmin: (orderId: string, patch: { status?: string; amountPaid?: number; bookCost?: number; sotuvNarxi?: number; comment?: string }) => Promise<void>;
  dismissNotification: (id: string) => void;
  dismissToast: (id: string) => void;
  fireToast: (message: string, variant?: AppToast['variant']) => void;
  refreshGroups: () => Promise<void>;
  refreshStudents: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  sendToTelegram: (orderIds: string[]) => Promise<boolean>;

  // ── Data
  sotuvNarxi: number;  // current manager-set selling price

  // ── Computed helpers
  getTeacherName: (id: string) => string;
  getStudentName: (id: string) => string;
  getGroupName: (id: string) => string;
  getInventoryItem: (id: string) => InventoryItem | undefined;
  getStudentOrders: (studentId: string) => Order[];
  getLatestOrder: (studentId: string) => Order | undefined;
  getStudentsByGroup: (groupId: string) => Student[];
  getGroupsByTeacher: (teacherName: string) => Group[];
  retailPrice: (order: Order) => number;  // returns order.sotuvNarxi
  isDeliverable: (order: Order) => boolean;
}

// ─── Context creation ─────────────────────────────────────────────────────────

const AppContext = createContext<AppContextType>({} as AppContextType);

export function useApp(): AppContextType {
  return useContext(AppContext);
}

// Route Persistence Helpers
function parseHashRoute(): { role: UserRole; subPage: SubPage } | null {
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  if (!hash) return null;

  const parts = hash.split('/');
  const roleStr = parts[0]?.toUpperCase();
  const subStr = parts[1];

  const validRoles: UserRole[] = ['TEACHER', 'CASHIER', 'LOGISTICS', 'MANAGER'];
  if (roleStr && validRoles.includes(roleStr as UserRole)) {
    const role = roleStr as UserRole;
    const defaultSub = DEFAULT_SUBPAGE[role];
    const subPage = (subStr as SubPage) || defaultSub;
    return { role, subPage };
  }
  return null;
}

function updateHashRoute(role: UserRole, subPage: SubPage) {
  const hash = `#${role.toLowerCase()}/${subPage}`;
  if (window.location.hash !== hash) {
    window.history.replaceState(null, '', hash);
  }
  try {
    localStorage.setItem('smartbooks_route', JSON.stringify({ role, subPage }));
  } catch (e) {}
}

function getInitialUser(): AuthUser | null {
  try {
    const saved = localStorage.getItem('smartbooks_auth_user');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return null;
}

function getInitialSubPage(user: AuthUser | null): SubPage {
  if (!user) return 'pipeline';
  const validSubs = VALID_SUBPAGES[user.role] || [];

  const hashRoute = parseHashRoute();
  if (hashRoute && hashRoute.role === user.role && validSubs.includes(hashRoute.subPage)) {
    return hashRoute.subPage;
  }

  try {
    const saved = localStorage.getItem('smartbooks_route');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.role === user.role && validSubs.includes(parsed.subPage)) {
        return parsed.subPage;
      }
    }
  } catch (e) {}

  return DEFAULT_SUBPAGE[user.role];
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getInitialUser);

  // Active role is strictly bound to currentUser's role
  const activeRole: UserRole = currentUser ? currentUser.role : 'CASHIER';
  const [activeSubPage, setActiveSubPageState] = useState<SubPage>(() => getInitialSubPage(currentUser));

  const [users,      setUsers]          = useState<AuthUser[]>([]);
  const [teachers]  = useState<Teacher[]>(SEED_TEACHERS);
  const [groups,     setGroups]     = useState<Group[]>([]);
  const [students,   setStudents]   = useState<Student[]>([]);
  const [inventory,  setInventory]  = useState<InventoryItem[]>([]);
  const [orders,     setOrders]     = useState<Order[]>([]);
  const [sotuvNarxi, setSotuvNarxi] = useState<number>(0);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [toasts,     setToasts]     = useState<AppToast[]>([]);

  // ── Toast helpers ────────────────────────────────────────────────────────────

  const fireToast = useCallback((message: string, variant: AppToast['variant'] = 'success') => {
    const id = nextToastId();
    setToasts(prev => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Session Guard ─────────────────────────────────────────────────────────────

  const checkAuth = useCallback((): boolean => {
    if (!currentUser) {
      fireToast("Sessiya tugagan yoki tizimga kirilmagan. Iltimos, qayta tizimga kiring.", 'error');
      setCurrentUser(null);
      try { localStorage.removeItem('smartbooks_auth_user'); } catch (e) {}
      return false;
    }
    return true;
  }, [currentUser, fireToast]);

  // ── Navigation with Route Persistence & Role View Lockdown ─────────────────

  const setActiveSubPage = useCallback((sp: SubPage) => {
    if (!currentUser) return;
    const validSubs = VALID_SUBPAGES[currentUser.role];
    if (validSubs.includes(sp)) {
      setActiveSubPageState(sp);
      updateHashRoute(currentUser.role, sp);
    }
  }, [currentUser]);

  const setActiveRole = useCallback((r: UserRole) => {
    if (currentUser && currentUser.role !== r) {
      return; // Cannot switch to another role view if logged in as a specific role
    }
    const defaultSub = DEFAULT_SUBPAGE[r];
    setActiveSubPageState(defaultSub);
    updateHashRoute(r, defaultSub);
  }, [currentUser]);

  // Ensure activeSubPage is always valid for the current user's role
  useEffect(() => {
    if (currentUser) {
      const validSubs = VALID_SUBPAGES[currentUser.role];
      if (!validSubs.includes(activeSubPage)) {
        const defaultSub = DEFAULT_SUBPAGE[currentUser.role];
        setActiveSubPageState(defaultSub);
        updateHashRoute(currentUser.role, defaultSub);
      } else {
        updateHashRoute(currentUser.role, activeSubPage);
      }
    }
  }, [currentUser, activeSubPage]);

  // Listen to browser hash changes
  useEffect(() => {
    const handleHashChange = () => {
      if (!currentUser) return;
      const route = parseHashRoute();
      if (route && route.role === currentUser.role) {
        const validSubs = VALID_SUBPAGES[currentUser.role];
        if (validSubs.includes(route.subPage)) {
          setActiveSubPageState(route.subPage);
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentUser]);

  // ── Authentication API ────────────────────────────────────────────────────────

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API}/backend/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const text = await res.text();
        let errMsg = "Foydalanuvchi nomi yoki parol noto'g'ri.";
        try {
          const json = JSON.parse(text);
          if (json.error) errMsg = json.error;
        } catch (e) {}
        fireToast(errMsg, 'error');
        return false;
      }

      const data = await res.json();
      const user: AuthUser = data.user;

      try {
        localStorage.setItem('smartbooks_auth_user', JSON.stringify(user));
      } catch (e) {}

      const defaultSub = DEFAULT_SUBPAGE[user.role];
      setActiveSubPageState(defaultSub);
      updateHashRoute(user.role, defaultSub);

      setCurrentUser(user);

      fireToast(`Xush kelibsiz, ${user.fullName}! (${user.role} bo'limi)`);
      return true;
    } catch (err: any) {
      fireToast(`Tizimga kirishda xatolik: ${err.message}`, 'error');
      return false;
    }
  }, [fireToast]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('smartbooks_auth_user');
      localStorage.removeItem('smartbooks_route');
    } catch (e) {}
    window.location.hash = '';
    fireToast("Tizimdan chiqildi.", 'info');
  }, [fireToast]);

  const refreshUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/backend/users`);
      if (!res.ok) throw new Error('users API failed');
      const data: AuthUser[] = await res.json();
      setUsers(data);
    } catch (err) {
      console.warn('Failed to load users:', err);
    }
  }, []);

  const createUserAccount = useCallback(async (data: { fullName: string; username: string; password: string; role: UserRole }): Promise<boolean> => {
    if (!checkAuth()) return false;
    if (currentUser?.role !== 'MANAGER') {
      fireToast("Faqat Bosh Menejer yangi xodim qo'sha oladi.", 'error');
      return false;
    }

    try {
      const res = await fetch(`${API}/backend/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const text = await res.text();
        let errStr = "Xodim yaratishda xatolik.";
        try { errStr = JSON.parse(text).error || errStr; } catch (e) {}
        throw new Error(errStr);
      }

      await refreshUsers();
      fireToast(`Yangi xodim "${data.fullName}" (${data.role}) yaratildi!`);
      return true;
    } catch (err: any) {
      fireToast(`Xatolik: ${err.message}`, 'error');
      return false;
    }
  }, [currentUser, checkAuth, refreshUsers, fireToast]);

  const deleteUserAccount = useCallback(async (id: string): Promise<boolean> => {
    if (!checkAuth()) return false;
    if (currentUser?.role !== 'MANAGER') {
      fireToast("Faqat Bosh Menejer xodimlarni o'chira oladi.", 'error');
      return false;
    }

    try {
      const res = await fetch(`${API}/backend/users/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      await refreshUsers();
      fireToast("Xodim akkaunti o'chirildi.", 'info');
      return true;
    } catch (err: any) {
      fireToast(`O'chirishda xatolik: ${err.message}`, 'error');
      return false;
    }
  }, [currentUser, checkAuth, refreshUsers, fireToast]);

  // ── Live data fetchers ────────────────────────────────────────────────────────

  const refreshOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API}/backend/orders`);
      if (!res.ok) throw new Error('orders API failed');
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.warn('Failed to load orders:', err);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API}/backend/settings`);
      if (!res.ok) throw new Error('settings API failed');
      const data = await res.json();
      setSotuvNarxi(data.sotuvNarxi ?? 0);
    } catch (err) {
      console.warn('Failed to load settings:', err);
    }
  }, []);

  const refreshGroups = useCallback(async () => {
    try {
      const res = await fetch(`${API}/backend/groups`);
      if (!res.ok) throw new Error('groups API failed');
      const data: Group[] = await res.json();
      setGroups(data);
    } catch (err) {
      console.warn('Failed to load groups from live API:', err);
    }
  }, []);

  const refreshStudents = useCallback(async () => {
    try {
      const res = await fetch(`${API}/backend/students`);
      if (!res.ok) throw new Error('students API failed');
      const data = await res.json();
      const mapped: Student[] = data.map((s: any) => ({
        ...s,
        name: s.fullName,
        createdAt: s.joinedAt,
      }));
      setStudents(mapped);
    } catch (err) {
      console.warn('Failed to load students from live API:', err);
    }
  }, []);

  useEffect(() => {
    async function loadBooks() {
      try {
        const res = await fetch(`${API}/backend/books`);
        if (!res.ok) throw new Error('API response failed');
        const dbBooks = await res.json();
        const mappedBooks: InventoryItem[] = dbBooks.map((b: any) => ({
          id: String(b.id),
          title: b.name,
          tgFileId: b.tgFileId,
          isReturned: false,
          bookCost: b.bookCost ?? 0,
          categoryName: b.category ? b.category.name : 'Umumiy',
        }));
        if (mappedBooks.length > 0) setInventory(mappedBooks);
      } catch (err) {
        console.warn('Failed to load books from live DB API:', err);
      }
    }
    loadBooks();
    refreshGroups();
    refreshStudents();
    refreshOrders();
    refreshSettings();
    refreshUsers();
  }, [refreshGroups, refreshStudents, refreshOrders, refreshSettings, refreshUsers]);

  // ── Mutations (all guarded by checkAuth) ───────────────────────────────────

  /** Teacher creates orders → POST /backend/orders */
  const createBulkOrders = useCallback(async (items: BulkOrderItem[]) => {
    if (!checkAuth()) return;
    try {
      const payload = items.map(item => {
        return {
          studentId: item.studentId,
          groupId:   item.groupId,
          bookId:    item.bookId,
          bookCost:  0,
          comment:   item.comment ?? '',
        };
      });
      const res = await fetch(`${API}/backend/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      await refreshOrders();
      fireToast(`${items.length} ta buyurtma yaratildi.`);
    } catch (err: any) {
      fireToast(`Buyurtma yaratishda xatolik: ${err.message}`, 'error');
    }
  }, [inventory, checkAuth, refreshOrders, fireToast]);

  /** CREATED → PAID: Cashier records payment → PATCH */
  const collectCash = useCallback(async (orderId: string, amount: number) => {
    if (!checkAuth()) return;
    setOrders(prev => prev.map(o =>
      o.id === orderId
        ? { ...o, status: 'PAID', amountPaid: o.amountPaid + amount, updatedAt: todayISO() }
        : o
    ));
    try {
      const order = orders.find(o => o.id === orderId);
      const newAmount = (order?.amountPaid ?? 0) + amount;
      await fetch(`${API}/backend/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID', amountPaid: newAmount }),
      });
      await refreshOrders();
      fireToast("To'lov qabul qilindi. Holat: Yaratildi → To'langan.");
    } catch (err: any) {
      fireToast(`To'lovda xatolik: ${err.message}`, 'error');
      await refreshOrders();
    }
  }, [orders, checkAuth, refreshOrders, fireToast]);

  /** CREATED → PAID with sotuvNarxi = 0 (To'lov ichida / Course payment included) */
  const markCoursePayment = useCallback(async (orderId: string) => {
    if (!checkAuth()) return;
    setOrders(prev => prev.map(o =>
      o.id === orderId
        ? { ...o, status: 'PAID', sotuvNarxi: 0, amountPaid: 0, updatedAt: todayISO() }
        : o
    ));
    try {
      await fetch(`${API}/backend/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID', sotuvNarxi: 0, amountPaid: 0 }),
      });
      await refreshOrders();
      fireToast("To'lov ichida deb belgilandi. Holat: To'langan (Sotuv narxi: 0).");
    } catch (err: any) {
      fireToast(`Xatolik: ${err.message}`, 'error');
      await refreshOrders();
    }
  }, [checkAuth, refreshOrders, fireToast]);

  /** CANCELLED: Keep order in DB as CANCELLED inventory stock */
  const cancelOrder = useCallback(async (orderId: string) => {
    if (!checkAuth()) return;
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: 'CANCELLED', updatedAt: todayISO() } : o
    ));
    try {
      await fetch(`${API}/backend/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      await refreshOrders();
      fireToast("Buyurtma bekor qilindi va ombor zaxirasiga o'tkazildi.", 'info');
    } catch (err: any) {
      fireToast(`Bekor qilishda xatolik: ${err.message}`, 'error');
      await refreshOrders();
    }
  }, [checkAuth, refreshOrders, fireToast]);

  const sendToTelegram = useCallback(async (orderIds: string[]): Promise<boolean> => {
    if (!checkAuth()) return false;
    try {
      const res = await fetch(`${API}/backend/orders/send-telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data.success) {
        await refreshOrders();
        if (data.autoFulfilledCount > 0) {
          fireToast(
            `${data.autoFulfilledCount} ta kitob omborda mavjud bo'lgani uchun Telegramga yuborilmasdan avtomatik biriktirildi!`,
            'info'
          );
        }
        if (data.results && data.results.length > 0) {
          fireToast("Qolgan buyurtmalar ro'yxati Telegramga yuborildi!", 'success');
        } else if (data.autoFulfilledCount === 0) {
          fireToast("Buyurtmalar ro'yxati Telegramga yuborildi!", 'success');
        }
        return true;
      } else {
        throw new Error(data.error || "Noma'lum xatolik");
      }
    } catch (err: any) {
      fireToast(`Telegramga yuborishda xatolik: ${err.message}`, 'error');
      return false;
    }
  }, [checkAuth, refreshOrders, fireToast]);

  /** PAID → ORDERED: Logistics dispatches to supplier */
  const dispatchToSupplier = useCallback(async (orderIds: string[]) => {
    if (!checkAuth()) return;
    if (orderIds.length === 0) return;
    await sendToTelegram(orderIds);
  }, [checkAuth, sendToTelegram]);

  /** ORDERED → ARRIVED (cashier/logistics sets bookCost and optional sotuvNarxi at arrival time) */
  const markArrived = useCallback(async (orderId: string, bookCost: number, newSotuvNarxi?: number) => {
    if (!checkAuth()) return;
    setOrders(prev => prev.map(o =>
      o.id === orderId
        ? {
            ...o,
            status: 'ARRIVED',
            bookCost,
            ...(newSotuvNarxi !== undefined && newSotuvNarxi >= 0 && { sotuvNarxi: newSotuvNarxi }),
            updatedAt: todayISO()
          }
        : o
    ));
    try {
      const payload: any = { status: 'ARRIVED', bookCost };
      if (newSotuvNarxi !== undefined && newSotuvNarxi >= 0) {
        payload.sotuvNarxi = newSotuvNarxi;
      }
      await fetch(`${API}/backend/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (newSotuvNarxi !== undefined && newSotuvNarxi >= 0) {
        await fetch(`${API}/backend/settings`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sotuvNarxi: newSotuvNarxi }),
        });
        await refreshSettings();
      }

      await refreshOrders();
      fireToast("Kitob keldi. Holat: Yo'lda → Keldi.");
    } catch (err: any) {
      fireToast(`Xatolik: ${err.message}`, 'error');
      await refreshOrders();
    }
  }, [checkAuth, refreshOrders, refreshSettings, fireToast]);

  /** ARRIVED → GIVEN (guarded: amountPaid >= sotuvNarxi) */
  const deliverBook = useCallback(async (orderId: string) => {
    if (!checkAuth()) return;
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    if (order.amountPaid < order.sotuvNarxi) {
      fireToast("Topshirib bo'lmaydi — qoldiq qarz mavjud.", 'error');
      return;
    }
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: 'GIVEN', updatedAt: todayISO() } : o
    ));
    try {
      await fetch(`${API}/backend/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'GIVEN' }),
      });
      await refreshOrders();
      fireToast("Kitob topshirildi. Holat: Keldi → Topshirildi.");
    } catch (err: any) {
      fireToast(`Xatolik: ${err.message}`, 'error');
      await refreshOrders();
    }
  }, [orders, checkAuth, refreshOrders, fireToast]);

  /** ARRIVED → RETURNED: Decouple book back to warehouse */
  const decoupleBook = useCallback(async (orderId: string) => {
    if (!checkAuth()) return;
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: 'RETURNED', updatedAt: todayISO() } : o
    ));
    setInventory(prev => prev.map(inv =>
      inv.id === order.bookId ? { ...inv, isReturned: true } : inv
    ));
    try {
      await fetch(`${API}/backend/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RETURNED' }),
      });
      await refreshOrders();
      fireToast('Kitob omborga qaytarildi.', 'info');
    } catch (err: any) {
      fireToast(`Xatolik: ${err.message}`, 'error');
      await refreshOrders();
    }
  }, [orders, checkAuth, refreshOrders, fireToast]);

  /** Warehouse allocation: 0-cost ARRIVED order via POST */
  const allocateFromWarehouse = useCallback(async (invId: string, studentId: string, groupId: string) => {
    if (!checkAuth()) return;
    const inv = inventory.find(i => i.id === invId);
    if (!inv) return;
    try {
      const res = await fetch(`${API}/backend/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{
          studentId,
          groupId,
          bookId: invId,
          bookCost: 0,
          comment: 'Ombordan bepul biriktirish',
        }]),
      });
      if (!res.ok) throw new Error(await res.text());
      const createdList = await res.json();
      if (createdList && createdList[0]) {
        await fetch(`${API}/backend/orders/${createdList[0].id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ARRIVED', amountPaid: 0 }),
        });
      }
      await refreshOrders();
    } catch (e: any) {
      fireToast(`Ombordan biriktirishda xatolik: ${e.message}`, 'error');
      await refreshOrders();
    }

    setInventory(prev => prev.map(i =>
      i.id === invId ? { ...i, isReturned: false } : i
    ));
    fireToast(`"${inv.title}" ombordan biriktirildi. Keldi holati. 0 so'm.`);
  }, [inventory, checkAuth, refreshOrders, fireToast]);

  /** Admin/cashier direct edit of any order field */
  const updateOrderAdmin = useCallback(async (
    orderId: string,
    patch: { status?: string; amountPaid?: number; bookCost?: number; sotuvNarxi?: number; comment?: string }
  ) => {
    if (!checkAuth()) return;
    setOrders(prev => prev.map(o =>
      o.id === orderId
        ? {
            ...o,
            ...patch,
            status: (patch.status as OrderStatus) ?? o.status,
            updatedAt: todayISO()
          }
        : o
    ));
    try {
      const res = await fetch(`${API}/backend/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(await res.text());
      await refreshOrders();
      fireToast("To'lov va buyurtma ma'lumotlari muvaffaqiyatli tuzatildi.");
    } catch (err: any) {
      fireToast(`Tuzatishda xatolik: ${err.message}`, 'error');
      await refreshOrders();
    }
  }, [checkAuth, refreshOrders, fireToast]);

  const addInventoryItem = useCallback((title: string, _bookCost: number) => {
    fireToast(`"${title}" ro'yxatga olindi.`);
  }, [fireToast]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }, []);

  // ── Computed helpers ──────────────────────────────────────────────────────────

  const getTeacherName    = (id: string) => teachers.find(t => t.id === id)?.name   ?? '—';
  const getStudentName    = (id: string) => students.find(s => s.id === id)?.name   ?? '—';
  const getGroupName      = (id: string) => groups.find(g => g.id === id)?.groupName ?? '—';
  const getInventoryItem  = (id: string) => inventory.find(i => i.id === id);

  const getStudentOrders  = (studentId: string) =>
    orders.filter(o => o.studentId === studentId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const getLatestOrder    = (studentId: string) => getStudentOrders(studentId)[0];

  const getStudentsByGroup  = (groupId: string) => students.filter(s => s.groupId === groupId);
  const getGroupsByTeacher  = (teacherName: string) => groups.filter(g => g.teacherName === teacherName);

  const retailPrice     = (order: Order) => order.sotuvNarxi;
  const isDeliverable   = (order: Order) => order.amountPaid >= order.sotuvNarxi;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <AppContext.Provider value={{
      activeRole, activeSubPage, setActiveRole, setActiveSubPage,
      currentUser, users, login, logout, createUserAccount, deleteUserAccount, refreshUsers,
      teachers, groups, students, inventory, orders, notifications, toasts, setOrders,
      sotuvNarxi,
      fireToast,
      createBulkOrders, collectCash, markCoursePayment, cancelOrder,
      dispatchToSupplier, markArrived, deliverBook, decoupleBook,
      allocateFromWarehouse, addInventoryItem, updateOrderAdmin,
      dismissNotification, dismissToast,
      refreshGroups, refreshStudents, refreshOrders, refreshSettings,
      sendToTelegram,
      getTeacherName, getStudentName, getGroupName, getInventoryItem,
      getStudentOrders, getLatestOrder, getStudentsByGroup, getGroupsByTeacher,
      retailPrice, isDeliverable,
    }}>
      {children}
    </AppContext.Provider>
  );
}
