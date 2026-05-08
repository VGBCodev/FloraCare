import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValue, useTransform } from 'motion/react';
import { MessageSquare, Heart, Send, Plus, Search, User as UserIcon, LogIn, Image as ImageIcon, Camera, Users, Filter, X, Globe, ArrowUpRight, Loader2, RefreshCcw } from 'lucide-react';
import { communityService, Post, Group, Comment } from '../services/communityService';
import { auth, signInWithGoogle, FirebaseUser, onAuthStateChanged } from '../lib/firebase';
import { cn } from '../lib/utils';

function CommentsSection({ postId, user, onClose }: { postId: string, user: FirebaseUser | null, onClose: () => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsub = communityService.subscribeToComments(postId, setComments);
    return unsub;
  }, [postId]);

  const handleSubmit = async () => {
    if (!newComment.trim() || isSubmitting) return;
    if (!user) {
      try {
        await signInWithGoogle();
      } catch (e) {}
      return;
    }

    const authorData = user ? { name: user.displayName || '', photo: user.photoURL || '' } : undefined;

    setIsSubmitting(true);
    try {
      await communityService.addComment(postId, newComment, authorData);
      setNewComment('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-4 mt-4 border-t border-[var(--border-main)] space-y-4">
      <div className="flex items-center justify-between">
        <h5 className="text-[9px] font-black uppercase opacity-40 tracking-widest">Comentários ({comments.length})</h5>
        <button onClick={onClose} className="p-1 opacity-40 hover:opacity-100">
          <X className="w-3 h-3" />
        </button>
      </div>
      
      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-2 text-left">
            {comment.authorPhoto ? (
              <img src={comment.authorPhoto} alt="" className="w-6 h-6 rounded-full object-cover mt-0.5" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mt-0.5">
                <UserIcon className="w-3 h-3 opacity-30" />
              </div>
            )}
            <div className="flex-1 bg-[var(--bg-main)] rounded-xl p-3">
              <div className="flex justify-between items-start mb-0.5">
                <span className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-tighter">{comment.authorName}</span>
                <span className="text-[8px] font-medium opacity-50">
                  {comment.createdAt?.toDate ? new Date(comment.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-main)]/80 leading-snug">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input 
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Adicione um comentário..."
          className="flex-1 px-4 py-2 bg-[var(--bg-main)] text-[var(--text-main)] rounded-xl text-[11px] focus:outline-none border border-[var(--border-main)]"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <button 
          onClick={handleSubmit}
          disabled={!newComment.trim() || isSubmitting}
          className="p-2 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-xl active:scale-95 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

const PostCard = memo(({ post, user, likedPosts, activeCommentsPostId, groups, selectedGroup, onToggleLike, setActiveCommentsPostId, onViewProfile }: { 
  post: Post, 
  user: FirebaseUser | null, 
  likedPosts: Set<string>, 
  activeCommentsPostId: string | null, 
  groups: Group[], 
  selectedGroup: Group | null,
  onToggleLike: (id: string) => void,
  setActiveCommentsPostId: (id: string | null) => void,
  onViewProfile?: (uid: string) => void
}) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bento-card overflow-hidden"
    >
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div 
            className="cursor-pointer flex items-center gap-2"
            onClick={() => post.authorId && onViewProfile?.(post.authorId)}
          >
            {post.authorPhoto ? (
              <img src={post.authorPhoto} alt="" className="w-8 h-8 rounded-full object-cover border border-[var(--border-main)]" loading="lazy" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center">
                <UserIcon className="w-4 h-4 opacity-30" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h4 
              className="font-black text-[var(--text-main)] text-sm uppercase tracking-tighter leading-none cursor-pointer hover:text-[var(--accent)] transition-colors"
              onClick={() => post.authorId && onViewProfile?.(post.authorId)}
            >
              {post.authorName}
              {post.groupId && !selectedGroup && (
                <span className="ml-2 text-[9px] text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-full">
                  {groups.find(g => g.id === post.groupId)?.name || '...'}
                </span>
              )}
            </h4>
            <p className="text-[9px] font-black opacity-40 uppercase tracking-widest mt-1">
              {post.createdAt?.toDate ? new Date(post.createdAt.toDate()).toLocaleDateString() : 'Agora'}
            </p>
          </div>
        </div>

        <p className="text-[var(--text-main)]/90 text-[13px] leading-relaxed font-medium">
          {post.content}
        </p>

        {post.imageUrl && (
          <div className="aspect-video w-full rounded-xl overflow-hidden mt-2 cursor-pointer" onClick={() => window.open(post.imageUrl, '_blank')}>
            <img src={post.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}

        <div className="pt-4 flex items-center justify-between border-t border-[var(--border-main)]">
          <div className="flex gap-6">
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleLike(post.id); }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-all active:scale-125 bg-[var(--bg-main)]",
                likedPosts.has(post.id) ? "text-rose-500 bg-rose-500/10" : "opacity-40 hover:opacity-100"
              )}
            >
              <Heart className={cn("w-4 h-4", likedPosts.has(post.id) && "fill-current")} />
              <span className="text-[11px] font-black">{post.likesCount}</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setActiveCommentsPostId(activeCommentsPostId === post.id ? null : post.id); }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-all bg-[var(--bg-main)]",
                activeCommentsPostId === post.id ? "text-[var(--accent)] bg-[var(--accent)]/10" : "opacity-40 hover:text-[var(--text-main)] hover:bg-[var(--border-main)]"
              )}
            >
              <MessageSquare className={cn("w-4 h-4", activeCommentsPostId === post.id && "fill-current")} />
              <span className="text-[11px] font-black">{post.commentsCount}</span>
            </button>
          </div>
          {post.plantType && (
            <span className="text-[8px] font-black text-[var(--accent)] uppercase tracking-widest opacity-60">
              #{post.plantType}
            </span>
          )}
        </div>

        {activeCommentsPostId === post.id && (
          <CommentsSection 
            postId={post.id} 
            user={user} 
            onClose={() => setActiveCommentsPostId(null)} 
          />
        )}
      </div>
    </motion.div>
  );
});

