import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Heart, MessageSquare, Globe, Check } from 'lucide-react';
import { notificationService, Notification, NotificationType } from '../services/notificationService';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { auth } from '../lib/firebase';

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [user, setUser] = useState(auth.currentUser);
  const hasUnread = notifications.some(n => !n.isRead);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(u => setUser(u));
    notificationService.requestPermission();
    const unsubscribeNotifs = notificationService.subscribeToNotifications((data) => {
      setNotifications(data);
    });
    return () => {
      unsubscribeAuth();
      unsubscribeNotifs();
    };
  }, []);

  if (!user) return null;

  const handleMarkAsRead = (id: string) => {
    notificationService.markAsRead(id);
  };

  const handleMarkAllAsRead = () => {
    notificationService.markAllAsRead();
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.LIKE:
        return <Heart className="w-3 h-3 text-rose-500" />;
      case NotificationType.COMMENT:
        return <MessageSquare className="w-3 h-3 text-blue-500" />;
      case NotificationType.NEW_POST:
        return <Globe className="w-3 h-3 text-green-500" />;
      default:
        return <Bell className="w-3 h-3" />;
    }
  };

  const getMessage = (n: Notification) => {
    switch (n.type) {
      case NotificationType.LIKE:
        return 'curtiu seu post';
      case NotificationType.COMMENT:
        return 'comentou no seu post';
      case NotificationType.NEW_POST:
        return `postou em ${n.groupName || 'uma comunidade'}`;
      default:
        return 'interagiu com você';
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-full flex items-center justify-center text-[var(--text-main)] active:scale-95 transition-all relative"
      >
        <Bell className="w-4 h-4" />
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[var(--bg-card)]" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-black/5"
            />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full right-0 mt-2 w-72 max-h-[80vh] bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--bg-secondary)] overflow-hidden z-[60]"
            >
              <div className="p-4 border-b border-[var(--bg-secondary)] flex justify-between items-center">
                <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40">Notificações</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={handleMarkAllAsRead}
                    className="p-1 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors text-green-500"
                    title="Marcar todas como lidas"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 opacity-40" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto max-h-[60vh]">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <Bell className="w-8 h-8 opacity-10 mx-auto" />
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-20">Nenhuma notificação</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--bg-secondary)]">
                    {notifications.map((n) => (
                      <div 
                        key={n.id}
                        onClick={() => handleMarkAsRead(n.id)}
                        className={`p-4 transition-colors cursor-pointer flex gap-3 ${!n.isRead ? 'bg-[var(--accent)]/5' : 'hover:bg-[var(--bg-secondary)]/50'}`}
                      >
                        <div className="shrink-0 mt-1">
                          {getIcon(n.type)}
                        </div>
                        <div className="space-y-1 flex-1">
                          <p className="text-[11px] leading-snug">
                            <span className="font-black text-[var(--text-main)]">{n.senderName}</span>
                            {' '}
                            <span className="opacity-60">{getMessage(n)}</span>
                          </p>
                          <p className="text-[8px] font-black uppercase tracking-widest opacity-30">
                            {n.createdAt?.seconds ? formatDistanceToNow(n.createdAt.seconds * 1000, { addSuffix: true, locale: ptBR }) : 'Agora'}
                          </p>
                        </div>
                        {!n.isRead && (
                          <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full mt-2 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
