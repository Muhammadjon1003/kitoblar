/**
 * views/ManagerView/LedgerTable.tsx — O'zbek tili
 * Texnik maydon nomlari (amount_paid, book_cost) foydalanuvchidan yashirilgan.
 */

import { useApp } from '../../context/AppContext';
import { StatusBadge, TableShell, Th, Td, uzs } from '../../components/ui';

export default function LedgerTable() {
  const { orders, getStudentName, getGroupName, getInventoryItem, retailPrice } = useApp();

  const tartiblangan = [...orders].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const jami_tolov    = orders.reduce((s, o) => s + o.amountPaid, 0);
  const jami_narx     = orders.reduce((s, o) => s + o.bookCost,   0);
  const jami_foyda    = jami_tolov - jami_narx;

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">To'lovlar Daftari — To'liq Hisobot</h2>
          <p className="text-[11px] text-zinc-400 mt-1">
            Jami {orders.length} ta buyurtmaning xronologik hisobi.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded text-zinc-400">
            Jami tushum: <span className="text-emerald-400 font-mono font-semibold">{uzs(jami_tolov)}</span>
          </span>
          <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded text-zinc-400">
            Sof foyda: <span className={`font-mono font-semibold ${jami_foyda >= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
              {jami_foyda >= 0 ? '+' : ''}{uzs(Math.abs(jami_foyda))}
            </span>
          </span>
        </div>
      </div>

      <TableShell>
        <thead>
          <tr>
            <Th>Talaba</Th>
            <Th>Guruh</Th>
            <Th>Kitob</Th>
            <Th right>Chakana narx (×1.5)</Th>
            <Th right>To'langan</Th>
            <Th right>Tan narxi</Th>
            <Th right>Foyda</Th>
            <Th>Holati</Th>
            <Th>Sana</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/40">
          {tartiblangan.map(o => {
            const inv          = getInventoryItem(o.bookId);
            const chakana      = retailPrice(o.bookCost);
            const foyda        = o.amountPaid - o.bookCost;
            const kutilmagan   = o.status === 'RETURNED' || o.status === 'ARRIVED';

            return (
              <tr
                key={o.id}
                className={`transition-colors hover:bg-zinc-800/20 ${kutilmagan ? 'bg-purple-950/5' : ''}`}
              >
                <Td><span className="font-medium text-zinc-200">{getStudentName(o.studentId)}</span></Td>
                <Td muted>{getGroupName(o.groupId)}</Td>
                <Td muted>{inv?.title ?? '—'}</Td>
                <Td right mono muted>{uzs(chakana)}</Td>
                <Td right mono>
                  <span className="text-emerald-400">{uzs(o.amountPaid)}</span>
                </Td>
                <Td right mono>
                  <span className="text-red-400">{uzs(o.bookCost)}</span>
                </Td>
                <Td right mono>
                  <span className={foyda >= 0 ? 'text-blue-400 font-semibold' : 'text-amber-400 font-semibold'}>
                    {foyda >= 0 ? '+' : ''}{uzs(Math.abs(foyda))}
                  </span>
                </Td>
                <Td>
                  <StatusBadge status={o.status} />
                  {kutilmagan && (
                    <span className="ml-1.5 text-[9px] text-purple-400 font-semibold">kutilmagan</span>
                  )}
                </Td>
                <Td mono muted>{o.updatedAt}</Td>
              </tr>
            );
          })}
        </tbody>
        {/* Jami qator */}
        <tfoot>
          <tr className="border-t-2 border-zinc-700 bg-zinc-900/60 text-xs font-bold">
            <td className="px-5 py-3 text-zinc-400" colSpan={4}>Jami ({orders.length} ta buyurtma)</td>
            <td className="px-5 py-3 text-right font-mono text-emerald-400">{uzs(jami_tolov)}</td>
            <td className="px-5 py-3 text-right font-mono text-red-400">{uzs(jami_narx)}</td>
            <td className={`px-5 py-3 text-right font-mono font-bold ${jami_foyda >= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
              {jami_foyda >= 0 ? '+' : ''}{uzs(Math.abs(jami_foyda))}
            </td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </TableShell>
    </div>
  );
}
