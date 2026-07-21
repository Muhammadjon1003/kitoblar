import { useState } from 'react';
import { CheckSquare, Square, Send, Package, Check, Clock, Truck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge, EmptyState, uzs, TableShell, Th, Td } from '../../components/ui';

export default function SupplierRouting() {
  const {
    orders,
    dispatchToSupplier,
    markArrived,
    getStudentName,
    getGroupName,
    getInventoryItem,
    sendToTelegram,
    sotuvNarxi,
  } = useApp();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [yuborildi, setYuborildi]     = useState(false);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);

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

  /** Group selected or all paid orders by book and send to Telegram */
  const handleSendTelegram = async () => {
    const targetIds = selectedIds.size > 0 
      ? [...selectedIds] 
      : tolovBuyurtmalar.map(o => o.id);

    if (targetIds.length === 0) return;

    setYuborilmoqda(true);
    const success = await sendToTelegram(targetIds);
    setYuborilmoqda(false);
    if (success) {
      setYuborildi(true);
      setTimeout(() => setYuborildi(false), 2500);
      setSelectedIds(new Set());
    }
  };

  const hasTolov = tolovBuyurtmalar.length > 0;
  const hasYolda = yoldaBuyurtmalar.length > 0;

  if (!hasTolov && !hasYolda) {
    return (
      <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6 bg-slate-50">
        <EmptyState label="Ta'minot yo'nalishida hech qanday buyurtma mavjud emas." />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6 bg-slate-50">

      {/* ── To'langan buyurtmalar: tanlash va yetkazib berish ── */}
      {hasTolov && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 bg-slate-100/60 border-b border-slate-200 gap-4">
            <div>
              <p className="text-sm font-bold text-slate-800">To'langan buyurtmalar — Ta'minotchiga yo'naltirish</p>
              <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                Buyurtmalarni tanlang va ta'minotchiga yuboring. Holat: To'langan → Yo'lda.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleSendTelegram}
                disabled={yuborilmoqda}
                className="flex items-center gap-1.5 text-xs sb-btn-secondary py-2 px-3.5 disabled:opacity-50 font-bold"
              >
                {yuborilmoqda ? (
                  <Clock className="w-3.5 h-3.5 animate-spin text-slate-500" />
                ) : yuborildi ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-indigo-600" />
                )}
                {yuborilmoqda ? 'Yuborilmoqda...' : yuborildi ? 'Yuborildi!' : 'Telegramga yuborish'}
              </button>
              <button
                onClick={handleDispatch}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-1.5 text-xs sb-btn-primary py-2 px-3.5 disabled:opacity-40 font-bold"
              >
                <Send className="w-3.5 h-3.5 text-white" />
                {selectedIds.size > 0 ? `${selectedIds.size} tasini yuborish` : 'Tanlanganlarini yuborish'}
              </button>
            </div>
          </div>

          <TableShell>
            <thead>
              <tr>
                <Th>
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-slate-700 transition-colors">
                    {selectedIds.size === tolovBuyurtmalar.length && tolovBuyurtmalar.length > 0
                      ? <CheckSquare className="w-4 h-4 text-blue-600 font-bold" />
                      : <Square className="w-4 h-4" />
                    }
                  </button>
                </Th>
                <Th>Talaba / Guruh</Th>
                <Th>Kitob nomi</Th>
                <Th>Sotuv Narxi</Th>
                <Th>Holati</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tolovBuyurtmalar.map(o => {
                const inv = getInventoryItem(o.bookId);
                const sel = selectedIds.has(o.id);
                const narx = o.sotuvNarxi > 0 ? o.sotuvNarxi : sotuvNarxi;

                return (
                  <tr
                    key={o.id}
                    className={`transition-colors cursor-pointer ${sel ? 'bg-blue-50/60' : 'hover:bg-slate-50/80'}`}
                    onClick={() => toggleSelect(o.id)}
                  >
                    <Td>
                      <div onClick={e => e.stopPropagation()}>
                        <button onClick={() => toggleSelect(o.id)} className="text-slate-400 hover:text-blue-600 transition-colors">
                          {sel
                            ? <CheckSquare className="w-4 h-4 text-blue-600 font-bold" />
                            : <Square className="w-4 h-4" />
                          }
                        </button>
                      </div>
                    </Td>
                    <Td>
                      <p className="font-bold text-slate-800 text-xs">{getStudentName(o.studentId)}</p>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{getGroupName(o.groupId)}</p>
                    </Td>
                    <Td>{inv?.title ?? '—'}</Td>
                    <Td mono>
                      <span className="text-emerald-600 font-bold">{uzs(narx)}</span>
                    </Td>
                    <Td><StatusBadge status={o.status} /></Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        </div>
      )}

      {/* ── Yo'lda buyurtmalar — Keldi deb belgilash ── */}
      {hasYolda && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-100/60 border-b border-slate-200">
            <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Truck className="w-4.5 h-4.5 text-amber-500" />
              Yo'lda — Ta'minotchidan kutilmoqda
            </p>
            <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
              O'quv markaziga jismoniy kitoblar kelganda "Qabul qilindi" tugmasini bosing.
            </p>
          </div>
          
          <TableShell>
            <thead>
              <tr>
                <Th>Talaba / Guruh</Th>
                <Th>Kitob nomi</Th>
                <Th>Sotuv Narxi</Th>
                <Th>Yuborilgan sana</Th>
                <Th right>Amal</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {yoldaBuyurtmalar.map(o => {
                const inv = getInventoryItem(o.bookId);
                const narx = o.sotuvNarxi > 0 ? o.sotuvNarxi : sotuvNarxi;

                return (
                  <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                    <Td>
                      <p className="font-bold text-slate-800 text-xs">{getStudentName(o.studentId)}</p>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{getGroupName(o.groupId)}</p>
                    </Td>
                    <Td>{inv?.title ?? '—'}</Td>
                    <Td mono>
                      <span className="text-emerald-600 font-bold">{uzs(narx)}</span>
                    </Td>
                    <Td mono>
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {o.updatedAt}
                      </span>
                    </Td>
                    <Td right>
                      <button
                        onClick={() => markArrived(o.id, 0)}
                        className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all duration-150 inline-flex items-center gap-1.5"
                      >
                        <Package className="w-3.5 h-3.5" /> Qabul qilindi
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        </div>
      )}
    </div>
  );
}
