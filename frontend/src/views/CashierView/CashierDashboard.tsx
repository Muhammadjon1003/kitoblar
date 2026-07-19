/**
 * views/CashierView/CashierDashboard.tsx — O'zbek tili
 */

import { useState } from 'react';
import { FolderPlus, Users, CalendarDays, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import PipelineColumn from './PipelineColumn';
import { CreateGroupModal, AddStudentModal } from './StudentModals';
import { TableShell, Th, Td } from '../../components/ui';

function PipelineView() {
  const USTUNLAR = [
    {
      status: 'CREATED' as const,
      title: 'To\'lov kutilmoqda',
      subtitle: 'Naqd pul qabul qiling — To\'langan holatiga o\'tadi',
      accentLeft: 'border-l-blue-600',
      countColor: 'bg-blue-600 text-white font-bold',
    },
    {
      status: 'PAID' as const,
      title: 'To\'langan — Buyurtma kutilmoqda',
      subtitle: 'Logistika ta\'minotchiga yo\'naltiradi',
      accentLeft: 'border-l-indigo-600',
      countColor: 'bg-indigo-600 text-white font-bold',
    },
    {
      status: 'ARRIVED' as const,
      title: 'Topshirishga tayyor',
      subtitle: 'Topshiring yoki omborga qaytaring',
      accentLeft: 'border-l-emerald-600',
      countColor: 'bg-emerald-600 text-white font-bold',
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
          <FolderPlus className="w-3.5 h-3.5 text-slate-800" /> Guruh yaratish
        </button>
        <button onClick={() => setTalabaKorsat(true)} className="sb-btn-primary flex items-center gap-1.5 text-xs">
          <Users className="w-3.5 h-3.5 text-white" /> Talaba qo'shish
        </button>
        <span className="text-[11px] font-bold text-slate-700 bg-slate-200 border border-slate-350 px-2.5 py-1 rounded-lg ml-auto">
          {groups.length} ta guruh · {students.length} ta talaba
        </span>
      </div>

      {/* Guruhlar jadvali */}
      <div className="sb-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-100/50 flex items-center gap-2">
          <FolderPlus className="w-4 h-4 text-blue-600 font-bold" />
          <p className="text-sm font-bold text-slate-800">Ro'yxatga olingan guruhlar</p>
        </div>
        <TableShell>
          <thead>
            <tr>
              <Th>Guruh nomi</Th>
              <Th>O'qituvchi</Th>
              <Th>Boshlanish</Th>
              <Th>Tugash</Th>
              <Th>Interval</Th>
              <Th>Talabalar</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {groups.map(g => (
              <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                <Td>{g.groupName}</Td>
                <Td>{getTeacherName(g.teacherId)}</Td>
                <Td mono>{g.startDate}</Td>
                <Td mono>{g.endDate}</Td>
                <Td>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-slate-950 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    <Clock className="w-2.5 h-2.5" />
                    {g.orderIntervalDays} kun
                  </span>
                </Td>
                <Td>{students.filter(s => s.groupId === g.id).length} ta talaba</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </div>

      {/* Talabalar jadvali */}
      <div className="sb-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-100/50 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600 font-bold" />
          <p className="text-sm font-bold text-slate-800">Barcha talabalar</p>
        </div>
        <TableShell>
          <thead>
            <tr>
              <Th>Ismi</Th>
              <Th>Guruh</Th>
              <Th>Ro'yxatga olingan</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map(s => (
              <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                <Td>
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm shadow-blue-500/20">
                      {s.name.charAt(0)}
                    </div>
                    <span className="font-semibold text-slate-800">{s.name}</span>
                  </div>
                </Td>
                <Td>{groups.find(g => g.id === s.groupId)?.groupName ?? '—'}</Td>
                <Td mono>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-200 text-slate-800 rounded-md font-semibold text-xs">
                    <CalendarDays className="w-3 h-3 text-slate-700" />
                    {s.createdAt}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
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
