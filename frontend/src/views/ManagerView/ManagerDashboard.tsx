/**
 * views/ManagerView/ManagerDashboard.tsx — O'zbek tili
 */

import {
  TrendingUp, TrendingDown, Activity, Archive, BarChart2,
  PieChart, Award
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { KpiCard, uzs, TableShell, Th, Td, StatusBadge } from '../../components/ui';
import LedgerTable from './LedgerTable';
import CoverageMatrix from './CoverageMatrix';
import NarxSozlamalari from './NarxSozlamalari';

// ─── Moliyaviy va Statistik tahlil paneli ─────────────────────────────────────────────

function MoliyaviyTahlil() {
  const { orders, inventory, sotuvNarxi, getStudentName, getInventoryItem } = useApp();

  // 1. Core KPIs
  const jamiBiriktirildi = orders.reduce((s, o) => s + o.amountPaid, 0);
  const jamiSarflandi    = orders.reduce((s, o) => s + o.bookCost, 0);
  const sofFoyda         = jamiBiriktirildi - jamiSarflandi;

  // 4th KPI: Inventory books & potential revenue
  const returnedInvCount = inventory.filter(i => i.isReturned).length;
  const stockOrdersCount = orders.filter(o => o.status === 'CANCELLED' || o.status === 'RETURNED').length;
  const totalUnassignedBooks = returnedInvCount + stockOrdersCount;
  const potentialRevenue = totalUnassignedBooks * sotuvNarxi;

  const kpilar = [
    {
      label: 'Jami tushum',
      value: uzs(jamiBiriktirildi),
      icon: TrendingUp,
      accent: 'text-emerald-600',
      sub: "Barcha to'lov operatsiyalari",
    },
    {
      label: 'Jami xarajat',
      value: uzs(jamiSarflandi),
      icon: TrendingDown,
      accent: 'text-red-600',
      sub: 'Ta\'minotchiga to\'langan tan narxi',
    },
    {
      label: 'Sof foyda',
      value: `${sofFoyda >= 0 ? '+' : '-'}${uzs(Math.abs(sofFoyda))}`,
      icon: Activity,
      accent: sofFoyda >= 0 ? 'text-blue-600' : 'text-amber-600',
      sub: 'Tushum − Xarajat (Sof daromad)',
    },
    {
      label: 'Ombor kitoblari & Potensial',
      value: uzs(potentialRevenue),
      icon: Archive,
      accent: 'text-purple-600',
      sub: `${totalUnassignedBooks} ta kitob × ${uzs(sotuvNarxi)}`,
    },
  ];

  // 2. Monthly Profit & Revenue Trend (12 Months)
  const monthsUz = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
  const currentYear = new Date().getFullYear();

  const monthlyStats = monthsUz.map((monthName, idx) => {
    const monthOrders = orders.filter(o => {
      if (!o.updatedAt) return false;
      const date = new Date(o.updatedAt);
      return !isNaN(date.getTime()) && date.getMonth() === idx && date.getFullYear() === currentYear;
    });

    const revenue = monthOrders.reduce((sum, o) => sum + o.amountPaid, 0);
    const cost    = monthOrders.reduce((sum, o) => sum + o.bookCost, 0);
    const profit  = revenue - cost;

    return {
      month: monthName,
      revenue,
      cost,
      profit,
      count: monthOrders.length,
    };
  });

  const maxRevenue = Math.max(...monthlyStats.map(m => m.revenue), 100000);

  // 3. Category / Subject Stats Breakdown
  const categoryMap: Record<string, { count: number; revenue: number; cost: number }> = {};
  orders.forEach(o => {
    const inv = getInventoryItem(o.bookId);
    const category = inv?.categoryName || 'Umumiy';
    if (!categoryMap[category]) {
      categoryMap[category] = { count: 0, revenue: 0, cost: 0 };
    }
    categoryMap[category].count += 1;
    categoryMap[category].revenue += o.amountPaid;
    categoryMap[category].cost += o.bookCost;
  });

  const categoryList = Object.entries(categoryMap).map(([category, stat]) => ({
    category,
    ...stat,
    profit: stat.revenue - stat.cost,
    percentage: jamiBiriktirildi > 0 ? Math.round((stat.revenue / jamiBiriktirildi) * 100) : 0,
  })).sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6 bg-slate-50">
      
      {/* ── 1. KPI Cards (4 Key Metrics) ── */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <BarChart2 className="w-3.5 h-3.5 text-blue-600" /> Moliyaviy ko'rsatkichlar va Ombor potentsiali
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {kpilar.map(kpi => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </div>

      {/* ── 2. Visual Analytics Section (Monthly Trend + Subject Stats) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Revenue & Profit Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Yillik Daromad va Sof Foyda Dinamikasi ({currentYear})
              </h3>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                Oylar bo'yicha tushum va net foyda o'sish ko'rsatkichi
              </p>
            </div>
            
            {/* Chart Legend */}
            <div className="flex items-center gap-4 text-xs font-bold shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-indigo-600" />
                <span className="text-slate-700">Tushum</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-500" />
                <span className="text-slate-700">Sof foyda</span>
              </div>
            </div>
          </div>

          {/* Dynamic SVG / HTML Bar Chart */}
          <div className="pt-6 pb-2">
            <div className="h-56 flex items-end justify-between gap-2 border-b border-slate-200 px-2 pb-2">
              {monthlyStats.map((item) => {
                const revHeightPercent = Math.max(8, Math.round((item.revenue / maxRevenue) * 100));
                const profitHeightPercent = item.profit > 0 ? Math.max(6, Math.round((item.profit / maxRevenue) * 100)) : 0;

                return (
                  <div key={item.month} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
                    
                    {/* Tooltip on Hover */}
                    <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] py-1.5 px-2.5 rounded-lg shadow-xl whitespace-nowrap pointer-events-none transition-all">
                      <span className="font-bold">{item.month} oyida:</span>
                      <span className="text-emerald-400 font-mono font-bold">Tushum: {uzs(item.revenue)}</span>
                      <span className="text-blue-300 font-mono font-bold">Foyda: {uzs(item.profit)}</span>
                    </div>

                    {/* Bars Container */}
                    <div className="w-full flex items-end justify-center gap-1 h-full">
                      {/* Revenue Bar */}
                      <div
                        style={{ height: `${revHeightPercent}%` }}
                        className="w-1/2 max-w-[18px] bg-indigo-600 hover:bg-indigo-700 rounded-t-md transition-all duration-300 shadow-sm"
                      />
                      {/* Profit Bar */}
                      <div
                        style={{ height: `${profitHeightPercent}%` }}
                        className="w-1/2 max-w-[18px] bg-emerald-500 hover:bg-emerald-600 rounded-t-md transition-all duration-300 shadow-sm"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X Axis Month Labels */}
            <div className="flex justify-between px-2 pt-2 text-[10px] font-bold text-slate-500">
              {monthlyStats.map(m => (
                <span key={m.month} className="flex-1 text-center truncate">{m.month}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Category / Subject Stats */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-600" />
              Fanlar va Kategoriyalar bo'yicha Tahlil
            </h3>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
              Sotuv hajmi va daromad ulushi
            </p>
          </div>

          <div className="space-y-4 py-4 overflow-y-auto max-h-[220px] pr-1">
            {categoryList.length === 0 ? (
              <p className="text-xs font-semibold text-slate-400 text-center py-6">Hozircha ma'lumotlar yo'q</p>
            ) : (
              categoryList.map(cat => (
                <div key={cat.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-800 flex items-center gap-1.5 truncate max-w-[140px]">
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      {cat.category}
                    </span>
                    <span className="font-mono text-emerald-600">{uzs(cat.revenue)}</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, cat.percentage)}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                    <span>{cat.count} ta buyurtma</span>
                    <span>Ulushi: {cat.percentage}%</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-slate-600">
            <span>Kategoriyalar soni:</span>
            <span className="bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-md">{categoryList.length} ta fan</span>
          </div>
        </div>
      </div>

      {/* ── 3. Recent Transactions Activity Table ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-100/60 border-b border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              So'nggi Moliyaviy Operatsiyalar
            </p>
            <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
              Oxirgi 5 ta buyurtma to'lovi va sof foyda hisobi
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-700 bg-white border border-slate-300 px-3 py-1 rounded-lg shadow-sm">
            Jami: {orders.length} ta buyurtma
          </span>
        </div>

        <TableShell>
          <thead>
            <tr>
              <Th>Talaba</Th>
              <Th>Kitob nomi</Th>
              <Th>Tushum (To'landi)</Th>
              <Th>Tan narxi (Xarajat)</Th>
              <Th>Sof foyda</Th>
              <Th>Holati</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[...orders]
              .sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                if (dateB !== dateA) return dateB - dateA;

                const upA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                const upB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                if (upB !== upA) return upB - upA;

                return b.id.localeCompare(a.id);
              })
              .slice(0, 5)
              .map(o => {
                const inv = getInventoryItem(o.bookId);
                const net = o.amountPaid - o.bookCost;
                return (
                  <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                    <Td>
                      <span className="font-bold text-slate-800">{getStudentName(o.studentId)}</span>
                    </Td>
                    <Td muted>{inv?.title ?? '—'}</Td>
                    <Td mono>
                      <span className="text-emerald-600 font-bold">{uzs(o.amountPaid)}</span>
                    </Td>
                    <Td mono>
                      <span className="text-red-500 font-bold">{uzs(o.bookCost)}</span>
                    </Td>
                    <Td mono>
                      <span className={`font-bold ${net >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                        {net >= 0 ? '+' : '-'}{uzs(Math.abs(net))}
                      </span>
                    </Td>
                    <Td><StatusBadge status={o.status} /></Td>
                  </tr>
                );
              })}
          </tbody>
        </TableShell>
      </div>

    </div>
  );
}

// ─── Manager Dashboard Router ──────────────────────────────────────────────────

export default function ManagerDashboard() {
  const { activeSubPage } = useApp();

  if (activeSubPage === 'ledger')   return <LedgerTable />;
  if (activeSubPage === 'coverage') return <CoverageMatrix />;
  if (activeSubPage === 'narxsozlama') return <NarxSozlamalari />;
  return <MoliyaviyTahlil />;
}
