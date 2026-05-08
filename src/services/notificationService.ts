import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  where, 
  limit, 
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export enum NotificationType {
  LIKE = 'like',
  COMMENT = 'comment',
  NEW_POST = 'new_post'
}

export interface Notification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  type: NotificationType;
  postId?: string;
  groupId?: string;
  groupName?: string;
  isRead: boolean;
  createdAt: any;
}

export const notificationService = {
  async createNotification(notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) {
    if (notification.recipientId === notification.senderId) return; // Don't notify yourself

    try {
      await addDoc(collection(db, 'notifications'), {
        ...notification,
        isRead: false,
        createdAt: serverTimestamp()
      });

      // Browser Notification
      if (Notification.permission === 'granted') {
        const title = this.getNotificationTitle(notification);
        new window.Notification(title, {
          body: `Bloom Community: ${notification.senderName} interacted with your content.`,
          icon: '/favicon.ico' // Or a better icon
        });
      }
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  },

  getNotificationTitle(n: Omit<Notification, 'id' | 'isRead' | 'createdAt'>): string {
    switch (n.type) {
      case NotificationType.LIKE:
        return `${n.senderName} curtiu seu post`;
      case NotificationType.COMMENT:
        return `${n.senderName} comentou no seu post`;
      case NotificationType.NEW_POST:
        return `Novo post em ${n.groupName || 'Comunidade'}`;
      default:
        return 'Nova notificação';
    }
  },

  subscribeToNotifications(callback: (notifications: Notification[]) => void) {
    if (!auth.currentUser) return () => {};

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      callback(notifications);
    });
  },

  async markAsRead(notificationId: string) {
    try {
      const ref = doc(db, 'notifications', notificationId);
      await updateDoc(ref, { isRead: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  },

  async markAllAsRead() {
    if (!auth.currentUser) return;

    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', auth.currentUser.uid),
        where('isRead', '==', false)
      );
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isRead: true });
      });
      await batch.commit();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  },

  async requestPermission() {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return;
    }

    if (Notification.permission !== 'granted') {
      await Notification.requestPermission();
    }
  }
};
