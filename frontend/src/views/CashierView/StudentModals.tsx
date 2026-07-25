import { useState, useEffect } from 'react';
import { FolderPlus, Users, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ModalShell } from '../../components/ui';
import type { Group } from '../../types';

const API = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

// ─── Create Group Modal ────────────────────────────────────────────────────────

export function CreateGroupModal({ onClose, lockedTeacherName, onSuccess }: { onClose: () => void; lockedTeacherName?: string; onSuccess?: (createdGroup: Group) => void }) {
  const { fireToast, refreshGroups, users, teachers, currentUser } = useApp();

  const initialTeacher = lockedTeacherName || (currentUser?.role === 'TEACHER' ? currentUser.fullName : '');
  const isTeacherLocked = !!initialTeacher;

  const teacherOptions = Array.from(
    new Set([
      ...users.filter(u => u.role === 'TEACHER').map(u => u.fullName),
      ...teachers.map(t => t.name),
    ])
  ).filter(Boolean);

  const [nom,            setNom]            = useState('');
  const [oqituvchi,     setOqituvchi]       = useState(initialTeacher);
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

      const createdGroup: Group = await res.json();
      await refreshGroups();
      fireToast(`Guruh "${nom.trim()}" muvaffaqiyatli yaratildi.`);
      if (onSuccess) onSuccess(createdGroup);
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

        {/* Teacher Selection Dropdown / Locked Field */}
        <div>
          <label className="sb-label">Mas'ul o'qituvchi</label>
          {isTeacherLocked ? (
            <input
              className="sb-input bg-slate-100 font-bold text-slate-800 border-slate-300 cursor-not-allowed"
              value={oqituvchi}
              disabled
            />
          ) : (
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
          )}
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

// ─── Bulk Add Students Modal (Standalone or Tabbed) ───────────────────────────

export function BulkAddStudentModal({ defaultGroupId, allowedGroups, onClose, onSuccess }: { defaultGroupId?: string; allowedGroups?: Group[]; onClose: () => void; onSuccess?: (groupId: string) => void }) {
  const { groups, currentUser, fireToast, refreshStudents, refreshGroups } = useApp();

  const availableGroups = allowedGroups ?? (currentUser?.role === 'TEACHER' && currentUser.fullName ? groups.filter(g => {
    const uLower = currentUser.fullName.toLowerCase().trim();
    const gLower = g.teacherName.toLowerCase().trim();
    return gLower === uLower || (uLower.length > 2 && gLower.includes(uLower)) || (gLower.length > 2 && uLower.includes(gLower));
  }) : groups);

  const [guruhId, setGuruhId]       = useState(defaultGroupId ?? availableGroups[0]?.id ?? '');
  const [namesText, setNamesText]   = useState('');
  const [yuklanyapti, setYuklanyapti] = useState(false);
  const [xato, setXato]             = useState('');

  // Sync guruhId when defaultGroupId or availableGroups finishes loading
  useEffect(() => {
    if (defaultGroupId && availableGroups.some(g => g.id === defaultGroupId)) {
      setGuruhId(defaultGroupId);
    } else if (availableGroups.length > 0 && (!guruhId || !availableGroups.some(g => g.id === guruhId))) {
      setGuruhId(availableGroups[0].id);
    }
  }, [defaultGroupId, availableGroups]);

  // Parse lines into clean student names
  const parsedNames = namesText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guruhId) {
      setXato('Iltimos, guruh tanlang.');
      return;
    }

    if (parsedNames.length === 0) {
      setXato("Kamida bitta talaba ismini kiriting.");
      return;
    }

    setYuklanyapti(true);
    setXato('');
    try {
      const res = await fetch(`${API}/backend/students/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: guruhId,
          names: parsedNames,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Server xatosi yuz berdi.');
      }

      const data = await res.json();
      await Promise.all([refreshStudents(), refreshGroups()]);
      fireToast(`${data.count ?? parsedNames.length} ta talaba "${data.groupName || 'guruh'}"ga muvaffaqiyatli qo'shildi.`);
      if (onSuccess) onSuccess(guruhId);
      onClose();
    } catch (err: any) {
      setXato(err.message ?? "Tarmoq xatosi. Qayta urinib ko'ring.");
    } finally {
      setYuklanyapti(false);
    }
  };

  const selectedGroup = availableGroups.find(g => g.id === guruhId);

  return (
    <ModalShell
      title="Guruhga ommaviy talabalar qo'shish"
      subtitle="Har bir qatorda bittadan talaba ismini kiriting"
      icon={Users}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        {/* Group selection */}
        <div>
          <label className="sb-label">Qaysi guruhga qo'shilsin?</label>
          {availableGroups.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[12px] font-semibold text-amber-700">
              Hech qanday guruh topilmadi. Avval guruh yarating.
            </div>
          ) : (
            <div className="relative">
              <select
                className="sb-input appearance-none pr-8 font-bold text-slate-800"
                value={guruhId}
                onChange={e => { setGuruhId(e.target.value); setXato(''); }}
              >
                {availableGroups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.groupName} ({g.teacherName})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Textarea for bulk names */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="sb-label mb-0">Talabalar ro'yxati (F.I.SH)</label>
            <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-md">
              {parsedNames.length} ta aniqlandi
            </span>
          </div>
          <textarea
            rows={7}
            className="w-full text-xs font-medium text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-300 rounded-xl p-3 focus:border-blue-500 focus:outline-none transition-colors font-mono leading-relaxed"
            placeholder={`Masalan:\nJasur Toshmatov\nAli Valiyev\nFeruza Karimova\nAnvar Nabiyev`}
            value={namesText}
            onChange={e => { setNamesText(e.target.value); setXato(''); }}
            autoFocus
          />
          <p className="text-[10px] text-slate-400 font-semibold mt-1">
            * Telegram yoki Excel/Word fayllardan ro'yxatni nusxalab (Ctrl+V) joylashtirishingiz mumkin.
          </p>
        </div>

        {/* Info summary */}
        {selectedGroup && parsedNames.length > 0 && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1 text-emerald-800">
            <p className="font-bold">Tayyor:</p>
            <p className="text-[11px]">
              <strong className="font-bold">{parsedNames.length} ta</strong> yangi talaba{' '}
              <strong className="font-bold">"{selectedGroup.groupName}"</strong> guruhiga qo'shiladi.
            </p>
          </div>
        )}

        {/* Error banner */}
        {xato && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-300 rounded-xl text-[12px] font-semibold text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" /> {xato}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} disabled={yuklanyapti} className="sb-btn-secondary flex-1 text-xs">
            Bekor qilish
          </button>
          <button
            type="submit"
            disabled={yuklanyapti || availableGroups.length === 0 || parsedNames.length === 0}
            className="sb-btn-primary flex-1 flex items-center justify-center gap-1.5 text-xs disabled:opacity-40"
          >
            {yuklanyapti ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Qo'shilmoqda...</>
            ) : (
              <><Users className="w-3.5 h-3.5" /> {parsedNames.length > 0 ? `${parsedNames.length} ta talabani qo'shish` : 'Ommaviy saqlash'}</>
            )}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Add Student Modal (Single & Tabbed) ───────────────────────────────────────

export function AddStudentModal({ defaultGroupId, allowedGroups, onClose, onSuccess }: { defaultGroupId?: string; allowedGroups?: Group[]; onClose: () => void; onSuccess?: (groupId: string) => void }) {
  const { groups, currentUser, fireToast, refreshStudents, refreshGroups } = useApp();

  const availableGroups = allowedGroups ?? (currentUser?.role === 'TEACHER' && currentUser.fullName ? groups.filter(g => {
    const uLower = currentUser.fullName.toLowerCase().trim();
    const gLower = g.teacherName.toLowerCase().trim();
    return gLower === uLower || (uLower.length > 2 && gLower.includes(uLower)) || (gLower.length > 2 && uLower.includes(gLower));
  }) : groups);

  const [mode, setMode]             = useState<'single' | 'bulk'>('single');
  const [ism,           setIsm]           = useState('');
  const [telefon,       setTelefon]       = useState('');
  const [guruhId,       setGuruhId]       = useState(defaultGroupId ?? availableGroups[0]?.id ?? '');
  const [yuklanyapti,   setYuklanyapti]   = useState(false);
  const [xato,          setXato]          = useState('');

  // Sync guruhId when defaultGroupId or availableGroups finishes loading
  useEffect(() => {
    if (defaultGroupId && availableGroups.some(g => g.id === defaultGroupId)) {
      setGuruhId(defaultGroupId);
    } else if (availableGroups.length > 0 && (!guruhId || !availableGroups.some(g => g.id === guruhId))) {
      setGuruhId(availableGroups[0].id);
    }
  }, [defaultGroupId, availableGroups]);

  // Bulk mode state
  const [namesText, setNamesText]   = useState('');

  const parsedNames = namesText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guruhId) { setXato('Guruh tanlang.'); return; }

    setYuklanyapti(true);
    setXato('');

    try {
      if (mode === 'single') {
        if (!ism.trim()) { setXato("To'liq ism majburiy."); setYuklanyapti(false); return; }

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

        await Promise.all([refreshStudents(), refreshGroups()]);
        fireToast(`"${ism.trim()}" muvaffaqiyatli ro'yxatga olindi.`);
        if (onSuccess) onSuccess(guruhId);
        onClose();
      } else {
        if (parsedNames.length === 0) {
          setXato("Kamida bitta talaba ismini kiriting.");
          setYuklanyapti(false);
          return;
        }

        const res = await fetch(`${API}/backend/students/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId: guruhId,
            names: parsedNames,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? 'Server xatosi yuz berdi.');
        }

        const data = await res.json();
        await Promise.all([refreshStudents(), refreshGroups()]);
        fireToast(`${data.count ?? parsedNames.length} ta talaba "${data.groupName || 'guruh'}"ga muvaffaqiyatli qo'shildi.`);
        if (onSuccess) onSuccess(guruhId);
        onClose();
      }
    } catch (err: any) {
      setXato(err.message ?? "Tarmoq xatosi. Qayta urinib ko'ring.");
    } finally {
      setYuklanyapti(false);
    }
  };

  return (
    <ModalShell title="Talabalarni guruhga qo'shish" subtitle="Yakka yoki ommaviy ro'yxat bo'yicha kiritish" icon={Users} onClose={onClose}>
      <div className="px-6 pt-4 pb-1 flex items-center gap-2 border-b border-slate-100">
        <button
          type="button"
          onClick={() => { setMode('single'); setXato(''); }}
          className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${
            mode === 'single'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Yakka qo'shish
        </button>
        <button
          type="button"
          onClick={() => { setMode('bulk'); setXato(''); }}
          className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${
            mode === 'bulk'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Ommaviy qo'shish (Ko'p talaba)
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        {/* Group assignment */}
        <div>
          <label className="sb-label">Guruhga biriktirish</label>
          {availableGroups.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[12px] font-semibold text-amber-700">
              Hech qanday guruh topilmadi. Avval guruh yarating.
            </div>
          ) : (
            <div className="relative">
              <select className="sb-input appearance-none pr-8 font-bold text-slate-800" value={guruhId} onChange={e => setGuruhId(e.target.value)}>
                {availableGroups.map(g => <option key={g.id} value={g.id}>{g.groupName} ({g.teacherName})</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          )}
        </div>

        {mode === 'single' ? (
          <>
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
          </>
        ) : (
          /* Bulk Mode */
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="sb-label mb-0">Talabalar ro'yxati (Har bir qatorda bitta)</label>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-md">
                {parsedNames.length} ta aniqlandi
              </span>
            </div>
            <textarea
              rows={6}
              className="w-full text-xs font-medium text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-300 rounded-xl p-3 focus:border-blue-500 focus:outline-none transition-colors font-mono leading-relaxed"
              placeholder={`Masalan:\nJasur Toshmatov\nAli Valiyev\nFeruza Karimova\nAnvar Nabiyev`}
              value={namesText}
              onChange={e => { setNamesText(e.target.value); setXato(''); }}
              autoFocus
            />
            <p className="text-[10px] text-slate-400 font-semibold mt-1">
              * Telegram yoki Excel'dan talabalar ro'yxatini ko'chirib (Ctrl+V) pastga joylashtiring.
            </p>
          </div>
        )}

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
            {yuklanyapti ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saqlanmoqda...</>
            ) : mode === 'single' ? (
              <><Users className="w-3.5 h-3.5" /> Talabani ro'yxatga olish</>
            ) : (
              <><Users className="w-3.5 h-3.5" /> {parsedNames.length > 0 ? `${parsedNames.length} ta talabani saqlash` : 'Ommaviy saqlash'}</>
            )}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

