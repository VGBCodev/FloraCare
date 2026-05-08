import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, Droplets, Zap, Scissors, RefreshCw, Calendar } from 'lucide-react';
import { ReminderType, reminderService } from '../services/reminderService';
import { auth } from '../lib/firebase';

interface ReminderModalProps {
  plantId: string;
  plantName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReminderModal({ plantId, plantName, onClose, onSuccess }: ReminderModalProps) {
  const [type, setType] = useState<ReminderType>('watering');
  const [frequency, setFrequency] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!auth.currentUser) return;
    setIsSubmitting(true);
    try {
      const lastDone = Date.now();
      const nextDue = lastDone + (frequency * 24 * 60 * 60 * 1000);
      
      await reminderService.addReminder({
        userId: auth.currentUser.uid,
        plantId,
        plantName,
        type,
        frequencyDays: frequency,
        lastDone,
        nextDue
      });
      onSuccess();
    } catch (error) {
      console.error("Error setting reminder:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const types: { id: ReminderType; icon: React.ReactNode; label: string; color: string }[] = [
    { id: 'watering', icon: <Droplets className="w-4 h-4" />, label: 'Rega', color: 'text-blue-500 bg-blue-500/10' },
    { id: 'fertilizing', icon: <Zap className="w-4 h-4" />, label: 'Adubação', color: 'text-amber-500 bg-amber-500/10' },
    { id: 'pruning', icon: <Scissors className="w-4 h-4" />, label: 'Poda', color: 'text-green-500 bg-green-500/10' },
    { id: 'repotting', icon: <RefreshCw className="w-4 h-4" />, label: 'Troca Vaso', color: 'text-purple-500 bg-purple-500/10' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bento-card w-full max-w-sm p-6 bg-[var(--bg-card)] space-y-6"
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--accent)]/10 rounded-xl text-[var(--accent)]">
              <Bell className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest">Novo Lembrete</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors">
            <X className="w-4 h-4 opacity-40" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2 block">Cuidado para {plantName}</label>
            <div className="grid grid-cols-2 gap-2">
              {types.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    type === t.id 
                    ? 'border-[var(--accent)] bg-[var(--accent)]/5' 
                    : 'border-transparent bg-[var(--bg-secondary)] opacity-60'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${t.color}`}>
                    {t.icon}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-tight">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Frequência (Dias)</label>
              <span className="text-[10px] font-black text-[var(--accent)]">{frequency} dias</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="60" 
              value={frequency}
              onChange={(e) => setFrequency(parseInt(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
            <div className="flex justify-between text-[8px] font-black opacity-30 uppercase tracking-widest">
              <span>Diário</span>
              <span>Quinzenal</span>
              <span>Mensal</span>
              <span>Bimestral</span>
            </div>
          </div>
        </div>

        <button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-4 bg-[var(--text-main)] text-[var(--bg-card)] rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
        >
          {isSubmitting ? "Salvando..." : "Configurar Lembrete"}
        </button>
      </motion.div>
    </div>
  );
}
