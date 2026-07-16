import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Alert,
  TextInput,
  Modal,
  StatusBar,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MatchState, getDisplayPoints, isServingFromDeuceCourt, calculateMatchStats } from '../utils/tennisEngine';
import { SpeechService } from '../services/speechService';
import { historyService } from '../services/historyService';
import GrandSlamScoreboard from './GrandSlamScoreboard';

interface ScoreboardViewProps {
  matchState: MatchState;
  onAddPoint: (player: 1 | 2) => void;
  onUndo: () => void;
  onReset: () => void;
  isVoiceMuted: boolean;
  onToggleMute: () => void;
  onToggleSide: () => void; // Callback to toggle ends manually
  physicalMappings: Record<string, string>;
  onRetireMatch: (player: 1 | 2, reason: 'injury' | 'forfeit') => void;
  onAbandonMatch: (reason: 'weather' | 'power_outage' | 'court_issue' | 'other') => void;
}

export default function ScoreboardView({
  matchState,
  onAddPoint,
  onUndo,
  onReset,
  isVoiceMuted,
  onToggleMute,
  onToggleSide,
  physicalMappings,
  onRetireMatch,
  onAbandonMatch,
}: ScoreboardViewProps) {
  const { config, player1Sets, player2Sets, setScores, currentSetIndex, isTieBreak, isMatchTieBreak, server, winner } = matchState;
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [isSaved, setIsSaved] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [optionsMenuSubview, setOptionsMenuSubview] = useState<'main' | 'retire_player_forfeit' | 'retire_player_injury' | 'abandon_reason'>('main');

  const [elapsedSeconds, setElapsedSeconds] = useState(matchState.elapsedSeconds || 0);
  const [isFullscreenWeb, setIsFullscreenWeb] = useState(false);

  // Lock to landscape and hide status bar on mount, restore on unmount
  useEffect(() => {
    async function lockOrientation() {
      if (Platform.OS !== 'web') {
        try {
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.LANDSCAPE
          );
        } catch (e) {
          console.warn('Failed to lock screen orientation', e);
        }
      }
    }

    lockOrientation();
    StatusBar.setHidden(true, 'fade');

    return () => {
      async function unlockOrientation() {
        if (Platform.OS !== 'web') {
          try {
            await ScreenOrientation.unlockAsync();
          } catch (e) {
            console.warn('Failed to unlock screen orientation', e);
          }
        }
      }
      unlockOrientation();
      StatusBar.setHidden(false, 'fade');
    };
  }, []);

  // Web fullscreen change listener
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleFullscreenChange = () => {
      setIsFullscreenWeb(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreenWeb = () => {
    if (Platform.OS !== 'web') return;
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
          setIsFullscreenWeb(true);
        }).catch((err) => {
          console.warn('Error attempting to enable fullscreen:', err);
        });
      } else {
        document.exitFullscreen().then(() => {
          setIsFullscreenWeb(false);
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Fullscreen API error:', e);
    }
  };

  // Sync elapsedSeconds when matchState changes (e.g. loaded from history)
  useEffect(() => {
    setElapsedSeconds(matchState.elapsedSeconds || 0);
    setIsSaved(false); // Reset isSaved state for a new match
    setIsPaused(false); // Reset pause state
  }, [matchState]);
  const [currentTime, setCurrentTime] = useState('');
  const [scoreboardMode, setScoreboardMode] = useState<'classic' | 'grandslam'>(
    width >= 768 ? 'grandslam' : 'classic'
  );

  const [gameDurations, setGameDurations] = useState<number[]>([]);
  const lastTotalGamesRef = useRef(0);

  const getTotalGames = (state: MatchState) => {
    return state.setScores.reduce((sum, s) => sum + s.player1Games + s.player2Games, 0);
  };

  // Initialize total games ref on mount
  useEffect(() => {
    lastTotalGamesRef.current = getTotalGames(matchState);
  }, []);

  // Track finished games and calculate their durations
  useEffect(() => {
    const currentGames = getTotalGames(matchState);
    if (currentGames > lastTotalGamesRef.current) {
      const prevEndSecs = gameDurations.reduce((sum, d) => sum + d, 0);
      const gameDuration = elapsedSeconds - prevEndSecs;
      setGameDurations((prev) => [...prev, gameDuration > 0 ? gameDuration : 0]);
      lastTotalGamesRef.current = currentGames;
    } else if (currentGames < lastTotalGamesRef.current) {
      // Handle score undo (if game was rolled back)
      setGameDurations((prev) => prev.slice(0, -1));
      lastTotalGamesRef.current = currentGames;
    }
  }, [matchState]);

  // Load preferred mode
  useEffect(() => {
    const loadMode = async () => {
      try {
        const saved = await AsyncStorage.getItem('@koala_scoreboard_mode');
        if (saved === 'classic' || saved === 'grandslam') {
          setScoreboardMode(saved);
        }
      } catch (e) {}
    };
    loadMode();
  }, []);

  const toggleScoreboardMode = async () => {
    const nextMode = scoreboardMode === 'classic' ? 'grandslam' : 'classic';
    setScoreboardMode(nextMode);
    try {
      await AsyncStorage.setItem('@koala_scoreboard_mode', nextMode);
    } catch (e) {}
  };

  // Elapsed Match Timer and Real-Time Clock
  useEffect(() => {
    // 1. Current Time Clock
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;
      setCurrentTime(timeStr);
    };
    updateTime();
    const timeInterval = setInterval(updateTime, 30000); // update every 30s

    // 2. Elapsed Match Timer
    let matchTimer: any;
    if (winner === null && !isPaused) {
      matchTimer = setInterval(() => {
        setElapsedSeconds((prev) => {
          const nextVal = prev + 1;
          matchState.elapsedSeconds = nextVal;
          return nextVal;
        });
      }, 1000);
    }

    return () => {
      clearInterval(timeInterval);
      if (matchTimer) clearInterval(matchTimer);
    };
  }, [winner, isPaused]);

  const formatElapsed = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Gesture Responder references and handlers to support Beauty-R1 remote swipes
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleStartShouldSetResponder = (e: any) => {
    const { pageX, pageY } = e.nativeEvent;
    touchStartRef.current = { x: pageX, y: pageY, time: Date.now() };
    return false; // return false to allow child touchables to receive taps, capture only on move/swipe!
  };

  const textInputRef = useRef<TextInput | null>(null);

  // Keep TextInput focused to capture remote keyboard keypresses (like Tab)
  useEffect(() => {
    const focusInput = () => {
      textInputRef.current?.focus();
    };
    focusInput();
    const interval = setInterval(focusInput, 1500);
    return () => clearInterval(interval);
  }, []);

  const triggerAction = (action: string) => {
    if (!action || action === 'none') return;
    
    const leftPlayer: 1 | 2 = matchState.courtSideSwapped ? 2 : 1;
    const rightPlayer: 1 | 2 = matchState.courtSideSwapped ? 1 : 2;

    switch (action) {
      case 'addPointP1':
        onAddPoint(1);
        break;
      case 'addPointP2':
        onAddPoint(2);
        break;
      case 'addPointLeft':
        onAddPoint(leftPlayer);
        break;
      case 'addPointRight':
        onAddPoint(rightPlayer);
        break;
      case 'undo':
        onUndo();
        break;
      case 'announceScore':
        handleSpeakScore();
        break;
      case 'toggleSide':
        onToggleSide();
        break;
      case 'toggleMute':
        onToggleMute();
        break;
      case 'reset':
        onReset();
        break;
      default:
        break;
    }
  };

  const lastKeyRef = useRef<{ key: string; time: number } | null>(null);

  const handleKeyPress = (e: any) => {
    const key = e.nativeEvent.key;
    const now = Date.now();
    lastKeyRef.current = { key, time: now };
    
    const action = physicalMappings[`key_${key}`];
    if (action) {
      triggerAction(action);
    }
  };

  const handleTextChange = (text: string) => {
    if (text) {
      const now = Date.now();
      const last = lastKeyRef.current;
      if (last && last.key === text && now - last.time < 150) {
        textInputRef.current?.clear();
        return;
      }
      
      const action = physicalMappings[`key_${text}`];
      if (action) {
        triggerAction(action);
      }
      textInputRef.current?.clear();
    }
  };

  const handleMoveShouldSetResponderCapture = (e: any) => {
    const start = touchStartRef.current;
    if (start) {
      const { pageX, pageY } = e.nativeEvent;
      const dx = pageX - start.x;
      const dy = pageY - start.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 25) {
        return true; // capture the touch if it moves more than 25px (swipe gesture)
      }
    }
    return false;
  };

  const handleResponderRelease = (e: any) => {
    const start = touchStartRef.current;
    if (start && winner === null) {
      const { pageX, pageY } = e.nativeEvent;
      const dx = pageX - start.x;
      const dy = pageY - start.y;
      const dt = Date.now() - start.time;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 35) {
        let inputKey = '';
        if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal gesture
          inputKey = dx < 0 ? 'gesture_left' : 'gesture_right';
        } else {
          // Vertical gesture
          inputKey = dy < 0 ? 'gesture_up' : 'gesture_down';
        }

        const action = physicalMappings[inputKey];
        if (action) {
          triggerAction(action);
        }
      }
    }
  };

  // Localized Labels Dictionary
  const labels = {
    pt: {
      serving: 'SACANDO',
      servingSide: 'Saque',
      deuceCourt: 'DIR (Igual)',
      adCourt: 'ESQ (Vantagem)',
      winner: (name: string) => `Vitória de ${name}!`,
      undo: 'Desfazer',
      speakScore: 'Falar Placar',
      swapSides: 'Inverter Lado',
      newGame: 'Novo Jogo',
      set: 'SET',
      bestOf: 'MELHOR DE',
      superTB: 'SUPER TIE-BREAK',
      tb: 'TIE-BREAK',
    },
    en: {
      serving: 'SERVING',
      servingSide: 'Serve',
      deuceCourt: 'RT (Deuce)',
      adCourt: 'LFT (Ad)',
      winner: (name: string) => `${name} Wins!`,
      undo: 'Undo',
      speakScore: 'Speak Score',
      swapSides: 'Swap Ends',
      newGame: 'New Game',
      set: 'SET',
      bestOf: 'BEST OF',
      superTB: 'SUPER TIE-BREAK',
      tb: 'TIE-BREAK',
    },
    es: {
      serving: 'SIRVIENDO',
      servingSide: 'Saque',
      deuceCourt: 'DER (Igual)',
      adCourt: 'IZQ (Ventaja)',
      winner: (name: string) => `¡Victoria de ${name}!`,
      undo: 'Deshacer',
      speakScore: 'Cantar Marcador',
      swapSides: 'Cambiar Lado',
      newGame: 'Nuevo Juego',
      set: 'SET',
      bestOf: 'MEJOR DE',
      superTB: 'SÚPER TIE-BREAK',
      tb: 'TIE-BREAK',
    },
  };

  const t = labels[config.language || 'pt'] || labels.pt;

  // Calculate display points
  const activeSetForPoints = setScores[currentSetIndex];
  const p1Pts = (isTieBreak || isMatchTieBreak)
    ? (activeSetForPoints.player1TieBreakPoints || 0)
    : matchState.player1Points;
  const p2Pts = (isTieBreak || isMatchTieBreak)
    ? (activeSetForPoints.player2TieBreakPoints || 0)
    : matchState.player2Points;

  const { p1Display, p2Display } = getDisplayPoints(
    p1Pts,
    p2Pts,
    isTieBreak || isMatchTieBreak,
    config.noAdScoring
  );

  const deuceCourt = isServingFromDeuceCourt(matchState);

  // Helper to read set scores
  const renderSetScores = () => {
    return (
      <View style={[styles.setsHistoryContainer, isLandscape && styles.setsHistoryContainerLandscape]}>
        {setScores.map((set, index) => {
          const isActive = index === currentSetIndex && winner === null;
          
          // For tiebreak scores, e.g. "6(5)"
          const p1TBStr = set.player1TieBreakPoints !== undefined ? `(${set.player1TieBreakPoints})` : '';
          const p2TBStr = set.player2TieBreakPoints !== undefined ? `(${set.player2TieBreakPoints})` : '';

          return (
            <View
              key={index}
              style={[
                styles.setScoreBadge,
                isActive && styles.setScoreBadgeActive,
                isLandscape && styles.setScoreBadgeLandscape,
              ]}
            >
              <Text style={styles.setNumberLabel}>S{index + 1}</Text>
              <View style={styles.setGamesRow}>
                <Text style={[styles.setGamesText, isLandscape && styles.setGamesTextLandscape, { color: '#06b6d4' }]}>
                  {set.player1Games}
                  <Text style={styles.setTieBreakPointsText}>{p1TBStr}</Text>
                </Text>
                <Text style={styles.setGamesDivider}>:</Text>
                <Text style={[styles.setGamesText, isLandscape && styles.setGamesTextLandscape, { color: '#f97316' }]}>
                  {set.player2Games}
                  <Text style={styles.setTieBreakPointsText}>{p2TBStr}</Text>
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const handleSpeakScore = () => {
    SpeechService.announceScore(matchState);
  };

  const confirmRetirement = (player: 1 | 2, reason: 'injury' | 'forfeit') => {
    const playerName = player === 1 ? config.player1Name : config.player2Name;
    const opponentName = player === 1 ? config.player2Name : config.player1Name;
    const reasonText = reason === 'injury'
      ? (config.language === 'pt' ? 'lesão' : config.language === 'es' ? 'lesión' : 'injury')
      : (config.language === 'pt' ? 'desistência' : config.language === 'es' ? 'desistencia' : 'forfeit');

    Alert.alert(
      config.language === 'pt' ? 'Confirmar Encerramento' : 'Confirm Early End',
      config.language === 'pt'
        ? `Confirmar a vitória de ${opponentName} devido a ${reasonText} de ${playerName}?`
        : `Confirm victory of ${opponentName} due to ${playerName}'s ${reasonText}?`,
      [
        { text: config.language === 'pt' ? 'Cancelar' : 'Cancel', style: 'cancel' },
        { text: config.language === 'pt' ? 'Confirmar' : 'Confirm', onPress: () => {
          setShowOptionsMenu(false);
          setIsPaused(false);
          onRetireMatch(player, reason);
        }}
      ]
    );
  };

  const confirmAbandonment = (reason: 'weather' | 'power_outage' | 'court_issue' | 'other') => {
    const reasonLabel = {
      weather: config.language === 'pt' ? 'Chuva / Condições Climáticas' : 'Rain / Weather',
      power_outage: config.language === 'pt' ? 'Falta de Energia' : 'Power Outage',
      court_issue: config.language === 'pt' ? 'Problema na Quadra ou Rede' : 'Court/Net issue',
      other: config.language === 'pt' ? 'Outro Motivo' : 'Other reason',
    }[reason];

    Alert.alert(
      config.language === 'pt' ? 'Confirmar Suspensão' : 'Confirm Suspension',
      config.language === 'pt'
        ? `Deseja suspender a partida devido a: ${reasonLabel}? Ela será salva sem vencedor e poderá ser retomada depois.`
        : `Do you want to suspend the match due to: ${reasonLabel}? It will be saved without a winner and can be resumed later.`,
      [
        { text: config.language === 'pt' ? 'Cancelar' : 'Cancel', style: 'cancel' },
        { text: config.language === 'pt' ? 'Confirmar' : 'Confirm', onPress: () => {
          setShowOptionsMenu(false);
          setIsPaused(false);
          onAbandonMatch(reason);
        }}
      ]
    );
  };

  // Calculate dynamic font size for the score numbers
  // In portrait, we use standard sizes, in landscape we scale with screen height
  const scoreFontSize = isLandscape
    ? Math.min(height * 0.68, 280)
    : 96;
  const player1Card = (
    <TouchableOpacity
      key="p1"
      style={[
        styles.playerCard,
        styles.playerCardP1,
        server === 1 && styles.servingCardP1,
        winner === 1 && styles.winningCard,
        isLandscape && styles.playerCardLandscape,
      ]}
      onPress={() => onAddPoint(1)}
      disabled={winner !== null || isPaused}
    >
      {server === 1 && (
        <View style={[styles.servingTag, isLandscape && styles.servingTagLandscape, { backgroundColor: '#06b6d4' }]}>
          <Ionicons name="tennisball" size={isLandscape ? 12 : 14} color="#fff" />
          <Text style={styles.servingTagText}>{t.serving}</Text>
        </View>
      )}

      <View style={[styles.playerDetails, isLandscape && styles.playerDetailsLandscape]}>
        <Text style={[styles.playerNameText, isLandscape && styles.playerNameTextLandscape]} numberOfLines={1}>
          {config.player1Name}
        </Text>
        <View style={styles.setsCountRow}>
          {Array.from({ length: config.setsToWin }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.setDot,
                isLandscape && styles.setDotLandscape,
                { backgroundColor: i < player1Sets ? '#06b6d4' : 'rgba(255, 255, 255, 0.1)' },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.scoreNumberContainer}>
        <Text style={[styles.scoreNumberText, { fontSize: scoreFontSize, color: '#06b6d4' }]}>
          {p1Display}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const player2Card = (
    <TouchableOpacity
      key="p2"
      style={[
        styles.playerCard,
        styles.playerCardP2,
        server === 2 && styles.servingCardP2,
        winner === 2 && styles.winningCard,
        isLandscape && styles.playerCardLandscape,
      ]}
      onPress={() => onAddPoint(2)}
      disabled={winner !== null || isPaused}
    >
      {server === 2 && (
        <View style={[styles.servingTag, isLandscape && styles.servingTagLandscape, { backgroundColor: '#f97316' }]}>
          <Ionicons name="tennisball" size={isLandscape ? 12 : 14} color="#fff" />
          <Text style={styles.servingTagText}>{t.serving}</Text>
        </View>
      )}

      <View style={[styles.playerDetails, isLandscape && styles.playerDetailsLandscape]}>
        <Text style={[styles.playerNameText, isLandscape && styles.playerNameTextLandscape]} numberOfLines={1}>
          {config.player2Name}
        </Text>
        <View style={styles.setsCountRow}>
          {Array.from({ length: config.setsToWin }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.setDot,
                isLandscape && styles.setDotLandscape,
                { backgroundColor: i < player2Sets ? '#f97316' : 'rgba(255, 255, 255, 0.1)' },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.scoreNumberContainer}>
        <Text style={[styles.scoreNumberText, { fontSize: scoreFontSize, color: '#f97316' }]}>
          {p2Display}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View 
      style={[styles.container, isLandscape && styles.containerLandscape]}
      onStartShouldSetResponder={handleStartShouldSetResponder}
      onMoveShouldSetResponderCapture={handleMoveShouldSetResponderCapture}
      onResponderRelease={handleResponderRelease}
    >
      {/* Layout Mode Selector (Always visible to allow selection) */}
      <View style={[styles.modeSelectorRow, isLandscape && styles.modeSelectorRowLandscape]}>
        <TouchableOpacity 
          style={[styles.modeToggleBtn, scoreboardMode === 'classic' && styles.modeToggleBtnActive]} 
          onPress={() => toggleScoreboardMode()}
        >
          <Text style={[styles.modeToggleText, scoreboardMode === 'classic' && styles.modeToggleTextActive]}>
            {config.language === 'pt' ? 'Resumido' : 'Classic'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.modeToggleBtn, scoreboardMode === 'grandslam' && styles.modeToggleBtnActive]} 
          onPress={() => toggleScoreboardMode()}
        >
          <Text style={[styles.modeToggleText, scoreboardMode === 'grandslam' && styles.modeToggleTextActive]}>
            {config.language === 'pt' ? 'Completo (Grand Slam)' : 'Grand Slam'}
          </Text>
        </TouchableOpacity>
        {Platform.OS === 'web' && (
          <TouchableOpacity 
            style={[styles.modeToggleBtn, isFullscreenWeb && styles.modeToggleBtnActive, { marginLeft: 8 }]} 
            onPress={toggleFullscreenWeb}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons 
                name={isFullscreenWeb ? "contract" : "expand"} 
                size={11} 
                color={isFullscreenWeb ? "#0f172a" : "#94a3b8"} 
              />
              <Text style={[styles.modeToggleText, isFullscreenWeb && styles.modeToggleTextActive]}>
                {isFullscreenWeb 
                  ? (config.language === 'pt' ? 'Sair Tela Cheia' : 'Exit Fullscreen') 
                  : (config.language === 'pt' ? 'Tela Cheia' : 'Fullscreen')}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {scoreboardMode === 'grandslam' ? (
        <GrandSlamScoreboard
          matchState={matchState}
          onAddPoint={onAddPoint}
          currentTime={currentTime}
          elapsedTime={formatElapsed(elapsedSeconds)}
          isVoiceMuted={isVoiceMuted}
          onToggleMute={onToggleMute}
          isPaused={isPaused}
        />
      ) : (
        <>
          {/* Set Scores Summary */}
          <View style={[styles.header, isLandscape && styles.headerLandscape]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.matchFormatText, isLandscape && styles.matchFormatTextLandscape]}>
                {isMatchTieBreak
                  ? t.superTB
                  : isTieBreak
                  ? t.tb
                  : `${t.set} ${currentSetIndex + 1} • ${t.bestOf} ${config.setsToWin * 2 - 1}`}
              </Text>
              <TouchableOpacity onPress={onToggleMute} style={[{ padding: 4 }, isLandscape ? { marginTop: 0 } : { marginTop: -8 }]}>
                <Ionicons 
                  name={isVoiceMuted ? "volume-mute" : "volume-high"} 
                  size={18} 
                  color={isVoiceMuted ? "#ef4444" : "#ccff00"} 
                />
              </TouchableOpacity>
            </View>
            {renderSetScores()}
          </View>

          {/* Main Scoreboard panels */}
          <View style={[styles.scoreboardWrapper, isLandscape && styles.scoreboardWrapperLandscape]}>
            {matchState.courtSideSwapped ? [player2Card, player1Card] : [player1Card, player2Card]}
          </View>
        </>
      )}

      {/* Serving side indicator & Winner Overlay & Control Buttons */}
      <View style={[styles.footerContainer, isLandscape && styles.footerContainerLandscape]}>
        
        {/* Serving side indicator */}
        {winner === null && (
          <View style={[styles.servingStatusRow, isLandscape && styles.servingStatusRowLandscape]}>
            <Ionicons name="swap-horizontal" size={isLandscape ? 14 : 18} color="#ccff00" />
            <Text style={[styles.servingStatusText, isLandscape && styles.servingStatusTextLandscape]}>
              {t.servingSide}:{' '}
              <Text style={styles.servingStatusValue}>
                {deuceCourt ? t.deuceCourt : t.adCourt}
              </Text>
            </Text>
          </View>
        )}

        {/* Winner Overlay Banner */}
        {winner !== null && (
          <View style={[styles.winnerCardContainer, isLandscape && styles.winnerCardContainerLandscape]}>
            <View style={[styles.winnerCard, isLandscape && styles.winnerCardLandscape]}>
              <Ionicons name="trophy" size={isLandscape ? 20 : 28} color="#eab308" />
              <Text style={[styles.winnerCardText, isLandscape && styles.winnerCardTextLandscape]}>
                {t.winner(winner === 1 ? config.player1Name : config.player2Name)}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.saveMatchBtn,
                isSaved && styles.saveMatchBtnSaved,
                isLandscape && styles.saveMatchBtnLandscape
              ]}
              onPress={async () => {
                if (isSaved) return;
                 const matchData = {
                   type: 'classic' as const,
                   player1Name: config.player1Name,
                   player2Name: config.player2Name,
                   setScores: setScores.map(s => ({
                     player1Games: s.player1Games,
                     player2Games: s.player2Games,
                     player1TieBreakPoints: s.player1TieBreakPoints,
                     player2TieBreakPoints: s.player2TieBreakPoints,
                   })),
                   winner,
                   setsToWin: config.setsToWin,
                   pointsHistory: matchState.pointsHistory || [],
                   stats: calculateMatchStats(matchState.pointsHistory || []),
                   totalDuration: formatElapsed(elapsedSeconds),
                   gameDurations: gameDurations.map(d => formatElapsed(d)),
                   terminationType: matchState.terminationType || 'completed',
                   retiredPlayer: matchState.retiredPlayer,
                   retirementReason: matchState.retirementReason,
                   abandonmentReason: matchState.abandonmentReason,
                   rawState: matchState,
                 };
                 const success = await historyService.saveMatch(matchData);
                if (success) {
                  if (matchState.resumedMatchId) {
                    await historyService.deleteMatch(matchState.resumedMatchId);
                  }
                  setIsSaved(true);
                  Alert.alert(
                    config.language === 'pt' ? 'Sucesso' : config.language === 'en' ? 'Success' : 'Éxito',
                    config.language === 'pt' ? 'Partida salva com sucesso!' : config.language === 'en' ? 'Match saved successfully!' : '¡Partido guardado con éxito!'
                  );
                }
              }}
              disabled={isSaved}
            >
              <Ionicons
                name={isSaved ? "checkmark-circle" : "save-outline"}
                size={isLandscape ? 14 : 16}
                color={isSaved ? "#0f172a" : "#ccff00"}
              />
              <Text style={[styles.saveMatchBtnText, isSaved && styles.saveMatchBtnTextSaved]}>
                {isSaved
                  ? (config.language === 'pt' ? 'Salvo!' : config.language === 'en' ? 'Saved!' : '¡Guardado!')
                  : (config.language === 'pt' ? 'Salvar Partida' : config.language === 'en' ? 'Save Match' : 'Guardar Partido')
                }
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Control Buttons */}
        <View style={[styles.controlsRow, isLandscape && styles.controlsRowLandscape]}>
          <TouchableOpacity 
            style={[styles.controlBtn, isLandscape && styles.controlBtnLandscape]} 
            onPress={onUndo} 
            disabled={matchState.history.length === 0}
          >
            <Ionicons
              name="arrow-undo"
              size={isLandscape ? 16 : 20}
              color={matchState.history.length === 0 ? '#475569' : '#f8fafc'}
            />
            <Text style={[styles.controlBtnText, matchState.history.length === 0 && styles.disabledText, isLandscape && styles.controlBtnTextLandscape]} numberOfLines={1}>
              {t.undo}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.controlBtn, isLandscape && styles.controlBtnLandscape]} 
            onPress={handleSpeakScore}
          >
            <Ionicons name="volume-high" size={isLandscape ? 16 : 20} color="#f8fafc" />
            <Text style={[styles.controlBtnText, isLandscape && styles.controlBtnTextLandscape]} numberOfLines={1}>
              {t.speakScore}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.controlBtn, isLandscape && styles.controlBtnLandscape]} 
            onPress={onToggleSide}
          >
            <Ionicons name="swap-horizontal" size={isLandscape ? 16 : 20} color="#f8fafc" />
            <Text style={[styles.controlBtnText, isLandscape && styles.controlBtnTextLandscape]} numberOfLines={1}>
              {t.swapSides}
            </Text>
          </TouchableOpacity>

          {winner !== null ? (
            <TouchableOpacity 
              style={[styles.controlBtn, styles.dangerBtn, isLandscape && styles.controlBtnLandscape]} 
              onPress={onReset}
            >
              <Ionicons name="refresh" size={isLandscape ? 16 : 20} color="#ef4444" />
              <Text style={[styles.controlBtnText, { color: '#ef4444' }, isLandscape && styles.controlBtnTextLandscape]} numberOfLines={1}>
                {t.newGame}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.controlBtn, styles.dangerBtn, isLandscape && styles.controlBtnLandscape]} 
              onPress={() => {
                setIsPaused(true);
                setOptionsMenuSubview('main');
                setShowOptionsMenu(true);
              }}
            >
              <Ionicons name="pause" size={isLandscape ? 16 : 20} color="#ef4444" />
              <Text style={[styles.controlBtnText, { color: '#ef4444' }, isLandscape && styles.controlBtnTextLandscape]} numberOfLines={1}>
                {config.language === 'pt' ? 'Interromper' : config.language === 'es' ? 'Interrumpir' : 'Interrupt'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {/* Overlay de Pausa / Interrupção */}
      {isPaused && !showOptionsMenu && (
        <View style={styles.pausedOverlay}>
          <Ionicons name="pause-circle" size={80} color="#ccff00" style={{ marginBottom: 15 }} />
          <Text style={styles.pausedTitle}>
            {config.language === 'pt' ? 'Partida Suspensa' : config.language === 'es' ? 'Partido Suspendido' : 'Match Suspended'}
          </Text>
          <Text style={styles.pausedSubtitle}>
            {config.language === 'pt' 
              ? 'O cronômetro está parado e as marcações de ponto estão bloqueadas.' 
              : config.language === 'es' 
              ? 'El cronómetro está parado y los controles de punto están bloqueados.' 
              : 'The timer is stopped and scoring buttons are locked.'}
          </Text>
          
          <TouchableOpacity 
            style={styles.resumeOverlayBtn} 
            onPress={() => setIsPaused(false)}
          >
            <Ionicons name="play" size={22} color="#090d16" style={{ marginRight: 8 }} />
            <Text style={styles.resumeOverlayBtnText}>
              {config.language === 'pt' ? 'Retomar Partida' : config.language === 'es' ? 'Retomar Partido' : 'Resume Match'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuOverlayBtn} 
            onPress={() => {
              setOptionsMenuSubview('main');
              setShowOptionsMenu(true);
            }}
          >
            <Ionicons name="menu" size={20} color="#ccff00" style={{ marginRight: 6 }} />
            <Text style={styles.menuOverlayBtnText}>
              {config.language === 'pt' ? 'Menu de Opções' : config.language === 'es' ? 'Menú de Opciones' : 'Options Menu'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal do Menu de Opções */}
      <Modal
        visible={showOptionsMenu}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowOptionsMenu(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            
            {/* Cabeçalho do Modal */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {optionsMenuSubview === 'main' && (config.language === 'pt' ? 'OPÇÕES DA PARTIDA' : config.language === 'es' ? 'OPCIONES DEL PARTIDO' : 'MATCH OPTIONS')}
                {optionsMenuSubview === 'retire_player_forfeit' && (config.language === 'pt' ? 'DESISTÊNCIA (FORFEIT)' : config.language === 'es' ? 'DESISTENCIA' : 'DECLARING FORFEIT')}
                {optionsMenuSubview === 'retire_player_injury' && (config.language === 'pt' ? 'ENCERRAR POR LESÃO' : config.language === 'es' ? 'LESIONADO' : 'DECLARING INJURY')}
                {optionsMenuSubview === 'abandon_reason' && (config.language === 'pt' ? 'SUSPENDER PARTIDA' : config.language === 'es' ? 'SUSPENDER PARTIDO' : 'SUSPEND MATCH')}
              </Text>
              <TouchableOpacity onPress={() => setShowOptionsMenu(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Conteúdo dinâmico do Modal baseados na subview */}
            <View style={styles.modalBody}>
              {optionsMenuSubview === 'main' && (
                <View style={styles.menuButtonsContainer}>
                  {/* Botão Retomar */}
                  <TouchableOpacity 
                    style={[styles.menuOptionBtn, styles.menuOptionBtnPrimary]} 
                    onPress={() => {
                      setShowOptionsMenu(false);
                      setIsPaused(false);
                    }}
                  >
                    <Ionicons name="play-outline" size={20} color="#090d16" style={{ marginRight: 10 }} />
                    <Text style={[styles.menuOptionBtnText, { color: '#090d16' }]}>
                      {config.language === 'pt' ? 'Retomar Partida' : config.language === 'es' ? 'Retomar Partido' : 'Resume Match'}
                    </Text>
                  </TouchableOpacity>

                  {/* Pausar/Despausar Cronômetro alternadamente sem fechar modal */}
                  <TouchableOpacity 
                    style={styles.menuOptionBtn} 
                    onPress={() => setIsPaused(!isPaused)}
                  >
                    <Ionicons name={isPaused ? "play-circle-outline" : "pause-circle-outline"} size={20} color="#ccff00" style={{ marginRight: 10 }} />
                    <Text style={styles.menuOptionBtnText}>
                      {isPaused 
                        ? (config.language === 'pt' ? 'Retomar Cronômetro' : config.language === 'es' ? 'Retomar Cronómetro' : 'Resume Timer')
                        : (config.language === 'pt' ? 'Pausar Cronômetro' : config.language === 'es' ? 'Pausar Cronómetro' : 'Pause Timer')
                      }
                    </Text>
                  </TouchableOpacity>

                  {/* Botão Desistência */}
                  <TouchableOpacity 
                    style={styles.menuOptionBtn} 
                    onPress={() => setOptionsMenuSubview('retire_player_forfeit')}
                  >
                    <Ionicons name="flag-outline" size={20} color="#f97316" style={{ marginRight: 10 }} />
                    <Text style={styles.menuOptionBtnText}>
                      {config.language === 'pt' ? 'Encerrar por Desistência' : config.language === 'es' ? 'Declarar Desistencia' : 'End by Forfeit'}
                    </Text>
                  </TouchableOpacity>

                  {/* Botão Lesão */}
                  <TouchableOpacity 
                    style={styles.menuOptionBtn} 
                    onPress={() => setOptionsMenuSubview('retire_player_injury')}
                  >
                    <Ionicons name="medical-outline" size={20} color="#f97316" style={{ marginRight: 10 }} />
                    <Text style={styles.menuOptionBtnText}>
                      {config.language === 'pt' ? 'Encerrar por Lesão' : config.language === 'es' ? 'Encerrar por Lesión' : 'End by Injury'}
                    </Text>
                  </TouchableOpacity>

                  {/* Botão Suspensão Externa */}
                  <TouchableOpacity 
                    style={styles.menuOptionBtn} 
                    onPress={() => setOptionsMenuSubview('abandon_reason')}
                  >
                    <Ionicons name="thunderstorm-outline" size={20} color="#38bdf8" style={{ marginRight: 10 }} />
                    <Text style={styles.menuOptionBtnText}>
                      {config.language === 'pt' ? 'Suspender (Chuva/Força Maior)' : config.language === 'es' ? 'Suspender (Lluvia/Fuerza Mayor)' : 'Suspend (Weather/Force Majeure)'}
                    </Text>
                  </TouchableOpacity>

                  {/* Botão Reiniciar */}
                  <TouchableOpacity 
                    style={styles.menuOptionBtn} 
                    onPress={() => {
                      Alert.alert(
                        config.language === 'pt' ? 'Reiniciar Partida' : 'Reset Match',
                        config.language === 'pt' ? 'Deseja reiniciar a pontuação deste jogo?' : 'Do you want to reset the score of this match?',
                        [
                          { text: config.language === 'pt' ? 'Não' : 'No', style: 'cancel' },
                          { text: config.language === 'pt' ? 'Sim, Reiniciar' : 'Yes, Reset', style: 'destructive', onPress: () => {
                            setShowOptionsMenu(false);
                            onReset();
                          }}
                        ]
                      );
                    }}
                  >
                    <Ionicons name="refresh-outline" size={20} color="#ef4444" style={{ marginRight: 10 }} />
                    <Text style={[styles.menuOptionBtnText, { color: '#ef4444' }]}>
                      {config.language === 'pt' ? 'Reiniciar Partida' : config.language === 'es' ? 'Reiniciar Partido' : 'Reset Match'}
                    </Text>
                  </TouchableOpacity>

                  {/* Botão Sair */}
                  <TouchableOpacity 
                    style={styles.menuOptionBtn} 
                    onPress={() => {
                      Alert.alert(
                        config.language === 'pt' ? 'Sair da Partida' : 'Exit Match',
                        config.language === 'pt' ? 'Deseja sair da partida? O progresso não salvo será perdido.' : 'Do you want to exit? Unsaved progress will be lost.',
                        [
                          { text: config.language === 'pt' ? 'Cancelar' : 'Cancel', style: 'cancel' },
                          { text: config.language === 'pt' ? 'Sair' : 'Exit', style: 'destructive', onPress: () => {
                            setShowOptionsMenu(false);
                            onReset();
                          }}
                        ]
                      );
                    }}
                  >
                    <Ionicons name="home-outline" size={20} color="#ef4444" style={{ marginRight: 10 }} />
                    <Text style={[styles.menuOptionBtnText, { color: '#ef4444' }]}>
                      {config.language === 'pt' ? 'Sair (Ir para Início)' : config.language === 'es' ? 'Salir (Ir al Inicio)' : 'Exit Match (Go Home)'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Subview: Desistência */}
              {optionsMenuSubview === 'retire_player_forfeit' && (
                <View style={styles.submenuContainer}>
                  <Text style={styles.submenuInstruction}>
                    {config.language === 'pt' ? 'Selecione o jogador que está desistindo da partida:' : 'Select the player who is forfeiting the match:'}
                  </Text>
                  <TouchableOpacity 
                    style={styles.submenuOptionBtn} 
                    onPress={() => confirmRetirement(1, 'forfeit')}
                  >
                    <Text style={styles.submenuOptionBtnText}>{config.player1Name}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.submenuOptionBtn} 
                    onPress={() => confirmRetirement(2, 'forfeit')}
                  >
                    <Text style={styles.submenuOptionBtnText}>{config.player2Name}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.submenuBackBtn} 
                    onPress={() => setOptionsMenuSubview('main')}
                  >
                    <Ionicons name="arrow-back" size={16} color="#ccff00" style={{ marginRight: 6 }} />
                    <Text style={styles.submenuBackBtnText}>
                      {config.language === 'pt' ? 'Voltar' : 'Back'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Subview: Lesão */}
              {optionsMenuSubview === 'retire_player_injury' && (
                <View style={styles.submenuContainer}>
                  <Text style={styles.submenuInstruction}>
                    {config.language === 'pt' ? 'Selecione o jogador que sofreu a lesão e não pode continuar:' : 'Select the player who suffered the injury:'}
                  </Text>
                  <TouchableOpacity 
                    style={styles.submenuOptionBtn} 
                    onPress={() => confirmRetirement(1, 'injury')}
                  >
                    <Text style={styles.submenuOptionBtnText}>{config.player1Name}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.submenuOptionBtn} 
                    onPress={() => confirmRetirement(2, 'injury')}
                  >
                    <Text style={styles.submenuOptionBtnText}>{config.player2Name}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.submenuBackBtn} 
                    onPress={() => setOptionsMenuSubview('main')}
                  >
                    <Ionicons name="arrow-back" size={16} color="#ccff00" style={{ marginRight: 6 }} />
                    <Text style={styles.submenuBackBtnText}>
                      {config.language === 'pt' ? 'Voltar' : 'Back'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Subview: Abandono / Suspensão Externa */}
              {optionsMenuSubview === 'abandon_reason' && (
                <View style={styles.submenuContainer}>
                  <Text style={styles.submenuInstruction}>
                    {config.language === 'pt' ? 'Selecione o motivo da suspensão da partida:' : 'Select the reason for match suspension:'}
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.submenuOptionBtn} 
                    onPress={() => confirmAbandonment('weather')}
                  >
                    <Text style={styles.submenuOptionBtnText}>
                      {config.language === 'pt' ? 'Chuva / Condições Climáticas' : 'Rain / Weather conditions'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.submenuOptionBtn} 
                    onPress={() => confirmAbandonment('power_outage')}
                  >
                    <Text style={styles.submenuOptionBtnText}>
                      {config.language === 'pt' ? 'Falta de Energia' : 'Power Outage'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.submenuOptionBtn} 
                    onPress={() => confirmAbandonment('court_issue')}
                  >
                    <Text style={styles.submenuOptionBtnText}>
                      {config.language === 'pt' ? 'Problema na Quadra ou Rede' : 'Court or Net Issue'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.submenuOptionBtn} 
                    onPress={() => confirmAbandonment('other')}
                  >
                    <Text style={styles.submenuOptionBtnText}>
                      {config.language === 'pt' ? 'Outro Motivo' : 'Other Reason'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.submenuBackBtn} 
                    onPress={() => setOptionsMenuSubview('main')}
                  >
                    <Ionicons name="arrow-back" size={16} color="#ccff00" style={{ marginRight: 6 }} />
                    <Text style={styles.submenuBackBtnText}>
                      {config.language === 'pt' ? 'Voltar' : 'Back'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Invisible TextInput to capture remote keypresses (like Tab) */}
      <TextInput
        ref={textInputRef}
        style={styles.invisibleInput}
        showSoftInputOnFocus={false}
        autoComplete="off"
        autoCorrect={false}
        value=""
        onKeyPress={handleKeyPress}
        onChangeText={handleTextChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  invisibleInput: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 1,
    height: 1,
    opacity: 0,
  },
  container: {
    flex: 1,
    padding: Platform.OS === 'web' ? 4 : 16,
    backgroundColor: '#090d16',
    justifyContent: 'space-between',
  },
  containerLandscape: {
    padding: Platform.OS === 'web' ? 2 : 8,
  },
  header: {
    alignItems: 'center',
    marginTop: 10,
  },
  headerLandscape: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  matchFormatText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  matchFormatTextLandscape: {
    marginBottom: 0,
  },
  setsHistoryContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  setsHistoryContainerLandscape: {
    marginBottom: 0,
  },
  setScoreBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  setScoreBadgeActive: {
    borderColor: '#ccff00',
    backgroundColor: 'rgba(204, 255, 0, 0.05)',
  },
  setScoreBadgeLandscape: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  setNumberLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  setGamesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  setGamesText: {
    fontSize: 16,
    fontWeight: '800',
  },
  setGamesTextLandscape: {
    fontSize: 12,
  },
  setTieBreakPointsText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
  },
  setGamesDivider: {
    fontSize: 14,
    color: '#475569',
    marginHorizontal: 4,
    fontWeight: '700',
  },
  scoreboardWrapper: {
    flex: 1,
    marginVertical: Platform.OS === 'web' ? 4 : 16,
    justifyContent: 'center',
    gap: Platform.OS === 'web' ? 6 : 16,
  },
  scoreboardWrapperLandscape: {
    flexDirection: 'row',
    marginVertical: Platform.OS === 'web' ? 2 : 4,
    gap: Platform.OS === 'web' ? 4 : 8,
  },
  playerCard: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: Platform.OS === 'web' ? 8 : 16,
    justifyContent: 'space-between',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  playerCardLandscape: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  playerCardP1: {
    borderLeftWidth: 4,
    borderLeftColor: '#06b6d4',
  },
  playerCardP2: {
    borderLeftWidth: 4,
    borderLeftColor: '#f97316',
  },
  servingCardP1: {
    borderColor: '#06b6d4',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
  },
  servingCardP2: {
    borderColor: '#f97316',
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
  },
  winningCard: {
    borderColor: '#ccff00',
    backgroundColor: 'rgba(204, 255, 0, 0.08)',
  },
  servingTag: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  servingTagLandscape: {
    top: 4,
    right: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  servingTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  playerDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  playerDetailsLandscape: {
    marginTop: 2,
    justifyContent: 'flex-start',
    gap: 8,
  },
  playerNameText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#f8fafc',
  },
  playerNameTextLandscape: {
    fontSize: 14,
  },
  setsCountRow: {
    flexDirection: 'row',
    gap: 4,
  },
  setDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  setDotLandscape: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scoreNumberContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumberText: {
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 6,
  },
  footerContainer: {
    width: '100%',
  },
  footerContainerLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  servingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    marginBottom: 10,
  },
  servingStatusRowLandscape: {
    flex: 1,
    marginBottom: 0,
    paddingVertical: 8,
    borderRadius: 8,
  },
  servingStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  servingStatusTextLandscape: {
    fontSize: 10,
  },
  servingStatusValue: {
    fontWeight: '800',
    color: '#ccff00',
  },
  winnerCardContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  winnerCardContainerLandscape: {
    flex: 1.5,
    marginBottom: 0,
  },
  winnerCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderWidth: 1,
    borderColor: '#eab308',
    paddingVertical: 12,
    borderRadius: 12,
  },
  winnerCardLandscape: {
    marginBottom: 0,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveMatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(204, 255, 0, 0.08)',
    borderWidth: 1,
    borderColor: '#ccff00',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  saveMatchBtnSaved: {
    backgroundColor: '#ccff00',
    borderColor: '#ccff00',
  },
  saveMatchBtnLandscape: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  saveMatchBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ccff00',
  },
  saveMatchBtnTextSaved: {
    color: '#0f172a',
  },
  winnerCardText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fef08a',
  },
  winnerCardTextLandscape: {
    fontSize: 11,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 5,
    flexWrap: 'wrap',
  },
  controlsRowLandscape: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    flex: 2,
    marginBottom: 0,
    gap: 6,
  },
  controlBtn: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  controlBtnLandscape: {
    minWidth: 0,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  dangerBtn: {
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  controlBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#f8fafc',
  },
  controlBtnTextLandscape: {
    fontSize: 9,
  },
  disabledText: {
    color: '#475569',
  },
  modeSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 8,
  },
  modeSelectorRowLandscape: {
    marginBottom: 2,
    marginTop: 0,
  },
  modeToggleBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  modeToggleBtnActive: {
    backgroundColor: '#ccff00',
  },
  modeToggleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  modeToggleTextActive: {
    color: '#0f172a',
  },
  // Paused Overlay Styles
  pausedOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(9, 13, 22, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    padding: 24,
  },
  pausedTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ccff00',
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  pausedSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
    maxWidth: 280,
  },
  resumeOverlayBtn: {
    backgroundColor: '#ccff00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 15,
    width: '80%',
    maxWidth: 260,
  },
  resumeOverlayBtnText: {
    color: '#090d16',
    fontSize: 15,
    fontWeight: '800',
  },
  menuOverlayBtn: {
    borderWidth: 1,
    borderColor: '#ccff00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '80%',
    maxWidth: 260,
  },
  menuOverlayBtnText: {
    color: '#ccff00',
    fontSize: 14,
    fontWeight: '800',
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#090d16',
    borderWidth: 1.5,
    borderColor: '#06b6d4',
    borderRadius: 20,
    width: '100%',
    maxWidth: 340,
    overflow: 'hidden',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 1,
  },
  modalBody: {
    padding: 20,
  },
  menuButtonsContainer: {
    gap: 10,
  },
  menuOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuOptionBtnPrimary: {
    backgroundColor: '#ccff00',
    borderColor: '#ccff00',
  },
  menuOptionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f8fafc',
  },

  // Submenu Styles
  submenuContainer: {
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  submenuInstruction: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 18,
  },
  submenuOptionBtn: {
    width: '100%',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1.2,
    borderColor: '#06b6d4',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submenuOptionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#f8fafc',
  },
  submenuBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 8,
  },
  submenuBackBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ccff00',
  },
});
