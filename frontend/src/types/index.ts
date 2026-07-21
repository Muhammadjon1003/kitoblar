/**
 * types/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Central TR § 2 aligned database schema definitions.
 * All interfaces map 1-to-1 to the Neon PostgreSQL table columns.
 * No legacy fields (debt, lessons, stream) are present.
 */

// ─── Order State Machine (TR § 3) ─────────────────────────────────────────────
// Strict linear progression with two side-exit states.
export type OrderStatus =
  | 'CREATED'    // Teacher submitted; Cashier must collect payment
  | 'PAID'       // Cashier confirmed receipt; awaiting Logistics
  | 'ORDERED'    // Logistics routed to supplier via Telegram CDN
  | 'ARRIVED'    // Physical books received at learning center
  | 'GIVEN'      // Final delivery to student (terminal success state)
  | 'CANCELLED'  // Order aborted; refund processed externally
  | 'RETURNED'   // Book decoupled from student; returned to warehouse
  | 'REASSIGNED'
  | 'Ombordan biriktirildi';

// ─── RBAC Roles (TR § 1) ──────────────────────────────────────────────────────
export type UserRole = 'TEACHER' | 'CASHIER' | 'LOGISTICS' | 'MANAGER';

// ─── TR § 2: users table (display only — auth not in frontend scope) ──────────
export interface Teacher {
  id: string;
  name: string;
  username: string;
}

// ─── TR § 2: groups table ─────────────────────────────────────────────────────
export interface Group {
  id: string;
  groupName: string;
  teacherName: string;        // Free-text teacher display name
  subjectCategory: string;    // Subject / category label
  startDate: string;          // ISO date string
  endDate: string;            // ISO date string
  orderIntervalDays: number;  // Used for TR § 5 window calculation
  createdAt?: string;         // ISO creation date
  studentCount?: number;      // Computed count from API
}

// ─── TR § 2: students table ──────────────────────────────────────────────────
export interface Student {
  id: string;
  fullName: string;    // Full name from DB
  name: string;        // Alias for fullName (kept for backward compat with existing views)
  phoneNumber: string; // Contact phone
  groupId: string;     // FK → groups.id
  groupName?: string;  // Denormalised from API join
  joinedAt: string;    // ISO date of enrollment
  createdAt: string;   // Alias for joinedAt (backward compat)
}

// ─── TR § 2: inventory table ──────────────────────────────────────────────────
export interface InventoryItem {
  id: string;
  title: string;
  tgFileId: string;   // Telegram cloud storage reference (binary never hits server)
  isReturned: boolean; // true = available as reusable warehouse stock
  bookCost: number;   // Wholesale procurement cost (TR § 6: Σ book_cost)
  categoryName?: string;
}

// ─── TR § 2: orders table (central state-machine table) ───────────────────────
export interface Order {
  id: string;
  studentId: string;  // FK → students.id
  groupId: string;    // Snapshot FK → groups.id
  bookId: string;     // FK → inventory.id
  status: OrderStatus;
  amountPaid: number; // TR § 6: Σ amount_paid (cash inflow)
  bookCost: number;   // Snapshot of wholesale cost (tan narxi) — set by cashier at arrival
  sotuvNarxi: number; // Manager-set selling price locked at order creation time
  comment: string;    // Teacher-authored custom note
  updatedAt: string;  // ISO date of last state transition
  createdAt?: string; // ISO date of creation
}

// ─── TR § 5: system_notifications table ───────────────────────────────────────
export interface SystemNotification {
  id: string;
  userId: string;     // Teacher's user ID
  message: string;
  type: 'IMMEDIATE_ORDER_REQUIRED' | 'ORDER_WINDOW_APPROACHING';
  isRead: boolean;
  createdAt: string;
}

// ─── UI helpers (not DB-mapped) ───────────────────────────────────────────────
export interface AppToast {
  id: string;
  message: string;
  variant: 'success' | 'error' | 'info';
}

/** Payload for teacher's bulk order submission */
export interface BulkOrderItem {
  studentId: string;
  groupId: string;
  bookId: string;
  comment: string;
}

/** Sub-page keys per role for sidebar navigation */
export type SubPage =
  | 'orders'        // TEACHER
  | 'pipeline'      // CASHIER
  | 'management'    // CASHIER
  | 'payments'      // CASHIER
  | 'warehouse'     // LOGISTICS
  | 'supplier'      // LOGISTICS
  | 'inbound'       // LOGISTICS
  | 'analytics'     // MANAGER
  | 'ledger'        // MANAGER
  | 'coverage'      // MANAGER
  | 'groups'        // MANAGER — groups management
  | 'narxsozlama';  // MANAGER — price settings
