import AsyncStorage from '@react-native-async-storage/async-storage';
import { PointHistoryEntry, MatchStats, MatchState } from '../utils/tennisEngine';
import { auth, db } from './firebaseConfig';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

export interface SavedMatch {
  id: string;
  type: 'classic';
  date: string; // ISO String
  player1Name: string;
  player2Name: string;
  setScores: {
    player1Games: number;
    player2Games: number;
    player1TieBreakPoints?: number;
    player2TieBreakPoints?: number;
  }[];
  winner: 1 | 2 | null;
  setsToWin: number;
  pointsHistory?: PointHistoryEntry[];
  stats?: MatchStats;
  totalDuration?: string;
  gameDurations?: string[];
  terminationType?: 'completed' | 'retired' | 'abandoned';
  retiredPlayer?: 1 | 2;
  retirementReason?: 'injury' | 'forfeit';
  abandonmentReason?: 'weather' | 'power_outage' | 'court_issue' | 'other';
  rawState?: MatchState;
}

export interface SavedMultiplayerPlayer {
  name: string;
  wins: number;
}

export interface SavedMultiplayerSession {
  id: string;
  type: 'multiplayer';
  date: string; // ISO String
  mode: 'singles' | 'doubles';
  bestOfGames: 3 | 5;
  players: SavedMultiplayerPlayer[]; // Sorted by wins
  winnerName: string;
  totalMatches: number;
}

export type HistoryItem = SavedMatch | SavedMultiplayerSession;

const STORAGE_KEY = '@koala_score_matches';

