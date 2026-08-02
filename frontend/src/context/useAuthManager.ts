/**
 * context/useAuthManager.ts
 * Manages authentication, current session, and user account management (CRUD).
 */

import { useState, useCallback } from 'react';
import type { AuthUser, UserRole } from '../types';
import { API, getInitialUser } from './contextHelpers';

export function useAuthManager(fireToast: (msg: string, variant?: any) => void) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getInitialUser);
  const [users, setUsers] = useState<AuthUser[]>([]);

  const checkAuth = useCallback((): boolean => {
    if (!currentUser) {
      fireToast("Sessiya tugagan yoki tizimga kirilmagan. Iltimos, qayta tizimga kiring.", 'error');
      setCurrentUser(null);
      try { localStorage.removeItem('smartbooks_auth_user'); } catch (e) {}
      return false;
    }
    return true;
  }, [currentUser, fireToast]);

  const refreshUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/backend/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e: any) {
      console.warn('[refreshUsers Warning]:', e.message);
    }
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API}/backend/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const text = await res.text();
        let errMsg = "Foydalanuvchi nomi yoki parol noto'g'ri.";
        try {
          const json = JSON.parse(text);
          if (json.error) errMsg = json.error;
        } catch (e) {}
        fireToast(errMsg, 'error');
        return false;
      }

      const data = await res.json();
      const user: AuthUser = data.user;

      try {
        localStorage.setItem('smartbooks_auth_user', JSON.stringify(user));
      } catch (e) {}

      setCurrentUser(user);
      fireToast(`Tizimga muvaffaqiyatli kirildi! Xush kelibsiz, ${user.fullName}!`, 'success');
      return true;
    } catch (err: any) {
      fireToast(`Kirishda xatolik yuz berdi: ${err.message}`, 'error');
      return false;
    }
  }, [fireToast]);

  const logout = useCallback(() => {
    try { localStorage.removeItem('smartbooks_auth_user'); } catch (e) {}
    setCurrentUser(null);
    fireToast("Tizimdan chiqildi.", 'info');
  }, [fireToast]);

  const createUserAccount = useCallback(async (data: {
    fullName: string;
    username: string;
    password: string;
    role: UserRole;
  }): Promise<boolean> => {
    if (!checkAuth()) return false;
    try {
      const res = await fetch(`${API}/backend/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errText = await res.text();
        let msg = "Foydalanuvchi yaratishda xatolik.";
        try {
          const json = JSON.parse(errText);
          if (json.error) msg = json.error;
        } catch (e) {}
        throw new Error(msg);
      }

      await refreshUsers();
      fireToast(`Yangi hisob (${data.fullName}) muvaffaqiyatli yaratildi!`, 'success');
      return true;
    } catch (err: any) {
      fireToast(err.message, 'error');
      return false;
    }
  }, [checkAuth, refreshUsers, fireToast]);

  const deleteUserAccount = useCallback(async (id: string): Promise<boolean> => {
    if (!checkAuth()) return false;
    try {
      const res = await fetch(`${API}/backend/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText);
      }
      await refreshUsers();
      fireToast("Foydalanuvchi hisobi o'chirildi.", 'info');
      return true;
    } catch (err: any) {
      fireToast(`O'chirishda xatolik: ${err.message}`, 'error');
      return false;
    }
  }, [checkAuth, refreshUsers, fireToast]);

  const updateUserAccount = useCallback(async (
    userId: string,
    patch: { password?: string; role?: UserRole; fullName?: string }
  ): Promise<boolean> => {
    if (!checkAuth()) return false;
    try {
      const res = await fetch(`${API}/backend/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });

      if (!res.ok) throw new Error(await res.text());
      await refreshUsers();
      fireToast("Foydalanuvchi ma'lumotlari muvaffaqiyatli yangilandi!", 'success');
      return true;
    } catch (err: any) {
      fireToast(`Tahrirlashda xatolik: ${err.message}`, 'error');
      return false;
    }
  }, [checkAuth, refreshUsers, fireToast]);

  return {
    currentUser,
    setCurrentUser,
    users,
    setUsers,
    checkAuth,
    login,
    logout,
    createUserAccount,
    deleteUserAccount,
    updateUserAccount,
    refreshUsers,
  };
}
