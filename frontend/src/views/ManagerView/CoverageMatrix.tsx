/**
 * views/ManagerView/CoverageMatrix.tsx — O'zbek tili
 * Talabalar × Darsliklar qoplama matritsasi.
 */

import { useState } from 'react';
import { useApp } from '../../context/AppContext';

// ─── Katak holati ──────────────────────────────────────────────────────────────

type KatakHolati = 'berildi' | 'jarayonda' | 'kutilmoqda' | 'buyurtma_yoq';

const KATAK_KONFIGURATSIYA: Record<KatakHolati, { dot: string; label: string; tooltip: string }> = {
  berildi:      { dot: 'bg-emerald-500',             label: 'Topshirildi',       tooltip: 'bg-emerald-950 text-emerald-300 border-emerald-800'  },
  jarayonda:    { dot: 'bg-amber-400 animate-pulse',  label: 'Jarayonda',         tooltip: 'bg-amber-950 text-amber-300 border-amber-800'        },
  kutilmoqda:   { dot: 'bg-red-500',                  label: "To'lov kutilmoqda", tooltip: 'bg-red-950 text-red-300 border-red-800'              },
  buyurtma_yoq: { dot: 'bg-zinc-700',                 label: 'Buyurtma yo\'q',    tooltip: 'bg-zinc-800 text-zinc-400 border-zinc-700'           },
};

function katakHolatiniAniqla(studentId: string, bookId: string, orders: ReturnType<typeof useApp>['orders']): KatakHolati {
  const mos = orders
    .filter(o => o.studentId === studentId && o.bookId === bookId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  if (!mos) return 'buyurtma_yoq';
  if (mos.status === 'GIVEN')                               return 'berildi';
  if (['ORDERED', 'ARRIVED'].includes(mos.status))          return 'jarayonda';
  if (['CREATED', 'PAID'].includes(mos.status))             return 'kutilmoqda';
  return 'buyurtma_yoq';
}

// ─── Komponent ─────────────────────────────────────────────────────────────────

export default function CoverageMatrix() {
  const { students, inventory, orders, groups } = useApp();
  const [hovered,     setHovered]     = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState("Barchasi");

  const guruhTanlovlari = ["Barchasi", ...groups.map(g => g.groupName)];
  const filteredStudents = filterGroup === "Barchasi"
    ? students
    : students.filter(s => {
        const g = groups.find(g => g.groupName === filterGroup);
        return g && s.groupId === g.id;
      });

  const faolKitobIdlar = new Set(orders.map(o => o.bookId));
  const matritsaKitoblari = inventory.filter(inv => faolKitobIdlar.has(inv.id));

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Talabalar × Darsliklar Qoplama Matritsasi</h2>
          <p className="text-[11px] text-zinc-400 mt-1">
            Har bir talaba va kitob juftligi uchun rang-kodli bajarilish holati.
          </p>
        </div>

        {/* Afsona + Guruh filtri */}
        <div className="flex items-center gap-4">
          {/* Afsona */}
          <div className="flex items-center gap-3">
            {Object.entries(KATAK_KONFIGURATSIYA).map(([k, cfg]) => (
              <div key={k} className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot.replace(' animate-pulse', '')}`} />
                {cfg.label}
              </div>
            ))}
          </div>

          {/* Guruh filtri tugmalari */}
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-md p-0.5">
            {guruhTanlovlari.map(g => (
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
                  Talaba
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest min-w-[80px]">
                  Guruh
                </th>
                {matritsaKitoblari.map(inv => (
                  <th key={inv.id} className="px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest text-center min-w-[100px]">
                    <span className="block max-w-[90px] truncate" title={inv.title}>{inv.title}</span>
                  </th>
                ))}
                <th className="px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest text-right">
                  Bajarildi %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredStudents.map(student => {
                const guruh    = groups.find(g => g.id === student.groupId);
                const holatlar = matritsaKitoblari.map(inv => katakHolatiniAniqla(student.id, inv.id, orders));
                const sonBajarildi = holatlar.filter(s => s === 'berildi').length;
                const foiz     = matritsaKitoblari.length > 0
                  ? Math.round((sonBajarildi / matritsaKitoblari.length) * 100)
                  : 0;

                return (
                  <tr key={student.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-5 py-3.5 sticky left-0 bg-zinc-950 backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400 uppercase shrink-0">
                          {student.name.charAt(0)}
                        </div>
                        <span className="font-medium text-zinc-200 truncate max-w-[130px]">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-zinc-400 whitespace-nowrap">
                        {guruh?.groupName ?? '—'}
                      </span>
                    </td>
                    {matritsaKitoblari.map((inv, i) => {
                      const katakHolati = holatlar[i];
                      const cfg         = KATAK_KONFIGURATSIYA[katakHolati];
                      const katakKaliti = `${student.id}-${inv.id}`;

                      return (
                        <td
                          key={inv.id}
                          className="px-4 py-3.5 text-center relative"
                          onMouseEnter={() => setHovered(katakKaliti)}
                          onMouseLeave={() => setHovered(null)}
                        >
                          <span className={`w-3 h-3 rounded-full inline-block ${cfg.dot}`} />
                          {hovered === katakKaliti && (
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
                      <span className={`text-[12px] font-bold ${foiz === 100 ? 'text-emerald-400' : foiz > 50 ? 'text-blue-400' : 'text-amber-500'}`}>
                        {foiz}%
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
