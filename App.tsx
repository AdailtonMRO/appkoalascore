import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './src/components/HomeScreen';
import MatchSetup from './src/components/MatchSetup';
import ScoreboardView from './src/components/ScoreboardView';
import BluetoothConnector from './src/components/BluetoothConnector';
import HistoryScreen from './src/components/HistoryScreen';
import MultiplayerSetup from './src/components/MultiplayerSetup';
import MultiplayerBoard from './src/components/MultiplayerBoard';
import MultiplayerRanking from './src/components/MultiplayerRanking';
import HelpScreen from './src/components/HelpScreen';
import {
  TennisConfig,
  MatchState,
  createInitialState,
  addPoint,
  undo,
  toggleCourtSide,
  retireMatch,
  abandonMatch,
  INITIAL_CONFIG,
} from './src/utils/tennisEngine';
import { MultiplayerSessionState } from './src/utils/multiplayerEngine';
import { SpeechService } from './src/services/speechService';
import { bleService, BleConnectionState } from './src/services/bleService';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import mobileAds from 'react-native-google-mobile-ads';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  const [screen, setScreen] = useState<
    'home' | 'setup' | 'remote' | 'game' | 'history' | 'multiplayer_setup' | 'multiplayer_game' | 'multiplayer_ranking' | 'help'
  >('home');
  const [multiplayerState, setMultiplayerState] = useState<MultiplayerSessionState | null>(null);
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [language, setLanguage] = useState<'pt' | 'en' | 'es'>('pt');
  const [connectionState, setConnectionState] = useState<BleConnectionState>('disconnected');
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [buttonMappings, setButtonMappings] = useState<Record<string, string>>({
    '1': 'addPointP1',
    '2': 'addPointP2',
    '3': 'undo',
    '4': 'reset',
    '5': 'toggleMute',
    '6': 'announceScore',
    '7': 'none',
    '8': 'none',
    '9': 'none',
  });

  const [physicalMappings, setPhysicalMappings] = useState<Record<string, string>>({
    'gesture_up': 'addPointLeft',
    'gesture_down': 'addPointRight',
    'gesture_left': 'undo',
    'gesture_right': 'announceScore',
    'key_Tab': 'undo',
  });

  // Load custom physical remote mappings from AsyncStorage on startup
  useEffect(() => {
    const loadPhysicalMappings = async () => {
      try {
        const saved = await AsyncStorage.getItem('koala_physical_mappings');
        if (saved) {
          setPhysicalMappings(JSON.parse(saved));
        }
      } catch (e) {
        console.warn('Failed to load physical mappings', e);
      }
    };
    loadPhysicalMappings();
  }, []);

  // Register service worker and manifest dynamically on Web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // Register service worker
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('./sw.js').then(
            (reg) => console.log('Service Worker registered successfully:', reg),
            (err) => console.log('Service Worker registration failed:', err)
          );
        });
      }

      // Add PWA manifest link if not exists
      let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'manifest';
        document.head.appendChild(link);
      }
      link.href = './manifest.json';

      // Prevent body scroll bug on focus, eliminate white borders and allow scrolling on mobile browsers
      const style = document.createElement('style');
      style.innerHTML = `
        html, body, #root, [data-reactroot] {
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background-color: #090d16 !important;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const updatePhysicalMapping = async (input: string, action: string) => {
    const newMappings = { ...physicalMappings };
    
    // Clean old mappings for this action to avoid duplicates if assigning a new trigger
    if (action !== 'none') {
      Object.keys(newMappings).forEach((key) => {
        if (newMappings[key] === action) {
          delete newMappings[key];
        }
      });
      newMappings[input] = action;
    } else {
      // If setting to none, delete this input key mapping
      delete newMappings[input];
    }
    
    setPhysicalMappings(newMappings);
    try {
      await AsyncStorage.setItem('koala_physical_mappings', JSON.stringify(newMappings));
    } catch (e) {
      console.warn('Failed to save physical mappings', e);
    }
  };

  // Maintain references to prevent stale closures in BLE listener callbacks
  const matchStateRef = useRef<MatchState | null>(matchState);
  matchStateRef.current = matchState;

  const buttonMappingsRef = useRef(buttonMappings);
  buttonMappingsRef.current = buttonMappings;

  // Sync speech service mute status with state
  useEffect(() => {
    SpeechService.setSpeechEnabled(!isVoiceMuted);
  }, [isVoiceMuted]);

  // Track BLE connection state and initialize AdMob SDK
  useEffect(() => {
    bleService.onConnectionState((state) => {
      setConnectionState(state);
    });

    mobileAds()
      .initialize()
      .then((adapterStatuses) => {
        console.log('AdMob SDK Initialized:', adapterStatuses);
      })
      .catch((err) => {
        console.warn('AdMob SDK Initialization failed:', err);
      });
  }, []);

  // Handler to add a point
  const handleAddPoint = (player: 1 | 2) => {
    const currentState = matchStateRef.current;
    if (!currentState) return;

    const updatedState = addPoint(currentState, player);
    setMatchState(updatedState);

    // Speak the score announcement
    if (!isVoiceMuted) {
      SpeechService.announceScore(updatedState, player);
    }
  };

  const handleAddPointRef = useRef(handleAddPoint);
  handleAddPointRef.current = handleAddPoint;

  // Handler to undo last action
  const handleUndo = () => {
    const currentState = matchStateRef.current;
    if (!currentState || currentState.history.length === 0) return;

    const rolledBackState = undo(currentState);
    setMatchState(rolledBackState);
    
    // Announce correction and speak new score in correct language
    const correctionTexts = {
      pt: "Correção de placar.",
      en: "Score correction.",
      es: "Corrección de marcador.",
    };

    if (!isVoiceMuted) {
      SpeechService.speak(correctionTexts[language] || correctionTexts.pt, language);
      setTimeout(() => {
        SpeechService.announceScore(rolledBackState);
      }, 1200);
    }
  };

  const handleUndoRef = useRef(handleUndo);
  handleUndoRef.current = handleUndo;

  const handleResetMatch = () => {
    setMatchState(null);
    setScreen('home');
  };

  const handleToggleSide = () => {
    const currentState = matchStateRef.current;
    if (!currentState) return;
    const updatedState = toggleCourtSide(currentState);
    setMatchState(updatedState);
  };

  const handleToggleMute = () => {
    setIsVoiceMuted(!isVoiceMuted);
  };

  const handleRetireMatch = (retiredPlayer: 1 | 2, reason: 'injury' | 'forfeit') => {
    const currentState = matchStateRef.current;
    if (!currentState) return;
    const updatedState = retireMatch(currentState, retiredPlayer, reason);
    setMatchState(updatedState);
    if (!isVoiceMuted) {
      SpeechService.announceScore(updatedState);
    }
  };

  const handleAbandonMatch = (reason: 'weather' | 'power_outage' | 'court_issue' | 'other') => {
    const currentState = matchStateRef.current;
    if (!currentState) return;
    const updatedState = abandonMatch(currentState, reason);
    setMatchState(updatedState);
    if (!isVoiceMuted) {
      SpeechService.announceScore(updatedState);
    }
  };

  const handleResumeMatch = (savedMatch: any) => {
    if (!savedMatch.rawState) return;
    // Clean up winner/termination status since it's active again
    const stateToResume: MatchState = {
      ...savedMatch.rawState,
      winner: null,
      terminationType: undefined,
      retiredPlayer: undefined,
      retirementReason: undefined,
      abandonmentReason: undefined,
      resumedMatchId: savedMatch.id, // Reference to delete upon final saving
    };
    setMatchState(stateToResume);
    setScreen('game');
  };

  const handleLanguageChange = (lang: 'pt' | 'en' | 'es') => {
    setLanguage(lang);
  };
  
  const handleResetMatchRef = useRef(handleResetMatch);
  handleResetMatchRef.current = handleResetMatch;

  const handleRemoteAction = (action: string) => {
    switch (action) {
      case 'addPointP1':
        handleAddPointRef.current(1);
        break;
      case 'addPointP2':
        handleAddPointRef.current(2);
        break;
      case 'undo':
        handleUndoRef.current();
        break;
      case 'reset':
        handleResetMatchRef.current();
        break;
      case 'toggleMute':
        setIsVoiceMuted((prev) => !prev);
        break;
      case 'announceScore':
        if (matchStateRef.current) {
          SpeechService.announceScore(matchStateRef.current);
        }
        break;
      case 'toggleSide':
        handleToggleSide();
        break;
      default:
        break;
    }
  };

  const handleRemoteActionRef = useRef(handleRemoteAction);
  handleRemoteActionRef.current = handleRemoteAction;

  // Register BLE event listener once
  useEffect(() => {
    // Legacy support
    bleService.onPointTriggered((player) => {
      handleAddPointRef.current(player);
    });

    // Custom button mapping handler
    bleService.onButtonPress((buttonId) => {
      const currentMappings = buttonMappingsRef.current;
      const action = currentMappings[buttonId] || 'none';
      handleRemoteActionRef.current(action);
    });
  }, []);

  // Triggered when match setup is complete
  const handleStartMatch = (config: TennisConfig, firstServer: 1 | 2) => {
    const initialState = createInitialState(config, firstServer);
    setMatchState(initialState);
    setScreen('game');
    
    if (!isVoiceMuted) {
      const startTexts = {
        pt: `Partida iniciada. ${config.player1Name} contra ${config.player2Name}. Saque inicial de ${firstServer === 1 ? config.player1Name : config.player2Name}.`,
        en: `Match started. ${config.player1Name} versus ${config.player2Name}. First service by ${firstServer === 1 ? config.player1Name : config.player2Name}.`,
        es: `Partido iniciado. ${config.player1Name} contra ${config.player2Name}. Primer saque de ${firstServer === 1 ? config.player1Name : config.player2Name}.`,
      };
      SpeechService.speak(startTexts[language] || startTexts.pt, language);
    }
  };

  const handleQuickStart = async () => {
    try {
      const saved = await AsyncStorage.getItem('@koala_tennis_config');
      let config: TennisConfig;
      let firstServer: 1 | 2 = 1;

      if (saved) {
        const parsed = JSON.parse(saved);
        config = {
          player1Name: parsed.player1Name || (language === 'pt' ? 'Jogador 1' : language === 'en' ? 'Player 1' : 'Jugador 1'),
          player2Name: parsed.player2Name || (language === 'pt' ? 'Jogador 2' : language === 'en' ? 'Player 2' : 'Jugador 2'),
          setsToWin: parsed.setsToWin !== undefined ? parsed.setsToWin : INITIAL_CONFIG.setsToWin,
          gamesPerSet: parsed.gamesPerSet !== undefined ? parsed.gamesPerSet : INITIAL_CONFIG.gamesPerSet,
          useTieBreak: parsed.useTieBreak !== undefined ? parsed.useTieBreak : INITIAL_CONFIG.useTieBreak,
          tieBreakPoints: parsed.tieBreakPoints !== undefined ? parsed.tieBreakPoints : INITIAL_CONFIG.tieBreakPoints,
          useMatchTieBreakForFinalSet: parsed.useMatchTieBreakForFinalSet !== undefined ? parsed.useMatchTieBreakForFinalSet : INITIAL_CONFIG.useMatchTieBreakForFinalSet,
          matchTieBreakPoints: parsed.matchTieBreakPoints || 10,
          noAdScoring: parsed.noAdScoring !== undefined ? parsed.noAdScoring : INITIAL_CONFIG.noAdScoring,
          language: language,
          autoSideChange: parsed.autoSideChange !== undefined ? parsed.autoSideChange : INITIAL_CONFIG.autoSideChange,
        };
        firstServer = parsed.firstServer || 1;
        if (parsed.speechEnabled !== undefined) {
          setIsVoiceMuted(!parsed.speechEnabled);
        }
      } else {
        config = {
          ...INITIAL_CONFIG,
          player1Name: language === 'pt' ? 'Jogador 1' : language === 'en' ? 'Player 1' : 'Jugador 1',
          player2Name: language === 'pt' ? 'Jogador 2' : language === 'en' ? 'Player 2' : 'Jugador 2',
          language,
        };
      }

      handleStartMatch(config, firstServer);
    } catch (e) {
      console.warn('Failed to load quick start config:', e);
      const fallbackConfig = {
        ...INITIAL_CONFIG,
        player1Name: language === 'pt' ? 'Jogador 1' : language === 'en' ? 'Player 1' : 'Jugador 1',
        player2Name: language === 'pt' ? 'Jogador 2' : language === 'en' ? 'Player 2' : 'Jugador 2',
        language,
      };
      handleStartMatch(fallbackConfig, 1);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Screen Router */}
      {screen === 'home' && (
        <HomeScreen
          onNavigate={(target) => setScreen(target)}
          language={language}
          onLanguageChange={handleLanguageChange}
          connectionState={connectionState}
          isVoiceMuted={isVoiceMuted}
          onToggleMute={() => setIsVoiceMuted(!isVoiceMuted)}
          onQuickStart={handleQuickStart}
        />
      )}

      {screen === 'setup' && (
        <MatchSetup
          onStartMatch={handleStartMatch}
          onBack={() => setScreen('home')}
          language={language}
          initialConfig={matchState?.config}
        />
      )}

      {screen === 'remote' && (
        <BluetoothConnector
          player1Name={matchState?.config.player1Name || (language === 'pt' ? 'Jogador 1' : language === 'en' ? 'Player 1' : 'Jugador 1')}
          player2Name={matchState?.config.player2Name || (language === 'pt' ? 'Jogador 2' : language === 'en' ? 'Player 2' : 'Jugador 2')}
          onPointTriggered={(player) => handleAddPointRef.current(player)}
          onBack={() => setScreen('home')}
          language={language}
          buttonMappings={buttonMappings}
          onUpdateMapping={(btnId, action) => {
            setButtonMappings((prev) => ({ ...prev, [btnId]: action }));
          }}
          isVoiceMuted={isVoiceMuted}
          onToggleMute={() => setIsVoiceMuted(!isVoiceMuted)}
          physicalMappings={physicalMappings}
          onUpdatePhysicalMapping={updatePhysicalMapping}
        />
      )}

      {screen === 'game' && matchState && (
        <ScoreboardView
          matchState={matchState}
          onAddPoint={(player) => handleAddPointRef.current(player)}
          onUndo={handleUndo}
          onReset={handleResetMatch}
          isVoiceMuted={isVoiceMuted}
          onToggleMute={handleToggleMute}
          onToggleSide={handleToggleSide}
          physicalMappings={physicalMappings}
          onRetireMatch={handleRetireMatch}
          onAbandonMatch={handleAbandonMatch}
        />
      )}

      {screen === 'history' && (
        <HistoryScreen
          onBack={() => setScreen('home')}
          language={language}
          onResumeMatch={handleResumeMatch}
        />
      )}

      {screen === 'help' && (
        <HelpScreen
          onBack={() => setScreen('home')}
          language={language}
        />
      )}

      {screen === 'multiplayer_setup' && (
        <MultiplayerSetup
          onStart={(session) => {
            setMultiplayerState(session);
            setScreen('multiplayer_game');
          }}
          onBack={() => setScreen('home')}
          language={language}
        />
      )}

      {screen === 'multiplayer_game' && multiplayerState && (
        <MultiplayerBoard
          sessionState={multiplayerState}
          onFinish={(finalSession) => {
            setMultiplayerState(finalSession);
            setScreen('multiplayer_ranking');
          }}
          onExit={() => {
            setMultiplayerState(null);
            setScreen('home');
          }}
          language={language}
          physicalMappings={physicalMappings}
        />
      )}

      {screen === 'multiplayer_ranking' && multiplayerState && (
        <MultiplayerRanking
          sessionState={multiplayerState}
          onExit={() => {
            setMultiplayerState(null);
            setScreen('home');
          }}
          language={language}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    paddingTop: Platform.OS === 'android' ? 35 : 0,
  },
});
