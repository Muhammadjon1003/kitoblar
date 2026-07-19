/**
 * views/LogisticsView/SupplierRouting.tsx — O'zbek tili
 * Texnik maydonlar (tg_file_id, CDN, TR §) foydalanuvchidan yashirilgan.
 */

import { useState } from 'react';
import { CheckSquare, Square, Send, Package, Check, Clock, Truck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge, EmptyState } from '../../components/ui';

export default function SupplierRouting() {
  const { orders, dispatchToSupplier, markArrived, getStudentName, getGroupName, getInventoryItem } = useApp();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [yuborildi, setYuborildi]     = useState(false);

  const tolovBuyurtmalar  = orders.filter(o => o.status === 'PAID');
  const yoldaBuyurtmalar  = orders.filter(o => o.status === 'ORDERED');

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev =>
      prev.size === tolovBuyurtmalar.length
        ? new Set()
        : new Set(tolovBuyurtmalar.map(o => o.id))
    );
  };

  const handleDispatch = () => {
    if (selectedIds.size === 0) return;
    dispatchToSupplier([...selectedIds]);
    setSelectedIds(new Set());
  };

  /** Tanlangan buyurtmalar ro'yxatini buferga nusxalash */
  const handleCopyBatch = () => {
    const payload = tolovBuyurtmalar.map((o, i) => {
      const inv = getInventoryItem(o.bookId);
      return `${i + 1}. ${getStudentName(o.studentId)} — ${inv?.title ?? '—'}`;
    });
    navigator.clipboard.writeText(payload.join('\n'));
    setYuborildi(true);
    setTimeout(() => setYuborildi(false), 2500);
  };

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6">

      {/* ── To'langan buyurtmalar: tanlash va yetkazib berish ── */}
      <div className="sb-card overflow-hidden border-blue-900/30">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <p className="text-sm font-semibold text-zinc-100">To'langan buyurtmalar — Ta'minotchiga yo'naltirish</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Buyurtmalarni tanlang va ta'minotchiga yuboring. Holat: To'langan → Yo'lda.
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <button
              onClick={handleCopyBatch}
              disabled={tolovBuyurtmalar.length === 0}
              className="flex items-center gap-1.5 text-xs sb-btn-secondary py-1.5 px-3 disabled:opacity-40"
            >
              {yuborildi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Package className="w-3.5 h-3.5" />}
              {yuborildi ? 'Nusxalandi!' : 'Ro\'yxatni nusxalash'}
            </button>
            <button
              onClick={handleDispatch}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-1.5 text-xs sb-btn-primary py-1.5 px-3 disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              {selectedIds.size > 0 ? `${selectedIds.size} tasini yuborish` : 'Tanlanganlari yuborish'}
            </button>
          </div>
        </div>

        {tolovBuyurtmalar.length === 0 ? (
          <EmptyState label="Ta'minotchiga yuborishni kutayotgan buyurtmalar yo'q." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/40">
                  <th className="px-4 py-2.5 w-10">
                    <button onClick={toggleSelectAll} className="text-zinc-500 hover:text-zinc-200 transition-colors">
                      {selectedIds.size === tolovBuyurtmalar.length && tolovBuyurtmalar.length > 0
                        ? <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                        : <Square className="w-3.5 h-3.5" />
                      }
                    </button>
                  </th>
                  {['Talaba / Guruh', 'Kitob nomi', 'Narxi', 'Holati'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {tolovBuyurtmalar.map(o => {
                  const inv = getInventoryItem(o.bookId);
                  const sel = selectedIds.has(o.id);
                  return (
                    <tr
                      key={o.id}
                      className={`transition-colors cursor-pointer ${sel ? 'bg-blue-950/15' : 'hover:bg-zinc-800/20'}`}
                      onClick={() => toggleSelect(o.id)}
                    >
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <button onClick={() => toggleSelect(o.id)} className="text-zinc-500 hover:text-blue-400 transition-colors">
                          {sel
                            ? <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                            : <Square className="w-3.5 h-3.5" />
                          }
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-200">{getStudentName(o.studentId)}</p>
                        <p className="text-[10px] text-zinc-500">{getGroupName(o.groupId)}</p>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{inv?.title ?? '—'}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-zinc-300">${o.bookCost}</td>
                      <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Yo'lda buyurtmalar — Keldi deb belgilash ── */}
      <div className="sb-card overflow-hidden border-amber-900/30">
        <div className="px-5 py-4 border-b border-zinc-800">
          <p className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-400" />
            Yo'lda — Ta'minotchidan kutilmoqda
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            O'quv markaziga jismoniy kitoblar kelganda "Qabul qilindi" tugmasini bosing.
          </p>
        </div>
        {yoldaBuyurtmalar.length === 0 ? (
          <EmptyState label="Hozircha yo'lda buyurtmalar yo'q." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/40">
                  {['Talaba', 'Kitob', 'Yuborilgan sana', 'Amal'].map(h => (
                    <th key={h} className="px-5 py-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {yoldaBuyurtmalar.map(o => {
                  const inv = getInventoryItem(o.bookId);
                  return (
                    <tr key={o.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-zinc-200">{getStudentName(o.studentId)}</p>
                        <p className="text-[10px] text-zinc-500">{getGroupName(o.groupId)}</p>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400">{inv?.title ?? '—'}</td>
                      <td className="px-5 py-3.5 text-zinc-500 font-mono flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />{o.updatedAt}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => markArrived(o.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold
                                     bg-emerald-900/50 hover:bg-emerald-800 text-emerald-400 hover:text-emerald-100
                                     border border-emerald-800 transition-colors whitespace-nowrap"
                        >
                          <Package className="w-3 h-3" /> Qabul qilindi
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
