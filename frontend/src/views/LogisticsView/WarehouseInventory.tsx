/**
 * views/LogisticsView/WarehouseInventory.tsx
 * Logistics physical warehouse inventory manager & stock allocation workspace.
 */

import { useState } from 'react';
import { Archive, Send, ChevronDown, Package, RotateCcw, CheckCircle2, PlusCircle, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { EmptyState, TableShell, Th, Td, uzs } from '../../components/ui';
import TalabadanKitobQaytarishModali from './components/TalabadanKitobQaytarishModali';
import OmborgaKitobQoshishModali from './components/OmborgaKitobQoshishModali';

export default function WarehouseInventory() {
  const {
    inventory,
    orders,
    students,
    groups,
    warehouseStock,
    allocateFromWarehouse,
    getStudentName,
    getGroupName,
    getInventoryItem,
    sotuvNarxi,
    decoupleBook,
    removeWarehouseStockItem,
    deleteOrderAdmin,
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

  /** Delete / write off damaged physical book from warehouse */
  const handleDeleteDamagedBook = async (title: string, rawStockId?: number, rawOrderId?: string) => {
    if (!window.confirm(`Rostdan ham "${title}" darsligini yaroqsiz/yomon holatda deb hisobdan chiqarib, ombordan O'CHIRMOQCHIMISIZ?\n\n(Bu darslik yaroqsiz deb o'chiriladi va ortga qaytarib bo'lmaydi!)`)) {
      return;
    }

    if (rawStockId) {
      await removeWarehouseStockItem(rawStockId, 1, `"${title}" darsligi yaroqsiz/yomon holati sababli ombordan o'chirildi`);
    } else if (rawOrderId) {
      await deleteOrderAdmin(rawOrderId);
    }
  };

  // 1. Physical unassigned books in warehouse available for allocation
  const allocatableItems: Array<{
    key: string;
    bookId: string;
    title: string;
    categoryName?: string;
    reason: string;
    badgeColor: string;
    rawStockId?: number;
    rawOrderId?: string;
  }> = [];

  // Individual physical sub-books / books in warehouse (warehouse_stock table)
  (warehouseStock || []).filter(ws => ws.quantity > 0).forEach(ws => {
    allocatableItems.push({
      key: `stock-${ws.id}`,
      bookId: ws.fileId,
      title: ws.title,
      categoryName: 'Darslik Zaxirasi',
      reason: `Jismoniy Ombor Zaxirasi (${ws.quantity} ta darslik)`,
      badgeColor: 'bg-emerald-100 border-emerald-300 text-emerald-800 font-bold',
      rawStockId: ws.id,
    });
  });

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
      rawOrderId: o.id,
    });
  });

  // 2. Comprehensive Company Possession Inventory (All physical books at learning center)
  const companyBooksList = [
    ...(warehouseStock || []).filter(ws => ws.quantity > 0).map(ws => ({
      id: `stock-${ws.id}`,
      title: ws.title,
      categoryName: 'Darslik Zaxirasi',
      studentName: '—',
      groupName: '—',
      statusLabel: `Ombor Zaxirasi (${ws.quantity} ta)`,
      statusType: 'STOCK' as const,
      price: sotuvNarxi,
      rawStockId: ws.id,
      rawOrderId: undefined,
    })),
    ...orders.filter(o => o.status === 'ARRIVED').map(o => ({
      id: o.id,
      title: getInventoryItem(o.bookId)?.title ?? 'Kitob',
      categoryName: getInventoryItem(o.bookId)?.categoryName ?? '—',
      studentName: getStudentName(o.studentId),
      groupName: getGroupName(o.groupId),
      statusLabel: "Kelgan (Topshirilmagan)",
      statusType: 'ARRIVED' as const,
      price: o.sotuvNarxi > 0 ? o.sotuvNarxi : sotuvNarxi,
      rawStockId: undefined,
      rawOrderId: o.id,
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
      rawStockId: undefined,
      rawOrderId: undefined,
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
      rawStockId: undefined,
      rawOrderId: o.id,
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
        </div>
      </div>

      {/* ── Section 1: Biriktiriladigan kitoblar (Returned, Free Stock) ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 bg-slate-100/60 border-b border-slate-200 gap-2">
          <div>
            <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              Talabalarga Biriktirilishi Mumkin Bo'lgan Kitoblar
            </p>
            <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
              Omborga qaytarilgan darsliklar — yangi talabaga biriktirilsa, darhol Keldi holatiga o'tadi. Yaroqsiz darsliklarni o'chirish mumkin.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl shadow-2xs self-start sm:self-auto shrink-0">
            Biriktiriladigan: {allocatableItems.length} ta
          </span>
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

                  {/* Talaba tanlash + biriktirish + yaroqsiz deb o'chirish */}
                  <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                    <div className="relative">
                      <select
                        className="sb-input appearance-none pr-8 text-xs min-w-[200px] bg-white border-slate-300 rounded-xl font-medium"
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
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold sb-btn-primary disabled:opacity-40 whitespace-nowrap shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Biriktirish
                      {selectedStudent && ` → ${selectedStudent.name.split(' ')[0]}`}
                    </button>

                    {(item.rawStockId || item.rawOrderId) && (
                      <button
                        onClick={() => handleDeleteDamagedBook(item.title, item.rawStockId, item.rawOrderId)}
                        title="Yaroqsiz/yomon holatda bo'lgani uchun ombordan o'chirish"
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 transition-colors shadow-2xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline">Yaroqsiz deb o'chirish</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section 2: Kompaniya Qo'lidagi Barcha Jismoniy Kitoblar va Inventar Jadvali ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 bg-slate-100/60 border-b border-slate-200 gap-2">
          <div>
            <p className="text-sm font-bold text-slate-800">Kompaniya Qo'lidagi Barcha Jismoniy Kitoblar Ro'yxati</p>
            <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
              Markazga kelgan, hali topshirilmagan va omborda turgan barcha kitoblar statistikasi. Yaroqsizlarini o'chirish mumkin.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl shadow-2xs self-start sm:self-auto shrink-0">
            Jami qo'ldagi: {companyBooksList.length} ta
          </span>
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
                      <div className="flex items-center gap-2">
                        {item.statusType === 'ARRIVED' ? (
                          <button
                            onClick={() => decoupleBook(item.id)}
                            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold text-[10px] rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" /> Ombor zaxirasiga o'tkazish
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Bo'sh zaxirada
                          </span>
                        )}

                        {(item.rawStockId || item.rawOrderId) && (
                          <button
                            onClick={() => handleDeleteDamagedBook(item.title, item.rawStockId, item.rawOrderId)}
                            title="Yaroqsiz/yomon holatda bo'lgani uchun ombordan o'chirish"
                            className="px-2 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-[10px] rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Yaroqsiz deb o'chirish</span>
                          </button>
                        )}
                      </div>
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
