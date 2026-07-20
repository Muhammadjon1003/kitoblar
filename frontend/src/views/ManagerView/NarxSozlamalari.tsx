/**
 * views/ManagerView/NarxSozlamalari.tsx
 * Manager can set the global sotuv narxi (selling price).
 * Every new order created after a change will use the new price.
 */

import { useState, useEffect } from 'react';
import { Settings, Save, TrendingUp, Clock } from 'lucide-react';
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
    <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6 bg-zinc-950">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Settings className="w-4.5 h-4.5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-zinc-100">Narx Sozlamalari</h2>
          <p className="text-[11px] text-zinc-400 mt-0.5">Yangi buyurtmalar uchun kitob sotuv narxini belgilang</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Current active price card */}
        <div className="sb-card p-5 flex items-center gap-4 border-amber-900/30">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              Hozirgi sotuv narxi
            </p>
            <p className="text-2xl font-black text-amber-400 font-mono">
              {sotuvNarxi > 0 ? uzs(sotuvNarxi) : <span className="text-zinc-500 text-base">Belgilanmagan</span>}
            </p>
            {lastUpdated && (
              <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" /> Oxirgi o'zgarish: {lastUpdated}
              </p>
            )}
          </div>
        </div>

        {/* How it works info */}
        <div className="sb-card p-5 border-zinc-700/40">
          <p className="text-xs font-bold text-zinc-300 mb-2">Qanday ishlaydi?</p>
          <ul className="space-y-1.5 text-[11px] text-zinc-400">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1" />
              Narx o'zgartirilgan paytdan boshlab yaratilgan barcha yangi buyurtmalarga yangi narx qo'llanadi.
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 shrink-0 mt-1" />
              Mavjud buyurtmalar o'z narxini saqlab qoladi — ular o'zgarmaydi.
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 shrink-0 mt-1" />
              Tan narxi (bookCost) kassa tomonidan kitobi qabul qilinganida alohida kiritiladi.
            </li>
          </ul>
        </div>
      </div>

      {/* Set new price form */}
      <div className="sb-card p-6 max-w-md">
        <p className="text-sm font-bold text-zinc-100 mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-amber-400" />
          Yangi sotuv narxini belgilash
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Sotuv narxi (so'm)
            </label>
            <input
              type="number"
              min="0"
              step="500"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="Masalan: 75000"
              className="w-full h-12 px-4 text-lg font-bold text-zinc-100 bg-zinc-800 border-2 border-zinc-600 focus:border-amber-500 focus:outline-none rounded-xl transition-colors font-mono"
              autoFocus
            />
          </div>

          {/* Live preview */}
          {hasPreview && (
            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-[11px] space-y-1">
              <p className="text-amber-400 font-semibold">Ko'rinish:</p>
              <p className="text-zinc-300">
                Yangi buyurtmalar → talaba to'laydi:{' '}
                <span className="font-mono font-bold text-amber-400">{uzs(preview)}</span>
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-700 text-zinc-950 font-black text-sm rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            {saving
              ? <><span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" /> Saqlanmoqda...</>
              : <><Save className="w-4 h-4" /> Narxni saqlash</>
            }
          </button>
        </form>
      </div>
    </div>
  );
}
