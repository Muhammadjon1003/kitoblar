/**
 * views/ManagerView/ManagerGroupsView.tsx — O'zbek tili
 * Menejer uchun guruhlar boshqaruvi va guruh talabalarining kitoblar tarixi modali.
 */

import { useState } from 'react';
import { Users, BookOpen, Calendar, Search, X, ChevronRight, UserCheck, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TableShell, Th, Td, StatusBadge, EmptyState } from '../../components/ui';
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
              <h3 className="text-base font-bold">{group.groupName}</h3>
              <span className="px-2 py-0.5 bg-white/20 rounded-md text-[10px] font-bold text-white uppercase tracking-wider">
                {group.subjectCategory || 'Umumiy'}
              </span>
            </div>
            <p className="text-[11px] text-blue-100 mt-0.5 font-medium flex items-center gap-3">
              <span>O'qituvchi: <strong className="text-white">{group.teacherName}</strong></span>
              <span>•</span>
              <span>Guruh a'zolari: <strong className="text-white">{groupStudents.length} ta talaba</strong></span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 text-white transition-colors">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Modal Body Table */}
        <div className="p-6 overflow-y-auto space-y-4">
          {groupStudents.length === 0 ? (
            <EmptyState label="Ushbu guruhda hozircha birorta ham talaba ro'yxatdan o'tmagan." />
          ) : (
            <TableShell>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Talaba ismi</Th>
                  <Th>Telefon raqami</Th>
                  <Th>A'zo bo'lgan sana</Th>
                  <Th>Yaqinda olgan kitobi</Th>
                  <Th>Olingan sana</Th>
                  <Th>Holati</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupStudents.map((student, idx) => {
                  const studentOrders = getStudentOrders(student.id);
                  const latestOrder   = studentOrders[0];
                  const bookInv       = latestOrder ? getInventoryItem(latestOrder.bookId) : null;
                  const joinedDateFormatted = student.joinedAt
                    ? student.joinedAt.slice(0, 10)
                    : (student as any).createdAt ? String((student as any).createdAt).slice(0, 10) : '—';

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <Td mono>{idx + 1}</Td>
                      <Td>
                        <span className="font-bold text-slate-800">{student.fullName || student.name}</span>
                      </Td>
                      <Td mono muted>{student.phoneNumber || '—'}</Td>
                      <Td mono>
                        <span className="inline-flex items-center gap-1 text-slate-600 font-semibold">
                          <UserCheck className="w-3 h-3 text-blue-500" />
                          {joinedDateFormatted}
                        </span>
                      </Td>
                      <Td>
                        {bookInv ? (
                          <span className="font-bold text-slate-800">{bookInv.title}</span>
                        ) : (
                          <span className="text-slate-400 font-medium italic">Hali kitob berilmagan</span>
                        )}
                      </Td>
                      <Td mono muted>
                        {latestOrder ? (
                          <span className="inline-flex items-center gap-1 text-slate-600">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {latestOrder.updatedAt}
                          </span>
                        ) : (
                          '—'
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
    <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6 bg-slate-50">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Guruhlar Boshqaruvi
          </h2>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            Mavjud guruhlarni ko'rish va har bir guruh o'quvchilarining kitob olish va a'zolik tarixini tahlil qilish
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs shrink-0">
          <span className="px-3.5 py-1.5 bg-white border border-slate-250 rounded-xl shadow-sm font-bold text-slate-700">
            Jami guruhlar: <strong className="text-blue-600 font-mono">{groups.length} ta</strong>
          </span>
          <span className="px-3.5 py-1.5 bg-blue-50 border border-blue-200 rounded-xl shadow-sm font-bold text-blue-800">
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

    </div>
  );
}