export const historyService = {
  async getUserTier(): Promise<'free' | 'pro'> {
    try {
      const user = auth.currentUser;
      if (!user) return 'free';

      const docRef = doc(db, 'profiles', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists() && docSnap.data().tier) {
        return docSnap.data().tier as 'free' | 'pro';
      }
      return 'free';
    } catch {
      return 'free';
    }
  },

  async getMatches(): Promise<HistoryItem[]> {
    try {
      const localData = await AsyncStorage.getItem(STORAGE_KEY);
      let localMatches: HistoryItem[] = [];
      if (localData) {
        localMatches = JSON.parse(localData) as HistoryItem[];
      }

      const tier = await this.getUserTier();

      const user = auth.currentUser;
      if (user) {
        try {
          const q = query(collection(db, 'matches'), where('user_id', '==', user.uid));
          const querySnapshot = await getDocs(q);

          const cloudMatches: HistoryItem[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.payload) {
              cloudMatches.push(data.payload as HistoryItem);
            }
          });

          // Mesclar local com nuvem (dando preferência para a nuvem em caso de colisão de ID)
          const mergedMap = new Map<string, HistoryItem>();
          localMatches.forEach((item) => mergedMap.set(item.id, item));
          cloudMatches.forEach((item) => mergedMap.set(item.id, item));

          const merged = Array.from(mergedMap.values());
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

          const sortedMerged = merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          return tier === 'pro' ? sortedMerged : sortedMerged.slice(0, 5);
        } catch (cloudError) {
          console.warn('Erro ao buscar partidas da nuvem, retornando locais:', cloudError);
        }
      }

      const sortedLocal = localMatches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return tier === 'pro' ? sortedLocal : sortedLocal.slice(0, 5);
    } catch (error) {
      console.warn('Failed to retrieve match history:', error);
      return [];
    }
  },

  async saveMatch(match: Omit<HistoryItem, 'id' | 'date'>): Promise<boolean> {
    try {
      const current = await this.getMatches();
      const newItem: HistoryItem = {
        ...match,
        id: Date.now().toString(),
        date: new Date().toISOString(),
      } as HistoryItem;

      // Salva localmente
      const updated = [newItem, ...current];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Salva no Firestore se logado
      const user = auth.currentUser;
      if (user) {
        try {
          const opponent = newItem.type === 'classic'
            ? `${newItem.player1Name} vs ${newItem.player2Name}`
            : newItem.winnerName;

          const winner = newItem.type === 'classic'
            ? (newItem.winner === 1 ? newItem.player1Name : newItem.player2Name)
            : newItem.winnerName;

          const docRef = doc(db, 'matches', newItem.id);
          await setDoc(docRef, {
            user_id: user.uid,
            sync_id: newItem.id,
            opponent: opponent,
            winner: winner,
            payload: newItem,
          });
          console.log('Match synced to Firebase Firestore successfully.');
        } catch (firebaseError) {
          console.warn(
            'Failed to write match to Firebase. Match is saved locally and will sync later:',
            firebaseError
          );
        }
      }

      return true;
    } catch (error) {
      console.warn('Failed to save match locally:', error);
      return false;
    }
  },

  async deleteMatch(id: string): Promise<boolean> {
    try {
      // Deleta no Firestore primeiro se logado
      const user = auth.currentUser;
      if (user) {
        try {
          const docRef = doc(db, 'matches', id);
          await deleteDoc(docRef);
          console.log('Match deleted from Firebase Firestore.');
        } catch (firebaseError) {
          console.warn('Failed to delete match from Firebase (will proceed with local deletion):', firebaseError);
        }
      }

      // Remove localmente
      const current = await this.getMatches();
      const filtered = current.filter((item) => item.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

      return true;
    } catch (error) {
      console.warn('Failed to delete match locally:', error);
      return false;
    }
  },

  async updateMatch(id: string, updatedFields: Partial<HistoryItem>): Promise<boolean> {
    try {
      const current = await this.getMatches();
      const updated = current.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            ...updatedFields,
          } as HistoryItem;
        }
        return item;
      });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Atualiza no Firestore se logado
      const user = auth.currentUser;
      if (user) {
        try {
          const updatedItem = updated.find((item) => item.id === id);
          if (updatedItem) {
            const opponent = updatedItem.type === 'classic'
              ? `${updatedItem.player1Name} vs ${updatedItem.player2Name}`
              : updatedItem.winnerName;

            const winner = updatedItem.type === 'classic'
              ? (updatedItem.winner === 1 ? updatedItem.player1Name : updatedItem.player2Name)
              : updatedItem.winnerName;

            const docRef = doc(db, 'matches', id);
            await updateDoc(docRef, {
              opponent: opponent,
              winner: winner,
              payload: updatedItem,
            });
            console.log('Match updated in Firebase Firestore successfully.');
          }
        } catch (firebaseError) {
          console.warn('Failed to update match in Firebase (will proceed with local update):', firebaseError);
        }
      }

      return true;
    } catch (error) {
      console.warn('Failed to update match:', error);
      return false;
    }
  },

  // Sincroniza partidas locais offline que foram criadas antes do login
  async syncLocalHistoryWithCloud(): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const localData = await AsyncStorage.getItem(STORAGE_KEY);
      if (!localData) return;

      const localMatches = JSON.parse(localData) as HistoryItem[];

      // Busca chaves já sincronizadas no Firestore
      const q = query(collection(db, 'matches'), where('user_id', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const syncedIds = new Set<string>();
      querySnapshot.forEach((doc) => {
        syncedIds.add(doc.id);
      });

      // Filtra as locais que ainda não estão na nuvem
      const unsyncedMatches = localMatches.filter((item) => !syncedIds.has(item.id));

      if (unsyncedMatches.length === 0) return;

      // Faz o upload em lote (batch write)
      const batch = writeBatch(db);
      unsyncedMatches.forEach((item) => {
        const opponent = item.type === 'classic'
          ? `${item.player1Name} vs ${item.player2Name}`
          : item.winnerName;

        const winner = item.type === 'classic'
          ? (item.winner === 1 ? item.player1Name : item.player2Name)
          : item.winnerName;

        const docRef = doc(db, 'matches', item.id);
        batch.set(docRef, {
          user_id: user.uid,
          sync_id: item.id,
          opponent: opponent,
          winner: winner,
          payload: item,
        });
      });

      await batch.commit();
      console.log(`${unsyncedMatches.length} partidas sincronizadas com a nuvem com sucesso!`);
    } catch (e) {
      console.warn('Erro ao sincronizar histórico offline com a nuvem:', e);
    }
  },
};
