/**
 * views/LogisticsView/WarehouseInventory.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays physical books with is_returned=true (reusable warehouse stock).
 * Provides an allocation flow to assign returned books to students at 0 cost,
 * instantly creating an ARRIVED order — skipping external vendor procurement.
 */

import { useState } from 'react';
import { Archive, Send, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { EmptyState } from '../../components/ui';

export default function WarehouseInventory() {
  const { inventory, students, groups, allocateFromWarehouse } = useApp();

  const returnedBooks = inventory.filter(i => i.isReturned);

  // Per-book allocation state: selected studentId
  const [allocations, setAllocations] = useState<Record<string, string>>({});

  const setAllocation = (invId: string, studentId: string) => {
    setAllocations(prev => ({ ...prev, [invId]: studentId }));
  };

  const handleAllocate = (invId: string) => {
    const studentId = allocations[invId];
    if (!studentId) return;
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    allocateFromWarehouse(invId, studentId, student.groupId);
    // Clear local allocation selection
    setAllocations(prev => { const next = { ...prev }; delete next[invId]; return next; });
  };

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Archive className="w-4 h-4 text-zinc-500" />
            Warehouse Reusable Stock
          </h2>
          <p className="text-[11px] text-zinc-500 mt-1">
            Books with <span className="font-mono text-zinc-400">is_returned: true</span>. Allocating creates an ARRIVED order at $0 book_cost.
          </p>
        </div>
        <span className="text-[11px] font-semibold px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-300">
          {returnedBooks.length} units available
        </span>
      </div>

      {returnedBooks.length === 0 ? (
        <EmptyState label="No returned books in warehouse stock." />
      ) : (
        <div className="space-y-3">
          {returnedBooks.map(inv => {
            const selectedStudentId = allocations[inv.id] ?? '';
            const selectedStudent = students.find(s => s.id === selectedStudentId);

            return (
              <div key={inv.id} className="sb-card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Book info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-100">{inv.title}</p>
                  <p className="text-[10px] text-zinc-600 font-mono mt-0.5 truncate">tg_file_id: {inv.tgFileId}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px]">
                    <span className="px-2 py-0.5 bg-purple-950 border border-purple-800 text-purple-400 rounded font-medium">
                      RETURNED
                    </span>
                    <span className="text-zinc-500">Wholesale cost: <span className="text-zinc-300 font-mono">${inv.bookCost}</span></span>
                    <span className="text-emerald-500 font-semibold">→ Allocate at $0.00</span>
                  </div>
                </div>

                {/* Student selector + allocate button */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="relative">
                    <select
                      className="sb-input appearance-none pr-8 text-xs min-w-[220px]"
                      value={selectedStudentId}
                      onChange={e => setAllocation(inv.id, e.target.value)}
                    >
                      <option value="">— Select student to allocate —</option>
                      {groups.map(g => (
                        <optgroup key={g.id} label={g.groupName}>
                          {students
                            .filter(s => s.groupId === g.id)
                            .map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))
                          }
                        </optgroup>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                  </div>

                  <button
                    onClick={() => handleAllocate(inv.id)}
                    disabled={!selectedStudentId}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold sb-btn-primary disabled:opacity-40 whitespace-nowrap"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Allocate
                    {selectedStudent && ` → ${selectedStudent.name.split(' ')[0]}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* All inventory reference table */}
      <div className="sb-card overflow-hidden mt-6">
        <div className="px-5 py-3 border-b border-zinc-800">
          <p className="text-xs font-semibold text-zinc-300">Full Inventory Ledger</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/40">
                {['Title','TG File ID','Cost','Status'].map(h => (
                  <th key={h} className="px-5 py-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {inventory.map(inv => (
                <tr key={inv.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-5 py-3 font-medium text-zinc-200">{inv.title}</td>
                  <td className="px-5 py-3 font-mono text-zinc-600 text-[10px] max-w-[200px] truncate">{inv.tgFileId}</td>
                  <td className="px-5 py-3 font-mono text-zinc-300">${inv.bookCost}</td>
                  <td className="px-5 py-3">
                    {inv.isReturned
                      ? <span className="px-2 py-0.5 bg-purple-950 border border-purple-800 text-purple-400 rounded text-[10px] font-semibold">Returned / Available</span>
                      : <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded text-[10px]">In Circulation</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
