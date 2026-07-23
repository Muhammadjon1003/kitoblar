/**
 * views/ManagerView/UserManagement.tsx — O'zbek tili
 * Menejer uchun xodimlar akkauntlari, login parollari va rollarini boshqarish sahifasi.
 */

import { useState } from 'react';
import { UserCheck, UserPlus, Trash2, Key, Shield, X, CheckCircle, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TableShell, Th, Td, EmptyState } from '../../components/ui';
import type { UserRole } from '../../types';

const ROLE_LABELS: Record<UserRole, { label: string; cls: string }> = {
  TEACHER:   { label: "O'qituvchi",         cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  CASHIER:   { label: 'Kassir (Moliyachi)', cls: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  LOGISTICS: { label: 'Logistika Admin',    cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  MANAGER:   { label: 'Bosh Menejer',       cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
};

function YangiXodimModali({ onClose }: { onClose: () => void }) {
  const { createUserAccount } = useApp();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role,     setRole]     = useState<UserRole>('CASHIER');
  const [saving,   setSaving]   = useState(false);
  const [xato,     setXato]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !password.trim()) {
      setXato("Barcha maydonlarni to'ldirish shart.");
      return;
    }

    setSaving(true);
    setXato('');

    try {
      const success = await createUserAccount({
        fullName: fullName.trim(),
        username: username.trim(),
        password: password.trim(),
        role,
      });

      if (success) {
        onClose();
      }
    } catch (err: any) {
      setXato(err.message || "Xodim biriktirishda xatolik yuz berdi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl z-10 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            <h3 className="text-base font-bold">Yangi Xodim Akkaunti Yaratish</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/15 text-white transition-colors">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {xato && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
              {xato}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">To'liq Ismi (F.I.SH)</label>
            <input
              type="text"
              value={fullName}
              onChange={e => { setFullName(e.target.value); setXato(''); }}
              placeholder="masalan: Kamola Mahmudova"
              required
              className="w-full h-10 px-3 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Foydalanuvchi nomi (Login)</label>
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setXato(''); }}
              placeholder="masalan: k.mahmudova"
              required
              className="w-full h-10 px-3 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Maxfiy Parol</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setXato(''); }}
              placeholder="••••••••"
              required
              className="w-full h-10 px-3 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Biriktiriluvchi Rol va Huquq</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as UserRole)}
              className="w-full h-10 px-3 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-none"
            >
              <option value="TEACHER">O'qituvchi (TEACHER)</option>
              <option value="CASHIER">Kassir (CASHIER)</option>
              <option value="LOGISTICS">Logistika Admin (LOGISTICS)</option>
              <option value="MANAGER">Bosh Menejer (MANAGER)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saqlanmoqda...
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  Akkauntni Saqlash
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

function ParolTahrirlashModali({ user, onClose }: { user: any; onClose: () => void }) {
  const { updateUserAccount } = useApp();

  const [fullName, setFullName] = useState(user.fullName);
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState<UserRole>(user.role);
  const [saving, setSaving]     = useState(false);
  const [xato, setXato]         = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setXato('');

    try {
      const patch: any = {};
      if (fullName.trim() !== user.fullName) patch.fullName = fullName.trim();
      if (password.trim()) patch.password = password.trim();
      if (role !== user.role) patch.role = role;

      if (Object.keys(patch).length === 0) {
        setXato("Hech qanday o'zgarish kiritilmadi.");
        setSaving(false);
        return;
      }

      const success = await updateUserAccount(user.id, patch);
      if (success) {
        onClose();
      }
    } catch (err: any) {
      setXato(err.message || "Tahrirlashda xatolik yuz berdi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl z-10 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            <h3 className="text-base font-bold">Xodim Paroli va Rolini Tahrirlash</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/15 text-white transition-colors">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {xato && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
              {xato}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">To'liq Ismi (F.I.SH)</label>
            <input
              type="text"
              value={fullName}
              onChange={e => { setFullName(e.target.value); setXato(''); }}
              required
              className="w-full h-10 px-3 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Foydalanuvchi nomi (Login)</label>
            <input
              type="text"
              value={user.username}
              disabled
              className="w-full h-10 px-3 text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-xl cursor-not-allowed font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">* Login nomini o'zgartirib bo'lmaydi.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Yangi Maxfiy Parol</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setXato(''); }}
              placeholder="O'zgartirmaslik uchun bo'sh qoldiring"
              className="w-full h-10 px-3 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Biriktiriluvchi Rol va Huquq</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as UserRole)}
              className="w-full h-10 px-3 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-none"
            >
              <option value="TEACHER">O'qituvchi (TEACHER)</option>
              <option value="CASHIER">Kassir (CASHIER)</option>
              <option value="LOGISTICS">Logistika Admin (LOGISTICS)</option>
              <option value="MANAGER">Bosh Menejer (MANAGER)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saqlanmoqda...
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  O'zgarishlarni Saqlash
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

export default function UserManagement() {
  const { users, deleteUserAccount } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser]         = useState<any | null>(null);
  const [searchQuery, setSearchQuery]   = useState('');

  const filteredUsers = users.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return u.fullName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6 bg-slate-50">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            Xodimlar Akkauntlari va Rollari Boshqaruvi
          </h2>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            Tizim foydalanuvchilariga rol biriktirish, yangi login/parol yaratish va ruxsatlarni cheklash
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Yangi Xodim Qo'shish
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Ism, login yoki rol bo'yicha..."
            className="w-full h-9 pl-9 pr-3 text-xs font-semibold text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
          <span>Jami xodimlar:</span>
          <span className="bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-md font-mono">{users.length} ta</span>
        </div>
      </div>

      {/* Users Table Shell */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-8">
            <EmptyState label={searchQuery ? `"${searchQuery}" bo'yicha xodim topilmadi.` : "Hozircha xodimlar ro'yxati bo'sh."} />
          </div>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>To'liq Ismi (F.I.SH)</Th>
                <Th>Login (Username)</Th>
                <Th>Biriktirilgan Rol</Th>
                <Th>Yaratilgan sana</Th>
                <Th right>Amallar</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user, idx) => {
                const roleMeta = ROLE_LABELS[user.role] ?? { label: user.role, cls: 'bg-slate-100 text-slate-800' };

                return (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    <Td mono>{idx + 1}</Td>
                    <Td>
                      <span className="font-bold text-slate-800 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
                        {user.fullName}
                      </span>
                    </Td>
                    <Td mono>
                      <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        {user.username}
                      </span>
                    </Td>
                    <Td>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${roleMeta.cls}`}>
                        <Key className="w-3 h-3" />
                        {roleMeta.label}
                      </span>
                    </Td>
                    <Td mono muted>
                      {user.createdAt ? user.createdAt.slice(0, 10) : '—'}
                    </Td>
                    <Td right>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditUser(user)}
                          className="py-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg transition-all flex items-center gap-1 text-[11px] font-bold"
                          title="Parol va rol tahrirlash"
                        >
                          <Key className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Parolni o'zgartirish</span>
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Haqiqatdan ham "${user.fullName}" akkauntini o'chirmoqchimisiz?`)) {
                              deleteUserAccount(user.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Akkauntni o'chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <YangiXodimModali onClose={() => setShowAddModal(false)} />
      )}

      {/* Edit User / Password Modal */}
      {editUser && (
        <ParolTahrirlashModali user={editUser} onClose={() => setEditUser(null)} />
      )}

    </div>
  );
}
