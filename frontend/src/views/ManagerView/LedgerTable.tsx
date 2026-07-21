/**
 * views/ManagerView/LedgerTable.tsx — O'zbek tili
 * To'lovlar daftari va buyurtmalar hisoboti (To'liq xronologik tartibda).
 */

import { useApp } from '../../context/AppContext';
import { StatusBadge, TableShell, Th, Td, uzs } from '../../components/ui';

export default function LedgerTable() {
  const { orders, getStudentName, getGroupName, getInventoryItem } = useApp();

  // Strict sorting: Newest orders first (by createdAt, updatedAt, or ID)
  const tartiblangan = [...orders].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (dateB !== dateA) return dateB - dateA;

    const upA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const upB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    if (upB !== upA) return upB - upA;

    return b.id.localeCompare(a.id);
  });

  const jami_tolov = orders.reduce((s, o) => s + o.amountPaid, 0);
  const jami_narx  = orders.reduce((s, o) => s + o.bookCost,   0);
  const jami_foyda = jami_tolov - jami_narx;

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6 bg-slate-50">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">To'lovlar Daftari — Buyurtmalar Hisoboti</h2>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            Jami <span className="text-slate-800 font-bold">{orders.length}</span> ta buyurtmaning eng so'nggi xronologik hisobi
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

      {/* Main Table Shell */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <TableShell>
          <thead>
            <tr>
              <Th>Talaba</Th>
              <Th>Guruh</Th>
              <Th>Kitob nomi</Th>
              <Th right>Sotuv Narxi</Th>
              <Th right>To'langan</Th>
              <Th right>Tan Narxi (Xarajat)</Th>
              <Th right>Sof Foyda</Th>
              <Th>Holati</Th>
              <Th>Sana</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tartiblangan.map(o => {
              const inv     = getInventoryItem(o.bookId);
              const chakana = o.sotuvNarxi;
              const foyda   = o.amountPaid - o.bookCost;

              return (
                <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                  <Td>
                    <span className="font-bold text-slate-800">{getStudentName(o.studentId)}</span>
                  </Td>
                  <Td muted>{getGroupName(o.groupId)}</Td>
                  <Td>{inv?.title ?? '—'}</Td>
                  <Td right mono muted>{uzs(chakana)}</Td>
                  <Td right mono>
                    <span className="text-emerald-600 font-bold">{uzs(o.amountPaid)}</span>
                  </Td>
                  <Td right mono>
                    <span className="text-red-500 font-bold">{uzs(o.bookCost)}</span>
                  </Td>
                  <Td right mono>
                    <span className={`font-bold ${foyda >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                      {foyda >= 0 ? '+' : ''}{uzs(Math.abs(foyda))}
                    </span>
                  </Td>
                  <Td>
                    <StatusBadge status={o.status} />
                  </Td>
                  <Td mono muted>{o.updatedAt}</Td>
                </tr>
              );
            })}
          </tbody>

          {/* Jami Summary Footer */}
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-100/80 text-xs font-bold">
              <td className="px-5 py-3.5 text-slate-700" colSpan={4}>Jami ({orders.length} ta buyurtma)</td>
              <td className="px-5 py-3.5 text-right font-mono text-emerald-600">{uzs(jami_tolov)}</td>
              <td className="px-5 py-3.5 text-right font-mono text-red-500">{uzs(jami_narx)}</td>
              <td className={`px-5 py-3.5 text-right font-mono font-bold ${jami_foyda >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                {jami_foyda >= 0 ? '+' : ''}{uzs(Math.abs(jami_foyda))}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </TableShell>
      </div>

    </div>
  );
}
