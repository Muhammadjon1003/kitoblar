/**
 * views/LogisticsView/SupplierRouting.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Supplier Integration Desk: shows PAID/ORDERED orders with tg_file_id refs.
 * Multi-checkbox batch dispatch (PAID → ORDERED) simulates Telegram CDN route.
 * Mark ARRIVED on ORDERED items when physical boxes arrive.
 */

import { useState } from 'react';
import { CheckSquare, Square, Send, Package, Copy, Check, Clock, Truck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge, EmptyState } from '../../components/ui';

export default function SupplierRouting() {
  const { orders, dispatchToSupplier, markArrived, getStudentName, getGroupName, getInventoryItem } = useApp();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const paidOrders    = orders.filter(o => o.status === 'PAID');
  const orderedOrders = orders.filter(o => o.status === 'ORDERED');

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev =>
      prev.size === paidOrders.length
        ? new Set()
        : new Set(paidOrders.map(o => o.id))
    );
  };

  const handleDispatch = () => {
    if (selectedIds.size === 0) return;
    dispatchToSupplier([...selectedIds]);
    setSelectedIds(new Set());
  };

  /** Copy Telegram CDN batch payload to clipboard */
  const handleCopyBatch = () => {
    const payload = paidOrders.map(o => {
      const inv = getInventoryItem(o.bookId);
      return `{ "order_id": "${o.id}", "tg_file_id": "${inv?.tgFileId}", "student": "${getStudentName(o.studentId)}" }`;
    });
    navigator.clipboard.writeText(`[\n  ${payload.join(',\n  ')}\n]`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6">

      {/* ── PAID orders table: batch select + dispatch ── */}
      <div className="sb-card overflow-hidden border-blue-900/30">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <p className="text-sm font-semibold text-zinc-100">PAID Orders — Route to Supplier</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Select orders and dispatch via Telegram CDN proxy. Status: PAID → ORDERED.
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <button
              onClick={handleCopyBatch}
              disabled={paidOrders.length === 0}
              className="flex items-center gap-1.5 text-xs sb-btn-secondary py-1.5 px-3 disabled:opacity-40"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Payload'}
            </button>
            <button
              onClick={handleDispatch}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-1.5 text-xs sb-btn-primary py-1.5 px-3 disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              Route {selectedIds.size > 0 ? `(${selectedIds.size})` : 'Selected'} to Supplier
            </button>
          </div>
        </div>

        {paidOrders.length === 0 ? (
          <EmptyState label="No PAID orders awaiting supplier routing." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/40">
                  <th className="px-4 py-2.5 w-10">
                    <button onClick={toggleSelectAll} className="text-zinc-500 hover:text-zinc-200 transition-colors">
                      {selectedIds.size === paidOrders.length && paidOrders.length > 0
                        ? <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                        : <Square className="w-3.5 h-3.5" />
                      }
                    </button>
                  </th>
                  {['Student / Group','Book Title','TG File ID (CDN)','Cost','Status'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {paidOrders.map(o => {
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
                      <td className="px-4 py-3 font-mono text-zinc-600 text-[10px] max-w-[160px] truncate">
                        {inv?.tgFileId ?? '—'}
                      </td>
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

      {/* ── ORDERED: in transit — Mark Arrived ── */}
      <div className="sb-card overflow-hidden border-amber-900/30">
        <div className="px-5 py-4 border-b border-zinc-800">
          <p className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-400" />
            ORDERED — In Transit
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Mark books ARRIVED when physical boxes are received at the learning center.
          </p>
        </div>
        {orderedOrders.length === 0 ? (
          <EmptyState label="No orders currently in transit." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/40">
                  {['Student','Book','TG File ID','Date Ordered','Action'].map(h => (
                    <th key={h} className="px-5 py-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {orderedOrders.map(o => {
                  const inv = getInventoryItem(o.bookId);
                  return (
                    <tr key={o.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-zinc-200">{getStudentName(o.studentId)}</p>
                        <p className="text-[10px] text-zinc-500">{getGroupName(o.groupId)}</p>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400">{inv?.title ?? '—'}</td>
                      <td className="px-5 py-3.5 font-mono text-zinc-600 text-[10px] max-w-[160px] truncate">
                        {inv?.tgFileId ?? '—'}
                      </td>
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
                          <Truck className="w-3 h-3" /> Mark ARRIVED
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

      {/* Architecture info */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-[11px] text-zinc-500 leading-relaxed">
        <p className="font-semibold text-zinc-400 mb-1">TR § 4 — Telegram CDN Architecture</p>
        Binary textbook files never touch the application server. Only <span className="font-mono text-zinc-300">tg_file_id</span> reference strings
        are persisted in the database. The <span className="font-mono text-zinc-300">route_to_supplier()</span> worker function forwards these
        IDs via the Telegram Bot API to the print shop proxy, which retrieves files directly from Telegram cloud.
        Server disk usage: <span className="text-emerald-400 font-semibold">0 GB</span>.
      </div>
    </div>
  );
}