const AdCard = ({ type = 'sponsored' }: { type?: 'sponsored' | 'banner' }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bento-card overflow-hidden border-2 border-[var(--accent)]/20 bg-[var(--accent)]/[0.02]"
    >
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
              <Globe className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div>
              <h4 className="font-black text-[var(--text-main)] text-[10px] uppercase tracking-widest leading-none">Anúncio Bloom</h4>
              <p className="text-[8px] font-black text-[var(--accent)] uppercase tracking-widest mt-1">Patrocinado</p>
            </div>
          </div>
          <button className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors">
            <X className="w-3 h-3 opacity-30" />
          </button>
        </div>

        {type === 'sponsored' ? (
          <>
            <p className="text-[var(--text-main)]/90 text-xs leading-relaxed font-medium">
              Cultive seu jardim com os melhores fertilizantes orgânicos da Terra Fertil. Desconto exclusivo para membros Bloom! 🌿
            </p>
            <div className="aspect-[16/9] w-full rounded-xl overflow-hidden relative">
              <img 
                src="https://images.unsplash.com/photo-1585336261022-680e295ce3fe?q=80&w=2070&auto=format&fit=crop" 
                alt="Ad" 
                className="w-full h-full object-cover" 
                loading="lazy" 
              />
              <div className="absolute bottom-3 right-3">
                <button className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95 transition-transform">
                  Saiba Mais <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 space-y-2">
              <p className="text-xs font-black leading-tight uppercase">Sementes Raras de Orquídeas 🌸</p>
              <button className="px-3 py-1.5 bg-[var(--text-main)] text-[var(--bg-card)] rounded-lg font-black text-[8px] uppercase tracking-widest">Comprar Agora</button>
            </div>
            <img src="https://images.unsplash.com/photo-1534713840784-9345ee3914a8?q=80&w=2000&auto=format&fit=crop" className="w-20 h-20 rounded-xl object-cover" alt="" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export function Community({ garden = [], onViewProfile }: { garden?: any[], onViewProfile?: (userId: string) => void }) {
  const [activeTab, setActiveTab] = useState<'feed' | 'communities'>('feed');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [joinedGroups, setJoinedGroups] = useState<Set<string>>(new Set());
  const [groups, setGroups] = useState<Group[]>([]);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [selectedPlantId, setSelectedPlantId] = useState<string>('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupImage, setNewGroupImage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const groupFileInputRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Pull to refresh motion values
  const pullDistance = 80;
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, pullDistance], [0, 1]);
  const rotate = useTransform(y, [0, pullDistance], [0, 180]);

  const loadInitialPosts = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const { posts: newPosts, lastDoc: newLastDoc } = await communityService.getPosts(10, null, selectedGroup?.id);
      setPosts(newPosts);
      setLastDoc(newLastDoc);
      setHasMore(newPosts.length === 10);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedGroup]);

  const loadMorePosts = useCallback(async () => {
    if (isFetchingMore || !hasMore || !lastDoc) return;

    setIsFetchingMore(true);
    try {
      const { posts: newPosts, lastDoc: newLastDoc } = await communityService.getPosts(10, lastDoc, selectedGroup?.id);
      if (newPosts.length > 0) {
        setPosts(prev => [...prev, ...newPosts]);
        setLastDoc(newLastDoc);
        setHasMore(newPosts.length === 10);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsFetchingMore(false);
    }
  }, [isFetchingMore, hasMore, lastDoc, selectedGroup]);

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    if (activeTab !== 'feed' || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [activeTab, hasMore, isLoading, loadMorePosts]);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Community login error:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          // Fetch Firestore profile to get high-res photo
          const profile = await communityService.getProfile(u.uid);
          setUser({
            ...u,
            photoURL: profile?.photoURL || u.photoURL,
            displayName: profile?.displayName || u.displayName
          });

          const [userLikes, userGroups] = await Promise.all([
            communityService.getUserLikes(),
            communityService.getJoinedGroups()
          ]);
          setLikedPosts(new Set(userLikes));
          setJoinedGroups(new Set(userGroups));
        } catch (e) {
          console.error("Error fetching user data:", e);
          setUser(u);
        }
      } else {
        setUser(null);
        setLikedPosts(new Set());
        setJoinedGroups(new Set());
      }
    });

    loadInitialPosts();

    const unsubscribeGroups = communityService.subscribeToGroups((fetchedGroups) => {
      setGroups(fetchedGroups);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeGroups();
    };
  }, [selectedGroup, loadInitialPosts]);

  const handleToggleLike = async (postId: string) => {
    if (!user) {
      handleLogin();
      return;
    }
    
    try {
      const liked = await communityService.toggleLike(postId);
      setLikedPosts(prev => {
        const next = new Set(prev);
        if (liked) next.add(postId);
        else next.delete(postId);
        return next;
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'post' | 'group') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await communityService.compressImage(file);
      if (type === 'post') setNewPostImage(compressed);
      else setNewGroupImage(compressed);
    } catch (error) {
      console.error(error);
      alert("Erro ao processar imagem.");
    }
  };

  const handleUpdateGroupImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedGroup || !user || isSubmitting) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    try {
      const compressed = await communityService.compressImage(file);
      await communityService.updateGroup(selectedGroup.id, { imageUrl: compressed });
      setSelectedGroup(prev => prev ? { ...prev, imageUrl: compressed } : null);
    } catch (error) {
      console.error(error);
      alert("Falha ao atualizar imagem da comunidade.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || isSubmitting) return;

    const authorData = user ? { name: user.displayName || '', photo: user.photoURL || '' } : undefined;
    const plantName = garden.find(p => p.id === selectedPlantId)?.commonName || '';

    setIsSubmitting(true);
    try {
      await communityService.createPost(newPostContent, newPostImage, plantName, selectedGroup?.id, authorData);
      setNewPostContent('');
      setNewPostImage('');
      setSelectedPlantId('');
      setShowCreate(false);
    } catch (error) {
      console.error(error);
      alert("Falha ao criar publicação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinLeaveGroup = async (groupId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user) {
      handleLogin();
      return;
    }

    const isJoined = joinedGroups.has(groupId);
    try {
      if (isJoined) {
        await communityService.leaveGroup(groupId);
        setJoinedGroups(prev => {
          const next = new Set(prev);
          next.delete(groupId);
          return next;
        });
      } else {
        await communityService.joinGroup(groupId);
        setJoinedGroups(prev => {
          const next = new Set(prev);
          next.add(groupId);
          return next;
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await communityService.createGroup(newGroupName, newGroupDesc, newGroupImage);
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupImage('');
      setShowCreateGroup(false);
    } catch (error) {
      console.error(error);
      alert("Falha ao criar comunidade.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto pb-24 relative overflow-hidden">
      {/* Pull to Refresh Indicator */}
      <motion.div 
        style={{ y: y, opacity }}
        className="absolute top-0 left-0 right-0 flex justify-center pt-4 z-50 pointer-events-none"
      >
        <motion.div 
          style={{ rotate }}
          animate={isRefreshing ? { rotate: 360 } : {}}
          transition={isRefreshing ? { repeat: Infinity, duration: 1, ease: "linear" } : {}}
          className="bg-[var(--accent)] text-white p-2 rounded-full shadow-lg"
        >
          <RefreshCcw className="w-4 h-4" />
        </motion.div>
      </motion.div>

      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.5}
        onDrag={(e, info) => {
          if (info.offset.y > 0) {
            y.set(info.offset.y);
          }
        }}
        onDragEnd={(e, info) => {
          if (info.offset.y > pullDistance) {
            loadInitialPosts(true);
          }
          y.set(0);
        }}
        className="space-y-6"
      >
        <div className="flex justify-between items-center px-4 pt-6">
          <div className="space-y-0.5">
          <h2 className="text-2xl font-black text-[var(--text-main)] uppercase tracking-tighter leading-none">Comunidade</h2>
          <p className="opacity-40 text-[10px] font-black uppercase tracking-widest">Troque dicas</p>
        </div>
        <div className="flex gap-2 items-center">
          {!user ? (
            <button 
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="px-4 py-2 bg-[var(--text-main)] text-[var(--bg-card)] rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 shadow-lg disabled:opacity-50"
            >
              {isLoggingIn ? "..." : "Entrar"}
            </button>
          ) : (
            <button 
              onClick={() => activeTab === 'feed' ? setShowCreate(true) : setShowCreateGroup(true)}
              className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 shadow-lg flex items-center gap-2"
            >
              <Plus className="w-3 h-3" />
              {activeTab === 'feed' ? 'Postar' : 'Criar'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <div className="flex bg-[var(--bg-secondary)] p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('feed')}
            className={cn(
              "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
              activeTab === 'feed' ? "bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm" : "opacity-40"
            )}
          >
            Feed
          </button>
          <button 
            onClick={() => setActiveTab('communities')}
            className={cn(
              "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
              activeTab === 'communities' ? "bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm" : "opacity-40"
            )}
          >
            Comunidades
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'feed' ? (
          <motion.div 
            key="feed"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6"
          >
            {/* Create Post Form */}
            <AnimatePresence>
              {showCreate && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="mx-4 p-6 bento-card border border-[var(--accent)]/20"
                >
                  <div className="space-y-4">
                    <textarea 
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="O que está acontecendo no seu jardim?"
                      className="w-full min-h-[100px] p-4 rounded-xl bg-[var(--bg-main)] text-[var(--text-main)] text-xs focus:outline-none border border-[var(--border-main)]"
                    />

                    {garden.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">Associar Planta (opcional)</label>
                        <select 
                          value={selectedPlantId}
                          onChange={(e) => setSelectedPlantId(e.target.value)}
                          className="w-full p-3 bg-[var(--bg-main)] rounded-xl text-xs font-bold text-[var(--text-main)] border border-[var(--border-main)] focus:ring-1 ring-[var(--accent)]"
                        >
                          <option value="">Nenhuma planta selecionada</option>
                          {garden.map((plant: any) => (
                            <option key={plant.id} value={plant.id}>
                              {plant.commonName}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    {newPostImage && (
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-[var(--bg-secondary)]">
                        <img src={newPostImage} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => setNewPostImage('')}
                          className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full active:scale-95"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          onChange={(e) => handleImageUpload(e, 'post')}
                          accept="image/*"
                          className="hidden"
                        />
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1 py-3 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2"
                        >
                          <ImageIcon className="w-4 h-4" />
                          Imagem
                        </button>
                        <button 
                          onClick={() => setShowCreate(false)}
                          className="flex-1 px-4 py-3 bg-[var(--bg-secondary)] rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95"
                        >
                          Cancelar
                        </button>
                      </div>
                      <button 
                        disabled={!newPostContent.trim() || isSubmitting}
                        onClick={handleCreatePost}
                        className="w-full py-3 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 disabled:opacity-50"
                      >
                        {isSubmitting ? "..." : "Publicar"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Posts List */}
            <div className="grid grid-cols-1 gap-6 px-4">
              {isLoading ? (
                <div className="py-20 text-center space-y-4">
                  <div className="w-10 h-10 border-4 border-[var(--border-main)] border-t-[var(--accent)] rounded-full animate-spin mx-auto" />
                  <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Carregando feed...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-[var(--bg-secondary)] rounded-2xl flex items-center justify-center opacity-20">
                    <MessageSquare />
                  </div>
                  <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Nenhuma publicação ainda</p>
                </div>
              ) : (
                posts.map((post, index) => (
                  <React.Fragment key={post.id}>
                    <PostCard 
                      post={post}
                      user={user}
                      likedPosts={likedPosts}
                      activeCommentsPostId={activeCommentsPostId}
                      groups={groups}
                      selectedGroup={selectedGroup}
                      onToggleLike={handleToggleLike}
                      setActiveCommentsPostId={setActiveCommentsPostId}
                      onViewProfile={onViewProfile}
                    />
                    {(index + 1) % 3 === 0 && <AdCard type={index % 6 === 0 ? 'banner' : 'sponsored'} />}
                  </React.Fragment>
                ))
              )}

              {/* Infinite Scroll Loader */}
              <div ref={loadMoreRef} className="py-8 flex justify-center">
                {isFetchingMore && (
                  <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin" />
                )}
                {!hasMore && posts.length > 0 && (
                  <p className="text-[10px] font-black opacity-30 uppercase tracking-widest">Fim do feed</p>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="communities"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-6"
          >
            {selectedGroup ? (
              <div className="px-4 space-y-6">
                {/* Group Header Detail */}
                <div className="bento-card bg-[var(--bg-secondary)] p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <button 
                      onClick={() => setSelectedGroup(null)}
                      className="p-2 bg-[var(--bg-main)] rounded-xl active:scale-95"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleJoinLeaveGroup(selectedGroup.id)}
                      className={cn(
                        "px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95",
                        joinedGroups.has(selectedGroup.id) ? "bg-[var(--bg-main)]" : "bg-[var(--accent)] text-[var(--accent-foreground)]"
                      )}
                    >
                      {joinedGroups.has(selectedGroup.id) ? 'Sair' : 'Participar'}
                    </button>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-[var(--bg-main)] overflow-hidden flex-shrink-0 relative group">
                      {selectedGroup.imageUrl ? (
                        <img src={selectedGroup.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Users className="w-8 h-8 opacity-20" />
                        </div>
                      )}
                      
                      {/* Admin Image Edit Overlay */}
                      {user?.uid === selectedGroup.creatorId && (
                        <div 
                          onClick={() => document.getElementById('group-image-update')?.click()}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                        >
                          <Camera className="w-6 h-6 text-white" />
                          <input 
                            id="group-image-update"
                            type="file" 
                            accept="image/*"
                            className="hidden"
                            onChange={handleUpdateGroupImage}
                          />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-black uppercase tracking-tighter leading-none">{selectedGroup.name}</h3>
                      <p className="text-[10px] opacity-60 font-medium leading-tight">{selectedGroup.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Users className="w-3 h-3 text-[var(--accent)]" />
                        <span className="text-[9px] font-black uppercase text-[var(--accent)]">{selectedGroup.membersCount} MEMBROS</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Group Feed Post Form */}
                {joinedGroups.has(selectedGroup.id) && (
                  <div className="space-y-4">
                    {!showCreate ? (
                      <button 
                        onClick={() => setShowCreate(true)}
                        className="w-full p-4 bento-card text-left opacity-60 text-xs font-medium"
                      >
                        Compartilhe com a comunidade...
                      </button>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-6 bento-card border border-[var(--accent)]/20"
                      >
                         <div className="space-y-4">
                            <textarea 
                              value={newPostContent}
                              onChange={(e) => setNewPostContent(e.target.value)}
                              placeholder={`O que está acontecendo no ${selectedGroup.name}?`}
                              className="w-full min-h-[100px] p-4 rounded-xl bg-[var(--bg-main)] text-[var(--text-main)] text-xs focus:outline-none border border-[var(--border-main)]"
                            />

                            {garden.length > 0 && (
                              <div className="space-y-1.5 mt-4">
                                <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">Associar Planta (opcional)</label>
                                <select 
                                  value={selectedPlantId}
                                  onChange={(e) => setSelectedPlantId(e.target.value)}
                                  className="w-full p-3 bg-[var(--bg-main)] rounded-xl text-xs font-bold text-[var(--text-main)] border border-[var(--border-main)] focus:ring-1 ring-[var(--accent)]"
                                >
                                  <option value="">Nenhuma planta selecionada</option>
                                  {garden.map((plant: any) => (
                                    <option key={plant.id} value={plant.id}>
                                      {plant.commonName}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                            
                            {newPostImage && (
                              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-[var(--bg-secondary)]">
                                <img src={newPostImage} alt="Preview" className="w-full h-full object-cover" />
                                <button 
                                  onClick={() => setNewPostImage('')}
                                  className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full active:scale-95"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            <div className="flex gap-2">
                              <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 py-3 bg-[var(--bg-main)] border border-[var(--border-main)] opacity-60 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2"
                              >
                                <ImageIcon className="w-4 h-4" />
                                Foto
                              </button>
                              <button 
                                onClick={() => setShowCreate(false)}
                                className="flex-1 px-4 py-3 bg-[var(--bg-secondary)] rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95"
                              >
                                Cancelar
                              </button>
                            </div>
                            <button 
                              disabled={!newPostContent.trim() || isSubmitting}
                              onClick={handleCreatePost}
                              className="w-full py-3 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 disabled:opacity-50"
                            >
                              {isSubmitting ? "..." : "Publicar"}
                            </button>
                         </div>
                      </motion.div>
                    )}

                    {/* Group Posts List */}
                    <div className="space-y-4">
                       {posts.filter(p => p.groupId === selectedGroup.id).length === 0 ? (
                         <div className="py-12 text-center border-2 border-dashed border-[var(--border-main)] rounded-2xl">
                           <p className="text-[10px] font-black opacity-30 uppercase tracking-widest">Seja o primeiro a postar!</p>
                         </div>
                       ) : (
                           posts.filter(p => p.groupId === selectedGroup.id).map((post, index) => (
                             <React.Fragment key={post.id}>
                               <PostCard 
                                 post={post}
                                 user={user}
                                 likedPosts={likedPosts}
                                 activeCommentsPostId={activeCommentsPostId}
                                 groups={groups}
                                 selectedGroup={selectedGroup}
                                 onToggleLike={handleToggleLike}
                                 setActiveCommentsPostId={setActiveCommentsPostId}
                                 onViewProfile={onViewProfile}
                               />
                               {(index + 1) % 3 === 0 && <AdCard type="banner" />}
                             </React.Fragment>
                           ))
                         )}
                      </div>
                  </div>
                )}

                {!joinedGroups.has(selectedGroup.id) && (
                  <div className="py-20 text-center flex flex-col items-center gap-4 bg-[var(--bg-secondary)] rounded-2xl">
                    <Users className="w-12 h-12 opacity-20" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-widest">Acesso Restrito</p>
                      <p className="text-[9px] font-medium opacity-50">Participe da comunidade para ver e interagir.</p>
                    </div>
                    <button 
                      onClick={() => handleJoinLeaveGroup(selectedGroup.id)}
                      className="px-6 py-2 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95"
                    >
                      Participar Agora
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Create Group Form */}
                <AnimatePresence>
                  {showCreateGroup && (
                    <motion.div 
                      key="create-group"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="mx-4 p-6 bento-card border border-[var(--accent)]/20"
                    >
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black opacity-40 uppercase tracking-widest pl-2">Nome da Comunidade</label>
                          <input 
                            type="text"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            placeholder="Ex: Amantes de Suculentas"
                            className="w-full p-4 rounded-xl bg-[var(--bg-main)] text-[var(--text-main)] text-xs focus:outline-none border border-[var(--border-main)]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black opacity-40 uppercase tracking-widest pl-2">Descrição</label>
                          <textarea 
                            value={newGroupDesc}
                            onChange={(e) => setNewGroupDesc(e.target.value)}
                            placeholder="Sobre o que é esta comunidade?"
                            className="w-full min-h-[80px] p-4 rounded-xl bg-[var(--bg-main)] text-[var(--text-main)] text-xs focus:outline-none border border-[var(--border-main)]"
                          />
                        </div>

                        {newGroupImage && (
                          <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-[var(--bg-secondary)]">
                            <img src={newGroupImage} alt="Preview" className="w-full h-full object-cover" />
                            <button 
                              onClick={() => setNewGroupImage('')}
                              className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full active:scale-95"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <input 
                              type="file" 
                              ref={groupFileInputRef}
                              onChange={(e) => handleImageUpload(e, 'group')}
                              accept="image/*"
                              className="hidden"
                            />
                            <button 
                              onClick={() => groupFileInputRef.current?.click()}
                              className="flex-1 py-3 bg-[var(--bg-secondary)] opacity-60 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2"
                            >
                              <Camera className="w-4 h-4" />
                              Foto
                            </button>
                            <button 
                              onClick={() => setShowCreateGroup(false)}
                              className="flex-1 px-4 py-3 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95"
                            >
                              Cancelar
                            </button>
                          </div>
                          <button 
                            disabled={!newGroupName.trim() || isSubmitting}
                            onClick={handleCreateGroup}
                            className="w-full py-3 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 disabled:opacity-50"
                          >
                            {isSubmitting ? "..." : "Criar Comunidade"}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 gap-4 px-4">
                  {groups.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-[var(--bg-secondary)] rounded-2xl flex items-center justify-center opacity-20">
                        <Users />
                      </div>
                      <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Nenhuma comunidade ainda</p>
                    </div>
                  ) : (
                    groups.map((group) => (
                      <motion.div 
                        key={group.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => setSelectedGroup(group)}
                        className="bento-card overflow-hidden group cursor-pointer active:scale-[0.98] transition-transform"
                      >
                        <div className="flex items-center p-4 gap-4">
                          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-secondary)] overflow-hidden flex-shrink-0">
                            {group.imageUrl ? (
                              <img src={group.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center opacity-30">
                                <Users className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-black text-[var(--text-main)] text-sm uppercase tracking-tighter truncate">{group.name}</h4>
                            <p className="text-[10px] font-medium opacity-60 line-clamp-2 leading-tight mt-1">{group.description}</p>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-1 text-[var(--accent)]">
                                <Users className="w-3 h-3" />
                                <span className="text-[9px] font-black uppercase">{group.membersCount}</span>
                              </div>
                              {joinedGroups.has(group.id) && (
                                <span className="text-[8px] font-black text-[var(--accent)] uppercase tracking-widest bg-[var(--accent)]/10 px-2 py-1 rounded-full">
                                  Membro
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </motion.div>
    </div>
  );
}
