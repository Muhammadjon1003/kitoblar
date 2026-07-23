/**
 * views/ManagerView/NarxSozlamalari.tsx
 * Manager can set the global sotuv narxi (selling price).
 * Every new order created after a change will use the new price.
 */

import { useState, useEffect } from 'react';
import { Settings, Save, TrendingUp, Clock, Info, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { uzs } from '../../components/ui';

const API = 'https://kitoblar-seven.vercel.app';

export default function NarxSozlamalari() {
  const { sotuvNarxi, refreshSettings, fireToast } = useApp();

  const [inputVal, setInputVal] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch full settings (including updatedAt) on mount
  useEffect(() => {
    fetch(`${API}/backend/settings`)
      .then(r => r.json())
      .then(d => {
        setInputVal(String(d.sotuvNarxi ?? 0));
        setLastUpdated(d.updatedAt ? new Date(d.updatedAt).toLocaleString('uz-UZ') : null);
      })
      .catch(console.warn);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(inputVal);
    if (isNaN(val) || val < 0) {
      fireToast("Iltimos, to'g'ri narx kiriting.", 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/backend/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sotuvNarxi: val }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setLastUpdated(new Date(data.updatedAt).toLocaleString('uz-UZ'));
      await refreshSettings();
      fireToast(`Sotuv narxi muvaffaqiyatli yangilandi: ${uzs(val)}`);
    } catch (err: any) {
      fireToast(`Xatolik: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const preview = parseFloat(inputVal);
  const hasPreview = !isNaN(preview) && preview > 0;

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6 bg-slate-50">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Narx Sozlamalari</h2>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Yangi buyurtmalar uchun kitob sotuv narxini belgilash</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Current active price card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4 pointer-events-none">
            <TrendingUp className="w-48 h-48" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-blue-100 text-xs font-bold uppercase tracking-wider mb-2">
              <TrendingUp className="w-4 h-4" />
              <span>Hozirgi sotuv narxi</span>
            </div>
            <p className="text-3xl font-black font-mono tracking-tight">
              {sotuvNarxi > 0 ? uzs(sotuvNarxi) : <span className="text-blue-200 text-xl font-sans">Belgilanmagan</span>}
            </p>
          </div>
          {lastUpdated && (
            <p className="text-[11px] text-blue-100/80 mt-4 flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5" /> Oxirgi o'zgartirilgan vaqt: <span className="font-bold">{lastUpdated}</span>
            </p>
          )}
        </div>

        {/* How it works info card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" /> Qanday ishlaydi?
            </p>
            <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                Narx o'zgartirilgan paytdan boshlab yaratilgan barcha yangi buyurtmalarga yangi narx qo'llanadi.
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0 mt-1.5" />
                Mavjud buyurtmalar o'z narxini saqlab qoladi — ular o'zgarmaydi.
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0 mt-1.5" />
                Logistika va Kassa tomonidan kitob qabul qilish vaqtida ushbu standart narx avto-to'ldiriladi.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Set new price form */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 max-w-lg">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-blue-600" />
          Yangi sotuv narxini belgilash
        </h3>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              Standart sotuv narxi (so'm)
            </label>
            <input
              type="number"
              min="0"
              step="500"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="Masalan: 75000"
              className="w-full h-12 px-4 text-lg font-bold text-slate-800 bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none rounded-xl transition-colors font-mono shadow-inner"
              autoFocus
            />
          </div>

          {/* Live preview */}
          {hasPreview && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-150 rounded-xl text-xs space-y-1">
              <p className="text-blue-700 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Narx ko'rinishi:
              </p>
              <p className="text-slate-700 font-medium">
                Yangi yaratilgan buyurtmalarda talaba to'laydi:{' '}
                <span className="font-mono font-bold text-blue-700">{uzs(preview)}</span>
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            {saving ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saqlanmoqda...</>
            ) : (
              <><Save className="w-4 h-4" /> Narxni saqlash</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
