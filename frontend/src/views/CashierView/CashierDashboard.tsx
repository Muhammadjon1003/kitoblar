/**
 * views/CashierView/CashierDashboard.tsx — O'zbek tili
 */

import { useState } from 'react';
import { FolderPlus, Users, CalendarDays, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import PipelineColumn from './PipelineColumn';
import { CreateGroupModal, AddStudentModal } from './StudentModals';

function PipelineView() {
  const USTUNLAR = [
    {
      status: 'CREATED' as const,
      title: 'To\'lov kutilmoqda',
      subtitle: 'Naqd pul qabul qiling — To\'langan holatiga o\'tadi',
      accentLeft: 'border-l-blue-400',
      countColor: 'bg-blue-100 text-blue-700',
    },
    {
      status: 'PAID' as const,
      title: 'To\'langan — Buyurtma kutilmoqda',
      subtitle: 'Logistika ta\'minotchiga yo\'naltiradi',
      accentLeft: 'border-l-indigo-400',
      countColor: 'bg-indigo-100 text-indigo-700',
    },
    {
      status: 'ARRIVED' as const,
      title: 'Topshirishga tayyor',
      subtitle: 'Topshiring yoki omborga qaytaring',
      accentLeft: 'border-l-emerald-400',
      countColor: 'bg-emerald-100 text-emerald-700',
    },
  ];

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-5 p-6 h-full min-w-max">
          {USTUNLAR.map(col => (
            <PipelineColumn key={col.status} {...col} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BoshqaruvKorinishi() {
  const { groups, students, getTeacherName } = useApp();
  const [guruhKorsat,   setGuruhKorsat]   = useState(false);
  const [talabKorsat, setTalabaKorsat] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6 bg-slate-50">
      {/* Amallar paneli */}
      <div className="flex items-center gap-3">
        <button onClick={() => setGuruhKorsat(true)} className="sb-btn-secondary flex items-center gap-1.5 text-xs">
          <FolderPlus className="w-3.5 h-3.5" /> Yangi guruh
        </button>
        <button onClick={() => setTalabaKorsat(true)} className="sb-btn-primary flex items-center gap-1.5 text-xs">
          <Users className="w-3.5 h-3.5" /> Talaba qo'shish
        </button>
        <span className="text-[11px] text-slate-400 ml-auto">
          {groups.length} ta guruh · {students.length} ta talaba
        </span>
      </div>

      {/* Guruhlar jadvali */}
      <div className="sb-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
          <FolderPlus className="w-4 h-4 text-slate-400" />
          <p className="text-sm font-semibold text-slate-800">Ro'yxatga olingan guruhlar</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Guruh nomi', 'O\'qituvchi', 'Boshlanish', 'Tugash', 'Interval', 'Talabalar'].map(h => (
                  <th key={h} className="px-5 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groups.map(g => (
                <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-slate-800">{g.groupName}</td>
                  <td className="px-5 py-3.5 text-slate-600">{getTeacherName(g.teacherId)}</td>
                  <td className="px-5 py-3.5 text-slate-500 font-mono">{g.startDate}</td>
                  <td className="px-5 py-3.5 text-slate-500 font-mono">{g.endDate}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-slate-600 text-[10px]">
                      <Clock className="w-2.5 h-2.5" />
                      {g.orderIntervalDays} kun
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {students.filter(s => s.groupId === g.id).length} ta
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Talabalar jadvali */}
      <div className="sb-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" />
          <p className="text-sm font-semibold text-slate-800">Barcha talabalar</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Ismi', 'Guruh', 'Ro\'yxatga olingan'].map(h => (
                  <th key={h} className="px-5 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-[10px] font-bold text-blue-600 uppercase shrink-0">
                        {s.name.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-800">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">
                    {groups.find(g => g.id === s.groupId)?.groupName ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 font-mono flex items-center gap-1.5">
                    <CalendarDays className="w-3 h-3" />{s.createdAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {guruhKorsat   && <CreateGroupModal onClose={() => setGuruhKorsat(false)} />}
      {talabKorsat && <AddStudentModal  onClose={() => setTalabaKorsat(false)} />}
    </div>
  );
}

export default function CashierDashboard() {
  const { activeSubPage } = useApp();
  return activeSubPage === 'pipeline' ? <PipelineView /> : <BoshqaruvKorinishi />;
}
