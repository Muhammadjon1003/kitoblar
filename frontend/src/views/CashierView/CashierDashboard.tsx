/**
 * views/CashierView/CashierDashboard.tsx — O'zbek tili
 */

import { useState } from 'react';
import { FolderPlus, Users, CalendarDays, Clock, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import PipelineColumn from './PipelineColumn';
import { CreateGroupModal, AddStudentModal } from './StudentModals';
import { TableShell, Th, Td, StatusBadge, EmptyState, uzs } from '../../components/ui';
import type { Order, OrderStatus } from '../../types';

function PipelineView() {
  const USTUNLAR = [
    {
      statuses: ['CREATED'] as OrderStatus[],
      title: 'O\'qituvchi buyurtma bergan',
      subtitle: 'To\'lov kutilayotgan buyurtmalar',
      accentLeft: 'border-l-blue-600',
      countColor: 'bg-blue-600 text-white font-bold',
    },
    {
      statuses: ['ORDERED'] as OrderStatus[],
      title: 'Logistika buyurtma bergan (Yo\'lda)',
      subtitle: 'Yo\'ldagi kitoblar — kelganda qabul qiling',
      accentLeft: 'border-l-indigo-600',
      countColor: 'bg-indigo-600 text-white font-bold',
    },
    {
      statuses: ['ARRIVED'] as OrderStatus[],
      title: 'Kelgan va Topshirishga tayyor',
      subtitle: 'Kitoblarni talabalarga topshiring',
      accentLeft: 'border-l-emerald-600',
      countColor: 'bg-emerald-600 text-white font-bold',
    },
  ];

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-5 p-6 h-full min-w-max">
          {USTUNLAR.map(col => (
            <PipelineColumn key={col.title} {...col} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface FixPaymentModalProps {
  order: Order;
  onClose: () => void;
}

function FixPaymentModal({ order, onClose }: FixPaymentModalProps) {
  const { updateOrderAdmin, getStudentName, getInventoryItem, retailPrice, fireToast } = useApp();
  const [amount,  setAmount]  = useState(String(order.amountPaid));
  const [status,  setStatus]  = useState<OrderStatus>(order.status);
  const [comment, setComment] = useState(order.comment);
  const [saving,  setSaving]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      fireToast('Iltimos, to\'g\'ri miqdor kiriting.', 'error');
      return;
    }
    setSaving(true);
    await updateOrderAdmin(order.id, { status, amountPaid: parsedAmount, comment });
    setSaving(false);
    onClose();
  };

  const inv = getInventoryItem(order.bookId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white border border-slate-300 rounded-2xl shadow-2xl z-10 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">To'lovni tahrirlash (Tuzatish)</h3>
            <p className="text-[11px] text-blue-100 mt-0.5">{getStudentName(order.studentId)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">Darslik:</span>
              <span className="font-bold text-slate-800">{inv?.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">Chakana narx:</span>
              <span className="font-bold text-slate-800">{uzs(retailPrice(order.bookCost))}</span>
            </div>
          </div>

          <div>
            <label className="sb-label">To'langan miqdor (so'm)</label>
            <input
              type="number" min="0" step="0.01" className="sb-input"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="sb-label">Buyurtma holati</label>
            <select
              className="sb-input"
              value={status}
              onChange={e => setStatus(e.target.value as OrderStatus)}
              required
            >
              <option value="CREATED">Yaratildi (To'lov kutilmoqda)</option>
              <option value="PAID">To'langan (Buyurtma kutilmoqda)</option>
              <option value="ORDERED">Buyurtma berildi (Yo'lda)</option>
              <option value="ARRIVED">Keldi (Topshirishga tayyor)</option>
              <option value="GIVEN">Topshirildi (Yakunlangan)</option>
              <option value="CANCELLED">Bekor qilindi</option>
              <option value="RETURNED">Qaytarildi (Omborga)</option>
            </select>
          </div>

          <div>
            <label className="sb-label">Izoh (Tuzatish sababi)</label>
            <textarea
              className="sb-input min-h-[60px]"
              placeholder="Nega o'zgartirilganligi haqida qisqa eslatma..."
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="sb-btn-secondary flex-1 text-xs">Bekor qilish</button>
            <button type="submit" disabled={saving} className="sb-btn-primary flex-1 text-xs flex items-center justify-center gap-1.5">
              {saving ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saqlanmoqda...</> : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaymentsHistoryView() {
  const { orders, getStudentName, getGroupName, getInventoryItem, retailPrice } = useApp();
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Show all orders sorted newest first
  const allOrders = [...orders].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

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
                    <Td mono>{uzs(retailPrice(o.bookCost))}</Td>
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

function BoshqaruvKorinishi() {
  const { groups, students } = useApp();
  const [guruhKorsat,   setGuruhKorsat]   = useState(false);
  const [talabKorsat, setTalabaKorsat] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6 bg-slate-50">
      {/* Amallar paneli */}
      <div className="flex items-center gap-3">
        <button onClick={() => setGuruhKorsat(true)} className="sb-btn-secondary flex items-center gap-1.5 text-xs">
          <FolderPlus className="w-3.5 h-3.5 text-slate-800" /> Guruh yaratish
        </button>
        <button onClick={() => setTalabaKorsat(true)} className="sb-btn-primary flex items-center gap-1.5 text-xs">
          <Users className="w-3.5 h-3.5 text-white" /> Talaba qo'shish
        </button>
        <span className="text-[11px] font-bold text-slate-700 bg-slate-200 border border-slate-350 px-2.5 py-1 rounded-lg ml-auto">
          {groups.length} ta guruh · {students.length} ta talaba
        </span>
      </div>

      {/* Guruhlar jadvali */}
      <div className="sb-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-100/50 flex items-center gap-2">
          <FolderPlus className="w-4 h-4 text-blue-600 font-bold" />
          <p className="text-sm font-bold text-slate-800">Ro'yxatga olingan guruhlar</p>
        </div>
        <TableShell>
          <thead>
            <tr>
              <Th>Guruh nomi</Th>
              <Th>O'qituvchi</Th>
              <Th>Boshlanish</Th>
              <Th>Tugash</Th>
              <Th>Interval</Th>
              <Th>Talabalar</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {groups.map(g => (
              <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                <Td>{g.groupName}</Td>
                <Td>{g.teacherName}</Td>
                <Td mono>{g.startDate}</Td>
                <Td mono>{g.endDate}</Td>
                <Td>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-slate-950 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    <Clock className="w-2.5 h-2.5" />
                    {g.orderIntervalDays} kun
                  </span>
                </Td>
                <Td>{students.filter(s => s.groupId === g.id).length} ta talaba</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </div>

      {/* Talabalar jadvali */}
      <div className="sb-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-100/50 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600 font-bold" />
          <p className="text-sm font-bold text-slate-800">Barcha talabalar</p>
        </div>
        <TableShell>
          <thead>
            <tr>
              <Th>Ismi</Th>
              <Th>Guruh</Th>
              <Th>Ro'yxatga olingan</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map(s => (
              <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                <Td>
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm shadow-blue-500/20">
                      {s.name.charAt(0)}
                    </div>
                    <span className="font-semibold text-slate-800">{s.name}</span>
                  </div>
                </Td>
                <Td>{groups.find(g => g.id === s.groupId)?.groupName ?? '—'}</Td>
                <Td mono>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-200 text-slate-800 rounded-md font-semibold text-xs">
                    <CalendarDays className="w-3 h-3 text-slate-700" />
                    {s.createdAt}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </div>

      {guruhKorsat   && <CreateGroupModal onClose={() => setGuruhKorsat(false)} />}
      {talabKorsat && <AddStudentModal  onClose={() => setTalabaKorsat(false)} />}
    </div>
  );
}

export default function CashierDashboard() {
  const { activeSubPage } = useApp();
  if (activeSubPage === 'pipeline') return <PipelineView />;
  if (activeSubPage === 'payments') return <PaymentsHistoryView />;
  return <BoshqaruvKorinishi />;
}
