/**
 * views/AuthView/LoginPage.tsx — O'zbek tili
 * SmartBooks ERP Tizimiga Kirish Sahifasi
 */

import { useState } from 'react';
import { BookOpen, User, Lock, LogIn, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

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
    <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background ambient lighting gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glassmorphic Card Container */}
      <div className="relative w-full max-w-md bg-slate-800/80 border border-slate-700/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 z-10">
        
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/30 ring-4 ring-blue-500/20">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">SmartBooks ERP</h1>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Darsliklar va Moliya Boshqaruvi Tizimiga Kirish
          </p>
        </div>

        {/* Error Notification Banner */}
        {error && (
          <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3 text-red-400 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
              Foydalanuvchi nomi (Username)
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                placeholder="masalan: admin"
                required
                className="w-full h-11 pl-10 pr-4 text-sm font-semibold text-white placeholder-slate-500 bg-slate-900/60 border border-slate-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
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
                className="w-full h-11 pl-10 pr-4 text-sm font-semibold text-white placeholder-slate-500 bg-slate-900/60 border border-slate-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all duration-200 mt-2"
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

        {/* Demo Credentials Hint */}
        <div className="mt-8 pt-5 border-t border-slate-700/60 text-center">
          <p className="text-[11px] font-medium text-slate-400">
            Boshlang'ich kirish uchun: <code className="bg-slate-900 px-2 py-0.5 rounded font-mono text-blue-400 font-bold">admin</code> / <code className="bg-slate-900 px-2 py-0.5 rounded font-mono text-blue-400 font-bold">admin123</code>
          </p>
        </div>

      </div>
    </div>
  );
}
