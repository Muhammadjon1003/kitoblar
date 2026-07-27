import { useState } from 'react';
import { Archive, Send, ChevronDown, Package, XCircle, RotateCcw, CheckCircle2, X, PlusCircle, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { EmptyState, TableShell, Th, Td, uzs } from '../../components/ui';
import BekorQilishModali from '../../components/BekorQilishModali';
import type { Order } from '../../types';

function TalabadanKitobQaytarishModali({ onClose }: { onClose: () => void }) {
  const { orders, getStudentName, getGroupName, getInventoryItem, cancelOrder } = useApp();
  const [qidiruv, setQidiruv] = useState('');
  const [returningOrder, setReturningOrder] = useState<Order | null>(null);

  // Filter GIVEN orders (topshirilgan darsliklar)
  const givenOrders = orders.filter(o => o.status === 'GIVEN');

  const filtered = qidiruv.trim() === ''
    ? givenOrders
    : givenOrders.filter(o => {
        const q = qidiruv.toLowerCase();
        const studentName = getStudentName(o.studentId).toLowerCase();
        const groupName   = getGroupName(o.groupId).toLowerCase();
        const inv         = getInventoryItem(o.bookId);
        const bookTitle   = (inv?.title ?? '').toLowerCase();
        return studentName.includes(q) || groupName.includes(q) || bookTitle.includes(q) || o.id.toLowerCase().includes(q);
      });

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              <h3 className="text-base font-bold">Topshirilgan Kitobni Talabadan Qaytarib Olish</h3>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/15 text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search bar */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={qidiruv}
                onChange={e => setQidiruv(e.target.value)}
                placeholder="Talaba ismi, guruh yoki darslik nomi bo'yicha qidirish..."
                className="w-full h-10 pl-9 pr-3 text-xs font-semibold text-slate-800 placeholder-slate-400 bg-white border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                autoFocus
              />
            </div>
          </div>

          {/* Given orders list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filtered.length === 0 ? (
              <EmptyState label={qidiruv ? `"${qidiruv}" bo'yicha berilgan kitoblar topilmadi.` : "Hozircha topshirilgan kitoblar mavjud emas."} />
            ) : (
              filtered.map(o => {
                const inv = getInventoryItem(o.bookId);
                const studentName = getStudentName(o.studentId);
                const groupName = getGroupName(o.groupId);

                return (
                  <div key={o.id} className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:border-purple-300 transition-all shadow-xs gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{studentName}</p>
                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                        Guruh: <span className="text-slate-700">{groupName}</span> • Darslik: <span className="text-purple-700 font-bold">{inv?.title ?? '—'}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => setReturningOrder(o)}
                      className="py-1.5 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all shrink-0 inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Omborga qaytarish
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 text-right shrink-0">
            <button onClick={onClose} className="sb-btn-secondary py-1.5 px-4 text-xs font-bold">
              Yopish
            </button>
          </div>
        </div>
      </div>

      {returningOrder && (
        <BekorQilishModali
          targetName={`${getStudentName(returningOrder.studentId)} — ${getInventoryItem(returningOrder.bookId)?.title ?? 'Kitob'}`}
          title="Kitobni Ombor Zaxirasiga Qaytarish Sababi"
          onClose={() => setReturningOrder(null)}
          onConfirm={(reason) => {
            cancelOrder(returningOrder.id, reason);
            setReturningOrder(null);
            onClose();
          }}
        />
      )}
    </>
  );
}

function OmborgaKitobQoshishModali({ onClose }: { onClose: () => void }) {
  const { inventory, addManualInventoryStock } = useApp();
  const [bookId, setBookId] = useState(inventory[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [bookCost, setBookCost] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [xato, setXato] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookId) {
      setXato("Iltimos, darslikni tanlang.");
      return;
    }
    setSaving(true);
    setXato('');

    const success = await addManualInventoryStock({
      bookId,
      quantity,
      bookCost,
      comment: comment.trim() || undefined,
    });

    setSaving(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl z-10 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <h3 className="text-base font-bold">Omborga Jismoniy Kitob Qo'shish</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/15 text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="sb-label">Darslik turi</label>
            {inventory.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-700">
                Hozircha bot/katalogda darsliklar mavjud emas. Avval Telegram bot orqali kitob yuklang.
              </div>
            ) : (
              <div className="relative">
                <select
                  className="sb-input appearance-none pr-8 font-bold text-slate-800"
                  value={bookId}
                  onChange={e => setBookId(e.target.value)}
                >
                  {inventory.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({b.categoryName || 'Umumiy'})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="sb-label">Miqdori (Soni)</label>
              <input
                type="number" min={1} max={500} className="sb-input font-mono font-bold"
                value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div>
              <label className="sb-label">Tan narxi (dona / so'm)</label>
              <input
                type="number" min={0} step={1000} className="sb-input font-mono font-bold"
                value={bookCost || ''} placeholder="0 so'm"
                onChange={e => setBookCost(Math.max(0, parseFloat(e.target.value) || 0))}
              />
            </div>
          </div>

          <div>
            <label className="sb-label">Izoh / Manba (ixtiyoriy)</label>
            <input
              type="text" className="sb-input"
              placeholder="masalan: Do'kondan keltirilgan yangi zaxira"
              value={comment} onChange={e => setComment(e.target.value)}
            />
          </div>

          {xato && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
              {xato}
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} disabled={saving} className="sb-btn-secondary flex-1 text-xs">
              Bekor qilish
            </button>
            <button type="submit" disabled={saving || inventory.length === 0} className="sb-btn-primary flex-1 flex items-center justify-center gap-1.5 text-xs">
              {saving ? 'Saqlanmoqda...' : 'Omborga saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WarehouseInventory() {
  const {
    inventory,
    orders,
    students,
    groups,
    allocateFromWarehouse,
    getStudentName,
    getGroupName,
    getInventoryItem,
    sotuvNarxi,
    cancelOrder,
  } = useApp();

  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  const setAllocation = (itemId: string, studentId: string) => {
    setAllocations(prev => ({ ...prev, [itemId]: studentId }));
  };

  const handleAllocate = (invId: string, itemKey: string) => {
    const studentId = allocations[itemKey];
    if (!studentId) return;
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    allocateFromWarehouse(invId, studentId, student.groupId);
    setAllocations(prev => { const next = { ...prev }; delete next[itemKey]; return next; });
  };

  // 1. Books in company hands that can be allocated/re-assigned (Returned, Cancelled, Free stock)
  const allocatableItems: Array<{
    key: string;
    bookId: string;
    title: string;
    categoryName?: string;
    reason: string;
    badgeColor: string;
  }> = [];

  // Returned inventory items (True inventory)
  inventory.filter(i => i.isReturned).forEach(i => {
    allocatableItems.push({
      key: `inv-${i.id}`,
      bookId: i.id,
      title: i.title,
      categoryName: i.categoryName,
      reason: 'Omborga qaytarilgan',
      badgeColor: 'bg-purple-100 border-purple-200 text-purple-700',
    });
  });

  // RETURNED status orders (True inventory & manually added stock)
  orders.filter(o => o.status === 'RETURNED').forEach(o => {
    const inv = getInventoryItem(o.bookId);
    const studentName = getStudentName(o.studentId);
    const displayReason = o.comment
      ? o.comment
      : (studentName && studentName !== '—' ? `Qaytarilgan buyurtma (${studentName})` : 'Ombor jismoniy zaxirasi');

    allocatableItems.push({
      key: `ord-ret-${o.id}`,
      bookId: o.bookId,
      title: inv?.title ?? 'Kitob',
      categoryName: inv?.categoryName,
      reason: displayReason,
      badgeColor: 'bg-purple-100 border-purple-200 text-purple-700',
    });
  });

  // Cancelled orders where a physical book actually arrived or was in transit
  orders.filter(o => o.status === 'CANCELLED' && !o.comment?.includes("hali buyurtma qilinmagan")).forEach(o => {
    const inv = getInventoryItem(o.bookId);
    const studentName = getStudentName(o.studentId);
    const displayReason = o.comment
      ? o.comment
      : `Bekor qilingan buyurtma (${studentName})`;

    allocatableItems.push({
      key: `ord-cancel-${o.id}`,
      bookId: o.bookId,
      title: inv?.title ?? 'Kitob',
      categoryName: inv?.categoryName,
      reason: displayReason,
      badgeColor: 'bg-rose-100 border-rose-200 text-rose-700',
    });
  });

  // 2. Comprehensive Company Possession Inventory (All books physically in company hands)
  // True inventory & physical books come first; cancelled books come later.
  const companyBooksList = [
    ...orders.filter(o => o.status === 'ARRIVED').map(o => ({
      id: o.id,
      title: getInventoryItem(o.bookId)?.title ?? 'Kitob',
      categoryName: getInventoryItem(o.bookId)?.categoryName ?? '—',
      studentName: getStudentName(o.studentId),
      groupName: getGroupName(o.groupId),
      statusLabel: "Kelgan (Topshirilmagan)",
      statusType: 'ARRIVED' as const,
      price: o.sotuvNarxi > 0 ? o.sotuvNarxi : sotuvNarxi,
    })),
    ...inventory.filter(inv => inv.isReturned).map(inv => ({
      id: `inv-${inv.id}`,
      title: inv.title,
      categoryName: inv.categoryName ?? '—',
      studentName: '—',
      groupName: '—',
      statusLabel: "Ombor inventari (Qaytarilgan)",
      statusType: 'STOCK' as const,
      price: sotuvNarxi,
    })),
    ...orders.filter(o => o.status === 'RETURNED').map(o => ({
      id: o.id,
      title: getInventoryItem(o.bookId)?.title ?? 'Kitob',
      categoryName: getInventoryItem(o.bookId)?.categoryName ?? '—',
      studentName: getStudentName(o.studentId),
      groupName: getGroupName(o.groupId),
      statusLabel: "Qaytarilgan (Omborda)",
      statusType: 'RETURNED' as const,
      price: o.sotuvNarxi > 0 ? o.sotuvNarxi : sotuvNarxi,
    })),
    ...orders.filter(o => o.status === 'CANCELLED' && !o.comment?.includes("hali buyurtma qilinmagan")).map(o => ({
      id: o.id,
      title: getInventoryItem(o.bookId)?.title ?? 'Kitob',
      categoryName: getInventoryItem(o.bookId)?.categoryName ?? '—',
      studentName: getStudentName(o.studentId),
      groupName: getGroupName(o.groupId),
      statusLabel: "Bekor qilingan (Omborda)",
      statusType: 'CANCELLED' as const,
      price: o.sotuvNarxi > 0 ? o.sotuvNarxi : sotuvNarxi,
    })),
  ];

  return (
    <div className="flex-1 overflow-y-auto px-3.5 sm:px-7 py-4 sm:py-6 space-y-6 bg-slate-50">
      
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Archive className="w-5 h-5 text-indigo-600" />
            Markaz Qo'lidagi va Omborxonadagi Kitoblar
          </h2>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Kompaniyadagi barcha jismoniy kitoblar: kelgan (topshirilmagan), bekor qilingan va ombordagi darsliklar.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowReturnModal(true)}
            className="py-2 px-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
          >
            <RotateCcw className="w-4 h-4 text-white" />
            Talabadan kitobni qaytarib olish
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            Omborga kitob qo'shish (Zaxira)
          </button>
          <span className="text-[11px] font-bold px-3 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 shadow-sm">
            Biriktiriladigan: {allocatableItems.length} ta
          </span>
          <span className="text-[11px] font-bold px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700 shadow-sm">
            Jami qo'ldagi: {companyBooksList.length} ta
          </span>
        </div>
      </div>

      {/* ── Section 1: Biriktiriladigan kitoblar (Returned, Cancelled, Free Stock) ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-100/60 border-b border-slate-200">
          <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-600" />
            Talabalarga Biriktirilishi Mumkin Bo'lgan Kitoblar
          </p>
          <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
            Bekor qilingan buyurtmalar va omborga qaytarilgan darsliklar — yangi talabaga biriktirilsa, darhol Keldi holatiga o'tadi.
          </p>
        </div>

        {allocatableItems.length === 0 ? (
          <div className="p-8">
            <EmptyState label="Hozircha biriktirish uchun bo'sh bo'lgan kitoblar yo'q." />
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {allocatableItems.map((item, idx) => {
              const selectedStudentId = allocations[item.key] ?? '';
              const selectedStudent   = students.find(s => s.id === selectedStudentId);

              return (
                <div key={item.key} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-slate-300 transition-colors">
                  {/* Kitob ma'lumotlari */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600 font-mono">
                        #{idx + 1}
                      </span>
                      <p className="text-sm font-bold text-slate-800">{item.title}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                      <span className={`px-2.5 py-0.5 border rounded-full font-bold ${item.badgeColor}`}>
                        {item.reason}
                      </span>
                      {item.categoryName && (
                        <span className="text-slate-500 font-semibold">{item.categoryName}</span>
                      )}
                      <span className="text-emerald-600 font-bold">→ Talabaga biriktirish</span>
                    </div>
                  </div>

                  {/* Talaba tanlash + biriktirish */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="relative">
                      <select
                        className="sb-input appearance-none pr-8 text-xs min-w-[220px] bg-white border-slate-300 rounded-xl font-medium"
                        value={selectedStudentId}
                        onChange={e => setAllocation(item.key, e.target.value)}
                      >
                        <option value="">— Talabani tanlang —</option>
                        {groups.map(g => (
                          <optgroup key={g.id} label={g.groupName}>
                            {students
                              .filter(s => s.groupId === g.id)
                              .map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))
                            }
                          </optgroup>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>

                    <button
                      onClick={() => handleAllocate(item.bookId, item.key)}
                      disabled={!selectedStudentId}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold sb-btn-primary disabled:opacity-40 whitespace-nowrap shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Biriktirish
                      {selectedStudent && ` → ${selectedStudent.name.split(' ')[0]}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section 2: Kompaniya Qo'lidagi Barcha Jismoniy Kitoblar va Inventar Jadvali ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-100/60 border-b border-slate-200">
          <p className="text-sm font-bold text-slate-800">Kompaniya Qo'lidagi Barcha Jismoniy Kitoblar Ro'yxati</p>
          <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
            Markazga kelgan, hali topshirilmagan, bekor qilingan va omborda turgan barcha kitoblar statistikasi.
          </p>
        </div>
        
        {companyBooksList.length === 0 ? (
          <div className="p-8">
            <EmptyState label="Hozircha kompaniya qo'lida hech qanday kitob mavjud emas." />
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <TableShell>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Kitob nomi</Th>
                  <Th>Talaba / Guruh</Th>
                  <Th>Kategoriya</Th>
                  <Th>Sotuv Narxi</Th>
                  <Th>Holati</Th>
                  <Th>Ombor Amali</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companyBooksList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <Td mono>{idx + 1}</Td>
                    <Td><span className="font-bold text-slate-800">{item.title}</span></Td>
                    <Td>
                      {item.studentName !== '—' ? (
                        <div>
                          <p className="font-bold text-slate-800 text-xs">{item.studentName}</p>
                          <p className="text-[10px] text-slate-500 font-semibold">{item.groupName}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium">—</span>
                      )}
                    </Td>
                    <Td muted>{item.categoryName}</Td>
                    <Td mono>
                      <span className="text-emerald-600 font-bold">{uzs(item.price)}</span>
                    </Td>
                    <Td>
                      {item.statusType === 'ARRIVED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 border border-amber-200 text-amber-800 rounded-full text-[10px] font-bold">
                          <Package className="w-3 h-3" /> Kelgan (Topshirilmagan)
                        </span>
                      ) : item.statusType === 'CANCELLED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-100 border border-rose-200 text-rose-700 rounded-full text-[10px] font-bold">
                          <XCircle className="w-3 h-3" /> Bekor qilingan (Omborda)
                        </span>
                      ) : item.statusType === 'RETURNED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-purple-100 border border-purple-200 text-purple-700 rounded-full text-[10px] font-bold">
                          <RotateCcw className="w-3 h-3" /> Qaytarilgan (Omborda)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-slate-500" /> Ombor Inventari
                        </span>
                      )}
                    </Td>
                    <Td>
                      {item.statusType === 'ARRIVED' ? (
                        <button
                          onClick={() => cancelOrder(item.id, 'O\'qituvchi xato buyurtmani ombor zaxirasiga qaytardi')}
                          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold text-[10px] rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" /> Ombor zaxirasiga o'tkazish
                        </button>
                      ) : (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Bo'sh zaxirada
                        </span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </div>
        )}
      </div>

      {/* Manual Stock Addition Modal */}
      {showAddModal && (
        <OmborgaKitobQoshishModali onClose={() => setShowAddModal(false)} />
      )}

      {/* Return Book from Student Modal */}
      {showReturnModal && (
        <TalabadanKitobQaytarishModali onClose={() => setShowReturnModal(false)} />
      )}

    </div>
  );
}
