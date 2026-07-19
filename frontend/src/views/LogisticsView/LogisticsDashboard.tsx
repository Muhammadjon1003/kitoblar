/**
 * views/LogisticsView/LogisticsDashboard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Logistics workspace router + Inbound Register sub-page.
 * Routes between: WarehouseInventory / SupplierRouting / Inbound form.
 */

import { useState } from 'react';
import { UploadCloud, PlusCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import WarehouseInventory from './WarehouseInventory';
import SupplierRouting from './SupplierRouting';

// ─── Inbound Ingestion Form ────────────────────────────────────────────────────

function InboundRegister() {
  const { addInventoryItem } = useApp();
  const [title,   setTitle]   = useState('');
  const [cost,    setCost]    = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [simFile, setSimFile] = useState<string | null>(null);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  /** Simulate Telegram file upload — generates a random tg_file_id */
  const simulateUpload = (fileName: string) => {
    const fakeId = `BQACAgIAAx_${fileName.slice(0, 5).replace(/\s|\./g, '').toLowerCase()}_${Math.random().toString(36).slice(2, 8)}`;
    setSimFile(fakeId);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) simulateUpload(file.name);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) simulateUpload(file.name);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim())          { setError('Title is required.'); return; }
    const costVal = parseFloat(cost);
    if (isNaN(costVal) || costVal < 0) { setError('Enter a valid procurement cost.'); return; }

    addInventoryItem(title.trim(), costVal);
    setSuccess(`"${title}" registered. tg_file_id generated and stored.`);
    setTitle('');
    setCost('');
    setSimFile(null);
    setError('');
    setTimeout(() => setSuccess(''), 4000);
  };

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      <div className="max-w-lg space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Inbound Book Registration</h2>
          <p className="text-[11px] text-zinc-500 mt-1">
            Register new textbooks with wholesale procurement cost. Drag-and-drop the PDF/file to simulate Telegram CDN upload and generate a <span className="font-mono">tg_file_id</span>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="sb-label">Book Title</label>
            <input className="sb-input" placeholder="e.g. Linear Algebra Volume 3" value={title}
              onChange={e => { setTitle(e.target.value); setError(''); }} />
          </div>

          <div>
            <label className="sb-label">Wholesale Procurement Cost (book_cost)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
              <input
                type="number" min="0" step="0.01" className="sb-input pl-7"
                placeholder="0.00" value={cost}
                onChange={e => { setCost(e.target.value); setError(''); }}
              />
            </div>
          </div>

          {/* Drag-and-drop Telegram upload zone */}
          <div>
            <label className="sb-label">Telegram File Upload (Simulated CDN)</label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                dragOver
                  ? 'border-blue-600 bg-blue-950/20'
                  : simFile
                  ? 'border-emerald-700 bg-emerald-950/10'
                  : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50'
              }`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input id="file-input" type="file" className="hidden" onChange={handleFileInput} />
              <UploadCloud className={`w-8 h-8 mx-auto mb-2 ${simFile ? 'text-emerald-400' : 'text-zinc-600'}`} />
              {simFile ? (
                <>
                  <p className="text-xs font-semibold text-emerald-400">File uploaded to Telegram CDN</p>
                  <p className="text-[10px] font-mono text-zinc-500 mt-1 break-all">{simFile}</p>
                  <p className="text-[10px] text-zinc-600 mt-1">tg_file_id will be auto-generated on registration</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-zinc-400">Drop PDF / DJVU file here, or click to browse</p>
                  <p className="text-[10px] text-zinc-600 mt-1">Simulates Telegram Bot API file upload — generates unique tg_file_id</p>
                </>
              )}
            </div>
          </div>

          {error   && <p className="text-[11px] text-red-400">{error}</p>}
          {success && (
            <div className="p-3 bg-emerald-950/30 border border-emerald-800 rounded-md text-[11px] text-emerald-400">
              {success}
            </div>
          )}

          <button type="submit" className="sb-btn-primary flex items-center gap-2 w-full justify-center">
            <PlusCircle className="w-4 h-4" />
            Register Book in Inventory
          </button>
        </form>

        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-md text-[10px] text-zinc-600 leading-relaxed">
          <strong className="text-zinc-400">TR § 4 Storage Policy:</strong> The application server stores zero binary data.
          Only the <span className="font-mono text-zinc-400">tg_file_id</span> string reference is persisted to the database.
          Telegram Cloud functions as the CDN, eliminating infrastructure storage costs entirely.
        </div>
      </div>
    </div>
  );
}

// ─── Logistics Dashboard Router ────────────────────────────────────────────────

export default function LogisticsDashboard() {
  const { activeSubPage } = useApp();

  if (activeSubPage === 'warehouse') return <WarehouseInventory />;
  if (activeSubPage === 'supplier')  return <SupplierRouting />;
  if (activeSubPage === 'inbound')   return <InboundRegister />;
  return null;
}
