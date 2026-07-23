/**
 * views/ManagerView/LedgerTable.tsx — O'zbek tili
 * To'lovlar daftari va buyurtmalar hisoboti (Status bo'yicha saralash, filtr va sahifalash).
 */

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Filter, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge, TableShell, Th, Td, EmptyState, uzs } from '../../components/ui';

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ALL',                   label: "Barcha holatlar" },
  { value: 'CREATED',               label: 'Yaratildi' },
  { value: 'PAID',                  label: "To'langan" },
  { value: 'ORDERED',               label: 'Buyurtma berildi (Yo\'lda)' },
  { value: 'ARRIVED',               label: 'Keldi (Topshirishga tayyor)' },
  { value: 'GIVEN',                 label: 'Topshirildi' },
  { value: 'CANCELLED',             label: 'Bekor qilindi' },
  { value: 'RETURNED',              label: 'Qaytarildi' },
  { value: 'Ombordan biriktirildi', label: 'Ombordan biriktirildi' },
];

export default function LedgerTable() {
  const { orders, groups, getStudentName, getGroupName, getInventoryItem } = useApp();

  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery]       = useState<string>('');
  const [currentPage, setCurrentPage]       = useState<number>(1);
  const [pageSize, setPageSize]             = useState<number>(15);

  // 1. Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchStatus = selectedStatus === 'ALL' || o.status === selectedStatus;
      if (!matchStatus) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const studentName = getStudentName(o.studentId).toLowerCase();
      const groupName   = getGroupName(o.groupId).toLowerCase();
      const bookTitle   = (getInventoryItem(o.bookId)?.title ?? '').toLowerCase();
      return studentName.includes(q) || groupName.includes(q) || bookTitle.includes(q) || o.id.toLowerCase().includes(q);
    });
  }, [orders, selectedStatus, searchQuery, getStudentName, getGroupName, getInventoryItem]);

  // 2. Sort orders PRIMARILY by updatedAt (most recently updated first)
  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      const upA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const upB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      if (upB !== upA) return upB - upA;

      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;

      return b.id.localeCompare(a.id);
    });
  }, [filteredOrders]);

  // 3. Paginate
  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / pageSize));
  const validPage  = Math.min(currentPage, totalPages);

  const paginatedOrders = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return sortedOrders.slice(start, start + pageSize);
  }, [sortedOrders, validPage, pageSize]);

  // Totals for current filtered dataset
  const jami_tolov = filteredOrders.reduce((s, o) => s + o.amountPaid, 0);
  const jami_narx  = filteredOrders.reduce((s, o) => s + o.bookCost,   0);
  const jami_foyda = jami_tolov - jami_narx;

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  };

  const startItem = sortedOrders.length === 0 ? 0 : (validPage - 1) * pageSize + 1;
  const endItem   = Math.min(validPage * pageSize, sortedOrders.length);

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6 bg-slate-50">
      
      {/* ── Header & Totals ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">To'lovlar Daftari — Buyurtmalar Hisoboti</h2>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            Jami <span className="text-slate-800 font-bold">{orders.length}</span> ta buyurtmaning so'nggi yangilangan xronologik tartibi
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs shrink-0">
          <div className="px-3.5 py-1.5 bg-white border border-slate-250 rounded-xl shadow-sm text-slate-600 font-medium">
            Jami tushum: <span className="text-emerald-600 font-mono font-bold">{uzs(jami_tolov)}</span>
          </div>
          <div className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm text-emerald-800 font-medium">
            Sof foyda: <span className={`font-mono font-bold ${jami_foyda >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
              {jami_foyda >= 0 ? '+' : ''}{uzs(Math.abs(jami_foyda))}
            </span>
          </div>
        </div>
      </div>

      {/* ── Filter Bar & Controls ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Holat bo'yicha:</label>
          <select
            value={selectedStatus}
            onChange={e => handleStatusChange(e.target.value)}
            className="sb-input appearance-none text-xs bg-slate-50 border-slate-300 rounded-xl font-semibold py-1.5 pr-8 min-w-[200px]"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Search & Page Size */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Talaba, guruh, kitob..."
              className="w-full h-9 pl-9 pr-3 text-xs font-semibold text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0 text-xs text-slate-600 font-semibold">
            <span>Ko'rsatish:</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="sb-input text-xs bg-slate-50 border-slate-300 rounded-xl py-1 px-2 font-bold"
            >
              <option value={10}>10 ta</option>
              <option value={15}>15 ta</option>
              <option value={25}>25 ta</option>
              <option value={50}>50 ta</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Main Table Shell ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {paginatedOrders.length === 0 ? (
          <div className="p-8">
            <EmptyState label={searchQuery || selectedStatus !== 'ALL' ? "Tanlangan filtr bo'yicha buyurtmalar topilmadi." : "Hozircha hech qanday buyurtma mavjud emas."} />
          </div>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Talaba</Th>
                <Th>Guruh</Th>
                <Th>O'qituvchi</Th>
                <Th>Kitob nomi</Th>
                <Th right>Sotuv Narxi</Th>
                <Th right>To'langan</Th>
                <Th right>Tan Narxi (Xarajat)</Th>
                <Th right>Sof Foyda</Th>
                <Th>Holati</Th>
                <Th>Yangilangan sana</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedOrders.map(o => {
                const inv     = getInventoryItem(o.bookId);
                const chakana = o.sotuvNarxi;
                const foyda   = o.amountPaid - o.bookCost;
                const teacherName = groups.find(g => g.id === o.groupId)?.teacherName ?? '—';
                const isCourseIncluded = o.sotuvNarxi === 0;

                return (
                  <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                    <Td>
                      <span className="font-bold text-slate-800">{getStudentName(o.studentId)}</span>
                    </Td>
                    <Td muted>{getGroupName(o.groupId)}</Td>
                    <Td muted><span className="font-semibold text-slate-700">{teacherName}</span></Td>
                    <Td>{inv?.title ?? '—'}</Td>
                    <Td right mono muted>
                      {isCourseIncluded ? (
                        <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[10px] rounded-md font-sans">To'lov ichida</span>
                      ) : (
                        uzs(chakana)
                      )}
                    </Td>
                    <Td right mono>
                      {isCourseIncluded ? (
                        <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[10px] rounded-md font-sans">To'lov ichida</span>
                      ) : (
                        <span className="text-emerald-600 font-bold">{uzs(o.amountPaid)}</span>
                      )}
                    </Td>
                    <Td right mono>
                      <span className="text-red-500 font-bold">{uzs(o.bookCost)}</span>
                    </Td>
                    <Td right mono>
                      {isCourseIncluded ? (
                        <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[10px] rounded-md font-sans">To'lov ichida</span>
                      ) : (
                        <span className={`font-bold ${foyda >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                          {foyda >= 0 ? '+' : ''}{uzs(Math.abs(foyda))}
                        </span>
                      )}
                    </Td>
                    <Td>
                      <StatusBadge status={o.status} />
                    </Td>
                    <Td mono muted>{o.updatedAt}</Td>
                  </tr>
                );
              })}
            </tbody>

            {/* Summary Footer */}
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-100/80 text-xs font-bold">
                <td className="px-5 py-3.5 text-slate-700" colSpan={5}>Filtr bo'yicha jami ({filteredOrders.length} ta buyurtma)</td>
                <td className="px-5 py-3.5 text-right font-mono text-emerald-600">{uzs(jami_tolov)}</td>
                <td className="px-5 py-3.5 text-right font-mono text-red-500">{uzs(jami_narx)}</td>
                <td className={`px-5 py-3.5 text-right font-mono font-bold ${jami_foyda >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                  {jami_foyda >= 0 ? '+' : ''}{uzs(Math.abs(jami_foyda))}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </TableShell>
        )}

        {/* ── Pagination Bar ── */}
        {sortedOrders.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-3.5 bg-slate-50 border-t border-slate-200 gap-3 text-xs font-semibold text-slate-600">
            <div>
              <span className="font-bold text-slate-800">{sortedOrders.length}</span> ta buyurtmadan{' '}
              <span className="font-bold text-slate-800">{startItem}–{endItem}</span> oralig'i ko'rsatilmoqda
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={validPage <= 1}
                className="py-1 px-3 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white font-bold transition-all inline-flex items-center gap-1 shadow-sm"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Oldingi
              </button>

              <div className="px-3 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800 shadow-sm">
                {validPage} / {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={validPage >= totalPages}
                className="py-1 px-3 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white font-bold transition-all inline-flex items-center gap-1 shadow-sm"
              >
                Keyingi <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
