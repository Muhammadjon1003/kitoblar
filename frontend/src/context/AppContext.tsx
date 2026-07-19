/**
 * context/AppContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Core state engine. Holds ALL business data and exposes every mutation.
 * Views are purely presentational — they never manage business state locally.
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

// ─── Seed Data ────────────────────────────────────────────────────────────────

export const SEED_TEACHERS: Teacher[] = [
  { id: 't1', name: 'Alisher Nazarov',  username: 'a.nazarov'   },
  { id: 't2', name: 'Feruza Mirzayeva', username: 'f.mirzayeva' },
  { id: 't3', name: 'Bobur Toshmatov',  username: 'b.toshmatov' },
];

const SEED_GROUPS: Group[] = [];
const SEED_STUDENTS: Student[] = [];

const SEED_INVENTORY: InventoryItem[] = [];

// Seed orders — mixed statuses to populate all pipeline columns for demo
const SEED_ORDERS: Order[] = [
  // CREATED: cashier needs to collect payment
  { id: 'o1', studentId: 's1', groupId: 'g1', bookId: 'inv1', status: 'CREATED',  amountPaid: 0,  bookCost: 45, comment: 'Priority student',   updatedAt: '2026-06-20' },
  { id: 'o4', studentId: 's4', groupId: 'g2', bookId: 'inv4', status: 'CREATED',  amountPaid: 0,  bookCost: 42, comment: 'Flask textbook',      updatedAt: '2026-06-22' },
  // PAID: waiting for logistics
  { id: 'o3', studentId: 's3', groupId: 'g1', bookId: 'inv1', status: 'PAID',     amountPaid: 68, bookCost: 45, comment: '',                    updatedAt: '2026-06-18' },
  // ORDERED: in transit to center
  { id: 'o5', studentId: 's5', groupId: 'g2', bookId: 'inv6', status: 'ORDERED',  amountPaid: 75, bookCost: 50, comment: '',                    updatedAt: '2026-06-17' },
  // ARRIVED: cashier handover stage
  // o2: fully paid (60 >= 40*1.5=60) → deliver UNLOCKED
  { id: 'o2', studentId: 's2', groupId: 'g1', bookId: 'inv2', status: 'ARRIVED',  amountPaid: 60, bookCost: 40, comment: '',                    updatedAt: '2026-06-21' },
  // o8: partially paid (30 < 42*1.5=63) → deliver LOCKED
  { id: 'o8', studentId: 's8', groupId: 'g2', bookId: 'inv4', status: 'ARRIVED',  amountPaid: 30, bookCost: 42, comment: '',                    updatedAt: '2026-06-23' },
  // Terminal states (archive)
  { id: 'o6', studentId: 's6', groupId: 'g3', bookId: 'inv5', status: 'GIVEN',    amountPaid: 83, bookCost: 55, comment: '',                    updatedAt: '2026-06-10' },
  { id: 'o7', studentId: 's7', groupId: 'g3', bookId: 'inv5', status: 'RETURNED', amountPaid: 0,  bookCost: 55, comment: 'Student withdrew',     updatedAt: '2026-06-15' },
];

// ─── ID generators ─────────────────────────────────────────────────────────────

let _oId = 100, _invId = 10;
// nextGroupId / nextStudentId / nextNotifId removed — managed via live API or no longer needed
const nextOrderId   = () => `o${++_oId}`;
const nextInvId     = () => `inv${++_invId}`;
const nextToastId   = () => `t${Date.now()}`;
const genTgFileId   = (title: string) =>
  `BQACAgIAAx_${title.slice(0, 4).replace(/\s/g, '').toLowerCase()}_${Math.random().toString(36).slice(2, 8)}`;
const todayISO = () => new Date().toISOString().slice(0, 10);

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

  // ── Mutations (TR § 3 state machine transitions)
  createBulkOrders: (items: BulkOrderItem[]) => void;               // TEACHER action → CREATED
  collectCash: (orderId: string, amount: number) => void;           // CREATED → PAID
  cancelOrder: (orderId: string) => void;                           // CREATED → CANCELLED
  dispatchToSupplier: (orderIds: string[]) => void;                  // PAID → ORDERED (Telegram route)
  markArrived: (orderId: string) => void;                           // ORDERED → ARRIVED
  deliverBook: (orderId: string) => void;                           // ARRIVED → GIVEN (guarded)
  decoupleBook: (orderId: string) => void;                          // ARRIVED → RETURNED + inventory
  allocateFromWarehouse: (invId: string, studentId: string, groupId: string) => void; // 0-cost ARRIVED
  addInventoryItem: (title: string, bookCost: number) => void;      // Inbound ingestion
  dismissNotification: (id: string) => void;
  dismissToast: (id: string) => void;
  fireToast: (message: string, variant?: AppToast['variant']) => void;
  refreshGroups: () => Promise<void>;    // Re-fetches groups from live API
  refreshStudents: () => Promise<void>;  // Re-fetches students from live API

  // ── Computed helpers
  getTeacherName: (id: string) => string;
  getStudentName: (id: string) => string;
  getGroupName: (id: string) => string;
  getInventoryItem: (id: string) => InventoryItem | undefined;
  getStudentOrders: (studentId: string) => Order[];
  getLatestOrder: (studentId: string) => Order | undefined;
  getStudentsByGroup: (groupId: string) => Student[];
  getGroupsByTeacher: (teacherName: string) => Group[];
  retailPrice: (bookCost: number) => number; // bookCost × 1.5
  isDeliverable: (order: Order) => boolean;  // amount_paid >= retailPrice
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
  const [groups,     setGroups]     = useState<Group[]>(SEED_GROUPS);
  const [students,   setStudents]   = useState<Student[]>(SEED_STUDENTS);
  const [inventory,  setInventory]  = useState<InventoryItem[]>(SEED_INVENTORY);
  const [orders,     setOrders]     = useState<Order[]>(SEED_ORDERS);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [toasts,     setToasts]     = useState<AppToast[]>([]);

  // ── Fetch Live Books from Vercel API ───────────────────────────────────────
  useEffect(() => {
    async function loadBooks() {
      try {
        const res = await fetch('https://kitoblar-seven.vercel.app/backend/books');
        if (!res.ok) throw new Error('API response failed');
        const dbBooks = await res.json();
        
        // Map database TelegramBook objects to frontend InventoryItem format
        const mappedBooks: InventoryItem[] = dbBooks.map((b: any) => ({
          id: String(b.id),
          title: b.name,
          tgFileId: b.tgFileId,
          isReturned: false,
          bookCost: 10, // Assign a default mock cost since DB is only for storing and delivering
          categoryName: b.category ? b.category.name : 'Umumiy'
        }));

        if (mappedBooks.length > 0) {
          setInventory(mappedBooks);
        }
      } catch (err) {
        console.warn('Failed to load books from live DB API:', err);
      }
    }
    loadBooks();
  }, []);

  // ── Fetch Live Groups & Students from API on mount ────────────────────────
  const refreshGroups = useCallback(async () => {
    try {
      const res = await fetch('https://kitoblar-seven.vercel.app/backend/groups');
      if (!res.ok) throw new Error('groups API failed');
      const data: Group[] = await res.json();
      setGroups(data);
    } catch (err) {
      console.warn('Failed to load groups from live API:', err);
    }
  }, []);

  const refreshStudents = useCallback(async () => {
    try {
      const res = await fetch('https://kitoblar-seven.vercel.app/backend/students');
      if (!res.ok) throw new Error('students API failed');
      const data = await res.json();
      // Normalise: map fullName → name and joinedAt → createdAt for backward compat
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
    refreshGroups();
    refreshStudents();
  }, [refreshGroups, refreshStudents]);

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

  // emitTeacherNotification removed — student onboarding now done via API (StudentModals)

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const createBulkOrders = useCallback((items: BulkOrderItem[]) => {
    const now = todayISO();
    const newOrders: Order[] = items.map(item => {
      const inv = inventory.find(i => i.id === item.bookId);
      return {
        id: nextOrderId(),
        studentId: item.studentId,
        groupId: item.groupId,
        bookId: item.bookId,
        status: 'CREATED' as const,
        amountPaid: 0,
        bookCost: inv?.bookCost ?? 0,
        comment: item.comment,
        updatedAt: now,
      };
    });
    setOrders(prev => [...prev, ...newOrders]);
    fireToast(`${newOrders.length} order(s) created (CREATED status).`);
  }, [inventory, fireToast]);

  /** CREATED → PAID: Cashier records payment amount */
  const collectCash = useCallback((orderId: string, amount: number) => {
    setOrders(prev => prev.map(o =>
      o.id === orderId
        ? { ...o, status: 'PAID', amountPaid: o.amountPaid + amount, updatedAt: todayISO() }
        : o
    ));
    fireToast('Payment recorded. Order advanced: CREATED → PAID.');
  }, [fireToast]);

  /** CREATED → CANCELLED */
  const cancelOrder = useCallback((orderId: string) => {
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: 'CANCELLED', updatedAt: todayISO() } : o
    ));
    fireToast('Order cancelled. Status → CANCELLED.', 'error');
  }, [fireToast]);

  /** PAID → ORDERED: Logistics routes to supplier via Telegram CDN (TR § 4) */
  const dispatchToSupplier = useCallback((orderIds: string[]) => {
    setOrders(prev => prev.map(o =>
      orderIds.includes(o.id) && o.status === 'PAID'
        ? { ...o, status: 'ORDERED', updatedAt: todayISO() }
        : o
    ));
    fireToast(`${orderIds.length} order(s) routed to supplier. Status: PAID → ORDERED.`);
  }, [fireToast]);

  /** ORDERED → ARRIVED */
  const markArrived = useCallback((orderId: string) => {
    setOrders(prev => prev.map(o =>
      o.id === orderId && o.status === 'ORDERED'
        ? { ...o, status: 'ARRIVED', updatedAt: todayISO() }
        : o
    ));
    fireToast('Book arrival confirmed. Status: ORDERED → ARRIVED.');
  }, [fireToast]);

  /** ARRIVED → GIVEN (guarded: amount_paid >= bookCost × 1.5) */
  const deliverBook = useCallback((orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    if (order.amountPaid < order.bookCost * 1.5) {
      fireToast('Cannot deliver — outstanding balance remains.', 'error');
      return;
    }
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: 'GIVEN', updatedAt: todayISO() } : o
    ));
    fireToast('Book delivered. Status: ARRIVED → GIVEN.');
  }, [orders, fireToast]);

  /** ARRIVED → RETURNED: Decouple book, mark inventory as reusable */
  const decoupleBook = useCallback((orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    // Update order status
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: 'RETURNED', updatedAt: todayISO() } : o
    ));
    // Mark the inventory item as returned/reusable
    setInventory(prev => prev.map(inv =>
      inv.id === order.bookId ? { ...inv, isReturned: true } : inv
    ));
    fireToast('Book returned to warehouse. tg_file_id preserved. Stock updated.', 'info');
  }, [orders, fireToast]);

  /** Allocate a returned warehouse book to a student at 0 cost → ARRIVED */
  const allocateFromWarehouse = useCallback((invId: string, studentId: string, groupId: string) => {
    const inv = inventory.find(i => i.id === invId);
    if (!inv) return;
    const newOrder: Order = {
      id: nextOrderId(),
      studentId,
      groupId,
      bookId: invId,
      status: 'ARRIVED',
      amountPaid: 0,
      bookCost: 0, // 0-cost allocation — student gets it free
      comment: 'Allocated from warehouse reusable stock',
      updatedAt: todayISO(),
    };
    setOrders(prev => [...prev, newOrder]);
    // Mark inventory as no longer available (allocated out)
    setInventory(prev => prev.map(i =>
      i.id === invId ? { ...i, isReturned: false } : i
    ));
    fireToast(`"${inv.title}" allocated from warehouse. ARRIVED status. 0 cost.`);
  }, [inventory, fireToast]);

  /** Inbound ingestion: register a new book in inventory */
  const addInventoryItem = useCallback((title: string, bookCost: number) => {
    const item: InventoryItem = {
      id: nextInvId(),
      title,
      tgFileId: genTgFileId(title),
      isReturned: false,
      bookCost,
    };
    setInventory(prev => [...prev, item]);
    fireToast(`"${title}" registered in inventory. tg_file_id generated.`);
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

  const retailPrice     = (bookCost: number) => parseFloat((bookCost * 1.5).toFixed(2));
  const isDeliverable   = (order: Order)     => order.amountPaid >= retailPrice(order.bookCost);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <AppContext.Provider value={{
      activeRole, activeSubPage, setActiveRole, setActiveSubPage,
      teachers, groups, students, inventory, orders, notifications, toasts, setOrders, fireToast,
      createBulkOrders, collectCash, cancelOrder,
      dispatchToSupplier, markArrived, deliverBook, decoupleBook,
      allocateFromWarehouse, addInventoryItem,
      dismissNotification, dismissToast,
      refreshGroups, refreshStudents,
      getTeacherName, getStudentName, getGroupName, getInventoryItem,
      getStudentOrders, getLatestOrder, getStudentsByGroup, getGroupsByTeacher,
      retailPrice, isDeliverable,
    }}>
      {children}
    </AppContext.Provider>
  );
}
