import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  increment,
  where,
  getDocs,
  writeBatch,
  setDoc,
  deleteDoc,
  getDoc,
  collectionGroup,
  limit,
  startAfter
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { notificationService, NotificationType } from './notificationService';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  imageUrl?: string;
  createdAt: any;
  likesCount: number;
  commentsCount: number;
  plantType?: string;
  groupId?: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  creatorId: string;
  membersCount: number;
  createdAt: any;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  createdAt: any;
}

export const communityService = {
  async compressImage(file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  },

  async createPost(content: string, imageUrl?: string, plantType?: string, groupId?: string, authorOverride?: { name: string, photo: string }) {
    if (!auth.currentUser) throw new Error("Must be signed in to post");
    
    const path = 'posts';
    try {
      const docRef = await addDoc(collection(db, path), {
        authorId: auth.currentUser.uid,
        authorName: authorOverride?.name || auth.currentUser.displayName || 'Anonymous Botanist',
        authorPhoto: authorOverride?.photo || auth.currentUser.photoURL || '',
        content,
        imageUrl: imageUrl || '',
        plantType: plantType || '',
        groupId: groupId || '',
        createdAt: serverTimestamp(),
        likesCount: 0,
        commentsCount: 0
      });

      // Notify group members if it's a group post
      if (groupId) {
        const groupSnap = await getDoc(doc(db, 'groups', groupId));
        if (groupSnap.exists()) {
          const groupData = groupSnap.data();
          // For now, let's at least notify the creator.
          // In a real app we'd query members, but let's notify the creator as a start.
          notificationService.createNotification({
            recipientId: groupData.creatorId,
            senderId: auth.currentUser.uid,
            senderName: authorOverride?.name || auth.currentUser.displayName || 'Alguém',
            type: NotificationType.NEW_POST,
            postId: docRef.id,
            groupId: groupId,
            groupName: groupData.name
          });
        }
      }

      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async createGroup(name: string, description: string, imageUrl?: string) {
    if (!auth.currentUser) throw new Error("Must be signed in to create groups");
    
    try {
      const batch = writeBatch(db);
      const groupRef = doc(collection(db, 'groups'));
      const userId = auth.currentUser.uid;
      const memberRef = doc(db, 'groups', groupRef.id, 'members', userId);

      const groupData = {
        name,
        description,
        imageUrl: imageUrl || '',
        creatorId: userId,
        membersCount: 1,
        createdAt: serverTimestamp()
      };

      batch.set(groupRef, groupData);
      batch.set(memberRef, {
        userId,
        joinedAt: serverTimestamp()
      });

      await batch.commit();
      return groupRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'groups');
    }
  },

  subscribeToGroups(callback: (groups: Group[]) => void) {
    const path = 'groups';
    const q = query(
      collection(db, path), 
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    return onSnapshot(q, (snapshot) => {
      const groups = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Group[];
      callback(groups);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  subscribeToPosts(callback: (posts: Post[]) => void, groupId?: string) {
    const path = 'posts';
    let q;
    
    if (groupId) {
      q = query(
        collection(db, path), 
        where('groupId', '==', groupId), 
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    } else {
      q = query(
        collection(db, path), 
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    }
    
    return onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      callback(posts);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async getPosts(limitCount = 10, lastDoc?: any, groupId?: string) {
    const path = 'posts';
    let q;
    
    if (groupId) {
      q = query(
        collection(db, path),
        where('groupId', '==', groupId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    } else {
      q = query(
        collection(db, path),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    }

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    try {
      const snapshot = await getDocs(q);
      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as object)
      })) as Post[];
      
      return {
        posts,
        lastDoc: snapshot.docs[snapshot.docs.length - 1]
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return { posts: [], lastDoc: null };
    }
  },

  async toggleLike(postId: string) {
    if (!auth.currentUser) throw new Error("Must be signed in to like");
    const userId = auth.currentUser.uid;
    const likeRef = doc(db, 'posts', postId, 'likes', userId);
    const postRef = doc(db, 'posts', postId);
    
    try {
      // Check if already liked
      const likeSnap = await getDoc(likeRef);
      const isLiked = likeSnap.exists();
      
      const batch = writeBatch(db);
      
      if (isLiked) {
        batch.delete(likeRef);
        batch.update(postRef, {
          likesCount: increment(-1)
        });
      } else {
        batch.set(likeRef, {
          userId,
          createdAt: serverTimestamp()
        });
        batch.update(postRef, {
          likesCount: increment(1)
        });

        // Trigger Notification
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
          const postData = postSnap.data();
          notificationService.createNotification({
            recipientId: postData.authorId,
            senderId: userId,
            senderName: auth.currentUser.displayName || 'Alguém',
            type: NotificationType.LIKE,
            postId: postId
          });
        }
      }
      
      await batch.commit();
      return !isLiked;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `posts/${postId}/likes`);
    }
  },

  async getUserLikes() {
    if (!auth.currentUser) return [];
    const path = 'likes';
    const q = query(collectionGroup(db, path), where('userId', '==', auth.currentUser.uid));
    try {
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.ref.parent.parent?.id).filter(Boolean) as string[];
    } catch (error) {
      // It's possible the collectionGroup index isn't ready or it fails
      console.error("Collection group query failed for likes:", error);
      return [];
    }
  },

  async getUserPosts(userId: string) {
    const path = 'posts';
    const q = query(collection(db, path), where('authorId', '==', userId), orderBy('createdAt', 'desc'));
    try {
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  async getJoinedGroups() {
    if (!auth.currentUser) return [];
    const q = query(collectionGroup(db, 'members'), where('userId', '==', auth.currentUser.uid));
    try {
      const snap = await getDocs(q);
      return snap.docs.map(doc => doc.ref.parent.parent?.id).filter(Boolean) as string[];
    } catch (e) {
      console.error("Collection group query failed for members:", e);
      return [];
    }
  },

  async updateUserProfile(data: { displayName?: string, photoURL?: string, bio?: string, email?: string }) {
    if (!auth.currentUser) throw new Error("Must be signed in to update profile");
    const userId = auth.currentUser.uid;
    const userRef = doc(db, 'users', userId);
    
    try {
      const snap = await getDoc(userRef);
      const isCreate = !snap.exists();

      const payload: any = {
        ...data,
        uid: userId,
        updatedAt: serverTimestamp()
      };
      
      if (isCreate) {
        payload.createdAt = serverTimestamp();
        payload.email = data.email || auth.currentUser.email || '';
        payload.displayName = data.displayName || auth.currentUser.displayName || 'Anonymous';
      }

      await setDoc(userRef, payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
    }
  },

  async getProfile(userId: string) {
    const userRef = doc(db, 'users', userId);
    try {
      const snap = await getDoc(userRef);
      return snap.exists() ? snap.data() : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
    }
  },

  async joinGroup(groupId: string) {
    if (!auth.currentUser) throw new Error("Must be signed in to join");
    const userId = auth.currentUser.uid;
    const memberRef = doc(db, 'groups', groupId, 'members', userId);
    const groupRef = doc(db, 'groups', groupId);

    try {
      const batch = writeBatch(db);
      batch.set(memberRef, {
        userId,
        joinedAt: serverTimestamp()
      });
      batch.update(groupRef, {
        membersCount: increment(1)
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `groups/${groupId}/members/${userId}`);
    }
  },

  async leaveGroup(groupId: string) {
    if (!auth.currentUser) throw new Error("Must be signed in to leave");
    const userId = auth.currentUser.uid;
    const memberRef = doc(db, 'groups', groupId, 'members', userId);
    const groupRef = doc(db, 'groups', groupId);

    try {
      const batch = writeBatch(db);
      batch.delete(memberRef);
      batch.update(groupRef, {
        membersCount: increment(-1)
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `groups/${groupId}/members/${userId}`);
    }
  },

  async updateGroup(groupId: string, data: { name?: string, description?: string, imageUrl?: string }) {
    if (!auth.currentUser) throw new Error("Must be signed in to update groups");
    const groupRef = doc(db, 'groups', groupId);
    
    try {
      await updateDoc(groupRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `groups/${groupId}`);
    }
  },

  async isMember(groupId: string) {
    if (!auth.currentUser) return false;
    const memberRef = doc(db, 'groups', groupId, 'members', auth.currentUser.uid);
    try {
      const snap = await getDoc(memberRef);
      return snap.exists();
    } catch (error) {
      console.error(error);
      return false;
    }
  },

  async addComment(postId: string, content: string, authorOverride?: { name: string, photo: string }) {
    if (!auth.currentUser) throw new Error("Must be signed in to comment");
    
    const commentRef = doc(collection(db, 'posts', postId, 'comments'));
    try {
      const batch = writeBatch(db);
      const postRef = doc(db, 'posts', postId);

      batch.set(commentRef, {
        postId,
        authorId: auth.currentUser.uid,
        authorName: authorOverride?.name || auth.currentUser.displayName || 'Anonymous',
        authorPhoto: authorOverride?.photo || auth.currentUser.photoURL || '',
        content,
        createdAt: serverTimestamp()
      });

      batch.update(postRef, {
        commentsCount: increment(1)
      });

      await batch.commit();

      // Trigger Notification
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        const postData = postSnap.data();
        notificationService.createNotification({
          recipientId: postData.authorId,
          senderId: auth.currentUser.uid,
          senderName: authorOverride?.name || auth.currentUser.displayName || 'Alguém',
          type: NotificationType.COMMENT,
          postId: postId
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `posts/${postId}/comments/${commentRef.id}`);
    }
  },

  subscribeToComments(postId: string, callback: (comments: Comment[]) => void) {
    const path = `posts/${postId}/comments`;
    const q = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'));
    
    return onSnapshot(q, (snapshot) => {
      const comments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      callback(comments);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  }
};
