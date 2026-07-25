/**
 * components/NotificationsModal.tsx — O'zbek tili
 * Bildirishnomalar oynasi (Eslatmalar, Guruh intervallari va Talabalar 1-haftalik eslatmalari)
 */

import { Bell, CheckCheck, X, Clock, AlertTriangle, CheckCircle2, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface NotificationsModalProps {
  onClose: () => void;
}

export default function NotificationsModal({ onClose }: NotificationsModalProps) {
  const { notifications, currentUser, markNotificationAsRead, markAllNotificationsAsRead } = useApp();

  // Filter notifications for logged-in user / teacher if role is TEACHER
  const userNotifications = notifications.filter(n => {
    if (currentUser?.role === 'TEACHER') {
      return !n.teacherName || n.teacherName === currentUser.fullName || n.userId === currentUser.username;
    }
    return true; // Manager, Cashier, Logistics see all system notifications
  });

  const unreadCount = userNotifications.filter(n => !n.isRead).length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 pt-16">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs" onClick={onClose} />

      {/* Popover / Card Container */}
      <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl z-10 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bell className="w-4.5 h-4.5 text-blue-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">Bildirishnomalar</p>
              <p className="text-[10px] text-slate-400 font-medium">
                {unreadCount > 0 ? `${unreadCount} ta o'qilmagan eslatma` : "Barchasi o'qilgan"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1"
                title="Barchasini o'qilgan deb belgilash"
              >
                <CheckCheck className="w-3 h-3 text-emerald-400" />
                <span>Tozalash</span>
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/15 text-slate-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
          {userNotifications.length === 0 ? (
            <div className="py-8 text-center px-4 space-y-2">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-700">Yangi bildirishnomalar yo'q</p>
              <p className="text-[10px] text-slate-400 font-medium">
                Guruhlar va o'quvchilar bo'yicha barqarorlik ta'minlangan.
              </p>
            </div>
          ) : (
            userNotifications.map(n => {
              const isJoinFollowup = n.type === 'STUDENT_JOIN_FOLLOWUP';
              const Icon = isJoinFollowup ? AlertTriangle : Calendar;
              const iconBg = isJoinFollowup ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-blue-50 text-blue-600 border-blue-200';

              return (
                <div
                  key={n.id}
                  onClick={() => markNotificationAsRead(n.id)}
                  className={`p-3 rounded-xl transition-all cursor-pointer border ${
                    !n.isRead
                      ? 'bg-slate-50/90 border-blue-200/80 shadow-xs'
                      : 'bg-white border-transparent opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`p-2 rounded-lg border shrink-0 mt-0.5 ${iconBg}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-bold text-slate-800 truncate">
                          {n.title || (isJoinFollowup ? "O'quvchi eslatmasi" : "Guruh intervali")}
                        </span>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                        )}
                      </div>
                      
                      <p className="text-[11px] text-slate-600 leading-snug font-medium">
                        {n.message}
                      </p>
                      
                      {n.time && (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 pt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{n.time}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
            SmartBook Eslatmalar Tizimi
          </p>
        </div>

      </div>
    </div>
  );
}
