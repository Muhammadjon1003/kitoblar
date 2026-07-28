/**
 * views/LogisticsView/SupplierOrderHistory.tsx
 * Immutable permanent historical log of all books ordered from supplier.
 */

import { useState, useEffect, useMemo } from 'react';
import { History, Search, ChevronLeft, ChevronRight, Clock, RefreshCw } from 'lucide-react';
import { TableShell, Th, Td, EmptyState } from '../../components/ui';

interface DispatchedLog {
  id: string;
  studentName: string;
  groupName: string;
  teacherName: string;
  bookTitle: string;
  orderedAt: string;
  createdAt: string;
}

export default function SupplierOrderHistory() {
  const [logs, setLogs]             = useState<DispatchedLog[]>([]);
  const [loading, setLoading]       = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize]       = useState<number>(15);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/backend/orders/dispatched-history');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error('Failed to fetch dispatched order logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter logs by search query
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(l =>
      l.studentName.toLowerCase().includes(q) ||
      l.groupName.toLowerCase().includes(q) ||
      l.teacherName.toLowerCase().includes(q) ||
      l.bookTitle.toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const validPage  = Math.min(currentPage, totalPages);

  const paginatedLogs = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, validPage, pageSize]);

  const startItem = filteredLogs.length === 0 ? 0 : (validPage - 1) * pageSize + 1;
  const endItem   = Math.min(validPage * pageSize, filteredLogs.length);

  return (
    <div className="flex-1 overflow-y-auto px-3.5 sm:px-7 py-4 sm:py-6 space-y-6 bg-slate-50">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            Ta'minotchiga Yuborilgan Buyurtmalar Tarixi
          </h2>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            Ta'minotchiga yo'naltirilgan darsliklarning o'zgarmas doimiy registri (Neon PostgreSQL <code>dispatched_order_logs</code>).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="sb-btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Yangilash
          </button>
          <span className="text-xs font-bold px-3.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl shadow-2xs">
            Jami loglar: {filteredLogs.length} ta
          </span>
        </div>
      </div>

      {/* ── Filter & Search Bar ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Talaba ismi, guruh yoki darslik nomi bo'yicha qidiruv..."
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

      {/* ── Table Shell ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-12 text-center text-xs font-semibold text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" /> Loglar yuklanmoqda...
          </div>
        ) : paginatedLogs.length === 0 ? (
          <div className="p-8">
            <EmptyState label={searchQuery ? "Qidiruv bo'yicha buyurtma loglari topilmadi." : "Hozircha ta'minotchiga yuborilgan buyurtma loglari yo'q."} />
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <TableShell>
              <thead>
                <tr>
                  <Th>Talaba ismi</Th>
                  <Th>Guruh / O'qituvchi</Th>
                  <Th>Kitob nomi</Th>
                  <Th>Buyurtma qilingan sana</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedLogs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                    <Td>
                      <p className="font-bold text-slate-800 text-xs">{l.studentName}</p>
                    </Td>
                    <Td>
                      <p className="font-semibold text-slate-800 text-xs">{l.groupName}</p>
                      {l.teacherName && (
                        <p className="text-[10px] text-slate-500 font-medium">
                          O'qituvchi: <span className="text-slate-700 font-semibold">{l.teacherName}</span>
                        </p>
                      )}
                    </Td>
                    <Td>
                      <span className="font-bold text-indigo-950 text-xs bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg inline-block">
                        📘 {l.bookTitle}
                      </span>
                    </Td>
                    <Td mono muted>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {l.orderedAt || new Date(l.createdAt).toISOString().slice(0, 10)}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </div>
        )}

        {/* ── Pagination Bar ── */}
        {!loading && filteredLogs.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-3.5 bg-slate-50 border-t border-slate-200 gap-3 text-xs font-semibold text-slate-600">
            <div>
              <span className="font-bold text-slate-800">{filteredLogs.length}</span> ta logdan{' '}
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
