/**
 * views/LogisticsView/WarehouseInventory.tsx — O'zbek tili
 * Markaz qo'lidagi barcha kitoblar: Kelgan (topshirilmagan), bekor qilingan, qaytarilgan va ombor inventari.
 */

import { useState } from 'react';
import { Archive, Send, ChevronDown, Package, XCircle, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { EmptyState, TableShell, Th, Td, uzs } from '../../components/ui';

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
  } = useApp();

  const [allocations, setAllocations] = useState<Record<string, string>>({});

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

  // Returned inventory items
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

  // Cancelled orders (books returned to company hands)
  orders.filter(o => o.status === 'CANCELLED').forEach(o => {
    const inv = getInventoryItem(o.bookId);
    allocatableItems.push({
      key: `ord-cancel-${o.id}`,
      bookId: o.bookId,
      title: inv?.title ?? 'Kitob',
      categoryName: inv?.categoryName,
      reason: `Bekor qilingan buyurtma (${getStudentName(o.studentId)})`,
      badgeColor: 'bg-rose-100 border-rose-200 text-rose-700',
    });
  });

  // RETURNED status orders
  orders.filter(o => o.status === 'RETURNED').forEach(o => {
    const inv = getInventoryItem(o.bookId);
    // avoid double counting if already in returned inventory
    if (!allocatableItems.some(item => item.bookId === o.bookId && item.reason.includes('Omborga'))) {
      allocatableItems.push({
        key: `ord-ret-${o.id}`,
        bookId: o.bookId,
        title: inv?.title ?? 'Kitob',
        categoryName: inv?.categoryName,
        reason: `Qaytarilgan buyurtma (${getStudentName(o.studentId)})`,
        badgeColor: 'bg-purple-100 border-purple-200 text-purple-700',
      });
    }
  });

  // 2. Comprehensive Company Possession Inventory (All books physically in company hands)
  // - ARRIVED (at center, not given yet)
  // - CANCELLED (at center)
  // - RETURNED (at center)
  // - Inventory Stock
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
    ...orders.filter(o => o.status === 'CANCELLED').map(o => ({
      id: o.id,
      title: getInventoryItem(o.bookId)?.title ?? 'Kitob',
      categoryName: getInventoryItem(o.bookId)?.categoryName ?? '—',
      studentName: getStudentName(o.studentId),
      groupName: getGroupName(o.groupId),
      statusLabel: "Bekor qilingan (Omborda)",
      statusType: 'CANCELLED' as const,
      price: o.sotuvNarxi > 0 ? o.sotuvNarxi : sotuvNarxi,
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
  ];

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6 bg-slate-50">
      
      {/* Page Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Archive className="w-5 h-5 text-indigo-600" />
            Markaz Qo'lidagi va Omborxonadagi Kitoblar
          </h2>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Kompaniyadagi barcha jismoniy kitoblar: kelgan (topshirilmagan), bekor qilingan va ombordagi darsliklar.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <TableShell>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>Kitob nomi</Th>
                <Th>Talaba / Guruh</Th>
                <Th>Kategoriya</Th>
                <Th>Sotuv Narxi</Th>
                <Th>Holati</Th>
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
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </div>

    </div>
  );
}
