/**
 * views/AuthView/LoginPage.tsx — O'zbek tili
 * SmartBooks ERP Tizimiga Kirish Sahifasi
 * Design: matches the main app's white/slate light theme
 */

import { useState } from 'react';
import { BookOpen, User, Lock, LogIn, AlertCircle, Shield } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const ROLE_CARDS = [
  { role: "O'qituvchi", desc: 'Buyurtmalar berish', color: 'bg-blue-500', textColor: 'text-blue-700', bg: 'bg-blue-50' },
  { role: 'Kassir',     desc: 'Moliya & To\'lovlar', color: 'bg-indigo-500', textColor: 'text-indigo-700', bg: 'bg-indigo-50' },
  { role: 'Logistika',  desc: 'Ta\'minotchi ombori', color: 'bg-amber-500',  textColor: 'text-amber-700',  bg: 'bg-amber-50'  },
  { role: 'Menejer',    desc: 'Boshqaruv markazi',  color: 'bg-emerald-500', textColor: 'text-emerald-700', bg: 'bg-emerald-50' },
];

export default function LoginPage() {
  const { login } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Iltimos, foydalanuvchi nomi va parolni kiriting.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await login(username.trim(), password);
      if (!success) {
        setError("Foydalanuvchi nomi yoki parol noto'g'ri.");
      }
    } catch (err: any) {
      setError(err.message || "Tizimga kirishda kutilmagan xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">

      {/* Subtle top gradient bar matching app header */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500" />

      <div className="w-full max-w-lg space-y-6">

        {/* Header Branding — matches Sidebar brand block */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-lg font-black text-slate-800 tracking-tight leading-none">SmartBook</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">ERP Tizim</p>
            </div>
          </div>
          <h1 className="text-2xl font-black text-slate-800">Tizimga Kirish</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Darsliklar va Moliya Boshqaruvi Platformasi</p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">

          {/* Card Header */}
          <div className="px-7 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Xavfsiz Kirish</span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-7 py-6 space-y-5">

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Username */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                Foydalanuvchi nomi (Username)
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(''); }}
                  placeholder="Foydalanuvchi nomini kiriting"
                  required
                  autoComplete="username"
                  className="w-full h-11 pl-10 pr-4 text-sm font-semibold text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                Parol
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full h-11 pl-10 pr-4 text-sm font-semibold text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-sm shadow-blue-200 flex items-center justify-center gap-2 transition-all duration-200"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Tekshirilmoqda...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Tizimga Kirish
                </>
              )}
            </button>

          </form>
        </div>

        {/* Role Indicators */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mb-3">Tizim Foydalanuvchi Rollari</p>
          <div className="grid grid-cols-4 gap-2">
            {ROLE_CARDS.map(({ role, desc, color, textColor, bg }) => (
              <div key={role} className={`${bg} border border-slate-200 rounded-xl px-2.5 py-3 text-center`}>
                <div className={`w-2 h-2 rounded-full ${color} mx-auto mb-1.5`} />
                <p className={`text-[10px] font-bold ${textColor}`}>{role}</p>
                <p className="text-[9px] text-slate-500 font-medium mt-0.5 leading-tight">{desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
