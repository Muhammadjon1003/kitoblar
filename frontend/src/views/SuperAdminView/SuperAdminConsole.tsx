/**
 * views/SuperAdminView/SuperAdminConsole.tsx
 * Developer / SuperAdmin Secret Control Console.
 * Full system state override, order status editing, price overrides, and data repairs.
 */

import { useState, useMemo } from 'react';
import { RefreshCw, Save, Search, Edit3, Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Td, StatusBadge, uzs } from '../../components/ui';

const STATUS_LIST = [
  'CREATED',
  'PAID',
  'ORDERED',
  'ARRIVED',
  'GIVEN',
  'CANCELLED',
  'RETURNED',
  'Ombordan biriktirildi',
];

export default function SuperAdminConsole() {
  const { orders, updateOrderAdmin, refreshOrders, getStudentName, getGroupName, getInventoryItem, fireToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string>('');
  const [editCost, setEditCost] = useState<string>('');
  const [editPrice, setEditPrice] = useState<string>('');
  const [editComment, setEditComment] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchStatus = selectedStatusFilter === 'ALL' || o.status === selectedStatusFilter;
      if (!matchStatus) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const studentName = getStudentName(o.studentId).toLowerCase();
      const groupName = getGroupName(o.groupId).toLowerCase();
      const bookTitle = (getInventoryItem(o.bookId)?.title ?? '').toLowerCase();
      return studentName.includes(q) || groupName.includes(q) || bookTitle.includes(q) || o.id.toLowerCase().includes(q);
    });
  }, [orders, selectedStatusFilter, searchQuery, getStudentName, getGroupName, getInventoryItem]);

  const handleStartEdit = (o: any) => {
    setEditingOrderId(o.id);
    setEditStatus(o.status);
    setEditCost(String(o.bookCost || 0));
    setEditPrice(String(o.sotuvNarxi || 0));
    setEditComment(o.comment || '');
  };

  const handleSaveEdit = async (orderId: string) => {
    setIsSaving(true);
    try {
      await updateOrderAdmin(orderId, {
        status: editStatus,
        bookCost: Number(editCost) || 0,
        sotuvNarxi: Number(editPrice) || 0,
        comment: editComment.trim(),
      });
      fireToast("⚡ Buyurtma ma'lumotlari muvaffaqiyatli saqlandi!", 'success');
      setEditingOrderId(null);
    } catch (err: any) {
      fireToast(`Xatolik: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 bg-slate-900 text-slate-100 min-h-screen">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 border border-purple-500/30 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center shrink-0 text-purple-300">
            <Zap className="w-6 h-6 text-purple-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white tracking-tight">SuperAdmin & Developer Konsoli</h1>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-purple-500/20 text-purple-300 border border-purple-400/30 rounded-full">
                ADMIN.DEV (ROOT)
              </span>
            </div>
            <p className="text-xs text-purple-200/80 mt-0.5">
              Barcha buyurtma holatlarini, narxlarni va ma'lumotlar bazasi parametrlarini to'g'ridan-to me'yorlashtirish konsoli.
            </p>
          </div>
        </div>

        <button
          onClick={() => refreshOrders()}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-purple-600/40 hover:bg-purple-600/60 border border-purple-400/40 text-purple-100 transition-all shadow-md shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
          Tizimni qayta yuklash
        </button>
      </div>

      {/* Control Tools Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-800/80 p-4 rounded-2xl border border-slate-700">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Talaba, guruh yoki kitob qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <span className="text-xs text-slate-400 font-semibold shrink-0">Filtr:</span>
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="bg-slate-900 text-xs font-bold text-slate-200 border border-slate-700 rounded-xl py-2 px-3 focus:outline-none focus:border-purple-500"
          >
            <option value="ALL">Barcha holatlar ({orders.length})</option>
            {STATUS_LIST.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Override Table */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-purple-300 text-xs uppercase font-extrabold border-b border-slate-700">
                <th className="px-4 py-3.5">Talaba & Guruh</th>
                <th className="px-4 py-3.5">Kitob nomi</th>
                <th className="px-4 py-3.5 text-right">Sotuv narxi</th>
                <th className="px-4 py-3.5 text-right">Tan narxi</th>
                <th className="px-4 py-3.5">Status (Holati)</th>
                <th className="px-4 py-3.5">Izoh / Comment</th>
                <th className="px-4 py-3.5 text-center">Boshqaruv</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 text-xs text-slate-200">
              {filteredOrders.map(o => {
                const isEditing = editingOrderId === o.id;
                const studentName = getStudentName(o.studentId);
                const groupName = getGroupName(o.groupId);
                const bookTitle = getInventoryItem(o.bookId)?.title ?? o.bookId;

                return (
                  <tr key={o.id} className="hover:bg-slate-700/40 transition-colors">
                    <Td>
                      <div>
                        <p className="font-bold text-white text-sm">{studentName}</p>
                        <p className="text-[11px] text-purple-400 font-medium">{groupName}</p>
                      </div>
                    </Td>

                    <Td>
                      <span className="font-semibold text-slate-300">{bookTitle}</span>
                    </Td>

                    <Td right mono>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-24 px-2 py-1 bg-slate-950 border border-purple-500 rounded text-right text-xs text-emerald-400 font-bold"
                        />
                      ) : (
                        <span className="text-emerald-400 font-bold">{uzs(o.sotuvNarxi)}</span>
                      )}
                    </Td>

                    <Td right mono>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editCost}
                          onChange={(e) => setEditCost(e.target.value)}
                          className="w-24 px-2 py-1 bg-slate-950 border border-purple-500 rounded text-right text-xs text-red-400 font-bold"
                        />
                      ) : (
                        <span className="text-red-400 font-bold">{uzs(o.bookCost)}</span>
                      )}
                    </Td>

                    <Td>
                      {isEditing ? (
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="px-2 py-1 bg-slate-950 text-purple-200 border border-purple-500 rounded font-bold text-xs"
                        >
                          {STATUS_LIST.map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      ) : (
                        <StatusBadge status={o.status} />
                      )}
                    </Td>

                    <Td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editComment}
                          onChange={(e) => setEditComment(e.target.value)}
                          className="w-full px-2 py-1 bg-slate-950 border border-purple-500 rounded text-xs text-slate-200"
                        />
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">{o.comment || '—'}</span>
                      )}
                    </Td>

                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleSaveEdit(o.id)}
                            disabled={isSaving}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-md transition-all"
                          >
                            <Save className="w-3.5 h-3.5" />
                            Saqlash
                          </button>
                          <button
                            onClick={() => setEditingOrderId(null)}
                            className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs"
                          >
                            Bekor
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(o)}
                          className="px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/60 border border-purple-400/40 text-purple-300 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Tahrirlash
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
