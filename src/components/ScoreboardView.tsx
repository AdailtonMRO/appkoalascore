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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MatchState, getDisplayPoints, isServingFromDeuceCourt, calculateMatchStats } from '../utils/tennisEngine';
import { SpeechService } from '../services/speechService';
import { historyService } from '../services/historyService';

interface ScoreboardViewProps {
  matchState: MatchState;
  onAddPoint: (player: 1 | 2) => void;
  onUndo: () => void;
  onReset: () => void;
  isVoiceMuted: boolean;
  onToggleMute: () => void;
  onToggleSide: () => void; // Callback to toggle ends manually
  physicalMappings: Record<string, string>;
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
}: ScoreboardViewProps) {
  const { config, player1Sets, player2Sets, setScores, currentSetIndex, isTieBreak, isMatchTieBreak, server, winner } = matchState;
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [isSaved, setIsSaved] = useState(false);

  // Gesture Responder references and handlers to support Beauty-R1 remote swipes
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleStartShouldSetResponder = (e: any) => {
    const { pageX, pageY } = e.nativeEvent;
    touchStartRef.current = { x: pageX, y: pageY, time: Date.now() };
    return true; // return true so empty space touch start is accepted and tracked!
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

  const handleKeyPress = (e: any) => {
    const key = e.nativeEvent.key;
    const action = physicalMappings[`key_${key}`];
    if (action) {
      triggerAction(action);
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

  // Calculate dynamic font size for the score numbers
  // In portrait, we use standard sizes, in landscape we scale with screen height
  const scoreFontSize = isLandscape
    ? Math.min(height * 0.48, 240)
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
      disabled={winner !== null}
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
      disabled={winner !== null}
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
      {/* Set Scores Summary */}
      <View style={[styles.header, isLandscape && styles.headerLandscape]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.matchFormatText}>
            {isMatchTieBreak
              ? t.superTB
              : isTieBreak
              ? t.tb
              : `${t.set} ${currentSetIndex + 1} • ${t.bestOf} ${config.setsToWin * 2 - 1}`}
          </Text>
          <TouchableOpacity onPress={onToggleMute} style={{ padding: 4, marginTop: -8 }}>
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
                 };
                 const success = await historyService.saveMatch(matchData);
                if (success) {
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

          <TouchableOpacity 
            style={[styles.controlBtn, styles.dangerBtn, isLandscape && styles.controlBtnLandscape]} 
            onPress={onReset}
          >
            <Ionicons name="refresh" size={isLandscape ? 16 : 20} color="#ef4444" />
            <Text style={[styles.controlBtnText, { color: '#ef4444' }, isLandscape && styles.controlBtnTextLandscape]} numberOfLines={1}>
              {t.newGame}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Invisible TextInput to capture remote keypresses (like Tab) */}
      <TextInput
        ref={textInputRef}
        style={styles.invisibleInput}
        showSoftInputOnFocus={false}
        autoComplete="off"
        autoCorrect={false}
        value=""
        onKeyPress={handleKeyPress}
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
    padding: 16,
    backgroundColor: '#090d16',
    justifyContent: 'space-between',
  },
  containerLandscape: {
    padding: 8,
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
    marginVertical: 16,
    justifyContent: 'center',
    gap: 16,
  },
  scoreboardWrapperLandscape: {
    flexDirection: 'row',
    marginVertical: 4,
    gap: 8,
  },
  playerCard: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    justifyContent: 'space-between',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  playerCardLandscape: {
    borderRadius: 12,
    padding: 8,
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
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
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
});
