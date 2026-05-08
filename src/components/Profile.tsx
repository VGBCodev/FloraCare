import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserIcon, LogOut, Grid, Heart, MessageSquare, Award, Settings, Camera, Check, X, Moon, Sun, Leaf, Bell, ChevronLeft, Calendar } from 'lucide-react';
import { auth, signInWithGoogle, FirebaseUser, onAuthStateChanged, updateProfile } from '../lib/firebase';
import { communityService, Post } from '../services/communityService';
import { cn } from '../lib/utils';
import { useTheme } from '../contexts/ThemeContext';
import { RemindersManager } from './RemindersManager';

interface ProfileUser {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  bio?: string;
}

export function Profile({ initialUserId, onClose }: { initialUserId?: string | null, onClose?: () => void }) {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [view, setView] = useState<'profile' | 'settings' | 'reminders'>('profile');
  const { theme, setTheme } = useTheme();
  
  // Settings states
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newBio, setNewBio] = useState('');
  const [notifications, setNotifications] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadProfile = async (targetUid: string, isSelf: boolean) => {
      setLoading(true);
      try {
        let profile = await communityService.getProfile(targetUid);
        
        if (!profile && isSelf && auth.currentUser) {
          // Auto-create profile for logged in user if missing
          await communityService.updateUserProfile({
            displayName: auth.currentUser.displayName || 'Botânico',
            photoURL: auth.currentUser.photoURL || '',
            email: auth.currentUser.email || ''
          });
          profile = await communityService.getProfile(targetUid);
        }

        if (profile) {
          setUser({
            uid: targetUid,
            displayName: profile.displayName || 'Botânico',
            photoURL: profile.photoURL || null,
            bio: profile.bio
          });
          if (isSelf) {
            setNewDisplayName(profile.displayName || auth.currentUser?.displayName || '');
            setNewBio(profile.bio || '');
          }
        } else if (isSelf && auth.currentUser) {
          setUser({
            uid: auth.currentUser.uid,
            displayName: auth.currentUser.displayName,
            photoURL: auth.currentUser.photoURL
          });
        }
        
        const posts = await communityService.getUserPosts(targetUid);
        setUserPosts(posts);
        setIsOwnProfile(isSelf);
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    };

    if (initialUserId) {
      loadProfile(initialUserId, initialUserId === auth.currentUser?.uid);
    } else {
      const unsubscribe = onAuthStateChanged(auth, (u) => {
        if (u) {
          loadProfile(u.uid, true);
        } else {
          setUser(null);
          setLoading(false);
        }
      });
      return () => unsubscribe();
    }
  }, [initialUserId]);

  const handleUpdateProfile = async () => {
    if (!auth.currentUser) return;
    setIsUpdating(true);
    try {
      await communityService.updateUserProfile({
        displayName: newDisplayName,
        bio: newBio
      });
      
      // Update local state
      setUser(prev => prev ? { ...prev, displayName: newDisplayName } : null);
      setView('profile');
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Erro ao atualizar perfil.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSignOut = () => {
    auth.signOut();
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setIsUpdating(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const originalBase64 = reader.result as string;
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 128;
          const MAX_HEIGHT = 128;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const highResBase64 = canvas.toDataURL('image/jpeg', 0.8);
          const thumbCanvas = document.createElement('canvas');
          thumbCanvas.width = 32;
          thumbCanvas.height = 32;
          const thumbCtx = thumbCanvas.getContext('2d');
          thumbCtx?.drawImage(img, 0, 0, 32, 32);
          const tinyThumbBase64 = thumbCanvas.toDataURL('image/jpeg', 0.4);
          
          try {
            try {
              await updateProfile(auth.currentUser!, { photoURL: tinyThumbBase64 });
            } catch (a) {}
            await communityService.updateUserProfile({ photoURL: highResBase64 });
            setUser(prev => prev ? { ...prev, photoURL: highResBase64 } : null);
          } catch (profileError) {
            console.error(profileError);
            alert("Erro ao salvar foto.");
          }
          setIsUpdating(false);
        };
        img.src = originalBase64;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setIsUpdating(false);
    }
  };

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Login component error:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 border-4 border-[var(--border-main)] border-t-[var(--accent)] rounded-full animate-spin" />
        <p className="opacity-50 font-bold uppercase tracking-widest text-[10px]">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6 gap-8">
        <div className="w-20 h-20 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center">
          <UserIcon className="w-10 h-10 opacity-20" />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-black uppercase tracking-tighter">Sua Jornada</h2>
          <p className="opacity-50 text-sm max-w-xs mx-auto">Entre para salvar suas descobertas e participar da rede.</p>
        </div>
        <button 
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="px-8 py-3 bg-[var(--text-main)] text-[var(--bg-card)] rounded-xl font-bold uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-lg active:scale-95 flex items-center gap-3 disabled:opacity-50"
        >
          {isLoggingIn ? (
            <div className="w-4 h-4 border-2 border-[var(--bg-card)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <img src="https://www.gstatic.com/firebase/trickle/google_logo.svg" className="w-4 h-4 bg-white p-0.5 rounded-full" alt="Google" loading="lazy" />
          )}
          {isLoggingIn ? "Entrando..." : "Entrar com Google"}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6 pb-24">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

      <AnimatePresence mode="wait">
        {view === 'reminders' ? (
          <motion.div
            key="reminders-view"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="px-4"
          >
            <RemindersManager onClose={() => setView('profile')} />
          </motion.div>
        ) : view === 'profile' ? (
          <motion.div 
            key="profile-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Header Profile */}
            <div className="px-4">
              <div className="bento-card p-6 flex flex-col items-center gap-6 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                
                {onClose && (
                  <button 
                    onClick={onClose}
                    className="absolute top-4 left-4 p-2 bg-[var(--bg-secondary)] rounded-xl active:scale-95 z-20"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}

                <div 
                  onClick={isOwnProfile ? handlePhotoClick : undefined}
                  className={cn(
                    "group relative z-10 w-24 h-24 rounded-[32px] overflow-hidden border-4 border-[var(--bg-secondary)] shadow-xl",
                    isOwnProfile && "cursor-pointer"
                  )}
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-[var(--bg-secondary)] flex items-center justify-center opacity-30">
                      <UserIcon />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 active:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Camera className="w-4 h-4" />
                  </div>
                  {isUpdating && (
                    <div className="absolute inset-0 bg-[var(--bg-card)]/80 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-[var(--border-main)] border-t-[var(--accent)] rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                <div className="space-y-4 w-full relative z-10">
                  <div className="space-y-1">
                    <h1 className="text-2xl font-black leading-tight uppercase tracking-tighter">{user.displayName}</h1>
                    <p className="text-[9px] font-black text-[var(--accent)] uppercase tracking-widest leading-none">Membro Guardião</p>
                    {user.bio && <p className="text-xs opacity-60 font-medium mt-2 max-w-[200px] mx-auto italic">"{user.bio}"</p>}
                  </div>
                  
                  <div className="flex gap-2">
                    {[
                      { label: 'Nível', val: '24' },
                      { label: 'Posts', val: userPosts.length },
                      { label: 'Seeds', val: '1.4k' }
                    ].map((stat) => (
                      <div key={stat.label} className="flex-1 p-2 bento-inner flex flex-col items-center">
                        <span className="text-[8px] font-black opacity-40 uppercase tracking-widest">{stat.label}</span>
                        <span className="text-sm font-black">{stat.val}</span>
                      </div>
                    ))}
                  </div>

                  {isOwnProfile && (
                      <div className="w-full space-y-2">
                        <button 
                         onClick={() => setView('reminders')}
                         className="w-full py-4 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2 shadow-xl"
                       >
                         <Calendar className="w-4 h-4" />
                         Minha Agenda
                       </button>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setView('settings')}
                          className="flex-1 py-3 bg-[var(--bg-secondary)] text-[var(--text-main)] rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          Ajustes
                        </button>
                        <button 
                          onClick={handleSignOut}
                          className="flex-1 py-3 bg-rose-500/10 text-rose-500 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Sair
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ad Banner */}
            <div className="px-4">
              <div className="bento-card p-4 bg-[var(--accent)]/[0.03] border border-[var(--accent)]/10 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
                  <Leaf className="w-5 h-5 text-[var(--accent)]" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">Oferta Bloom</p>
                  <p className="text-[9px] font-medium opacity-60 leading-tight">Ganhe 20% OFF em vasos inteligentes. Use o cupom BLOOM20.</p>
                </div>
                <ChevronLeft className="w-4 h-4 opacity-20 rotate-180" />
              </div>
            </div>

            {/* Badges */}
            <div className="px-4 grid grid-cols-4 gap-2">
              {['🌱', '☀️', '💧', '🏆'].map((emoji, i) => (
                <div key={i} className="bento-card p-3 flex items-center justify-center active:scale-95 transition-transform">
                  <span className="text-xl">{emoji}</span>
                </div>
              ))}
            </div>

            {/* Posts */}
            <div className="px-4 space-y-4">
              <div className="flex items-center gap-2 border-b border-[var(--border-main)] pb-2">
                <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-widest opacity-30">Atividade</h3>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {userPosts.map((post) => (
                  <div key={post.id} className="bento-card overflow-hidden">
                    {post.imageUrl && <img src={post.imageUrl} alt="" className="aspect-video w-full object-cover" loading="lazy" />}
                    <div className="p-4 space-y-3">
                      <p className="text-xs opacity-80 line-clamp-2 leading-relaxed font-medium">{post.content}</p>
                      <div className="flex justify-between items-center pt-3 border-t border-[var(--border-main)]">
                        <div className="flex gap-4">
                          <div className="flex items-center gap-1 text-rose-500 font-black text-[10px]"><Heart className="w-3 h-3 fill-current" /> {post.likesCount}</div>
                          <div className="flex items-center gap-1 opacity-40 font-black text-[10px]"><MessageSquare className="w-3 h-3" /> {post.commentsCount}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="settings-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="px-4 space-y-6"
          >
            <div className="flex items-center gap-4">
              <button onClick={() => setView('profile')} className="p-2 bento-card bg-[var(--bg-secondary)] active:scale-90"><X className="w-4 h-4" /></button>
              <h2 className="text-lg font-black uppercase tracking-tighter">Configurações</h2>
            </div>

            <div className="space-y-4">
              {/* Profile Config */}
              <div className="bento-card p-6 space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40">Conta</h3>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">Nickname</label>
                    <input 
                      type="text" 
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      className="w-full p-3 bento-inner bg-[var(--bg-main)] text-sm font-bold focus:outline-none focus:ring-1 ring-[var(--accent)] border border-[var(--border-main)]"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-50 ml-1">Bio</label>
                    <textarea 
                      value={newBio}
                      onChange={(e) => setNewBio(e.target.value)}
                      placeholder="Conte um pouco sobre suas plantas..."
                      className="w-full p-3 bento-inner bg-[var(--bg-main)] text-sm font-medium focus:outline-none focus:ring-1 ring-[var(--accent)] border border-[var(--border-main)] min-h-[80px]"
                    />
                  </div>
                </div>
              </div>

              {/* Theme Selector */}
              <div className="bento-card p-6 space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40">Personalização</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'light', icon: <Sun className="w-4 h-4" />, label: 'Luz' },
                    { id: 'dark', icon: <Moon className="w-4 h-4" />, label: 'Noite' },
                    { id: 'earth', icon: <Leaf className="w-4 h-4" />, label: 'Terra' }
                  ].map((t) => (
                    <button 
                      key={t.id}
                      onClick={() => setTheme(t.id as any)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all active:scale-95",
                        theme === t.id ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-[var(--border-main)] bg-[var(--bg-main)] opacity-40"
                      )}
                    >
                      {t.icon}
                      <span className="text-[9px] font-black uppercase tracking-widest">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notifications */}
              <div className="bento-card p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", notifications ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "bg-[var(--bg-main)] opacity-30")}>
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Notificações</h4>
                    <p className="text-[9px] opacity-40 font-medium tracking-tight">Alertas de rega e rede social</p>
                  </div>
                </div>
                <button 
                  onClick={() => setNotifications(!notifications)}
                  className={cn(
                    "w-12 h-6 rounded-full relative transition-colors",
                    notifications ? "bg-[var(--accent)]" : "bg-[var(--bg-secondary)]"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    notifications ? "right-1" : "left-1"
                  )} />
                </button>
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleUpdateProfile}
                  disabled={isUpdating}
                  className="w-full py-4 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-[24px] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-xl active:scale-95 disabled:opacity-50"
                >
                  {isUpdating ? "Salvando..." : <Check className="w-4 h-4" />}
                  {isUpdating ? "" : "Salvar Alterações"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
