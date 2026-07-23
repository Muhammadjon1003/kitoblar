/**
 * views/TeacherView.tsx — O'zbek tili
 */

import { useState, useMemo } from 'react';
import { BookOpen, CheckSquare, Square, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge, EmptyState, TableShell, Th, Td } from '../components/ui';
import BulkOrderModal from './TeacherView/BulkOrderModal';

export default function TeacherView() {
  const {
    currentUser,
    groups,
    students,
    getStudentOrders, getInventoryItem,
  } = useApp();

  // Filter groups strictly for currently logged-in teacher (if logged in as TEACHER)
  const teacherGroups = useMemo(() => {
    if (currentUser?.role === 'TEACHER' && currentUser.fullName) {
      const userLower = currentUser.fullName.toLowerCase().trim();
      return groups.filter(g => {
        const groupTeacherLower = g.teacherName.toLowerCase().trim();
        return (
          groupTeacherLower === userLower ||
          (userLower.length > 2 && groupTeacherLower.includes(userLower)) ||
          (groupTeacherLower.length > 2 && userLower.includes(groupTeacherLower))
        );
      });
    }
    return groups; // Manager/Cashier preview shows all groups
  }, [currentUser, groups]);

  const [activeGroupIdState, setActiveGroupId] = useState<string>('');
  const activeGroupId = teacherGroups.find(g => g.id === activeGroupIdState)?.id ?? teacherGroups[0]?.id ?? '';

  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  const [showModal,     setShowModal]     = useState(false);

  const groupStudents = students.filter(s => s.groupId === activeGroupId);

  const toggleStudent = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(prev =>
      prev.size === groupStudents.length ? new Set() : new Set(groupStudents.map(s => s.id))
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Asboblar paneli */}
      <div className="flex items-center gap-4 px-7 py-4 border-b border-slate-200 bg-white shrink-0">
        <div className="relative">
          <select className="sb-input appearance-none pr-8 text-sm font-medium"
            value={activeGroupId}
            onChange={e => { setActiveGroupId(e.target.value); setSelectedIds(new Set()); }}>
            {teacherGroups.map(g => <option key={g.id} value={g.id}>{g.groupName}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        <span className="text-[11px] text-slate-600 font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50">
          {groupStudents.length} ta talaba
        </span>

        <div className="ml-auto flex items-center gap-2">
          {selectedIds.size > 0 && (
            <span className="text-[11px] text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1 font-semibold">
              {selectedIds.size} ta tanlandi
            </span>
          )}
          <button onClick={() => selectedIds.size > 0 && setShowModal(true)}
            disabled={selectedIds.size === 0}
            className="sb-btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3 disabled:opacity-40">
            <BookOpen className="w-3.5 h-3.5" /> Buyurtma yaratish
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-7 py-5">
        {teacherGroups.length === 0 ? (
          <EmptyState label="Sizga biriktirilgan guruhlar topilmadi." />
        ) : groupStudents.length === 0 ? (
          <EmptyState label="Bu guruhda hali talabalar yo'q." />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>
                  <button onClick={toggleAll} className="text-slate-400 hover:text-slate-700 transition-colors">
                    {selectedIds.size === groupStudents.length && groupStudents.length > 0
                      ? <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                      : <Square className="w-3.5 h-3.5" />}
                  </button>
                </Th>
                <Th>Talaba ismi</Th>
                <Th>Oxirgi kitob</Th>
                <Th>Buyurtma sanasi</Th>
                <Th>Holati</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groupStudents.map(student => {
                const latestOrder = getStudentOrders(student.id)[0];
                const bookItem    = latestOrder ? getInventoryItem(latestOrder.bookId) : undefined;
                const selected    = selectedIds.has(student.id);

                return (
                  <tr key={student.id}
                    className={`transition-colors cursor-pointer ${selected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                    onClick={() => toggleStudent(student.id)}>
                    <Td>
                      <button onClick={e => { e.stopPropagation(); toggleStudent(student.id); }}
                        className="text-slate-400 hover:text-blue-600 transition-colors">
                        {selected
                          ? <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                          : <Square className="w-3.5 h-3.5" />}
                      </button>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-[10px] font-bold text-blue-600 uppercase shrink-0">
                          {student.name.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-800">{student.name}</span>
                      </div>
                    </Td>
                    <Td muted={!bookItem}>{bookItem ? bookItem.title : 'Buyurtma yo\'q'}</Td>
                    <Td mono muted={!latestOrder}>{latestOrder ? latestOrder.updatedAt : '—'}</Td>
                    <Td>
                      {latestOrder
                        ? <StatusBadge status={latestOrder.status} />
                        : <span className="text-[11px] text-slate-500 font-semibold">Faol buyurtma yo'q</span>}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        )}
      </div>

      {showModal && (
        <BulkOrderModal selectedIds={[...selectedIds]} activeGroupId={activeGroupId}
          onClose={() => { setShowModal(false); setSelectedIds(new Set()); }} />
      )}
    </div>
  );
}
