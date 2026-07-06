import * as Speech from 'expo-speech';
import { MatchState, getScoreSpeechAnnouncement } from '../utils/tennisEngine';

let isSpeechEnabled = true;

export const SpeechService = {
  setSpeechEnabled(enabled: boolean) {
    isSpeechEnabled = enabled;
  },

  isSpeechEnabled() {
    return isSpeechEnabled;
  },

  async speak(text: string, lang: 'pt' | 'en' | 'es' = 'pt') {
    if (!isSpeechEnabled) return;

    try {
      // Stop any ongoing speech before speaking
      await Speech.stop();
      
      const langCodes = {
        pt: 'pt-BR',
        en: 'en-US',
        es: 'es-ES',
      };

      Speech.speak(text, {
        language: langCodes[lang] || 'pt-BR',
        pitch: 1.0,
        rate: 1.0,
      });
    } catch (error) {
      console.warn('Speech service error:', error);
    }
  },

  announceScore(state: MatchState, lastScorer?: 1 | 2) {
    const text = getScoreSpeechAnnouncement(state, lastScorer);
    const lang = state.config.language || 'pt';
    this.speak(text, lang);
  }
};
