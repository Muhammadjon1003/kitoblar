/**
 * views/LogisticsView/components/KomplektSubBookReturnModal.tsx
 * Modal for returning partial or full sub-textbook sets to physical warehouse stock.
 */

import { useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import type { Order } from '../../../types';

export default function KomplektSubBookReturnModal({
  order,
  onClose,
  onConfirm,
}: {
  order: Order;
  onClose: () => void;
  onConfirm: (selectedFileIds: string[], reason: string) => void;
}) {
  const { getInventoryItem, getStudentName } = useApp();
  const inv = getInventoryItem(order.bookId);

  let setFiles: Array<{ name: string; fileId: string }> = [];
  if (inv?.isSet && inv?.setDetails) {
    try { setFiles = JSON.parse(inv.setDetails); } catch (e) {}
  }

  const [selectedFileIds, setSelectedFileIds] = useState<string[]>(
    setFiles.map(f => f.fileId)
  );
  const [reason, setReason] = useState('');

  const toggleFile = (fileId: string) => {
    setSelectedFileIds(prev =>
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl z-10 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-purple-700 font-bold text-base">
            <RotateCcw className="w-5 h-5" />
            <h3>Komplekt Darsliklarini Qaytarish</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl">
          <p className="text-xs font-bold text-purple-900">{getStudentName(order.studentId)}</p>
          <p className="text-[11px] text-purple-700 mt-0.5">
            Komplekt: <span className="font-bold">{inv?.title}</span> ({setFiles.length} ta darslik)
          </p>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-2">
            Qaysi darsliklar omborga qaytarildi? (Belgilang):
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {setFiles.map((file, idx) => (
              <label
                key={file.fileId}
                className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                  selectedFileIds.includes(file.fileId)
                    ? 'border-purple-500 bg-purple-50/50 text-purple-900 font-bold'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedFileIds.includes(file.fileId)}
                  onChange={() => toggleFile(file.fileId)}
                  className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                />
                <span className="text-xs">{idx + 1}. {file.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Qaytarish sababi / Izoh:</label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Masalan: Kursni tugatdi / 1 ta darslik yo'qolgan"
            className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">
            Bekor qilish
          </button>
          <button
            onClick={() => onConfirm(selectedFileIds, reason)}
            disabled={selectedFileIds.length === 0}
            className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl shadow-md flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Omborga Qaytarish ({selectedFileIds.length} ta)
          </button>
        </div>
      </div>
    </div>
  );
}
