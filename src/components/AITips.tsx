import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Leaf, Droplets, Sun, Lightbulb, RefreshCw } from 'lucide-react';
import { aiTipsService, GardeningTip } from '../services/aiTipsService';

const iconMap: Record<string, React.ReactNode> = {
  Leaf: <Leaf className="w-4 h-4" />,
  Droplets: <Droplets className="w-4 h-4" />,
  Sun: <Sun className="w-4 h-4" />,
  Sparkles: <Sparkles className="w-4 h-4" />,
  Lightbulb: <Lightbulb className="w-4 h-4" />,
  RefreshCw: <RefreshCw className="w-4 h-4" />,
};

const categoryColors = {
  seasonal: 'bg-blue-500/10 text-blue-500',
  care: 'bg-green-500/10 text-green-500',
  beginner: 'bg-amber-500/10 text-amber-500',
  expert: 'bg-purple-500/10 text-purple-500',
};

export function AITips() {
  const [tips, setTips] = useState<GardeningTip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTips() {
      try {
        const data = await aiTipsService.getCuratedTips();
        setTips(data);
      } catch (error) {
        console.error("Failed to load AI tips:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadTips();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40">Dicas Bloom IA</h3>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bento-card p-5 animate-pulse flex gap-4">
              <div className="w-10 h-10 bg-[var(--bg-secondary)] rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 bg-[var(--bg-secondary)] rounded" />
                <div className="h-2 w-full bg-[var(--bg-secondary)] rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40">Dicas Bloom IA</h3>
        </div>
        <span className="text-[8px] font-black text-[var(--accent)] uppercase tracking-widest">Atualizado Agora</span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {tips.map((tip, index) => (
          <motion.div
            key={tip.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bento-card p-5 group hover:border-[var(--accent)]/30 transition-all cursor-default"
          >
            <div className="flex gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${categoryColors[tip.category]}`}>
                {iconMap[tip.icon] || <Lightbulb className="w-4 h-4" />}
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <h4 className="text-xs font-black uppercase tracking-tight text-[var(--text-main)]">{tip.title}</h4>
                  <span className="text-[7px] font-black uppercase tracking-widest opacity-30">{tip.category}</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-60 font-medium">{tip.content}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
