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
  UserRole, SubPage, AuthUser, WarehouseStockItem,
} from '../types';

import {
  API, SEED_TEACHERS, nextToastId, todayISO, DEFAULT_SUBPAGE, VALID_SUBPAGES,
  parseHashRoute, updateHashRoute, getInitialUser, getInitialSubPage
} from './contextHelpers';

export { SEED_TEACHERS, DEFAULT_SUBPAGE, VALID_SUBPAGES };

// ─── Context interface ─────────────────────────────────────────────────────────

interface AppContextType {
  // ── Navigation
  activeRole: UserRole;
  activeSubPage: SubPage;
  setActiveRole: (r: UserRole) => void;
  setActiveSubPage: (p: SubPage) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;

  // ── Authentication & User Accounts
  currentUser: AuthUser | null;
  users: AuthUser[];
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  createUserAccount: (data: { fullName: string; username: string; password: string; role: UserRole }) => Promise<boolean>;
  deleteUserAccount: (id: string) => Promise<boolean>;
  updateUserAccount: (userId: string, patch: { password?: string; role?: UserRole; fullName?: string }) => Promise<boolean>;
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
  cancelOrder: (orderId: string, reason?: string) => Promise<void>;
  addManualInventoryStock: (data: { bookId: string; quantity: number; bookCost: number; comment?: string }) => Promise<boolean>;
  dispatchToSupplier: (orderIds: string[]) => Promise<void>;
  markArrived: (orderId: string, bookCost: number) => Promise<void>;
  deliverBook: (orderId: string) => Promise<void>;
  decoupleBook: (orderId: string) => Promise<void>;
  allocateFromWarehouse: (invId: string, studentId: string, groupId: string) => void;
  addInventoryItem: (title: string, bookCost: number) => void;
  updateOrderAdmin: (orderId: string, patch: { status?: string; amountPaid?: number; bookCost?: number; sotuvNarxi?: number; comment?: string }) => Promise<void>;
  updateOrderBook: (orderId: string, payload: { bookId: string; bookCost?: number; sotuvNarxi?: number }) => Promise<boolean>;
  updateBookPrice: (bookId: string, price: number) => Promise<boolean>;
  updateBookDetails: (bookId: string, payload: { name?: string; price?: number; setDetails?: string }) => Promise<boolean>;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  dismissNotification: (id: string) => void;
  dismissToast: (id: string) => void;
  fireToast: (message: string, variant?: AppToast['variant']) => void;
  refreshGroups: () => Promise<void>;
  refreshStudents: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  refreshWarehouseStock: () => Promise<void>;
  sendToTelegram: (orderIds: string[]) => Promise<boolean>;
  returnOrderWithStock: (orderId: string, returnedFileIds?: string[], comment?: string) => Promise<boolean>;
  addWarehouseStockItem: (payload: { bookId: string; selectedFileIds?: string[]; quantity?: number; bookCost?: number; comment?: string }) => Promise<boolean>;
  deleteOrderAdmin: (orderId: string) => Promise<boolean>;

