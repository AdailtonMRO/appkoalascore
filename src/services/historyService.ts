import AsyncStorage from '@react-native-async-storage/async-storage';
import { PointHistoryEntry, MatchStats } from '../utils/tennisEngine';

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
  winner: 1 | 2;
  setsToWin: number;
  pointsHistory?: PointHistoryEntry[];
  stats?: MatchStats;
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
  async getMatches(): Promise<HistoryItem[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data) as HistoryItem[];
        // Sort by date descending
        return parsed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
      return [];
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

      const updated = [newItem, ...current];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return true;
    } catch (error) {
      console.warn('Failed to save match:', error);
      return false;
    }
  },

  async deleteMatch(id: string): Promise<boolean> {
    try {
      const current = await this.getMatches();
      const filtered = current.filter(item => item.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.warn('Failed to delete match:', error);
      return false;
    }
  },

  async updateMatch(id: string, updatedFields: Partial<HistoryItem>): Promise<boolean> {
    try {
      const current = await this.getMatches();
      const updated = current.map(item => {
        if (item.id === id) {
          return {
            ...item,
            ...updatedFields,
          } as HistoryItem;
        }
        return item;
      });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return true;
    } catch (error) {
      console.warn('Failed to update match:', error);
      return false;
    }
  }
};
