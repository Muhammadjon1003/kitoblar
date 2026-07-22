/**
 * views/CashierView/components/PaymentsHistoryView.tsx — O'zbek tili
 */

import { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { TableShell, Th, Td, StatusBadge, EmptyState, uzs } from '../../../components/ui';
import type { Order } from '../../../types';
import FixPaymentModal from './FixPaymentModal';

export default function PaymentsHistoryView() {
  const { orders, getStudentName, getGroupName, getInventoryItem } = useApp();
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Show all orders sorted newest first strictly by createdAt, updatedAt, and id
  const allOrders = [...orders].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (dateB !== dateA) return dateB - dateA;

    const upA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const upB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    if (upB !== upA) return upB - upA;

    return b.id.localeCompare(a.id);
  });

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6 bg-slate-50">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">To'lovlar Tarixi</h2>
          <p className="text-xs text-slate-700 font-semibold mt-0.5">Tizimdagi barcha to'lov operatsiyalari va ularni tahrirlash</p>
        </div>
        <span className="text-[11px] font-bold text-slate-700 bg-slate-200 border border-slate-350 px-2.5 py-1 rounded-lg">
          Jami: {allOrders.length} ta buyurtma
        </span>
      </div>

      <div className="sb-card overflow-hidden">
        {allOrders.length === 0 ? (
          <EmptyState label="Hozircha hech qanday buyurtma mavjud emas." />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Talaba</Th>
                <Th>Guruh</Th>
                <Th>Kitob</Th>
                <Th>To'langan miqdor</Th>
                <Th>Chakana narx</Th>
                <Th>Holati</Th>
                <Th>Izoh</Th>
                <Th right>Amallar</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allOrders.map(o => {
                const inv = getInventoryItem(o.bookId);
                return (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <Td>{getStudentName(o.studentId)}</Td>
                    <Td>{getGroupName(o.groupId)}</Td>
                    <Td>{inv?.title ?? '—'}</Td>
                    <Td mono>
                      <span className="text-emerald-600 font-bold">{uzs(o.amountPaid)}</span>
                    </Td>
                    <Td mono>{uzs(o.sotuvNarxi)}</Td>
                    <Td>
                      <StatusBadge status={o.status} />
                    </Td>
                    <Td muted>{o.comment || '—'}</Td>
                    <Td right>
                      <button
                        onClick={() => setEditingOrder(o)}
                        className="py-1 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all duration-150"
                      >
                        Tuzatish
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        )}
      </div>

      {editingOrder && (
        <FixPaymentModal order={editingOrder} onClose={() => setEditingOrder(null)} />
      )}
    </div>
  );
}
