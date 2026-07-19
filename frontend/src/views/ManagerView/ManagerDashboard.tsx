/**
 * views/ManagerView/ManagerDashboard.tsx — O'zbek tili
 * TR § havolalar va texnik atamalar foydalanuvchidan yashirilgan.
 */

import { TrendingUp, TrendingDown, Activity, Archive, HardDrive, BarChart2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { KpiCard } from '../../components/ui';
import LedgerTable from './LedgerTable';
import CoverageMatrix from './CoverageMatrix';

// Holat nomlari o'zbekcha
const STATUS_UZBE: Record<string, string> = {
  CREATED:   'Yaratildi',
  PAID:      "To'langan",
  ORDERED:   'Buyurtma berildi',
  ARRIVED:   'Keldi',
  GIVEN:     'Topshirildi',
  CANCELLED: 'Bekor qilindi',
  RETURNED:  'Qaytarildi',
};

// ─── Moliyaviy tahlil paneli ───────────────────────────────────────────────────

function MoliyaviyTahlil() {
  const { orders, inventory, getStudentName } = useApp();

  const jamiBiriktirildi  = orders.reduce((s, o) => s + o.amountPaid, 0);
  const jamiSarflandi      = orders.reduce((s, o) => s + o.bookCost,   0);
  const sofFoyda           = jamiBiriktirildi - jamiSarflandi;

  const muomaladan          = orders
    .filter(o => o.status === 'RETURNED' || (o.status === 'ARRIVED' && o.bookCost === 0))
    .reduce((s, o) => s + o.bookCost, 0);

  const tejasavedMB = inventory.length * 25;
  const tejasavedGB = (tejasavedMB / 1024).toFixed(2);

  const kpilar = [
    {
      label: 'Jami tushum',
      value: `$${jamiBiriktirildi}`,
      icon: TrendingUp,
      accent: 'text-emerald-400',
      sub: "Barcha buyurtmalar bo'yicha to'lovlar",
    },
    {
      label: 'Jami xarajat',
      value: `$${jamiSarflandi}`,
      icon: TrendingDown,
      accent: 'text-red-400',
      sub: 'Kitoblarni sotib olish xarajati',
    },
    {
      label: 'Sof foyda',
      value: `${sofFoyda >= 0 ? '+' : ''}${sofFoyda}$`,
      icon: Activity,
      accent: sofFoyda >= 0 ? 'text-blue-400' : 'text-amber-400',
      sub: 'Tushum − Xarajat',
    },
    {
      label: 'Muomaladagi kitoblar',
      value: `$${muomaladan}`,
      icon: Archive,
      accent: 'text-purple-400',
      sub: 'Qaytarilgan va biriktirilmagan',
    },
    {
      label: 'Tejashlar (bulut)',
      value: `${tejasavedGB} GB`,
      icon: HardDrive,
      accent: 'text-cyan-400',
      sub: `${inventory.length} ta kitob × 25 MB`,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6">
      {/* KPI kartalar */}
      <div>
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <BarChart2 className="w-3.5 h-3.5" /> Moliyaviy ko'rsatkichlar
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {kpilar.map(kpi => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </div>

      {/* Buyurtma holatlari taqsimoti */}
      <div>
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          Buyurtmalar holati bo'yicha taqsimot
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {(['CREATED','PAID','ORDERED','ARRIVED','GIVEN','CANCELLED','RETURNED'] as const).map(status => {
            const soni = orders.filter(o => o.status === status).length;
            const foiz = orders.length > 0 ? Math.round((soni / orders.length) * 100) : 0;
            return (
              <div key={status} className="sb-card px-4 py-3 text-center">
                <p className="text-xl font-bold text-zinc-100">{soni}</p>
                <p className="text-[9px] font-semibold text-zinc-400 mt-0.5">{STATUS_UZBE[status] ?? status}</p>
                <div className="mt-2 bg-zinc-800 rounded-full h-1 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      status === 'GIVEN'     ? 'bg-emerald-600' :
                      status === 'ARRIVED'   ? 'bg-emerald-800' :
                      status === 'ORDERED'   ? 'bg-amber-600'   :
                      status === 'PAID'      ? 'bg-indigo-600'  :
                      status === 'CREATED'   ? 'bg-blue-600'    :
                      status === 'CANCELLED' ? 'bg-red-700'     :
                      'bg-purple-700'
                    }`}
                    style={{ width: `${foiz}%` }}
                  />
                </div>
                <p className="text-[9px] text-zinc-600 mt-1">{foiz}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* So'nggi 5 ta buyurtma */}
      <div>
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          So'nggi faoliyat (oxirgi 5 ta buyurtma)
        </p>
        <div className="sb-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/40">
                  {['Talaba', 'Kitob', "To'landi", 'Tan narxi', 'Foyda', 'Holati'].map(h => (
                    <th key={h} className="px-5 py-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {[...orders]
                  .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                  .slice(0, 5)
                  .map(o => {
                    const inv = inventory.find(i => i.id === o.bookId);
                    const net = o.amountPaid - o.bookCost;
                    return (
                      <tr key={o.id} className="hover:bg-zinc-800/20 transition-colors">
                        <td className="px-5 py-3 font-medium text-zinc-200">
                          {getStudentName(o.studentId)}
                        </td>
                        <td className="px-5 py-3 text-zinc-400 max-w-[140px] truncate">{inv?.title ?? '—'}</td>
                        <td className="px-5 py-3 font-mono text-emerald-400">${o.amountPaid}</td>
                        <td className="px-5 py-3 font-mono text-red-400">${o.bookCost}</td>
                        <td className={`px-5 py-3 font-mono font-semibold ${net >= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
                          {net >= 0 ? '+' : ''}{net}$
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-[10px] font-semibold text-zinc-400">{STATUS_UZBE[o.status] ?? o.status}</span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Manager Dashboard Router ──────────────────────────────────────────────────

export default function ManagerDashboard() {
  const { activeSubPage } = useApp();

  if (activeSubPage === 'ledger')   return <LedgerTable />;
  if (activeSubPage === 'coverage') return <CoverageMatrix />;
  return <MoliyaviyTahlil />;
}
