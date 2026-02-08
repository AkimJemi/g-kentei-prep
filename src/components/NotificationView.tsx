import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle2, Info, AlertTriangle, MailOpen } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../store/useAuthStore';
import { normalizeKeys } from '../utils/normalize';

interface Notification {
  id: number;
  userId: number | null;
  title: string;
  content: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: number;
  createdAt: string;
}

export const NotificationView: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuthStore();

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const url = currentUser ? `/api/notifications?userId=${currentUser.userId}` : '/api/notifications';
      const res = await fetch(url);
      const data = await res.json();
      setNotifications(normalizeKeys(data));
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: 1 } : n));
    } catch (e) {
      console.error("Failed to mark notification as read", e);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'error': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  if (isLoading) return <div className="p-12 text-center animate-pulse text-accent font-black uppercase tracking-widest">通知を受信中...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/[0.04] pb-8 gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tight flex items-center gap-4">
            <Bell className="w-6 h-6 md:w-8 md:h-8 text-accent shrink-0" />
            システム通知 (System Alerts)
          </h1>
          <p className="text-[11px] md:text-sm text-slate-500 font-medium tracking-tight leading-relaxed">運営からの重要なお知らせおよびステータスアップデート</p>
        </div>
        <div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest self-start md:self-auto">
          {notifications.filter(n => !n.isRead).length} 件の未読
        </div>
      </div>

      <div className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {notifications.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 text-center space-y-4 bg-white/[0.01] rounded-3xl border border-dashed border-white/10"
            >
              <MailOpen className="w-12 h-12 text-slate-800 mx-auto" />
              <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">現在、新しい通知はありません</p>
            </motion.div>
          ) : (
            notifications.map((note) => (
              <motion.div 
                key={note.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={clsx(
                  "p-4 md:p-6 rounded-2xl border transition-all duration-300 flex gap-4 md:gap-6 items-start group relative overflow-hidden",
                  note.isRead 
                    ? "bg-slate-900/20 border-white/[0.04] opacity-60" 
                    : "bg-slate-900/50 border-white/[0.08] shadow-xl shadow-accent/5"
                )}
              >
                {!note.isRead && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-accent shadow-[0_0_15px_rgba(56,189,248,0.5)]" />
                )}
                
                <div className="mt-1 shrink-0">
                  {getIcon(note.type)}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className={clsx(
                        "text-lg font-bold tracking-tight",
                        note.isRead ? "text-slate-500" : "text-white"
                      )}>
                        {note.title}
                      </h3>
                      <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
                        {new Date(note.createdAt).toLocaleString('ja-JP')}
                      </div>
                    </div>
                    {!note.isRead && (
                      <button 
                        onClick={() => markAsRead(note.id)}
                        className="text-[10px] font-black text-accent hover:text-white uppercase tracking-widest border border-accent/20 px-3 py-1 rounded-lg transition-all hover:bg-accent/10"
                      >
                        既読にする
                      </button>
                    )}
                  </div>
                  <p className={clsx(
                    "text-sm leading-relaxed",
                    note.isRead ? "text-slate-600" : "text-slate-300"
                  )}>
                    {note.content}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
