/**
 * views/ManagerView/ManagerDashboard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Executive analytics hub. Routes between: Financial KPI cards (TR § 6),
 * LedgerTable, and CoverageMatrix based on activeSubPage.
 */

import { TrendingUp, TrendingDown, Activity, Archive, HardDrive, BarChart2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { KpiCard } from '../../components/ui';
import LedgerTable from './LedgerTable';
import CoverageMatrix from './CoverageMatrix';

// ─── TR § 6 Financial Formula Cards ───────────────────────────────────────────

function FinancialAnalytics() {
  const { orders, inventory } = useApp();

  // TR § 6: Gross Revenue = Σ(amount_paid)
  const grossRevenue = orders.reduce((s, o) => s + o.amountPaid, 0);

  // TR § 6: Total Capital Invested = Σ(book_cost)
  const totalInvested = orders.reduce((s, o) => s + o.bookCost, 0);

  // TR § 6: Net Profit = Gross Revenue − Total Invested
  const netProfit = grossRevenue - totalInvested;

  // TR § 6: Unrealized Dead Capital = Σ(book_cost) WHERE status='RETURNED' OR (status='ARRIVED' AND unassigned)
  // In our model: RETURNED orders + ARRIVED orders with 0 amountPaid (warehouse allocation)
  const unrealizedCapital = orders
    .filter(o =>
      o.status === 'RETURNED' ||
      (o.status === 'ARRIVED' && o.bookCost === 0)
    )
    .reduce((s, o) => s + o.bookCost, 0);

  // TR § 4: Telegram Storage Savings = inventory.length × 25 MB (average textbook size)
  const savedMB = inventory.length * 25;
  const savedGB = (savedMB / 1024).toFixed(2);

  const kpis = [
    {
      label: 'Gross Revenue',
      value: `$${grossRevenue}`,
      icon: TrendingUp,
      accent: 'text-emerald-400',
      sub: 'Σ orders.amount_paid',
    },
    {
      label: 'Total Capital Invested',
      value: `$${totalInvested}`,
      icon: TrendingDown,
      accent: 'text-red-400',
      sub: 'Σ orders.book_cost',
    },
    {
      label: 'Net Profit',
      value: `${netProfit >= 0 ? '+' : ''}${netProfit}$`,
      icon: Activity,
      accent: netProfit >= 0 ? 'text-blue-400' : 'text-amber-400',
      sub: 'Gross Revenue − Total Invested',
    },
    {
      label: 'Unrealized Dead Capital',
      value: `$${unrealizedCapital}`,
      icon: Archive,
      accent: 'text-purple-400',
      sub: 'RETURNED + unassigned ARRIVED',
    },
    {
      label: 'Telegram Storage Saved',
      value: `${savedGB} GB`,
      icon: HardDrive,
      accent: 'text-cyan-400',
      sub: `${inventory.length} books × 25 MB avg`,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6">
      {/* KPI cards */}
      <div>
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <BarChart2 className="w-3.5 h-3.5" /> TR § 6 Financial Formulas
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {kpis.map(kpi => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </div>

      {/* Order status distribution */}
      <div>
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          Order Status Distribution
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {(['CREATED','PAID','ORDERED','ARRIVED','GIVEN','CANCELLED','RETURNED'] as const).map(status => {
            const count = orders.filter(o => o.status === status).length;
            const pct = orders.length > 0 ? Math.round((count / orders.length) * 100) : 0;
            return (
              <div key={status} className="sb-card px-4 py-3 text-center">
                <p className="text-xl font-bold text-zinc-100">{count}</p>
                <p className="text-[9px] font-semibold text-zinc-500 uppercase tracking-widest mt-0.5">{status}</p>
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
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[9px] text-zinc-600 mt-1">{pct}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Embedded mini-ledger (last 5 orders) */}
      <div>
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          Recent Activity (Last 5 Orders)
        </p>
        <div className="sb-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/40">
                  {['Student','Book','Paid','Cost','Net','Status'].map(h => (
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
                        <td className="px-5 py-3 font-medium text-zinc-200">{o.studentId}</td>
                        <td className="px-5 py-3 text-zinc-400 max-w-[140px] truncate">{inv?.title ?? '—'}</td>
                        <td className="px-5 py-3 font-mono text-emerald-400">${o.amountPaid}</td>
                        <td className="px-5 py-3 font-mono text-red-400">${o.bookCost}</td>
                        <td className={`px-5 py-3 font-mono font-semibold ${net >= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
                          {net >= 0 ? '+' : ''}{net}$
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-[10px] font-semibold text-zinc-400">{o.status}</span>
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
  return <FinancialAnalytics />;
}
