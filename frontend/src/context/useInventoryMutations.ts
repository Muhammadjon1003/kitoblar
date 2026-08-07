/**
 * context/useInventoryMutations.ts
 * Inventory stock, warehouse physical stock management, book pricing, and title editing.
 */

import { useCallback } from 'react';
import type { InventoryItem } from '../types';
import { API } from './contextHelpers';

export function useInventoryMutations(
  checkAuth: () => boolean,
  inventory: InventoryItem[],
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>,
  refreshOrders: () => Promise<void>,
  refreshWarehouseStock: () => Promise<void>,
  fireToast: (msg: string, variant?: any) => void
) {
  /** Add manual inventory stock to database */
  const addManualInventoryStock = useCallback(async (data: {
    bookId: string;
    quantity: number;
    bookCost: number;
    comment?: string;
  }): Promise<boolean> => {
    if (!checkAuth()) return false;
    try {
      const res = await fetch(`${API}/backend/inventory/manual-add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error(await res.text());
      await refreshOrders();
      fireToast("Omborga zaxira darsliklar qo'shildi!");
      return true;
    } catch (err: any) {
      fireToast(`Qo'shishda xatolik: ${err.message}`, 'error');
      return false;
    }
  }, [checkAuth, refreshOrders, fireToast]);

  /** Allocate a free/returned book from warehouse to student */
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
  }, [inventory, checkAuth, refreshOrders, setInventory, fireToast]);

  /** Add inventory item stub */
  const addInventoryItem = useCallback((title: string, _bookCost: number) => {
    fireToast(`"${title}" ro'yxatga olindi.`);
  }, [fireToast]);

  /** Update book custom selling price */
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
  }, [checkAuth, setInventory, fireToast]);

  /** Update book title, price, or set details */
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
  }, [checkAuth, setInventory, fireToast]);

  /** Add physical unassigned warehouse stock (or sub-books of set) */
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

      if (!res.ok) throw new Error(await res.text());
      await refreshWarehouseStock();
      fireToast("Jismoniy ombor zaxirasiga darsliklar qo'shildi!", 'success');
      return true;
    } catch (err: any) {
      fireToast(`Qo'shishda xatolik: ${err.message}`, 'error');
      return false;
    }
  }, [checkAuth, refreshWarehouseStock, fireToast]);

  /** Delete/write off damaged physical warehouse stock item */
  const removeWarehouseStockItem = useCallback(async (stockId: number, quantity = 1, reason?: string): Promise<boolean> => {
    if (!checkAuth()) return false;
    try {
      const res = await fetch(`${API}/backend/warehouse-stock/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockId, quantity, reason }),
      });

      if (!res.ok) throw new Error(await res.text());
      await refreshWarehouseStock();
      fireToast(reason || "Yaroqsiz darslik ombor zaxirasidan o'chirildi.", 'info');
      return true;
    } catch (err: any) {
      fireToast(`O'chirishda xatolik: ${err.message}`, 'error');
      return false;
    }
  }, [checkAuth, refreshWarehouseStock, fireToast]);

  return {
    addManualInventoryStock,
    allocateFromWarehouse,
    addInventoryItem,
    updateBookPrice,
    updateBookDetails,
    addWarehouseStockItem,
    removeWarehouseStockItem,
  };
}
