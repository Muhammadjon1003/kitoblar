/**
 * context/useOrderMutations.ts
 * Order lifecycle mutations, payments, decoupled items, Telegram supplier dispatching, etc.
 */

import { useCallback } from 'react';
import type { Order, OrderStatus, BulkOrderItem } from '../types';
import { API, todayISO } from './contextHelpers';

export function useOrderMutations(
  checkAuth: () => boolean,
  orders: Order[],
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>,
  refreshOrders: () => Promise<void>,
  fireToast: (msg: string, variant?: any) => void
) {
  /** Create bulk orders for a group */
  const createBulkOrders = useCallback(async (items: BulkOrderItem[]) => {
    if (!checkAuth()) return;
    if (items.length === 0) return;

    try {
      const res = await fetch(`${API}/backend/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items),
      });

      if (!res.ok) throw new Error(await res.text());
      await refreshOrders();
      fireToast(`Muvaffaqiyatli ${items.length} ta darslik buyurtma qilindi!`);
    } catch (err: any) {
      fireToast(`Buyurtma berishda xatolik: ${err.message}`, 'error');
      await refreshOrders();
    }
  }, [checkAuth, refreshOrders, fireToast]);

  /** Cashier collects cash payment for book */
  const collectCash = useCallback(async (orderId: string, amount: number) => {
    if (!checkAuth()) return;
    setOrders(prev => prev.map(o =>
      o.id === orderId
        ? { ...o, amountPaid: o.amountPaid + amount, updatedAt: todayISO() }
        : o
    ));

    try {
      const res = await fetch(`${API}/backend/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountPaidDelta: amount }),
      });

      if (!res.ok) throw new Error(await res.text());
      await refreshOrders();
      fireToast(`${amount.toLocaleString('uz-UZ')} so'm to'lov qabul qilindi.`);
    } catch (err: any) {
      fireToast(`To'lov saqlashda xatolik: ${err.message}`, 'error');
      await refreshOrders();
    }
  }, [checkAuth, refreshOrders, fireToast]);

  /** Cashier marks course payment as collected */
  const markCoursePayment = useCallback(async (orderId: string) => {
    if (!checkAuth()) return;
    setOrders(prev => prev.map(o =>
      o.id === orderId
        ? { ...o, isCoursePaid: true, updatedAt: todayISO() }
        : o
    ));

    try {
      const res = await fetch(`${API}/backend/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCoursePaid: true }),
      });

      if (!res.ok) throw new Error(await res.text());
      await refreshOrders();
      fireToast("Kurs to'lovi qabul qilingan deb belgilandi.");
    } catch (err: any) {
      fireToast(`To'lov saqlashda xatolik: ${err.message}`, 'error');
      await refreshOrders();
    }
  }, [checkAuth, refreshOrders, fireToast]);

  /** Cancel an order */
  const cancelOrder = useCallback(async (orderId: string, reason?: string) => {
    if (!checkAuth()) return;
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: 'CANCELLED', updatedAt: todayISO() } : o
    ));

    try {
      const res = await fetch(`${API}/backend/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED', comment: reason }),
      });

      if (!res.ok) throw new Error(await res.text());
      await refreshOrders();
      fireToast(reason || "Buyurtma bekor qilindi.", 'info');
    } catch (err: any) {
      fireToast(`Bekor qilishda xatolik: ${err.message}`, 'error');
      await refreshOrders();
    }
  }, [checkAuth, refreshOrders, fireToast]);

  /** Dispatch pending orders to supplier */
  const dispatchToSupplier = useCallback(async (orderIds: string[]) => {
    if (!checkAuth()) return;
    setOrders(prev => prev.map(o =>
      orderIds.includes(o.id) ? { ...o, status: 'ORDERED', updatedAt: todayISO() } : o
    ));

    try {
      const res = await fetch(`${API}/backend/orders/bulk-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds, status: 'ORDERED' }),
      });

      if (!res.ok) throw new Error(await res.text());
      await refreshOrders();
      fireToast(`${orderIds.length} ta buyurtma ta'minotchiga yuborildi.`);
    } catch (err: any) {
      fireToast(`Yuborishda xatolik: ${err.message}`, 'error');
      await refreshOrders();
    }
  }, [checkAuth, refreshOrders, fireToast]);

  /** Mark order as arrived */
  const markArrived = useCallback(async (orderId: string, bookCost: number) => {
    if (!checkAuth()) return;
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: 'ARRIVED', bookCost, updatedAt: todayISO() } : o
    ));

    try {
      const res = await fetch(`${API}/backend/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ARRIVED', bookCost }),
      });

      if (!res.ok) throw new Error(await res.text());
      await refreshOrders();
      fireToast("Darslik yetib keldi deb belgilandi.");
    } catch (err: any) {
      fireToast(`Xatolik: ${err.message}`, 'error');
      await refreshOrders();
    }
  }, [checkAuth, refreshOrders, fireToast]);

  /** Deliver book to student */
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

  /** Decouple book back to warehouse */
  const decoupleBook = useCallback(async (orderId: string) => {
    if (!checkAuth()) return;
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: 'RETURNED', updatedAt: todayISO() } : o
    ));

    try {
      const res = await fetch(`${API}/backend/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RETURNED' }),
      });

      if (!res.ok) throw new Error(await res.text());
      await refreshOrders();
      fireToast("Darslik talabadan yechildi va ombor zaxirasiga o'tkazildi.");
    } catch (err: any) {
      fireToast(`Xatolik: ${err.message}`, 'error');
      await refreshOrders();
    }
  }, [checkAuth, refreshOrders, fireToast]);

  /** Update order fields directly (admin/cashier) */
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

  /** Update order book assignment */
  const updateOrderBook = useCallback(async (
    orderId: string,
    payload: { bookId: string; bookCost?: number; sotuvNarxi?: number }
  ): Promise<boolean> => {
    if (!checkAuth()) return false;
    try {
      const res = await fetch(`${API}/backend/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());
      await refreshOrders();
      fireToast("Buyurtma darsligi o'zgartirildi!");
      return true;
    } catch (err: any) {
      fireToast(`O'zgartirishda xatolik: ${err.message}`, 'error');
      return false;
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

  /** Dispatch orders directly to Telegram Group */
  const sendToTelegram = useCallback(async (orderIds: string[]): Promise<boolean> => {
    if (!checkAuth()) return false;
    try {
      const res = await fetch(`${API}/backend/send-to-telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds }),
      });

      if (!res.ok) throw new Error(await res.text());
      await refreshOrders();
      fireToast("Buyurtmalar Telegram xodimlar guruhiga yuborildi!", 'success');
      return true;
    } catch (err: any) {
      fireToast(`Telegramga yuborishda xatolik: ${err.message}`, 'error');
      return false;
    }
  }, [checkAuth, refreshOrders, fireToast]);

  /** Return order book to warehouse stock */
  const returnOrderWithStock = useCallback(async (
    orderId: string,
    returnedFileIds?: string[],
    comment?: string
  ): Promise<boolean> => {
    if (!checkAuth()) return false;
    try {
      const res = await fetch(`${API}/backend/orders/${orderId}/return-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnedFileIds, comment }),
      });

      if (!res.ok) throw new Error(await res.text());
      await refreshOrders();
      fireToast("Darslik ombor zaxirasiga qaytarildi!", 'success');
      return true;
    } catch (err: any) {
      fireToast(`Qaytarishda xatolik: ${err.message}`, 'error');
      return false;
    }
  }, [checkAuth, refreshOrders, fireToast]);

  return {
    createBulkOrders,
    collectCash,
    markCoursePayment,
    cancelOrder,
    dispatchToSupplier,
    markArrived,
    deliverBook,
    decoupleBook,
    updateOrderAdmin,
    updateOrderBook,
    deleteOrderAdmin,
    sendToTelegram,
    returnOrderWithStock,
  };
}
