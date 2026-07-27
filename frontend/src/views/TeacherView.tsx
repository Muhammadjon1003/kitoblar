import { useState, useMemo } from 'react';
import { BookOpen, CheckSquare, Square, ChevronDown, FolderPlus, Users, UserPlus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge, EmptyState, TableShell, Th, Td } from '../components/ui';
import BulkOrderModal from './TeacherView/BulkOrderModal';
import EditOrderBookModal from './TeacherView/EditOrderBookModal';
import { CreateGroupModal, AddStudentModal, BulkAddStudentModal } from './CashierView/StudentModals';

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

  const [selectedIds,         setSelectedIds]         = useState<Set<string>>(new Set());
  const [showModal,           setShowModal]           = useState(false);
  const [showCreateGroup,     setShowCreateGroup]     = useState(false);
  const [showAddStudent,     setShowAddStudent]     = useState(false);
  const [showBulkAddStudent, setShowBulkAddStudent] = useState(false);
  const [editingOrder,       setEditingOrder]       = useState<{ orderId: string; currentBookId: string; studentName: string } | null>(null);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3.5 sm:px-7 py-3 sm:py-4 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 sm:flex-none min-w-[160px]">
            <select className="sb-input appearance-none pr-8 text-sm font-semibold w-full"
              value={activeGroupId}
              onChange={e => { setActiveGroupId(e.target.value); setSelectedIds(new Set()); }}>
              {teacherGroups.map(g => <option key={g.id} value={g.id}>{g.groupName}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          <span className="text-[11px] text-slate-600 font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 shrink-0">
            {groupStudents.length} ta talaba
          </span>

          <div className="h-4 w-px bg-slate-200 hidden sm:block mx-1" />

          {/* Teacher Group & Student Add Buttons */}
          <button
            onClick={() => setShowCreateGroup(true)}
            className="sb-btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
            title="Faqat o'zingiz uchun yangi guruh yaratish"
          >
            <FolderPlus className="w-3.5 h-3.5 text-slate-700" /> Guruh yaratish
          </button>
          <button
            onClick={() => setShowAddStudent(true)}
            className="sb-btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
            title="Guruhingizga talaba qo'shish"
          >
            <Users className="w-3.5 h-3.5 text-slate-700" /> Talaba qo'shish
          </button>
          <button
            onClick={() => setShowBulkAddStudent(true)}
            className="sb-btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold"
            title="Guruhingizga ko'plab talabalarni birvarakay qo'shish"
          >
            <UserPlus className="w-3.5 h-3.5 text-indigo-600" /> Ommaviy talaba qo'shish
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0">
          {selectedIds.size > 0 && (
            <span className="text-[11px] text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1 font-semibold">
              {selectedIds.size} ta tanlandi
            </span>
          )}
          <button onClick={() => selectedIds.size > 0 && setShowModal(true)}
            disabled={selectedIds.size === 0}
            className="sb-btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3 disabled:opacity-40 ml-auto sm:ml-0">
            <BookOpen className="w-3.5 h-3.5" /> Buyurtma yaratish
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 sm:px-7 py-4 sm:py-5">
        {teacherGroups.length === 0 ? (
          <EmptyState label="Sizga biriktirilgan guruhlar topilmadi." />
        ) : groupStudents.length === 0 ? (
          <EmptyState label="Bu guruhda hali talabalar yo'q." />
        ) : (
          <div className="w-full overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-sm">
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
                <Th>Amallar / Tahrirlash</Th>
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
                    <Td>
                      {latestOrder ? (
                        latestOrder.status === 'CREATED' ? (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setEditingOrder({
                                orderId: latestOrder.id,
                                currentBookId: latestOrder.bookId,
                                studentName: student.name
                              });
                            }}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold text-[11px] rounded-lg flex items-center gap-1 transition-colors"
                          >
                            ✏️ Tahrirlash
                          </button>
                        ) : (
                          <span
                            title="Buyurtma ta'minotchiga yuborilgan. O'zgartirish uchun yangi buyurtma berib, eskisini omborda qaytarishni so'rang."
                            className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-500 font-semibold text-[10px] rounded-lg cursor-help inline-flex items-center gap-1"
                          >
                            🔒 Yuborilgan (Nodovom)
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
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

      {showModal && (
        <BulkOrderModal selectedIds={[...selectedIds]} activeGroupId={activeGroupId}
          onClose={() => { setShowModal(false); setSelectedIds(new Set()); }} />
      )}

      {/* Teacher Group Creation Modal — locked to current teacher */}
      {showCreateGroup && (
        <CreateGroupModal
          lockedTeacherName={currentUser?.fullName}
          onSuccess={(createdGroup) => setActiveGroupId(createdGroup.id)}
          onClose={() => setShowCreateGroup(false)}
        />
      )}

      {/* Teacher Single Student Add Modal — filtered to teacher's groups */}
      {showAddStudent && (
        <AddStudentModal
          defaultGroupId={activeGroupId}
          allowedGroups={teacherGroups}
          onSuccess={(groupId) => setActiveGroupId(groupId)}
          onClose={() => setShowAddStudent(false)}
        />
      )}

      {/* Teacher Bulk Student Add Modal — filtered to teacher's groups */}
      {showBulkAddStudent && (
        <BulkAddStudentModal
          defaultGroupId={activeGroupId}
          allowedGroups={teacherGroups}
          onSuccess={(groupId) => setActiveGroupId(groupId)}
          onClose={() => setShowBulkAddStudent(false)}
        />
      )}

      {/* Edit Order Book Modal (for CREATED orders) */}
      {editingOrder && (
        <EditOrderBookModal
          orderId={editingOrder.orderId}
          currentBookId={editingOrder.currentBookId}
          studentName={editingOrder.studentName}
          onClose={() => setEditingOrder(null)}
        />
      )}
    </div>
  );
}