  // ── Data
  sotuvNarxi: number;  // current manager-set selling price
  warehouseStock: WarehouseStockItem[];

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

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getInitialUser);
  const [activeRoleOverride, setActiveRoleOverride] = useState<UserRole | null>(null);

  // Active role can be dynamically switched if logged in as SUPER_ADMIN
  const activeRole: UserRole = (currentUser?.role === 'SUPER_ADMIN' && activeRoleOverride)
    ? activeRoleOverride
    : (currentUser ? currentUser.role : 'CASHIER');

  const [activeSubPage, setActiveSubPageState] = useState<SubPage>(() => getInitialSubPage(currentUser));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = useCallback(() => setIsMobileMenuOpen(prev => !prev), []);
  const closeMobileMenu  = useCallback(() => setIsMobileMenuOpen(false), []);

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

  // ── Navigation with Route Persistence & Role View Switching ────────────────

  const setActiveSubPage = useCallback((sp: SubPage) => {
    if (!currentUser) return;
    const effectiveRole = (currentUser.role === 'SUPER_ADMIN' && activeRoleOverride) ? activeRoleOverride : currentUser.role;
    const validSubs = VALID_SUBPAGES[effectiveRole] || VALID_SUBPAGES['SUPER_ADMIN'];
    if (validSubs.includes(sp) || currentUser.role === 'SUPER_ADMIN') {
      setActiveSubPageState(sp);
      setIsMobileMenuOpen(false);
      updateHashRoute(effectiveRole, sp);
    }
  }, [currentUser, activeRoleOverride]);

  const setActiveRole = useCallback((r: UserRole) => {
    if (currentUser?.role === 'SUPER_ADMIN') {
      setActiveRoleOverride(r);
      const defaultSub = DEFAULT_SUBPAGE[r];
      setActiveSubPageState(defaultSub);
      setIsMobileMenuOpen(false);
      updateHashRoute(r, defaultSub);
      return;
    }
    if (currentUser && currentUser.role !== r) {
      return; // Cannot switch to another role view if logged in as a specific role
    }
    const defaultSub = DEFAULT_SUBPAGE[r];
    setActiveSubPageState(defaultSub);
    setIsMobileMenuOpen(false);
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

  const updateUserAccount = useCallback(async (
    userId: string,
    patch: { password?: string; role?: UserRole; fullName?: string }
  ): Promise<boolean> => {
    if (!checkAuth()) return false;
    if (currentUser?.role !== 'MANAGER') {
      fireToast("Faqat Bosh Menejer xodimlarni tahrirlay oladi.", 'error');
      return false;
    }

    try {
      const res = await fetch(`${API}/backend/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Tahrirlashda xatolik.");
      }
      await refreshUsers();
      fireToast("Xodim paroli va ma'lumotlari muvaffaqiyatli yangilandi!", 'success');
      return true;
    } catch (err: any) {
      fireToast(`Xatolik: ${err.message}`, 'error');
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
      setGroups(data.filter(g => g.groupName !== 'Ombor Zaxirasi'));
    } catch (err) {
      console.warn('Failed to load groups from live API:', err);
    }
  }, []);

  const refreshStudents = useCallback(async () => {
    try {
      const res = await fetch(`${API}/backend/students`);
      if (!res.ok) throw new Error('students API failed');
      const data = await res.json();
      const mapped: Student[] = data
        .filter((s: any) => s.fullName !== 'Ombor Inventari')
        .map((s: any) => ({
          ...s,
          name: s.fullName,
          createdAt: s.joinedAt,
        }));
      setStudents(mapped);
    } catch (err) {
      console.warn('Failed to load students from live API:', err);
    }
  }, []);

  const [warehouseStock, setWarehouseStock] = useState<import('../types').WarehouseStockItem[]>([]);

  const refreshWarehouseStock = useCallback(async () => {
    try {
      const res = await fetch(`${API}/backend/warehouse-stock`);
      if (res.ok) {
        const data = await res.json();
        setWarehouseStock(data);
      }
    } catch (err) {}
  }, []);

  const returnOrderWithStock = useCallback(async (orderId: string, returnedFileIds?: string[], comment?: string): Promise<boolean> => {
    if (!checkAuth()) return false;
    try {
      const res = await fetch(`${API}/backend/warehouse-stock/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, returnedFileIds, comment }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Omborga qaytarishda xatolik.");
      }
      await refreshOrders();
      await refreshWarehouseStock();
      fireToast("Darslik ombor zaxirasiga muvaffaqiyatli qaytarildi!", 'success');
      return true;
    } catch (err: any) {
      fireToast(`Xatolik: ${err.message}`, 'error');
      return false;
    }
  }, [checkAuth, refreshOrders, refreshWarehouseStock, fireToast]);

  const addWarehouseStockItem = useCallback(async (payload: {
    bookId: string;
    selectedFileIds?: string[];
    quantity?: number;
    bookCost?: number;
    comment?: string;
  }): Promise<boolean> => {
    if (!checkAuth()) return false;
    try {
      const res = await fetch(`${API}/backend/warehouse-stock/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Omborga qo'shishda xatolik.");
      }
      const data = await res.json();
      await refreshWarehouseStock();
      fireToast(data.message || "Darslik ombor zaxirasiga qo'shildi!", 'success');
      return true;
    } catch (err: any) {
      fireToast(`Xatolik: ${err.message}`, 'error');
      return false;
    }
  }, [checkAuth, refreshWarehouseStock, fireToast]);

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
          price: b.price ?? 0,
          categoryName: b.category ? b.category.name : 'Umumiy',
          isSet: b.isSet ?? false,
          setDetails: b.setDetails ?? null,
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
    refreshWarehouseStock();
  }, [refreshGroups, refreshStudents, refreshOrders, refreshSettings, refreshUsers, refreshWarehouseStock]);

  /** Logistics/Manager updates a book's custom selling price → PATCH /backend/books/:id */
  const updateBookPrice = useCallback(async (bookId: string, price: number): Promise<boolean> => {
    if (!checkAuth()) return false;
    try {
      const res = await fetch(`${API}/backend/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updatedBook = await res.json();

      setInventory(prev => prev.map(inv =>
        inv.id === String(updatedBook.id) ? { ...inv, price: updatedBook.price ?? 0 } : inv
      ));

      fireToast("Darslik sotuv narxi muvaffaqiyatli saqlandi!", 'success');
      return true;
    } catch (err: any) {
      fireToast(`Narx saqlashda xatolik: ${err.message}`, 'error');
      return false;
    }
  }, [checkAuth, fireToast]);

  /** Logistics/Manager updates book title, price, or set details → PATCH /backend/books/:id */
  const updateBookDetails = useCallback(async (
    bookId: string,
    payload: { name?: string; price?: number; setDetails?: string }
  ): Promise<boolean> => {
    if (!checkAuth()) return false;
    try {
      const res = await fetch(`${API}/backend/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const updatedBook = await res.json();

      setInventory(prev => prev.map(inv =>
        inv.id === String(updatedBook.id)
          ? {
              ...inv,
              title: updatedBook.name,
              price: updatedBook.price ?? inv.price,
              setDetails: updatedBook.setDetails ?? inv.setDetails,
            }
          : inv
      ));

      fireToast("Darslik va komplekt ma'lumotlari muvaffaqiyatli saqlandi!", 'success');
      return true;
    } catch (err: any) {
      fireToast(`Saqlashda xatolik: ${err.message}`, 'error');
      return false;
    }
  }, [checkAuth, fireToast]);

  const updateOrderBook = useCallback(async (orderId: string, payload: { bookId: string; bookCost?: number; sotuvNarxi?: number }): Promise<boolean> => {
    if (!checkAuth()) return false;
    try {
      const res = await fetch(`${API}/backend/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      await refreshOrders();
      return true;
    } catch (err: any) {
      fireToast(`Darslikni o'zgartirishda xatolik: ${err.message}`, 'error');
      return false;
    }
  }, [checkAuth, refreshOrders, fireToast]);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  // Generate real-time system notifications for teachers based on student join dates (1 week) and group interval dates
  useEffect(() => {
    if (students.length === 0 || groups.length === 0) return;

    const generated: SystemNotification[] = [];
    const now = new Date();

    // 1. Student 1-Week Join Follow-Up Notifications
    students.forEach(s => {
      const group = groups.find(g => g.id === s.groupId);
      if (!group) return;

      const joinedDate = s.joinedAt ? new Date(s.joinedAt) : null;
      if (!joinedDate || isNaN(joinedDate.getTime())) return;

      const diffDays = Math.floor((now.getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24));
      // Check if student has no active non-cancelled order
      const hasOrder = orders.some(o => o.studentId === s.id && o.status !== 'CANCELLED');

      if (diffDays >= 7 && !hasOrder) {
        generated.push({
          id: `notif-join-${s.id}`,
          userId: group.teacherName,
          teacherName: group.teacherName,
          title: "Talaba bo'yicha buyurtma eslatmasi",
          message: `"${s.fullName || s.name}" guruhga (${group.groupName}) qo'shilganiga ${diffDays} kun bo'ldi. Darslik buyurtma berish vaqti kelgan.`,
          type: 'STUDENT_JOIN_FOLLOWUP',
          isRead: false,
          time: `${diffDays} kun oldin qo'shilgan`,
          variant: 'warning',
          createdAt: s.joinedAt,
        });
      }
    });

    // 2. Group Recurring Interval Notifications
    groups.forEach(g => {
      if (!g.startDate || !g.orderIntervalDays || g.orderIntervalDays <= 0) return;

      const startDate = new Date(g.startDate);
      if (isNaN(startDate.getTime())) return;

      const diffDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return;

      const currentCycle = Math.floor(diffDays / g.orderIntervalDays);
      const nextDueDate = new Date(startDate.getTime() + (currentCycle + 1) * g.orderIntervalDays * 24 * 60 * 60 * 1000);
      const daysUntilNext = Math.ceil((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilNext <= 3) {
        generated.push({
          id: `notif-group-${g.id}-cycle-${currentCycle}`,
          userId: g.teacherName,
          teacherName: g.teacherName,
          title: "Guruh interval buyurtma vaqti",
          message: `"${g.groupName}" guruhi uchun navbatdagi darslik buyurtmasi vaqti (${g.orderIntervalDays} kunlik interval). Buyurtmalarni rasmiylashtiring.`,
          type: 'GROUP_INTERVAL_DUE',
          isRead: false,
          time: daysUntilNext === 0 ? "Bugun interval kuni" : `${daysUntilNext} kun qoldi`,
          variant: 'info',
          createdAt: g.startDate,
        });
      }
    });

    setNotifications(prev => {
      const readMap = new Map(prev.map(n => [n.id, n.isRead]));
      return generated.map(g => ({
        ...g,
        isRead: readMap.get(g.id) ?? false
      }));
    });
  }, [students, groups, orders]);

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
    const order = orders.find(o => o.id === orderId);
    const newStatus = order?.status === 'CREATED' ? 'PAID' : (order?.status ?? 'PAID');
    const newAmount = (order?.amountPaid ?? 0) + amount;

    setOrders(prev => prev.map(o =>
      o.id === orderId
        ? { ...o, status: newStatus, amountPaid: newAmount, updatedAt: todayISO() }
        : o
    ));
    try {
      await fetch(`${API}/backend/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, amountPaid: newAmount }),
      });
      await refreshOrders();
      fireToast("To'lov qabul qilindi.");
    } catch (err: any) {
      fireToast(`To'lovda xatolik: ${err.message}`, 'error');
      await refreshOrders();
    }
  }, [orders, checkAuth, refreshOrders, fireToast]);

  /** CREATED → PAID with sotuvNarxi = 0 (To'lov ichida / Course payment included) */
  const markCoursePayment = useCallback(async (orderId: string) => {
    if (!checkAuth()) return;
    const order = orders.find(o => o.id === orderId);
    const newStatus = order?.status === 'CREATED' ? 'PAID' : (order?.status ?? 'PAID');

    setOrders(prev => prev.map(o =>
      o.id === orderId
        ? { ...o, status: newStatus, sotuvNarxi: 0, amountPaid: 0, updatedAt: todayISO() }
        : o
    ));
    try {
      await fetch(`${API}/backend/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, sotuvNarxi: 0, amountPaid: 0 }),
      });
      await refreshOrders();
      fireToast("To'lov ichida deb belgilandi. Holat saqlandi.");
    } catch (err: any) {
      fireToast(`Xatolik: ${err.message}`, 'error');
      await refreshOrders();
    }
  }, [orders, checkAuth, refreshOrders, fireToast]);

  /** CANCELLED: Keep order in DB as CANCELLED with reason comment. Physical book moves to warehouse only if ORDERED/ARRIVED/GIVEN */
  const cancelOrder = useCallback(async (orderId: string, reason?: string) => {
    if (!checkAuth()) return;
    const targetOrder = orders.find(o => o.id === orderId);
    const hadPhysicalBook = targetOrder ? ['ORDERED', 'ARRIVED', 'GIVEN'].includes(targetOrder.status) : false;

    const prefix = hadPhysicalBook 
      ? "Jismoniy darslik omborda."
      : "Buyurtma bekor qilindi (Darslik hali buyurtma qilinmagan edi).";
    
    const comment = reason?.trim() 
      ? `${prefix} Sababi: ${reason.trim()}` 
      : prefix;

    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: 'CANCELLED', comment, updatedAt: todayISO() } : o
    ));
    try {
      await fetch(`${API}/backend/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED', comment }),
      });
      await refreshOrders();
      if (hadPhysicalBook) {
        fireToast("Buyurtma bekor qilindi va jismoniy kitob ombor zaxirasiga o'tkazildi.", 'info');
      } else {
        fireToast("Buyurtma bekor qilindi (Kitob hali buyurtma qilinmagan edi).", 'info');
      }
    } catch (err: any) {
      fireToast(`Bekor qilishda xatolik: ${err.message}`, 'error');
      await refreshOrders();
    }
  }, [orders, checkAuth, refreshOrders, fireToast]);

  /** Manual inventory stock addition by Logistics */
  const addManualInventoryStock = useCallback(async (data: {
    bookId: string;
    quantity: number;
    bookCost: number;
    comment?: string;
  }): Promise<boolean> => {
    if (!checkAuth()) return false;
    try {
      const res = await fetch(`${API}/backend/inventory/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Omborga kitob qo'shishda xatolik.");
      }

      await refreshOrders();
      fireToast(`${data.quantity} ta darslik jismoniy ombor zaxirasiga muvaffaqiyatli qo'shildi.`);
      return true;
    } catch (err: any) {
      fireToast(`Xatolik: ${err.message}`, 'error');
      return false;
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
    setOrders(prev => prev.map(o =>
      orderIds.includes(o.id) ? { ...o, status: 'ORDERED', updatedAt: todayISO() } : o
    ));
    try {
      await Promise.all(orderIds.map(id =>
        fetch(`${API}/backend/orders/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ORDERED' }),
        })
      ));
      await sendToTelegram(orderIds);
      await refreshOrders();
      fireToast(`${orderIds.length} ta buyurtma ta'minotchiga yo'naltirildi. Holat: Yo'lda.`, 'success');
    } catch (err: any) {
      fireToast(`Xatolik: ${err.message}`, 'error');
      await refreshOrders();
    }
  }, [checkAuth, sendToTelegram, refreshOrders, fireToast]);

  /** ORDERED → ARRIVED (logistics sets procurement bookCost at arrival time; original selling price is locked) */
  const markArrived = useCallback(async (orderId: string, bookCost: number) => {
    if (!checkAuth()) return;

    setOrders(prev => prev.map(o =>
      o.id === orderId
        ? {
            ...o,
            status: 'ARRIVED',
            bookCost,
            updatedAt: todayISO()
          }
        : o
    ));
    try {
      await fetch(`${API}/backend/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ARRIVED', bookCost }),
      });

      await refreshOrders();
      fireToast("Kitob keldi. Holat: Yo'lda → Keldi.");
    } catch (err: any) {
      fireToast(`Xatolik: ${err.message}`, 'error');
      await refreshOrders();
    }
  }, [checkAuth, refreshOrders, fireToast]);

  /** ARRIVED → GIVEN (guarded: amountPaid >= sotuvNarxi) */
  const deliverBook = useCallback(async (orderId: string) => {
    if (!checkAuth()) return;
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    if (order.sotuvNarxi > 0 && order.amountPaid < order.sotuvNarxi) {
      fireToast("Topshirib bo'lmaydi — qoldiq qarz mavjud.", 'error');
      return;
    }
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: 'GIVEN', updatedAt: todayISO() } : o
    ));
    try {
      const res = await fetch(`${API}/backend/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'GIVEN' }),
      });
      if (!res.ok) throw new Error(await res.text());
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

  /** SuperAdmin hard delete of an order */
  const deleteOrderAdmin = useCallback(async (orderId: string): Promise<boolean> => {
    if (!checkAuth()) return false;
    setOrders(prev => prev.filter(o => o.id !== orderId));
    try {
      const res = await fetch(`${API}/backend/orders/${orderId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(await res.text());
      await refreshOrders();
      fireToast("Buyurtma bazadan butunlay o'chirib tashlandi.", 'info');
      return true;
    } catch (err: any) {
      fireToast(`O'chirishda xatolik: ${err.message}`, 'error');
      await refreshOrders();
      return false;
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
  const isDeliverable   = (order: Order) => order.sotuvNarxi === 0 || order.amountPaid >= order.sotuvNarxi;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <AppContext.Provider value={{
      activeRole, activeSubPage, setActiveRole, setActiveSubPage,
      isMobileMenuOpen, setIsMobileMenuOpen, toggleMobileMenu, closeMobileMenu,
      currentUser, users, login, logout, createUserAccount, deleteUserAccount, updateUserAccount, refreshUsers,
      teachers, groups, students, inventory, orders, notifications, toasts, setOrders,
      sotuvNarxi,
      warehouseStock,
      fireToast,
      createBulkOrders, collectCash, markCoursePayment, cancelOrder, addManualInventoryStock,
      dispatchToSupplier, markArrived, deliverBook, decoupleBook,
      allocateFromWarehouse, addInventoryItem, updateOrderAdmin, updateOrderBook, updateBookPrice, updateBookDetails, deleteOrderAdmin,
      markNotificationAsRead, markAllNotificationsAsRead, dismissNotification, dismissToast,
      refreshGroups, refreshStudents, refreshOrders, refreshSettings, refreshWarehouseStock,
      sendToTelegram, returnOrderWithStock, addWarehouseStockItem,
      getTeacherName, getStudentName, getGroupName, getInventoryItem,
      getStudentOrders, getLatestOrder, getStudentsByGroup, getGroupsByTeacher,
      retailPrice, isDeliverable,
    }}>
      {children}
    </AppContext.Provider>
  );
}
