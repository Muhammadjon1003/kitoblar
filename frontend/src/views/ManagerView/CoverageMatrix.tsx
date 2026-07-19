/**
 * views/ManagerView/CoverageMatrix.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Visual grid mapping students (rows) × inventory books (columns).
 * Color-coded dots: Green=GIVEN, Yellow=ORDERED/ARRIVED, Red=CREATED/PAID, Gray=No Order.
 */

import { useState } from 'react';
import { useApp } from '../../context/AppContext';

// ─── Cell status resolution ────────────────────────────────────────────────────

type CellStatus = 'given' | 'in_progress' | 'pending_payment' | 'no_order';

const CELL_CONFIG: Record<CellStatus, { dot: string; label: string; tooltip: string }> = {
  given:           { dot: 'bg-emerald-500',             label: 'Given',           tooltip: 'bg-emerald-950 text-emerald-300 border-emerald-800'  },
  in_progress:     { dot: 'bg-amber-400 animate-pulse', label: 'In Progress',     tooltip: 'bg-amber-950 text-amber-300 border-amber-800'        },
  pending_payment: { dot: 'bg-red-500',                 label: 'Pending Payment', tooltip: 'bg-red-950 text-red-300 border-red-800'              },
  no_order:        { dot: 'bg-zinc-700',                label: 'No Order',        tooltip: 'bg-zinc-800 text-zinc-400 border-zinc-700'           },
};

function resolveStatus(studentId: string, bookId: string, orders: ReturnType<typeof useApp>['orders']): CellStatus {
  const match = orders
    .filter(o => o.studentId === studentId && o.bookId === bookId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  if (!match) return 'no_order';
  if (match.status === 'GIVEN') return 'given';
  if (['ORDERED', 'ARRIVED'].includes(match.status)) return 'in_progress';
  if (['CREATED', 'PAID'].includes(match.status)) return 'pending_payment';
  return 'no_order';
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function CoverageMatrix() {
  const { students, inventory, orders, groups } = useApp();
  const [hovered, setHovered] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState('All');

  const groupOptions = ['All', ...groups.map(g => g.groupName)];
  const filteredStudents = filterGroup === 'All'
    ? students
    : students.filter(s => {
        const g = groups.find(g => g.groupName === filterGroup);
        return g && s.groupId === g.id;
      });

  // Only show books that have at least one order
  const activeBookIds = new Set(orders.map(o => o.bookId));
  const matrixBooks = inventory.filter(inv => activeBookIds.has(inv.id));

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Student × Curriculum Coverage Matrix</h2>
          <p className="text-[11px] text-zinc-500 mt-1">
            Color-coded fulfillment status for each student-book pair.
          </p>
        </div>

        {/* Legend + Group Filter */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            {Object.entries(CELL_CONFIG).map(([k, cfg]) => (
              <div key={k} className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </div>
            ))}
          </div>

          {/* Group filter pills */}
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-md p-0.5">
            {groupOptions.map(g => (
              <button
                key={g}
                onClick={() => setFilterGroup(g)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  filterGroup === g
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sb-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-xs text-left">
            <thead className="bg-zinc-950/60 border-b border-zinc-800">
              <tr>
                <th className="px-5 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest sticky left-0 bg-zinc-950/80 backdrop-blur-sm min-w-[180px]">
                  Student
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest min-w-[80px]">
                  Group
                </th>
                {matrixBooks.map(inv => (
                  <th key={inv.id} className="px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest text-center min-w-[100px]">
                    <span className="block max-w-[90px] truncate" title={inv.title}>{inv.title}</span>
                  </th>
                ))}
                <th className="px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest text-right">
                  Done %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredStudents.map(student => {
                const group = groups.find(g => g.id === student.groupId);
                const statuses = matrixBooks.map(inv => resolveStatus(student.id, inv.id, orders));
                const doneCount = statuses.filter(s => s === 'given').length;
                const pct = matrixBooks.length > 0 ? Math.round((doneCount / matrixBooks.length) * 100) : 0;

                return (
                  <tr key={student.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-5 py-3.5 sticky left-0 bg-zinc-950 group-hover:bg-zinc-900 backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400 uppercase shrink-0">
                          {student.name.charAt(0)}
                        </div>
                        <span className="font-medium text-zinc-200 truncate max-w-[130px]">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-zinc-400 whitespace-nowrap">
                        {group?.groupName ?? '—'}
                      </span>
                    </td>
                    {matrixBooks.map((inv, i) => {
                      const cellStatus = statuses[i];
                      const cfg = CELL_CONFIG[cellStatus];
                      const cellKey = `${student.id}-${inv.id}`;

                      return (
                        <td
                          key={inv.id}
                          className="px-4 py-3.5 text-center relative"
                          onMouseEnter={() => setHovered(cellKey)}
                          onMouseLeave={() => setHovered(null)}
                        >
                          <span className={`w-3 h-3 rounded-full inline-block ${cfg.dot}`} />
                          {hovered === cellKey && (
                            <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
                              <div className={`px-2.5 py-1.5 rounded border text-[10px] font-medium whitespace-nowrap shadow-xl ${cfg.tooltip}`}>
                                {cfg.label} — {inv.title}
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3.5 text-right">
                      <span className={`text-[12px] font-bold ${pct === 100 ? 'text-emerald-400' : pct > 50 ? 'text-blue-400' : 'text-amber-500'}`}>
                        {pct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
