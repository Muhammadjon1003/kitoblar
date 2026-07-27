/**
 * components/BekorQilishModali.tsx
 * Shared modal for prompting custom cancellation reason/note when cancelling orders.
 */

import { useState } from 'react';
import { XCircle, X } from 'lucide-react';

interface BekorQilishModaliProps {
  title?: string;
  targetName?: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export default function BekorQilishModali({
  title = "Buyurtmani Bekor Qilish Sababi",
  targetName,
  onClose,
  onConfirm,
}: BekorQilishModaliProps) {
  const [reason, setReason] = useState('');
  const [xato, setXato]     = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setXato("Iltimos, bekor qilish sababi yoki izohini kiriting.");
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-red-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            <h3 className="text-base font-bold">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/15 text-white transition-colors">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {targetName && (
            <p className="text-xs text-slate-600 font-medium">
              <strong className="text-slate-800">"{targetName}"</strong> buyurtmasini bekor qilish sababini kiritishingiz shart:
            </p>
          )}

          <div>
            <label className="sb-label">Bekor qilish sababi / Izoh</label>
            <textarea
              rows={3}
              className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl p-3 focus:border-red-500 focus:outline-none leading-relaxed"
              placeholder="masalan: Kassir adashib kiritgan / Talaba o'qishni to'xtatgan / Boshqa sabab"
              value={reason}
              onChange={e => { setReason(e.target.value); setXato(''); }}
              autoFocus
            />
          </div>

          {xato && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
              {xato}
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="sb-btn-secondary flex-1 text-xs">
              Orqaga
            </button>
            <button type="submit" className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm flex-1">
              Bekor qilish va Saqlash
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
