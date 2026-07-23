import { useState } from 'react';
import { CheckSquare, Square, Send, Package, Check, Clock, Truck, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge, EmptyState, uzs, TableShell, Th, Td } from '../../components/ui';
import { QabulQilishModali, OmmaviyQabulModali } from '../../components/QabulModallari';
import type { Order } from '../../types';

export default function SupplierRouting() {
  const {
    orders,
    groups,
    dispatchToSupplier,
    getStudentName,
    getGroupName,
    getInventoryItem,
    sendToTelegram,
    sotuvNarxi,
  } = useApp();

  const [selectedPaidIds, setSelectedPaidIds] = useState<Set<string>>(new Set());
  const [selectedYoldaIds, setSelectedYoldaIds] = useState<Set<string>>(new Set());
  
  const [yuborildi, setYuborildi]         = useState(false);
  const [yuborilmoqda, setYuborilmoqda]   = useState(false);

  // Modals state
  const [singleOrderToAccept, setSingleOrderToAccept] = useState<Order | null>(null);
  const [showBulkAcceptModal, setShowBulkAcceptModal] = useState(false);

  const tolovBuyurtmalar  = orders.filter(o => o.status === 'PAID');
  const yoldaBuyurtmalar  = orders.filter(o => o.status === 'ORDERED');

  // Paid selection handlers
  const toggleSelectPaid = (id: string) => {
    setSelectedPaidIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAllPaid = () => {
    setSelectedPaidIds(prev =>
      prev.size === tolovBuyurtmalar.length
        ? new Set()
        : new Set(tolovBuyurtmalar.map(o => o.id))
    );
  };

  // Yolda selection handlers
  const toggleSelectYolda = (id: string) => {
    setSelectedYoldaIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAllYolda = () => {
    setSelectedYoldaIds(prev =>
      prev.size === yoldaBuyurtmalar.length
        ? new Set()
        : new Set(yoldaBuyurtmalar.map(o => o.id))
    );
  };

  const handleDispatch = () => {
    if (selectedPaidIds.size === 0) return;
    dispatchToSupplier([...selectedPaidIds]);
    setSelectedPaidIds(new Set());
  };

  /** Group selected or all paid orders by book and send to Telegram */
  const handleSendTelegram = async () => {
    const targetIds = selectedPaidIds.size > 0 
      ? [...selectedPaidIds] 
      : tolovBuyurtmalar.map(o => o.id);

    if (targetIds.length === 0) return;

    setYuborilmoqda(true);
    const success = await sendToTelegram(targetIds);
    setYuborilmoqda(false);
    if (success) {
      setYuborildi(true);
      setTimeout(() => setYuborildi(false), 2500);
      setSelectedPaidIds(new Set());
    }
  };

  const bulkYoldaOrdersToAccept = yoldaBuyurtmalar.filter(o => selectedYoldaIds.has(o.id));

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6 bg-slate-50">

      {/* ── To'langan buyurtmalar: tanlash va yetkazib berish ── */}
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
              disabled={yuborilmoqda || tolovBuyurtmalar.length === 0}
              className="flex items-center gap-1.5 text-xs sb-btn-secondary py-2 px-3.5 disabled:opacity-40 font-bold"
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
              disabled={selectedPaidIds.size === 0}
              className="flex items-center gap-1.5 text-xs sb-btn-primary py-2 px-3.5 disabled:opacity-40 font-bold"
            >
              <Send className="w-3.5 h-3.5 text-white" />
              {selectedPaidIds.size > 0 ? `${selectedPaidIds.size} tasini yuborish` : 'Tanlanganlarini yuborish'}
            </button>
          </div>
        </div>

        {tolovBuyurtmalar.length === 0 ? (
          <div className="p-8">
            <EmptyState label="Hozircha to'langan va yuborilish kutilayotgan buyurtmalar yo'q." />
          </div>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>
                  <button onClick={toggleSelectAllPaid} className="text-slate-400 hover:text-slate-700 transition-colors">
                    {selectedPaidIds.size === tolovBuyurtmalar.length && tolovBuyurtmalar.length > 0
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
                const sel = selectedPaidIds.has(o.id);
                const narx = o.sotuvNarxi > 0 ? o.sotuvNarxi : sotuvNarxi;

                return (
                  <tr
                    key={o.id}
                    className={`transition-colors cursor-pointer ${sel ? 'bg-blue-50/60' : 'hover:bg-slate-50/80'}`}
                    onClick={() => toggleSelectPaid(o.id)}
                  >
                    <Td>
                      <div onClick={e => e.stopPropagation()}>
                        <button onClick={() => toggleSelectPaid(o.id)} className="text-slate-400 hover:text-blue-600 transition-colors">
                          {sel
                            ? <CheckSquare className="w-4 h-4 text-blue-600 font-bold" />
                            : <Square className="w-4 h-4" />
                          }
                        </button>
                      </div>
                    </Td>
                    <Td>
                      <p className="font-bold text-slate-800 text-xs">{getStudentName(o.studentId)}</p>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                        {getGroupName(o.groupId)} <span className="text-slate-400 font-normal">•</span> O'qituvchi: <span className="text-slate-700 font-bold">{groups.find(g => g.id === o.groupId)?.teacherName ?? '—'}</span>
                      </p>
                    </Td>
                    <Td>{inv?.title ?? '—'}</Td>
                    <Td mono>
                      {o.sotuvNarxi === 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[10px] rounded-md font-sans">To'lov ichida</span>
                      ) : (
                        <span className="text-emerald-600 font-bold">{uzs(narx)}</span>
                      )}
                    </Td>
                    <Td><StatusBadge status={o.status} /></Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        )}
      </div>

      {/* ── Yo'lda buyurtmalar — Keldi deb belgilash ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 bg-slate-100/60 border-b border-slate-200 gap-4">
          <div>
            <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Truck className="w-4.5 h-4.5 text-amber-500" />
              Yo'lda — Ta'minotchidan kutilmoqda
            </p>
            <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
              O'quv markaziga jismoniy kitoblar kelganda qabul qilish va tan narxini kiritish.
            </p>
          </div>

          {/* Bulk accept button for Yo'lda section */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowBulkAcceptModal(true)}
              disabled={selectedYoldaIds.size === 0}
              className="flex items-center gap-1.5 text-xs py-2 px-3.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white transition-all shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {selectedYoldaIds.size > 0 
                ? `${selectedYoldaIds.size} ta kitobni ommaviy qabul qilish` 
                : 'Tanlanganlarini qabul qilish'}
            </button>
          </div>
        </div>
        
        {yoldaBuyurtmalar.length === 0 ? (
          <div className="p-8">
            <EmptyState label="Hozircha yo'lda bo'lgan kutilayotgan kitoblar yo'q." />
          </div>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>
                  <button onClick={toggleSelectAllYolda} className="text-slate-400 hover:text-slate-700 transition-colors">
                    {selectedYoldaIds.size === yoldaBuyurtmalar.length && yoldaBuyurtmalar.length > 0
                      ? <CheckSquare className="w-4 h-4 text-emerald-600 font-bold" />
                      : <Square className="w-4 h-4" />
                    }
                  </button>
                </Th>
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
                const sel = selectedYoldaIds.has(o.id);

                return (
                  <tr 
                    key={o.id} 
                    className={`transition-colors cursor-pointer ${sel ? 'bg-emerald-50/50' : 'hover:bg-slate-50/80'}`}
                    onClick={() => toggleSelectYolda(o.id)}
                  >
                    <Td>
                      <div onClick={e => e.stopPropagation()}>
                        <button onClick={() => toggleSelectYolda(o.id)} className="text-slate-400 hover:text-emerald-600 transition-colors">
                          {sel
                            ? <CheckSquare className="w-4 h-4 text-emerald-600 font-bold" />
                            : <Square className="w-4 h-4" />
                          }
                        </button>
                      </div>
                    </Td>
                    <Td>
                      <p className="font-bold text-slate-800 text-xs">{getStudentName(o.studentId)}</p>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                        {getGroupName(o.groupId)} <span className="text-slate-400 font-normal">•</span> O'qituvchi: <span className="text-slate-700 font-bold">{groups.find(g => g.id === o.groupId)?.teacherName ?? '—'}</span>
                      </p>
                    </Td>
                    <Td>{inv?.title ?? '—'}</Td>
                    <Td mono>
                      {o.sotuvNarxi === 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[10px] rounded-md font-sans">To'lov ichida</span>
                      ) : (
                        <span className="text-emerald-600 font-bold">{uzs(narx)}</span>
                      )}
                    </Td>
                    <Td mono>
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {o.updatedAt}
                      </span>
                    </Td>
                    <Td right>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSingleOrderToAccept(o); }}
                        className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all duration-150 inline-flex items-center gap-1.5"
                      >
                        <Package className="w-3.5 h-3.5" /> Qabul qilish
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        )}
      </div>

      {/* Single accept modal */}
      {singleOrderToAccept && (
        <QabulQilishModali
          order={singleOrderToAccept}
          onClose={() => setSingleOrderToAccept(null)}
        />
      )}

      {/* Bulk accept modal */}
      {showBulkAcceptModal && bulkYoldaOrdersToAccept.length > 0 && (
        <OmmaviyQabulModali
          orders={bulkYoldaOrdersToAccept}
          onClose={() => setShowBulkAcceptModal(false)}
          onSuccess={() => setSelectedYoldaIds(new Set())}
        />
      )}
    </div>
  );
}
