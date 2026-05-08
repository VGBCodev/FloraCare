import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, ExternalLink, ShieldCheck, Zap, ArrowRight, ExternalLink as Launch, Globe, DollarSign } from 'lucide-react';

interface AnalysisAdProps {
  onComplete: () => void;
}

export function AnalysisAd({ onComplete }: AnalysisAdProps) {
  const [timeLeft, setTimeLeft] = useState(3);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanSkip(true);
    }
  }, [timeLeft]);

  const ads = [
    {
      title: "Fertilizante Orgânico Premium",
      company: "EcoGarden Solutions",
      description: "Aumente a saúde das suas suculentas em até 40% com nossa nova fórmula rica em nitrogênio vegetal.",
      image: "https://images.unsplash.com/photo-1585336261022-680e295ce3fe?q=80&w=2070&auto=format&fit=crop",
      cta: "Ver Oferta",
      tag: "Mais Vendido"
    },
    {
      title: "Vaso Inteligente com Auto-Irrigação",
      company: "HydroHome",
      description: "Nunca mais esqueça de regar! Nosso sistema detecta a umidade do solo e libera água precisamente.",
      image: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?q=80&w=2072&auto=format&fit=crop",
      cta: "Comprar Agora",
      tag: "Novidade"
    }
  ];

  const ad = ads[Math.floor(Math.random() * ads.length)];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Anúncio Patrocinado</span>
        </div>
        {!canSkip ? (
          <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Continuar em {timeLeft}s...</span>
        ) : (
          <button 
            onClick={onComplete}
            className="flex items-center gap-1.5 text-[var(--accent)] font-black text-[10px] uppercase tracking-widest hover:opacity-70"
          >
            Pular Anúncio <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="bento-card overflow-hidden bg-[var(--bg-card)] border-2 border-[var(--accent)]/20 relative group">
        <div className="aspect-[16/10] relative overflow-hidden">
          <img src={ad.image} alt="Ad Content" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1.5 bg-[var(--accent)] text-[var(--accent-foreground)] text-[8px] font-black uppercase tracking-widest rounded-lg shadow-xl">
              {ad.tag}
            </span>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 opacity-40">
                <Globe className="w-3 h-3" />
                <span className="text-[9px] font-black uppercase tracking-widest">{ad.company}</span>
              </div>
              <h3 className="text-xl font-black uppercase tracking-tighter leading-tight text-[var(--text-main)]">{ad.title}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/5 border border-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
              <Launch className="w-5 h-5" />
            </div>
          </div>

          <p className="text-xs text-[var(--text-main)]/70 font-medium leading-relaxed">
            {ad.description}
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button className="py-4 bg-[var(--text-main)] text-[var(--bg-card)] rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-transform">
              {ad.cta} <ExternalLink className="w-3 h-3" />
            </button>
            <button 
              onClick={onComplete}
              disabled={!canSkip}
              className="py-4 bg-[var(--bg-secondary)] text-[var(--text-main)] rounded-2xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50 active:scale-95 transition-transform"
            >
              Resultado
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 bento-card bg-[var(--accent)]/5 border-[var(--accent)]/10 flex items-center gap-4">
        <div className="w-12 h-12 bg-[var(--accent)]/10 rounded-2xl flex items-center justify-center text-[var(--accent)]">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest">Anúncios Seguros</h4>
          <p className="text-[9px] font-medium opacity-50">Sua privacidade é nossa prioridade. Este anúncio nos ajuda a manter o FloraCare gratuito.</p>
        </div>
      </div>
    </motion.div>
  );
}
