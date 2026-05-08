import React, { useState } from 'react';
import { Leaf, Droplets, Sun, Wind, Thermometer, AlertTriangle, Plus, Search, Info, ChevronLeft, MapPin, Calendar, Heart, Camera, Sparkles, Users, User as UserIcon, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Scanner } from './components/Scanner';
import { Community } from './components/Community';
import { Profile } from './components/Profile';
import { AnalysisAd } from './components/AnalysisAd';
import { ReminderModal } from './components/ReminderModal';
import { AITips } from './components/AITips';
import { NotificationCenter } from './components/NotificationCenter';
import { identifyPlant, diagnosePlant, type PlantResult } from './services/gemini';
import { cn } from './lib/utils';

type AppMode = 'home' | 'scan' | 'result' | 'diagnose' | 'garden' | 'community' | 'profile';

interface SavedPlant extends PlantResult {
  id: string;
  image: string;
  dateAdded: string;
}

export default function App() {
  const [mode, setMode] = useState<AppMode>('home');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<PlantResult | null>(null);
  const [lastImage, setLastImage] = useState<string | null>(null);
  const [lastMime, setLastMime] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState('');
  const [showAd, setShowAd] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [targetPlantForReminder, setTargetPlantForReminder] = useState<{ id: string, name: string } | null>(null);
  const [savedGarden, setSavedGarden] = useState<SavedPlant[]>([]);
  const [selectedUserProfileId, setSelectedUserProfileId] = useState<string | null>(null);

  const handleViewProfile = (userId: string) => {
    setSelectedUserProfileId(userId);
    setMode('profile');
  };

  const handleCapture = async (base64: string, mimeType: string) => {
    setIsProcessing(true);
    setLastImage(base64);
    setLastMime(mimeType);
    try {
      if (mode === 'scan') {
        const data = await identifyPlant(base64, mimeType);
        setResult(data);
        setShowAd(true);
        setMode('result');
      } else if (mode === 'diagnose') {
        // Symptoms handled in separate step
      }
    } catch (err) {
      console.error(err);
      alert("Falha ao analisar a imagem. Por favor, tente novamente com uma foto mais nítida.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDiagnoseSubmit = async () => {
    if (!lastImage || !lastMime || !symptoms) return;
    setIsProcessing(true);
    try {
      const data = await diagnosePlant(lastImage, lastMime, symptoms);
      setDiagnosis(data);
      setShowAd(true);
      setMode('result'); // Use result mode but UI will switch based on diagnosis state
    } catch (err) {
      console.error(err);
      alert("Falha ao diagnosticar. Por favor, tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const addToGarden = () => {
    if (!result || !lastImage) return;
    const newPlant: SavedPlant = {
      ...result,
      id: Math.random().toString(36).substr(2, 9),
      image: lastImage,
      dateAdded: new Date().toLocaleDateString()
    };
    setSavedGarden(prev => [...prev, newPlant]);
    setMode('garden');
  };

  const reset = () => {
    setResult(null);
    setDiagnosis(null);
    setLastImage(null);
    setLastMime(null);
    setSymptoms('');
    setMode('home');
  };

  return (
    <div className="min-h-screen transition-colors duration-500 overflow-x-hidden pb-20 relative bg-[var(--bg-main)]">
      {/* Background Decoration */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-pattern">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
          className="absolute -top-40 -left-40 text-[var(--accent)]/5"
        >
          <Leaf size={600} />
        </motion.div>
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-60 -right-20 text-[var(--accent)]/5"
        >
          <Leaf size={800} />
        </motion.div>
        
        {/* Floating Blobs for 3D depth */}
        <div className="absolute top-1/4 right-[10%] w-64 h-64 bg-[var(--accent)]/5 rounded-full blur-3xl floating-element" />
        <div className="absolute bottom-1/4 left-[5%] w-96 h-96 bg-[var(--bg-secondary)]/30 rounded-full blur-3xl floating-element" style={{ animationDelay: '-2s' }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--bg-main)]/80 backdrop-blur-md px-4 py-4 flex justify-between items-center border-b border-[var(--border-main)]">
        <div 
          id="logo" 
          className="flex items-center gap-2 cursor-pointer"
          onClick={reset}
        >
          <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center text-[var(--accent-foreground)] font-black text-xs">F</div>
          <h1 className="text-lg font-black tracking-tighter text-[var(--text-main)] uppercase">Flora<span className="text-[var(--accent)]">Care</span></h1>
        </div>
        
        <div className="flex gap-2">
          <NotificationCenter />
          <button 
            onClick={() => setMode('garden')}
            className="w-10 h-10 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-full flex items-center justify-center text-[var(--text-main)] active:scale-90 transition-all relative"
          >
            <Heart className={cn("w-4 h-4", savedGarden.length > 0 && "fill-[var(--accent)] text-[var(--accent)]")} />
            {savedGarden.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--accent)] text-[8px] text-[var(--accent-foreground)] flex items-center justify-center rounded-full font-black">
                {savedGarden.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {mode === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              {/* Hero Capture Card */}
              <div className="bento-card relative flex flex-col justify-end p-6 bg-[var(--accent)] min-h-[220px] overflow-hidden border-none text-[var(--accent-foreground)]">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-0" />
                <div className="z-10 space-y-4">
                  <h1 className="text-3xl font-black text-white leading-tight uppercase tracking-tighter">Identifique seu <br /> <span className="text-white opacity-60">Verde.</span></h1>
                  <button
                    onClick={() => setMode('scan')}
                    className="px-6 py-3 bg-white text-green-900 rounded-xl font-black uppercase tracking-widest text-[10px] active:scale-95 shadow-lg"
                  >
                    Começar Scan
                  </button>
                </div>
              </div>

              {/* Stats & Diagnosis Row */}
              <div className="grid grid-cols-2 gap-4">
                <div onClick={() => setMode('diagnose')} className="bento-card p-6 flex flex-col gap-3 cursor-pointer active:scale-95 transition-transform">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black opacity-50 uppercase tracking-widest">Saúde</span>
                  <span className="text-sm font-black">Diagnosticar</span>
                </div>
                
                <div onClick={() => setMode('garden')} className="bento-card p-6 flex flex-col gap-3 cursor-pointer active:scale-95 transition-transform">
                  <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-xl flex items-center justify-center text-[var(--accent)]">
                    <Droplets className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black opacity-50 uppercase tracking-widest">Jardim</span>
                  <span className="text-sm font-black">{savedGarden.length} Vasos</span>
                </div>
              </div>

              {/* AI Curated Tips Section */}
              <AITips />

              {/* Community Preview Card */}
              <div 
                onClick={() => setMode('community')}
                className="bento-card p-6 flex flex-col justify-between gap-4 cursor-pointer hover:border-[var(--accent)] transition-all"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">Rede Social</h3>
                  <Users className="w-4 h-4 text-[var(--accent)]" />
                </div>
                <p className="text-sm font-bold leading-tight">"Alguém sabe por que minha Jiboia tem manchas?"</p>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-6 h-6 rounded-full border-2 border-[var(--bg-card)] bg-[var(--bg-secondary)] overflow-hidden">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 20}`} alt="avatar" loading="lazy" />
                      </div>
                    ))}
                  </div>
                  <span className="text-[9px] font-black opacity-40 uppercase tracking-widest">Ver Discussão</span>
                </div>
              </div>
            </motion.div>
          )}

          {(mode === 'scan' || mode === 'diagnose') && !lastImage && (
            <motion.div
              key="scanner-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setMode('home')}
                  className="w-10 h-10 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl flex items-center justify-center text-[var(--text-main)] active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tighter">
                  {mode === 'scan' ? 'Identificar' : 'Saúde'}
                </h2>
              </div>
              <Scanner onCapture={handleCapture} isProcessing={isProcessing} />
            </motion.div>
          )}

          {mode === 'diagnose' && lastImage && !diagnosis && (
            <motion.div
              key="diagnose-symptoms"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bento-card relative aspect-square max-w-[300px] mx-auto overflow-hidden">
                <img src={lastImage} alt="Planta" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="space-y-4">
                <h2 className="text-xl font-black uppercase tracking-tighter">O que ela tem?</h2>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="Relate os sintomas..."
                  className="w-full min-h-[140px] p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] focus:outline-none text-sm text-[var(--text-main)]"
                />
                <button
                  onClick={handleDiagnoseSubmit}
                  disabled={!symptoms || isProcessing}
                  className="w-full py-4 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg disabled:opacity-50 active:scale-95"
                >
                  {isProcessing ? "Lendo..." : "Diagnosticar com IA"}
                </button>
              </div>
            </motion.div>
          )}

          {mode === 'result' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <AnimatePresence mode="wait">
                {showAd ? (
                  <motion.div
                    key="analysis-ad"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <AnalysisAd onComplete={() => setShowAd(false)} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="analysis-content"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex justify-between items-center">
                      <button onClick={reset} className="p-2 bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] active:scale-90">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="flex gap-2">
                        <button onClick={() => setMode('community')} className="px-4 py-2 bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] text-[9px] font-black uppercase tracking-widest">Rede</button>
                        <button onClick={addToGarden} className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-[var(--accent)]/20">Salvar</button>
                      </div>
                    </div>

                    <div className="bento-card relative aspect-[4/5]">
                      <img src={lastImage!} alt="Resultado" className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-earth-900 via-earth-900/40 to-transparent">
                        {result ? (
                          <div className="space-y-1">
                            <h1 className="text-2xl font-black text-white uppercase tracking-tighter">{result.commonName}</h1>
                            <p className="text-xs text-white/70 italic leading-none">{result.scientificName}</p>
                          </div>
                        ) : (
                          <h1 className="text-xl font-black text-white uppercase tracking-tighter">Relatório de Saúde</h1>
                        )}
                      </div>
                    </div>

                    {diagnosis && (
                      <div className="bento-card p-6 space-y-4">
                        <div className="flex items-center gap-2 text-amber-500">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Avaliação</span>
                        </div>
                        <div className="markdown-body">
                          <ReactMarkdown>{diagnosis}</ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {result && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { l: 'Luz', v: result.careInstructions.sunlight, i: <Sun className="w-4 h-4" /> },
                            { l: 'Rega', v: result.careInstructions.watering, i: <Droplets className="w-4 h-4" /> },
                            { l: 'Clima', v: result.careInstructions.temperature, i: <Thermometer className="w-4 h-4" /> },
                            { l: 'Ar', v: result.careInstructions.humidity, i: <Wind className="w-4 h-4" /> }
                          ].map((s, idx) => (
                            <div key={idx} className="bento-card p-4 space-y-2">
                              <div className="flex items-center gap-1.5 opacity-50">
                                {s.i}
                                <span className="text-[8px] font-black uppercase tracking-widest">{s.l}</span>
                              </div>
                              <p className="text-[10px] font-black leading-tight">{s.v}</p>
                            </div>
                          ))}
                        </div>
                        
                        <div className="bento-card p-6 space-y-3">
                          <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50">Cuidados Gerais</h4>
                          <p className="text-xs leading-relaxed font-medium">{result.careInstructions.generalCare}</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {mode === 'garden' && (
            <motion.div
              key="garden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-black text-[var(--text-main)] uppercase tracking-tighter">Meu <span className="text-[var(--accent)]">Jardim</span></h1>
                <button onClick={() => setMode('scan')} className="w-10 h-10 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-xl flex items-center justify-center active:scale-90"><Plus /></button>
              </div>

              {savedGarden.length === 0 ? (
                <div className="bento-card border-dashed py-20 flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 bg-[var(--bg-secondary)] rounded-2xl flex items-center justify-center text-[var(--text-muted)] opacity-30"><Leaf /></div>
                  <p className="text-xs font-black text-[var(--text-muted)] opacity-40 uppercase tracking-widest px-10">Seu jardim está vazio. Comece um scan!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {savedGarden.map(plant => (
                    <div key={plant.id} className="bento-card bg-[var(--bg-card)] active:scale-95 transition-transform overflow-hidden relative group">
                      <div onClick={() => {setResult(plant); setLastImage(plant.image); setMode('result')}}>
                        <img src={plant.image} className="aspect-square object-cover" alt="" loading="lazy" />
                        <div className="p-3">
                          <h3 className="text-[10px] font-black uppercase tracking-tighter truncate">{plant.commonName}</h3>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setTargetPlantForReminder({ id: plant.id, name: plant.commonName });
                          setIsReminderModalOpen(true);
                        }}
                        className="absolute top-2 right-2 p-2 bg-[var(--bg-card)]/90 backdrop-blur-sm text-[var(--accent)] rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Bell className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {mode === 'community' && (
            <motion.div key="community" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Community garden={savedGarden} onViewProfile={handleViewProfile} />
            </motion.div>
          )}

          {mode === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Profile 
                initialUserId={selectedUserProfileId} 
                onClose={() => {
                  setSelectedUserProfileId(null);
                  setMode('home');
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Nav Bar Mobile */}
      <footer className="fixed bottom-6 left-4 right-4 z-40 max-w-sm mx-auto bg-[var(--bg-card)]/80 backdrop-blur-2xl rounded-[28px] border border-[var(--border-main)] px-2 py-3 shadow-2xl shadow-black/10">
        <div className="flex justify-between items-center relative">
          <button onClick={() => setMode('home')} className={cn("flex flex-col items-center gap-1 flex-1 transition-all", mode === 'home' ? "text-[var(--accent)]" : "opacity-40")}>
            <Leaf className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-[0.15em] leading-none">Home</span>
          </button>

          <button onClick={() => setMode('community')} className={cn("flex flex-col items-center gap-1 flex-1 transition-all", mode === 'community' ? "text-[var(--accent)]" : "opacity-40")}>
            <Users className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-[0.15em] leading-none">Rede</span>
          </button>
          
          <div className="flex-1 flex justify-center -mt-10 relative z-50">
            <button 
              onClick={() => setMode('scan')} 
              className="w-14 h-14 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-full flex items-center justify-center shadow-lg shadow-[var(--accent)]/30 border-[4px] border-[var(--bg-card)] active:scale-90 transition-all"
            >
              <Camera className="w-6 h-6" />
            </button>
          </div>

          <button onClick={() => setMode('garden')} className={cn("flex flex-col items-center gap-1 flex-1 transition-all", mode === 'garden' ? "text-[var(--accent)]" : "opacity-40")}>
            <Heart className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-[0.15em] leading-none">Vasos</span>
          </button>

          <button onClick={() => setMode('profile')} className={cn("flex flex-col items-center gap-1 flex-1 transition-all", mode === 'profile' ? "text-[var(--accent)]" : "opacity-40")}>
            <UserIcon className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-[0.15em] leading-none">Perfil</span>
          </button>
        </div>
      </footer>

      <AnimatePresence>
        {isReminderModalOpen && targetPlantForReminder && (
          <ReminderModal 
            plantId={targetPlantForReminder.id}
            plantName={targetPlantForReminder.name}
            onClose={() => setIsReminderModalOpen(false)}
            onSuccess={() => setIsReminderModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

