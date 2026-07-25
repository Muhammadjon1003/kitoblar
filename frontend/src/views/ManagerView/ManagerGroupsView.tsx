/**
 * views/ManagerView/ManagerGroupsView.tsx — O'zbek tili
 * Menejer uchun guruhlar boshqaruvi va guruh talabalarining kitoblar tarixi modali.
 */

import { useState } from 'react';
import { Users, UserPlus, BookOpen, Calendar, Search, X, ChevronRight, UserCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TableShell, Th, Td, StatusBadge, EmptyState } from '../../components/ui';
import { BulkAddStudentModal } from '../CashierView/StudentModals';
import type { Group } from '../../types';

interface GroupModalProps {
  group: Group;
  onClose: () => void;
}

function GuruhTalabalariModali({ group, onClose }: GroupModalProps) {
  const { students, getStudentOrders, getInventoryItem } = useApp();

  const groupStudents = students.filter(s => s.groupId === group.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              <h3 className="text-base font-bold">{group.groupName} — Talabalar Ro'yxati</h3>
            </div>
            <p className="text-xs text-blue-100 mt-0.5 font-medium">
              O'qituvchi: {group.teacherName} · Jami: {groupStudents.length} ta talaba
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/15 text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Table */}
        <div className="p-6 overflow-y-auto flex-1">
          {groupStudents.length === 0 ? (
            <EmptyState label="Bu guruhda hali birorta ham talaba mavjud emas." />
          ) : (
            <div className="w-full overflow-x-auto">
              <TableShell>
                <thead>
                  <tr>
                    <Th>#</Th>
                    <Th>Talaba ismi</Th>
                    <Th>Telefon</Th>
                    <Th>A'zo bo'lgan sana</Th>
                    <Th>So'nggi buyurtma kitobi</Th>
                    <Th>Holat</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupStudents.map((s, idx) => {
                    const latestOrder = getStudentOrders(s.id)[0];
                    const bookItem    = latestOrder ? getInventoryItem(latestOrder.bookId) : undefined;

                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <Td mono>{idx + 1}</Td>
                        <Td>
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="font-bold text-slate-800">{s.fullName || s.name}</span>
                          </div>
                        </Td>
                        <Td mono muted>{s.phoneNumber || '—'}</Td>
                        <Td mono muted>{(s as any).createdAt?.slice(0, 10) || '—'}</Td>
                        <Td>
                          {bookItem ? (
                            <span className="font-semibold text-slate-700">{bookItem.title}</span>
                          ) : (
                            <span className="text-slate-400 italic">Kitob yo'q</span>
                          )}
                        </Td>
                        <Td>
                          {latestOrder ? (
                            <StatusBadge status={latestOrder.status} />
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-semibold">
                              Yo'q
                            </span>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableShell>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors"
          >
            Yopish
          </button>
        </div>

      </div>
    </div>
  );
}

export default function ManagerGroupsView() {
  const { groups, students } = useApp();
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');

  const filteredGroups = groups.filter(g => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.groupName.toLowerCase().includes(q) ||
      g.teacherName.toLowerCase().includes(q) ||
      (g.subjectCategory || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 overflow-y-auto px-3.5 sm:px-7 py-4 sm:py-6 space-y-6 bg-slate-50">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Guruhlar Boshqaruvi
          </h2>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            Mavjud guruhlarni ko'rish va har bir guruh o'quvchilarining kitob olish va a'zolik tarixini tahlil qilish
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            onClick={() => setShowBulkAddModal(true)}
            className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Ommaviy talaba qo'shish
          </button>

          <span className="px-3.5 py-1.5 bg-white border border-slate-250 rounded-xl shadow-sm font-bold text-slate-700 text-xs">
            Jami guruhlar: <strong className="text-blue-600 font-mono">{groups.length} ta</strong>
          </span>
          <span className="px-3.5 py-1.5 bg-blue-50 border border-blue-200 rounded-xl shadow-sm font-bold text-blue-800 text-xs">
            Jami talabalar: <strong className="text-indigo-600 font-mono">{students.length} ta</strong>
          </span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Guruh nomi, o'qituvchi yoki fan..."
            className="w-full h-9 pl-9 pr-3 text-xs font-semibold text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
        
        <p className="text-xs font-bold text-slate-500 hidden sm:block">
          Natija: <span className="text-slate-800">{filteredGroups.length} ta guruh</span>
        </p>
      </div>

      {/* Groups Grid */}
      {filteredGroups.length === 0 ? (
        <EmptyState label={searchQuery ? `"${searchQuery}" bo'yicha guruh topilmadi.` : "Hozircha hech qanday guruh mavjud emas."} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGroups.map(group => {
            const groupStudentCount = students.filter(s => s.groupId === group.id).length;

            return (
              <div
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Category & Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 font-bold text-[10px] rounded-md uppercase tracking-wider">
                      {group.subjectCategory || 'Umumiy'}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      <Users className="w-3 h-3 text-slate-500" />
                      {groupStudentCount} ta talaba
                    </span>
                  </div>

                  {/* Group Name & Teacher */}
                  <h3 className="text-base font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {group.groupName}
                  </h3>
                  <p className="text-xs text-slate-600 font-semibold mt-1">
                    O'qituvchi: <span className="text-slate-800 font-bold">{group.teacherName}</span>
                  </p>

                  {/* Dates */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {group.startDate} — {group.endDate}
                    </span>
                  </div>
                </div>

                {/* View Students Modal Trigger Button */}
                <div className="mt-5 pt-3 border-t border-slate-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedGroup(group); }}
                    className="w-full py-2 bg-slate-50 group-hover:bg-blue-600 group-hover:text-white border border-slate-200 group-hover:border-blue-600 text-slate-700 font-bold text-xs rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Talabalar va Kitoblar Tarixi
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Group Modal */}
      {selectedGroup && (
        <GuruhTalabalariModali
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
        />
      )}

      {/* Bulk Add Student Modal */}
      {showBulkAddModal && (
        <BulkAddStudentModal
          onClose={() => setShowBulkAddModal(false)}
        />
      )}

    </div>
  );
}
