import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

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

export type ReminderType = 'watering' | 'fertilizing' | 'pruning' | 'repotting';

export interface Reminder {
  id?: string;
  userId: string;
  plantId: string;
  plantName: string;
  type: ReminderType;
  frequencyDays: number;
  lastDone: number;
  nextDue: number;
  createdAt: number;
}

const COLLECTION = 'reminders';

export const reminderService = {
  async getReminders(userId: string): Promise<Reminder[]> {
    try {
      const q = query(collection(db, COLLECTION), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reminder));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, COLLECTION);
      return [];
    }
  },

  async addReminder(reminder: Omit<Reminder, 'id' | 'createdAt'>): Promise<string | undefined> {
    try {
      const docRef = await addDoc(collection(db, COLLECTION), {
        ...reminder,
        createdAt: Date.now()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, COLLECTION);
    }
  },

  async deleteReminder(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION}/${id}`);
    }
  },

  async markAsDone(id: string, frequencyDays: number): Promise<void> {
    const lastDone = Date.now();
    const nextDue = lastDone + (frequencyDays * 24 * 60 * 60 * 1000);
    try {
      await updateDoc(doc(db, COLLECTION, id), {
        lastDone,
        nextDue
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${id}`);
    }
  }
};
