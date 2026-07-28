/**
 * views/LogisticsView/SupplierOrderHistory.tsx
 * Complete chronological history of all books ordered from supplier.
 */

import { useState, useMemo } from 'react';
import { History, Search, Filter, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge, TableShell, Th, Td, EmptyState, uzs } from '../../components/ui';

const STATUS_OPTIONS = [
  { value: 'ALL',       label: 'Barcha holatlar' },
  { value: 'ORDERED',   label: "Buyurtma qilingan (Yo'lda)" },
  { value: 'ARRIVED',   label: 'Kelgan (Topshirishga tayyor)' },
  { value: 'GIVEN',     label: 'Topshirildi (Talabaga berildi)' },
  { value: 'CANCELLED', label: 'Bekor qilingan' },
];

export default function SupplierOrderHistory() {
  const {
    orders,
    groups,
    getStudentName,
    getGroupName,
    getInventoryItem,
    sotuvNarxi,
  } = useApp();

  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery]       = useState<string>('');
  const [currentPage, setCurrentPage]       = useState<number>(1);
  const [pageSize, setPageSize]             = useState<number>(15);

  // 1. Filter supplier orders (all orders that reached ORDERED, ARRIVED, GIVEN, or CANCELLED)
  const supplierOrders = useMemo(() => {
    return orders.filter(o => {
      // Exclude un-dispatched CREATED orders unless user wants all
      const isSupplierRelated = ['ORDERED', 'ARRIVED', 'GIVEN', 'RETURNED', 'Ombordan biriktirildi'].includes(o.status) || 
        (o.status === 'CANCELLED' && o.comment?.includes("Jismoniy darslik omborda"));

      if (!isSupplierRelated && selectedStatus !== 'ALL') return false;

      const matchStatus = selectedStatus === 'ALL' || o.status === selectedStatus;
      if (!matchStatus) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const studentName = getStudentName(o.studentId).toLowerCase();
      const groupName   = getGroupName(o.groupId).toLowerCase();
      const inv         = getInventoryItem(o.bookId);
      const bookTitle   = (inv?.title ?? '').toLowerCase();
      return studentName.includes(q) || groupName.includes(q) || bookTitle.includes(q) || o.id.toLowerCase().includes(q);
    });
  }, [orders, selectedStatus, searchQuery, getStudentName, getGroupName, getInventoryItem]);

  // 2. Sort by date (most recent first)
  const sortedOrders = useMemo(() => {
    return [...supplierOrders].sort((a, b) => {
      const upA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const upB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return upB - upA;
    });
  }, [supplierOrders]);

  // 3. Paginate
  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / pageSize));
  const validPage  = Math.min(currentPage, totalPages);

  const paginatedOrders = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return sortedOrders.slice(start, start + pageSize);
  }, [sortedOrders, validPage, pageSize]);

  const startItem = sortedOrders.length === 0 ? 0 : (validPage - 1) * pageSize + 1;
  const endItem   = Math.min(validPage * pageSize, sortedOrders.length);

  return (
    <div className="flex-1 overflow-y-auto px-3.5 sm:px-7 py-4 sm:py-6 space-y-6 bg-slate-50">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            Ta'minotchi Buyurtmalari Tarixi
          </h2>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            Ta'minotchiga yo'naltirilgan, kelgan va topshirilgan barcha darsliklarning to'liq xronologik ro'yxati.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold px-3.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl shadow-2xs">
            Jami buyurtmalar: {sortedOrders.length} ta
          </span>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Holat bo'yicha:</label>
          <select
            value={selectedStatus}
            onChange={e => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
            className="sb-input appearance-none text-xs bg-slate-50 border-slate-300 rounded-xl font-semibold py-1.5 pr-8 w-full sm:w-auto sm:min-w-[200px]"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Talaba, guruh yoki darslik nomi..."
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

      {/* ── Table Shell ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {paginatedOrders.length === 0 ? (
          <div className="p-8">
            <EmptyState label={searchQuery || selectedStatus !== 'ALL' ? "Filtr bo'yicha buyurtmalar topilmadi." : "Hozircha ta'minotchi buyurtmalari yo'q."} />
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <TableShell>
              <thead>
                <tr>
                  <Th>Talaba / Guruh</Th>
                  <Th>Kitob nomi</Th>
                  <Th right>Sotuv Narxi</Th>
                  <Th right>Tan Narxi (Xarajat)</Th>
                  <Th>Holati</Th>
                  <Th>Izoh / Manba</Th>
                  <Th>Sana</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedOrders.map(o => {
                  const inv = getInventoryItem(o.bookId);
                  const studentName = getStudentName(o.studentId);
                  const groupName = getGroupName(o.groupId);
                  const teacherName = groups.find(g => g.id === o.groupId)?.teacherName ?? '—';
                  const narx = o.sotuvNarxi > 0 ? o.sotuvNarxi : sotuvNarxi;

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                      <Td>
                        <p className="font-bold text-slate-800 text-xs">{studentName}</p>
                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                          {groupName} <span className="text-slate-400 font-normal">•</span> O'qituvchi: <span className="text-slate-700 font-bold">{teacherName}</span>
                        </p>
                      </Td>
                      <Td>
                        <p className="font-semibold text-slate-800 text-xs">{inv?.title ?? '—'}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{inv?.categoryName || 'Umumiy'}</p>
                      </Td>
                      <Td right mono>
                        {o.sotuvNarxi === 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[10px] rounded-md font-sans">To'lov ichida</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">{uzs(narx)}</span>
                        )}
                      </Td>
                      <Td right mono>
                        <span className="text-slate-600 font-medium">{uzs(o.bookCost)}</span>
                      </Td>
                      <Td>
                        <StatusBadge status={o.status} />
                      </Td>
                      <Td>
                        {o.comment ? (
                          <span className="text-[10px] text-amber-800 font-medium bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-block max-w-[200px] truncate" title={o.comment}>
                            {o.comment}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </Td>
                      <Td mono muted>
                        <span className="inline-flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {o.updatedAt || o.createdAt}
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableShell>
          </div>
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
