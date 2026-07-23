/**
 * views/CashierView/StudentModals.tsx — O'zbek tili
 * Live API-connected: no mock data. POST to backend → refresh context state.
 */

import { useState } from 'react';
import { FolderPlus, Users, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ModalShell } from '../../components/ui';

const API = 'https://kitoblar-seven.vercel.app';

// ─── Create Group Modal ────────────────────────────────────────────────────────

export function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const { fireToast, refreshGroups, users, teachers } = useApp();

  const teacherOptions = Array.from(
    new Set([
      ...users.filter(u => u.role === 'TEACHER').map(u => u.fullName),
      ...teachers.map(t => t.name),
    ])
  ).filter(Boolean);

  const [nom,            setNom]            = useState('');
  const [oqituvchi,     setOqituvchi]       = useState('');
  const [kategoriya,     setKategoriya]     = useState('');
  const [boshlanish,    setBoshlanish]      = useState('');
  const [tugash,        setTugash]          = useState('');
  const [kunlar,        setKunlar]          = useState(30);
  const [yuklanyapti,   setYuklanyapti]     = useState(false);
  const [xato,          setXato]            = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim())       { setXato('Guruh nomi majburiy.'); return; }
    if (!oqituvchi.trim()) { setXato("O'qituvchi majburiy."); return; }

    setYuklanyapti(true);
    setXato('');
    try {
      const res = await fetch(`${API}/backend/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupName: nom.trim(),
          teacherName: oqituvchi.trim(),
          subjectCategory: kategoriya.trim(),
          startDate: boshlanish,
          endDate: tugash,
          orderIntervalDays: kunlar,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Server xatosi yuz berdi.');
      }

      await refreshGroups();
      fireToast(`Guruh "${nom.trim()}" muvaffaqiyatli yaratildi.`);
      onClose();
    } catch (err: any) {
      setXato(err.message ?? 'Tarmoq xatosi. Qayta urinib ko\'ring.');
    } finally {
      setYuklanyapti(false);
    }
  };

  return (
    <ModalShell title="Yangi guruh yaratish" subtitle="Ma'lumotlarni kiriting va saqlang" icon={FolderPlus} onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

        {/* Group Name */}
        <div>
          <label className="sb-label">Guruh nomi</label>
          <input
            className="sb-input" placeholder="masalan: Fizika-Ilg'or"
            value={nom} onChange={e => { setNom(e.target.value); setXato(''); }}
            autoFocus
          />
        </div>

        {/* Teacher Selection Dropdown */}
        <div>
          <label className="sb-label">Mas'ul o'qituvchi</label>
          <div className="relative">
            <select
              className="sb-input appearance-none pr-8 font-semibold text-slate-800"
              value={oqituvchi}
              onChange={e => { setOqituvchi(e.target.value); setXato(''); }}
            >
              <option value="">O'qituvchini tanlang...</option>
              {teacherOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Subject Category */}
        <div>
          <label className="sb-label">Fan / kategoriya</label>
          <input
            className="sb-input" placeholder="masalan: Matematika"
            value={kategoriya} onChange={e => setKategoriya(e.target.value)}
          />
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="sb-label">Boshlanish sanasi</label>
            <input type="date" className="sb-input" value={boshlanish} onChange={e => setBoshlanish(e.target.value)} />
          </div>
          <div>
            <label className="sb-label">Tugash sanasi</label>
            <input type="date" className="sb-input" value={tugash} onChange={e => setTugash(e.target.value)} />
          </div>
        </div>

        {/* Interval */}
        <div>
          <label className="sb-label">Buyurtma intervali (kunlar)</label>
          <input
            type="number" min={1} className="sb-input" value={kunlar}
            onChange={e => setKunlar(parseInt(e.target.value) || 30)}
          />
        </div>

        {/* Error banner */}
        {xato && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-300 rounded-xl text-[12px] font-semibold text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" /> {xato}
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} disabled={yuklanyapti} className="sb-btn-secondary flex-1 text-xs">
            Bekor qilish
          </button>
          <button type="submit" disabled={yuklanyapti} className="sb-btn-primary flex-1 flex items-center justify-center gap-1.5 text-xs">
            {yuklanyapti
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saqlanmoqda...</>
              : <><FolderPlus className="w-3.5 h-3.5" /> Guruh yaratish</>
            }
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Add Student Modal ─────────────────────────────────────────────────────────

export function AddStudentModal({ onClose }: { onClose: () => void }) {
  const { groups, fireToast, refreshStudents } = useApp();

  const [ism,           setIsm]           = useState('');
  const [telefon,       setTelefon]       = useState('');
  const [guruhId,       setGuruhId]       = useState(groups[0]?.id ?? '');
  const [yuklanyapti,   setYuklanyapti]   = useState(false);
  const [xato,          setXato]          = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ism.trim())   { setXato("To'liq ism majburiy."); return; }
    if (!guruhId)      { setXato('Guruh tanlang.'); return; }

    setYuklanyapti(true);
    setXato('');
    try {
      const res = await fetch(`${API}/backend/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: ism.trim(),
          phoneNumber: telefon.trim(),
          groupId: guruhId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Server xatosi yuz berdi.');
      }

      await refreshStudents();
      fireToast(`"${ism.trim()}" muvaffaqiyatli ro'yxatga olindi.`);
      onClose();
    } catch (err: any) {
      setXato(err.message ?? "Tarmoq xatosi. Qayta urinib ko'ring.");
    } finally {
      setYuklanyapti(false);
    }
  };

  return (
    <ModalShell title="Yangi talaba qo'shish" subtitle="Ro'yxatga olish — ma'lumotlar bazasiga saqlanadi" icon={Users} onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

        {/* Full name */}
        <div>
          <label className="sb-label">To'liq ismi</label>
          <input
            className="sb-input" placeholder="masalan: Jasur Bek Toshmatov"
            value={ism} onChange={e => { setIsm(e.target.value); setXato(''); }}
            autoFocus
          />
        </div>

        {/* Phone number */}
        <div>
          <label className="sb-label">Telefon raqami (ixtiyoriy)</label>
          <input
            className="sb-input" placeholder="+998 90 123 45 67"
            value={telefon} onChange={e => setTelefon(e.target.value)}
            type="tel"
          />
        </div>

        {/* Group assignment */}
        <div>
          <label className="sb-label">Guruhga biriktirish</label>
          {groups.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[12px] font-semibold text-amber-700">
              Hech qanday guruh topilmadi. Avval guruh yarating.
            </div>
          ) : (
            <div className="relative">
              <select className="sb-input appearance-none pr-8" value={guruhId} onChange={e => setGuruhId(e.target.value)}>
                {groups.map(g => <option key={g.id} value={g.id}>{g.groupName}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] space-y-1 text-slate-500">
          <p className="font-semibold text-blue-700 text-[10px] uppercase tracking-wider mb-1.5">Avtomatik belgilanadi</p>
          <div className="flex justify-between">
            <span className="font-mono text-slate-600">joined_at</span>
            <span>{new Date().toISOString().slice(0, 10)}</span>
          </div>
          <p className="text-[10px] text-blue-600 pt-2 border-t border-blue-100 mt-1 leading-relaxed">
            Ma'lumotlar Neon PostgreSQL bazasiga darhol saqlanadi.
          </p>
        </div>

        {/* Error banner */}
        {xato && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-300 rounded-xl text-[12px] font-semibold text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" /> {xato}
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} disabled={yuklanyapti} className="sb-btn-secondary flex-1 text-xs">
            Bekor qilish
          </button>
          <button type="submit" disabled={yuklanyapti || groups.length === 0} className="sb-btn-primary flex-1 flex items-center justify-center gap-1.5 text-xs">
            {yuklanyapti
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saqlanmoqda...</>
              : <><Users className="w-3.5 h-3.5" /> Talabani ro'yxatga olish</>
            }
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
