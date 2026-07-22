/**
 * views/CashierView/CashierDashboard.tsx — O'zbek tili
 */

import { useApp } from '../../context/AppContext';
import PipelineColumn from './PipelineColumn';
import PaymentsHistoryView from './components/PaymentsHistoryView';
import BoshqaruvKorinishi from './components/BoshqaruvKorinishi';
import type { OrderStatus } from '../../types';

function PipelineView() {
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
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full items-start">
        {USTUNLAR.map(col => (
          <PipelineColumn key={col.title} {...col} />
        ))}
      </div>
    </div>
  );
}

export default function CashierDashboard() {
  const { activeSubPage } = useApp();
  if (activeSubPage === 'pipeline') return <PipelineView />;
  if (activeSubPage === 'payments') return <PaymentsHistoryView />;
  return <BoshqaruvKorinishi />;
}
