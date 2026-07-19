/**
 * views/CashierView/StudentModals.tsx — O'zbek tili
 */

import { useState } from 'react';
import { FolderPlus, Users, ChevronDown } from 'lucide-react';
import { useApp, SEED_TEACHERS } from '../../context/AppContext';
import { ModalShell } from '../../components/ui';

export function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const { createGroup } = useApp();
  const [nom,      setNom]      = useState('');
  const [oqituvchi, setOqituvchi] = useState(SEED_TEACHERS[0].id);
  const [boshlanish, setBoshlanish] = useState('');
  const [tugash,   setTugash]   = useState('');
  const [kunlar,   setKunlar]   = useState(30);
  const [xato,     setXato]     = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) { setXato('Guruh nomi majburiy.'); return; }
    if (!boshlanish || !tugash) { setXato('Sanalar majburiy.'); return; }
    createGroup(nom.trim(), oqituvchi, boshlanish, tugash, kunlar);
    onClose();
  };

  return (
    <ModalShell title="Yangi guruh yaratish" subtitle="O'qituvchi biriktiring va jadval belgilang" icon={FolderPlus} onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        <div>
          <label className="sb-label">Guruh nomi</label>
          <input className="sb-input" placeholder="masalan: Fizika-Ilg'or" value={nom}
            onChange={e => { setNom(e.target.value); setXato(''); }} />
          {xato && <p className="text-[11px] text-red-500 mt-1">{xato}</p>}
        </div>

        <div>
          <label className="sb-label">Mas'ul o'qituvchi</label>
          <div className="relative">
            <select className="sb-input appearance-none pr-8" value={oqituvchi} onChange={e => setOqituvchi(e.target.value)}>
              {SEED_TEACHERS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

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

        <div>
          <label className="sb-label">Buyurtma intervali (kunlar)</label>
          <input type="number" min={1} className="sb-input" value={kunlar}
            onChange={e => setKunlar(parseInt(e.target.value) || 30)} />
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="sb-btn-secondary flex-1 text-xs">Bekor qilish</button>
          <button type="submit" className="sb-btn-primary flex-1 flex items-center justify-center gap-1.5 text-xs">
            <FolderPlus className="w-3.5 h-3.5" /> Guruh yaratish
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function AddStudentModal({ onClose }: { onClose: () => void }) {
  const { groups, onboardStudent } = useApp();
  const [ism,     setIsm]     = useState('');
  const [guruhId, setGuruhId] = useState(groups[0]?.id ?? '');
  const [xato,    setXato]    = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ism.trim()) { setXato('To\'liq ism majburiy.'); return; }
    if (!guruhId) { setXato('Guruh tanlang.'); return; }
    onboardStudent(ism.trim(), guruhId);
    onClose();
  };

  return (
    <ModalShell title="Yangi talaba qo'shish" subtitle="Ro'yxatga olish — o'qituvchi xabardor qilinadi" icon={Users} onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        <div>
          <label className="sb-label">To'liq ismi</label>
          <input className="sb-input" placeholder="masalan: Jasur Bek Toshmatov" value={ism}
            onChange={e => { setIsm(e.target.value); setXato(''); }} autoFocus />
          {xato && <p className="text-[11px] text-red-500 mt-1">{xato}</p>}
        </div>

        <div>
          <label className="sb-label">Guruhga biriktirish</label>
          <div className="relative">
            <select className="sb-input appearance-none pr-8" value={guruhId} onChange={e => setGuruhId(e.target.value)}>
              {groups.map(g => <option key={g.id} value={g.id}>{g.groupName}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] space-y-1 text-slate-500">
          <p className="font-semibold text-blue-700 text-[10px] uppercase tracking-wider mb-1.5">Avtomatik belgilanadi</p>
          <div className="flex justify-between">
            <span className="font-mono text-slate-600">created_at</span>
            <span>{new Date().toISOString().slice(0, 10)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-mono text-slate-600">holat</span>
            <span>Toza / Faolsiz</span>
          </div>
          <p className="text-[10px] text-blue-600 pt-2 border-t border-blue-100 mt-1 leading-relaxed">
            Guruh o'qituvchisiga buyurtma berish haqida bildirishnoma yuboriladi.
          </p>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="sb-btn-secondary flex-1 text-xs">Bekor qilish</button>
          <button type="submit" className="sb-btn-primary flex-1 flex items-center justify-center gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5" /> Talabani ro'yxatga olish
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
