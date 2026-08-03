/**
 * context/AppContext.tsx
 * Core state engine. Assembles data refreshers, authentication, navigation, and mutations.
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type {
  Teacher, Group, Student, InventoryItem, Order, SystemNotification, AppToast,
  UserRole, SubPage, AuthUser, WarehouseStockItem, BulkOrderItem
} from '../types';

import {
  API, SEED_TEACHERS, nextToastId, DEFAULT_SUBPAGE, VALID_SUBPAGES,
  parseHashRoute, updateHashRoute, getInitialSubPage
} from './contextHelpers';

import { useAuthManager } from './useAuthManager';
import { useOrderMutations } from './useOrderMutations';
import { useInventoryMutations } from './useInventoryMutations';

export { SEED_TEACHERS, DEFAULT_SUBPAGE, VALID_SUBPAGES };

interface AppContextType {
  activeRole: UserRole;
  activeSubPage: SubPage;
  setActiveRole: (r: UserRole) => void;
  setActiveSubPage: (p: SubPage) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;

  currentUser: AuthUser | null;
  users: AuthUser[];
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  createUserAccount: (data: { fullName: string; username: string; password: string; role: UserRole }) => Promise<boolean>;
  deleteUserAccount: (id: string) => Promise<boolean>;
  updateUserAccount: (userId: string, patch: { password?: string; role?: UserRole; fullName?: string }) => Promise<boolean>;
  refreshUsers: () => Promise<void>;

  teachers: Teacher[];
  groups: Group[];
  students: Student[];
  inventory: InventoryItem[];
  orders: Order[];
  notifications: SystemNotification[];
  toasts: AppToast[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;

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

  sotuvNarxi: number;
  warehouseStock: WarehouseStockItem[];

  getTeacherName: (id: string) => string;
  getStudentName: (id: string) => string;
  getGroupName: (id: string) => string;
  getInventoryItem: (id: string) => InventoryItem | undefined;
  getStudentOrders: (studentId: string) => Order[];
  getLatestOrder: (studentId: string) => Order | undefined;
  getStudentsByGroup: (groupId: string) => Student[];
  getGroupsByTeacher: (teacherName: string) => Group[];
  retailPrice: (order: Order) => number;
  isDeliverable: (order: Order) => boolean;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

export function useApp(): AppContextType {
  return useContext(AppContext);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeRoleOverride, setActiveRoleOverride] = useState<UserRole | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = useCallback(() => setIsMobileMenuOpen(prev => !prev), []);
  const closeMobileMenu  = useCallback(() => setIsMobileMenuOpen(false), []);

  const [teachers]  = useState<Teacher[]>(SEED_TEACHERS);
  const [groups,     setGroups]     = useState<Group[]>([]);
  const [students,   setStudents]   = useState<Student[]>([]);
  const [inventory,  setInventory]  = useState<InventoryItem[]>([]);
  const [orders,     setOrders]     = useState<Order[]>([]);
  const [sotuvNarxi, setSotuvNarxi] = useState<number>(0);
  const [warehouseStock, setWarehouseStock] = useState<WarehouseStockItem[]>([]);
  const [notifications, setNotifications]   = useState<SystemNotification[]>([]);
  const [toasts,     setToasts]     = useState<AppToast[]>([]);

  const fireToast = useCallback((message: string, variant: AppToast['variant'] = 'success') => {
    const id = nextToastId();
    setToasts(prev => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const auth = useAuthManager(fireToast);
  const { currentUser } = auth;

  const activeRole: UserRole = (currentUser?.role === 'SUPER_ADMIN' && activeRoleOverride)
    ? activeRoleOverride
    : (currentUser ? currentUser.role : 'CASHIER');

  const [activeSubPage, setActiveSubPageState] = useState<SubPage>(() => getInitialSubPage(currentUser));

  // ── Navigation & Routes ──────────────────────────────────────────────────

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
    if (currentUser && currentUser.role !== r) return;
    const defaultSub = DEFAULT_SUBPAGE[r];
    setActiveSubPageState(defaultSub);
    setIsMobileMenuOpen(false);
    updateHashRoute(r, defaultSub);
  }, [currentUser]);

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

  // ── Data Refreshers ──────────────────────────────────────────────────────────

  const refreshGroups = useCallback(async () => {
    try {
      const res = await fetch(`${API}/backend/groups`);
      if (res.ok) setGroups(await res.json());
    } catch (e: any) { console.warn('[refreshGroups Warning]:', e.message); }
  }, []);

  const refreshStudents = useCallback(async () => {
    try {
      const res = await fetch(`${API}/backend/students`);
      if (res.ok) setStudents(await res.json());
    } catch (e: any) { console.warn('[refreshStudents Warning]:', e.message); }
  }, []);

  const loadBooks = async () => {
    try {
      const res = await fetch(`${API}/backend/books`);
      if (res.ok) {
        const books = await res.json();
        setInventory(books.map((b: any) => ({
          id: String(b.id),
          title: b.name,
          categoryName: b.category ? b.category.name : 'Umumiy',
          price: b.price ?? 0,
          isSet: Boolean(b.isSet),
          setDetails: b.setDetails ?? undefined,
        })));
      }
    } catch (e: any) { console.warn('[loadBooks Warning]:', e.message); }
  };

  const refreshOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API}/backend/orders`);
      if (res.ok) setOrders(await res.json());
      await loadBooks();
    } catch (e: any) { console.warn('[refreshOrders Warning]:', e.message); }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API}/backend/settings`);
      if (res.ok) {
        const data = await res.json();
        if (data.sotuvNarxi !== undefined) setSotuvNarxi(data.sotuvNarxi);
      }
    } catch (e: any) { console.warn('[refreshSettings Warning]:', e.message); }
  }, []);

  const refreshWarehouseStock = useCallback(async () => {
    try {
      const res = await fetch(`${API}/backend/warehouse-stock`);
      if (res.ok) setWarehouseStock(await res.json());
    } catch (e: any) { console.warn('[refreshWarehouseStock Warning]:', e.message); }
  }, []);

  useEffect(() => {
    loadBooks();
    refreshGroups();
    refreshStudents();
    refreshOrders();
    refreshSettings();
    auth.refreshUsers();
    refreshWarehouseStock();
  }, []);

  // ── Modular Hooks ────────────────────────────────────────────────────────────

  const orderMutations = useOrderMutations(auth.checkAuth, orders, setOrders, refreshOrders, fireToast);
  const inventoryMutations = useInventoryMutations(auth.checkAuth, inventory, setInventory, refreshOrders, refreshWarehouseStock, fireToast);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }, []);

  // ── Computed Helpers ──────────────────────────────────────────────────────────

  const getTeacherName    = (id: string) => teachers.find(t => t.id === id)?.name   ?? '—';

  const getStudentName = useCallback((id: string) => {
    const s = students.find(s => s.id === id);
    if (s && (s.fullName || s.name)) return s.fullName || s.name;
    const order = orders.find(o => o.studentId === id);
    if (order && (order as any).studentName) return (order as any).studentName;
    if (order && (order as any).student?.fullName) return (order as any).student.fullName;
    return '—';
  }, [students, orders]);

  const getGroupName = useCallback((id: string) => {
    const g = groups.find(g => g.id === id);
    if (g && g.groupName) return g.groupName;
    const order = orders.find(o => o.groupId === id);
    if (order && (order as any).groupName) return (order as any).groupName;
    if (order && (order as any).group?.groupName) return (order as any).group.groupName;
    return '—';
  }, [groups, orders]);
  const getInventoryItem  = (id: string) => inventory.find(i => i.id === id);

  const getStudentOrders  = (studentId: string) =>
    orders.filter(o => o.studentId === studentId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const getLatestOrder    = (studentId: string) => getStudentOrders(studentId)[0];

  const getStudentsByGroup  = (groupId: string) => students.filter(s => s.groupId === groupId);
  const getGroupsByTeacher  = (teacherName: string) => groups.filter(g => g.teacherName === teacherName);

  const retailPrice     = (order: Order) => order.sotuvNarxi;
  const isDeliverable   = (order: Order) => order.sotuvNarxi === 0 || order.amountPaid >= order.sotuvNarxi;

  return (
    <AppContext.Provider value={{
      activeRole, activeSubPage, setActiveRole, setActiveSubPage,
      isMobileMenuOpen, setIsMobileMenuOpen, toggleMobileMenu, closeMobileMenu,
      currentUser: auth.currentUser, users: auth.users, login: auth.login, logout: auth.logout,
      createUserAccount: auth.createUserAccount, deleteUserAccount: auth.deleteUserAccount,
      updateUserAccount: auth.updateUserAccount, refreshUsers: auth.refreshUsers,
      teachers, groups, students, inventory, orders, notifications, toasts, setOrders,
      sotuvNarxi, warehouseStock, fireToast,
      ...orderMutations,
      ...inventoryMutations,
      markNotificationAsRead, markAllNotificationsAsRead, dismissNotification, dismissToast,
      refreshGroups, refreshStudents, refreshOrders, refreshSettings, refreshWarehouseStock,
      getTeacherName, getStudentName, getGroupName, getInventoryItem,
      getStudentOrders, getLatestOrder, getStudentsByGroup, getGroupsByTeacher,
      retailPrice, isDeliverable,
    }}>
      {children}
    </AppContext.Provider>
  );
}
