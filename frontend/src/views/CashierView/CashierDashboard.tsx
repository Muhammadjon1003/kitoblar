import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import PipelineColumn from './PipelineColumn';
import PaymentsHistoryView from './components/PaymentsHistoryView';
import BoshqaruvKorinishi from './components/BoshqaruvKorinishi';
import WarehouseInventory from '../LogisticsView/WarehouseInventory';
import { YoldaPartiyalarSection } from '../LogisticsView/SupplierRouting';
import type { OrderStatus } from '../../types';

function PipelineView() {
  const [crmViewMode, setCrmViewMode] = useState<'columns' | 'yolda'>('columns');

  const USTUNLAR = [
    {
      statuses: ['CREATED'] as OrderStatus[],
      title: 'O\'qituvchi buyurtma bergan',
      subtitle: 'To\'lov kutilayotgan buyurtmalar',
      accentLeft: 'border-l-blue-600',
      countColor: 'bg-blue-600 text-white font-bold',
    },
    {
      statuses: ['ORDERED'] as OrderStatus[],
      title: 'Logistika buyurtma bergan (Yo\'lda)',
      subtitle: 'Yo\'ldagi kitoblar — kelganda qabul qiling',
      accentLeft: 'border-l-indigo-600',
      countColor: 'bg-indigo-600 text-white font-bold',
    },
    {
      statuses: ['ARRIVED'] as OrderStatus[],
      title: 'Kelgan va Topshirishga tayyor',
      subtitle: 'Kitoblarni talabalarga topshiring',
      accentLeft: 'border-l-emerald-600',
      countColor: 'bg-emerald-600 text-white font-bold',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-3.5 sm:p-6 space-y-4">
      {/* Sub-navbar Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCrmViewMode('columns')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              crmViewMode === 'columns'
                ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/20 font-extrabold'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            📊 CRM Ustunlar Ko'rinishi
          </button>

          <button
            onClick={() => setCrmViewMode('yolda')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              crmViewMode === 'yolda'
                ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-600/20 font-extrabold'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            🚚 Yo'ldagi Ta'minot Partiyalari
          </button>
        </div>
      </div>

      {crmViewMode === 'columns' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full items-start">
          {USTUNLAR.map(col => (
            <PipelineColumn key={col.title} {...col} />
          ))}
        </div>
      ) : (
        <YoldaPartiyalarSection />
      )}
    </div>
  );
}

export default function CashierDashboard() {
  const { activeSubPage } = useApp();
  if (activeSubPage === 'pipeline')  return <PipelineView />;
  if (activeSubPage === 'supplier')  return <YoldaPartiyalarSection />;
  if (activeSubPage === 'warehouse') return <WarehouseInventory />;
  if (activeSubPage === 'payments')  return <PaymentsHistoryView />;
  return <BoshqaruvKorinishi />;
}
