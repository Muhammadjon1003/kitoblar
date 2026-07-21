/**
 * context/AppContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Core state engine. Holds ALL business data and exposes every mutation.
 * Orders are fully persisted to the Neon backend — no mock data.
 *
 * Price model: retailPrice = bookCost × 1.5
 * Deliver guard: amount_paid >= bookCost × 1.5
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type {
  Teacher, Group, Student, InventoryItem, Order,
  SystemNotification, AppToast, BulkOrderItem,
  UserRole, SubPage,
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
  LOGISTICS: 'warehouse',
  MANAGER:   'analytics',
};

// ─── Context interface ─────────────────────────────────────────────────────────

interface AppContextType {
  // ── Navigation
  activeRole: UserRole;
  activeSubPage: SubPage;
  setActiveRole: (r: UserRole) => void;
  setActiveSubPage: (p: SubPage) => void;

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
  cancelOrder: (orderId: string) => Promise<void>;
  dispatchToSupplier: (orderIds: string[]) => Promise<void>;
  markArrived: (orderId: string, bookCost: number) => Promise<void>;
  deliverBook: (orderId: string) => Promise<void>;
  decoupleBook: (orderId: string) => Promise<void>;
  allocateFromWarehouse: (invId: string, studentId: string, groupId: string) => void;
  addInventoryItem: (title: string, bookCost: number) => void;
  updateOrderAdmin: (orderId: string, patch: { status?: string; amountPaid?: number; sotuvNarxi?: number; comment?: string }) => Promise<void>;
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

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeRole,    setActiveRoleState] = useState<UserRole>('CASHIER');
  const [activeSubPage, setActiveSubPage]   = useState<SubPage>('pipeline');

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

  // ── Navigation ────────────────────────────────────────────────────────────────

  const setActiveRole = useCallback((r: UserRole) => {
    setActiveRoleState(r);
    setActiveSubPage(DEFAULT_SUBPAGE[r]);
  }, []);

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
          bookCost: 10,
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
  }, [refreshGroups, refreshStudents, refreshOrders, refreshSettings]);

  // ── Mutations (all wired to backend) ─────────────────────────────────────────

  /** Teacher creates orders → POST /backend/orders */
  const createBulkOrders = useCallback(async (items: BulkOrderItem[]) => {
    try {
      const payload = items.map(item => {
        const inv = inventory.find(i => i.id === item.bookId);
        return {
          studentId: item.studentId,
          groupId:   item.groupId,
          bookId:    item.bookId,
          bookCost:  inv?.bookCost ?? 0,
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
  }, [inventory, refreshOrders, fireToast]);

  /** CREATED → PAID: Cashier records payment → PATCH */
  const collectCash = useCallback(async (orderId: string, amount: number) => {
    // Optimistic update
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
  }, [orders, refreshOrders, fireToast]);

  /** CREATED → CANCELLED (hard delete from DB) */
  const cancelOrder = useCallback(async (orderId: string) => {
    // Optimistic update
    setOrders(prev => prev.filter(o => o.id !== orderId));
    try {
      await fetch(`${API}/backend/orders/${orderId}`, { method: 'DELETE' });
      fireToast("Buyurtma bekor qilindi.", 'error');
    } catch (err: any) {
      fireToast(`Bekor qilishda xatolik: ${err.message}`, 'error');
      await refreshOrders();
    }
  }, [refreshOrders, fireToast]);

  /** PAID → ORDERED: Logistics dispatches to supplier */
  const dispatchToSupplier = useCallback(async (orderIds: string[]) => {
    // Optimistic update
    setOrders(prev => prev.map(o =>
      orderIds.includes(o.id) && o.status === 'PAID'
        ? { ...o, status: 'ORDERED', updatedAt: todayISO() }
        : o
    ));
    try {
      await Promise.all(orderIds.map(id =>
        fetch(`${API}/backend/orders/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ORDERED' }),
        })
      ));
      await refreshOrders();
      fireToast(`${orderIds.length} ta buyurtma ta'minotchiga yuborildi.`);
    } catch (err: any) {
      fireToast(`Yuborishda xatolik: ${err.message}`, 'error');
      await refreshOrders();
    }
  }, [refreshOrders, fireToast]);

  /** ORDERED → ARRIVED (cashier sets bookCost at arrival time) */
  const markArrived = useCallback(async (orderId: string, bookCost: number) => {
    setOrders(prev => prev.map(o =>
      o.id === orderId && o.status === 'ORDERED'
        ? { ...o, status: 'ARRIVED', bookCost, updatedAt: todayISO() }
        : o
    ));
    try {
      await fetch(`${API}/backend/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ARRIVED', bookCost }),
      });
      await refreshOrders();
      fireToast("Kitob keldi. Holat: Yo'lda \u2192 Keldi.");
    } catch (err: any) {
      fireToast(`Xatolik: ${err.message}`, 'error');
      await refreshOrders();
    }
  }, [refreshOrders, fireToast]);

  /** ARRIVED → GIVEN (guarded: amountPaid >= bookCost × 1.5) */
  const deliverBook = useCallback(async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    if (order.amountPaid < order.bookCost * 1.5) {
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
  }, [orders, refreshOrders, fireToast]);

  /** ARRIVED → RETURNED: Decouple book back to warehouse */
  const decoupleBook = useCallback(async (orderId: string) => {
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
  }, [orders, refreshOrders, fireToast]);

  /** Warehouse allocation: 0-cost ARRIVED order via POST */
  const allocateFromWarehouse = useCallback((invId: string, studentId: string, groupId: string) => {
    const inv = inventory.find(i => i.id === invId);
    if (!inv) return;
    // Create order in backend
    fetch(`${API}/backend/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{
        studentId, groupId, bookId: invId,
        bookCost: 0, comment: 'Ombordan bepul biriktirish',
      }]),
    }).then(() => {
      // Also immediately PATCH it to ARRIVED since it skips the pipeline
      return refreshOrders();
    }).catch(console.warn);

    setInventory(prev => prev.map(i =>
      i.id === invId ? { ...i, isReturned: false } : i
    ));
    fireToast(`"${inv.title}" ombordan biriktiriildi. Keldi holati. 0 so'm.`);
  }, [inventory, refreshOrders, fireToast]);

  /** Admin/cashier direct edit of any order field */
  const updateOrderAdmin = useCallback(async (
    orderId: string,
    patch: { status?: string; amountPaid?: number; comment?: string }
  ) => {
    try {
      const res = await fetch(`${API}/backend/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(await res.text());
      await refreshOrders();
      fireToast("To'lov ma'lumotlari muvaffaqiyatli tuzatildi.");
    } catch (err: any) {
      fireToast(`Tuzatishda xatolik: ${err.message}`, 'error');
    }
  }, [refreshOrders, fireToast]);

  /** Inbound ingestion: register a new book in inventory (local only — books come from Telegram) */
  const addInventoryItem = useCallback((title: string, _bookCost: number) => {
    fireToast(`"${title}" ro'yxatga olindi.`);
  }, [fireToast]);

  const sendToTelegram = useCallback(async (orderIds: string[]): Promise<boolean> => {
    try {
      const res = await fetch(`${API}/backend/orders/send-telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data.success) {
        fireToast("Buyurtmalar ro'yxati Telegramga yuborildi!", 'success');
        return true;
      } else {
        throw new Error(data.error || "Noma'lum xatolik");
      }
    } catch (err: any) {
      fireToast(`Telegramga yuborishda xatolik: ${err.message}`, 'error');
      return false;
    }
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
      teachers, groups, students, inventory, orders, notifications, toasts, setOrders,
      sotuvNarxi,
      fireToast,
      createBulkOrders, collectCash, cancelOrder,
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
