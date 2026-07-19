/**
 * views/ManagerView/LedgerTable.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Comprehensive chronological audit table of all orders.
 * Displays per-row margin (amount_paid - book_cost) and color-coded status.
 */

import { useApp } from '../../context/AppContext';
import { StatusBadge, TableShell, Th, Td } from '../../components/ui';

export default function LedgerTable() {
  const { orders, getStudentName, getGroupName, getInventoryItem, retailPrice } = useApp();

  // Sort by updatedAt descending (most recent first)
  const sorted = [...orders].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const totalAmountPaid = orders.reduce((s, o) => s + o.amountPaid, 0);
  const totalBookCost   = orders.reduce((s, o) => s + o.bookCost,   0);
  const totalMargin     = totalAmountPaid - totalBookCost;

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Order Ledger — Full Audit Log</h2>
          <p className="text-[11px] text-zinc-500 mt-1">
            Chronological record of all {orders.length} orders. Margin = amount_paid − book_cost (not retail).
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded text-zinc-400">
            Total Revenue: <span className="text-emerald-400 font-mono font-semibold">${totalAmountPaid}</span>
          </span>
          <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded text-zinc-400">
            Net: <span className={`font-mono font-semibold ${totalMargin >= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
              {totalMargin >= 0 ? '+' : ''}{totalMargin}$
            </span>
          </span>
        </div>
      </div>

      <TableShell>
        <thead>
          <tr>
            <Th>Student</Th>
            <Th>Group</Th>
            <Th>Book</Th>
            <Th right>Retail (×1.5)</Th>
            <Th right>amount_paid</Th>
            <Th right>book_cost</Th>
            <Th right>Margin</Th>
            <Th>Status</Th>
            <Th>Updated</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/40">
          {sorted.map(o => {
            const inv    = getInventoryItem(o.bookId);
            const retail = retailPrice(o.bookCost);
            const margin = o.amountPaid - o.bookCost;
            const isUnrealized = o.status === 'RETURNED' || o.status === 'ARRIVED';

            return (
              <tr
                key={o.id}
                className={`transition-colors hover:bg-zinc-800/20 ${isUnrealized ? 'bg-purple-950/5' : ''}`}
              >
                <Td><span className="font-medium text-zinc-200">{getStudentName(o.studentId)}</span></Td>
                <Td muted>{getGroupName(o.groupId)}</Td>
                <Td muted>{inv?.title ?? '—'}</Td>
                <Td right mono muted>${retail.toFixed(2)}</Td>
                <Td right mono>
                  <span className="text-emerald-400">${o.amountPaid}</span>
                </Td>
                <Td right mono>
                  <span className="text-red-400">${o.bookCost}</span>
                </Td>
                <Td right mono>
                  <span className={margin >= 0 ? 'text-blue-400 font-semibold' : 'text-amber-400 font-semibold'}>
                    {margin >= 0 ? '+' : ''}{margin}$
                  </span>
                </Td>
                <Td>
                  <StatusBadge status={o.status} />
                  {isUnrealized && (
                    <span className="ml-1.5 text-[9px] text-purple-500 font-mono">unrealized</span>
                  )}
                </Td>
                <Td mono muted>{o.updatedAt}</Td>
              </tr>
            );
          })}
        </tbody>
        {/* Totals footer */}
        <tfoot>
          <tr className="border-t-2 border-zinc-700 bg-zinc-900/60 text-xs font-bold">
            <td className="px-5 py-3 text-zinc-400" colSpan={4}>Totals ({orders.length} orders)</td>
            <td className="px-5 py-3 text-right font-mono text-emerald-400">${totalAmountPaid}</td>
            <td className="px-5 py-3 text-right font-mono text-red-400">${totalBookCost}</td>
            <td className={`px-5 py-3 text-right font-mono font-bold ${totalMargin >= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
              {totalMargin >= 0 ? '+' : ''}{totalMargin}$
            </td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </TableShell>
    </div>
  );
}
