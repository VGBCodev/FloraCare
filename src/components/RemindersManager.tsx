import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Check, Trash2, Calendar, Droplets, Zap, Scissors, RefreshCw, ChevronLeft } from 'lucide-react';
import { Reminder, reminderService } from '../services/reminderService';
import { auth } from '../lib/firebase';
import { cn } from '../lib/utils';

export function RemindersManager({ onClose }: { onClose: () => void }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminderToDelete, setReminderToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    if (!auth.currentUser) return;
    try {
      const data = await reminderService.getReminders(auth.currentUser.uid);
      setReminders(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDone = async (reminder: Reminder) => {
    if (!reminder.id) return;
    try {
      await reminderService.markAsDone(reminder.id, reminder.frequencyDays);
      await loadReminders();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = (id: string) => {
    setReminderToDelete(id);
  };

  const confirmDelete = async () => {
    if (!reminderToDelete) return;
    setIsDeleting(true);
    try {
      await reminderService.deleteReminder(reminderToDelete);
      setReminders(prev => prev.filter(r => r.id !== reminderToDelete));
      setReminderToDelete(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'watering': return <Droplets className="w-4 h-4" />;
      case 'fertilizing': return <Zap className="w-4 h-4" />;
      case 'pruning': return <Scissors className="w-4 h-4" />;
      case 'repotting': return <RefreshCw className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'watering': return 'text-blue-500 bg-blue-500/10';
      case 'fertilizing': return 'text-amber-500 bg-amber-500/10';
      case 'pruning': return 'text-green-500 bg-green-500/10';
      case 'repotting': return 'text-purple-500 bg-purple-500/10';
      default: return 'text-[var(--accent)] bg-[var(--accent)]/10';
    }
  };

  const getTranslatedType = (type: string) => {
    switch (type) {
      case 'watering': return 'Rega';
      case 'fertilizing': return 'Adubação';
      case 'pruning': return 'Poda';
      case 'repotting': return 'Troca de Vaso';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onClose} className="p-2 bg-[var(--bg-secondary)] rounded-xl active:scale-95 transition-transform">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter">Agenda de Cuidados</h2>
          <p className="text-[9px] font-black text-[var(--accent)] uppercase tracking-widest opacity-60">Seus Lembretes Ativos</p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reminders.length === 0 ? (
        <div className="py-20 text-center space-y-4">
          <div className="w-16 h-16 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mx-auto text-[var(--text-muted)]">
            <Bell className="w-8 h-8" />
          </div>
          <p className="text-xs font-black uppercase tracking-widest opacity-30">Nenhum lembrete configurado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.sort((a, b) => a.nextDue - b.nextDue).map((reminder) => {
            const isDue = reminder.nextDue <= Date.now();
            const daysLeft = Math.ceil((reminder.nextDue - Date.now()) / (1000 * 60 * 60 * 24));
            
            return (
              <motion.div 
                key={reminder.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "bento-card p-4 transition-all border-2",
                  isDue ? "border-rose-100 bg-rose-50/20" : "border-transparent"
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2.5 rounded-xl", getTypeColor(reminder.type))}>
                      {getTypeIcon(reminder.type)}
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-tighter leading-none">{reminder.plantName}</h4>
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mt-1">
                        {getTranslatedType(reminder.type)} • cada {reminder.frequencyDays}d
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleMarkDone(reminder)}
                      className={cn(
                        "p-2 rounded-xl transition-all active:scale-90",
                        isDue ? "bg-rose-500 text-white shadow-lg shadow-rose-200" : "bg-[var(--accent)]/10 text-[var(--accent)]"
                      )}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(reminder.id!)}
                      className="p-2 bg-[var(--bg-secondary)] text-rose-500 rounded-xl active:scale-90"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3 opacity-30" />
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-widest",
                      isDue ? "text-rose-500" : "opacity-30"
                    )}>
                      {isDue ? "Atrasado!" : `Próximo: em ${daysLeft} dias`}
                    </span>
                  </div>
                  <div className="h-1 flex-1 bg-[var(--bg-secondary)] rounded-full mx-4 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(5, Math.min(100, (1 - (daysLeft / reminder.frequencyDays)) * 100))}%` }}
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        isDue ? "bg-rose-500" : "bg-[var(--accent)]"
                      )}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {reminderToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bento-card w-full max-w-xs p-6 bg-[var(--bg-card)] space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-main)]">Excluir Lembrete?</h3>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 leading-relaxed">
                  Esta ação não pode ser desfeita. Você perderá o histórico deste lembrete.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setReminderToDelete(null)}
                  disabled={isDeleting}
                  className="py-3 bg-[var(--bg-secondary)] rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="py-3 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-200 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isDeleting ? "..." : "Excluir"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
