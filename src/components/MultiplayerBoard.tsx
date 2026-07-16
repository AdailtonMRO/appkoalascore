import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  MultiplayerSessionState,
  getMultiplayerDisplayPoints,
  addPointMultiplayer,
  undoMultiplayer,
  skipPlayerInQueue,
  removePlayerFromSession,
  addPlayerToSession,
} from '../utils/multiplayerEngine';
import { SpeechService } from '../services/speechService';
import { historyService } from '../services/historyService';

interface MultiplayerBoardProps {
  sessionState: MultiplayerSessionState;
  onFinish: (state: MultiplayerSessionState) => void;
  onExit: () => void;
  language: 'pt' | 'en' | 'es';
  physicalMappings: Record<string, string>;
}

export default function MultiplayerBoard({
  sessionState: initialSessionState,
  onFinish,
  onExit,
  language,
  physicalMappings,
}: MultiplayerBoardProps) {
  const [state, setState] = useState<MultiplayerSessionState>(initialSessionState);
  const [newPlayerName, setNewPlayerName] = useState('');
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

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

    switch (action) {
      case 'addPointP1':
      case 'addPointLeft':
        handleAddPoint(1);
        break;
      case 'addPointP2':
      case 'addPointRight':
        handleAddPoint(2);
        break;
      case 'undo':
        handleUndo();
        break;
      case 'announceScore':
        announceMultiplayerScore(state, 'point');
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
    if (start) {
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

  // Sync references to prevent stale closures
  const stateRef = useRef(state);
  stateRef.current = state;

  const announceMultiplayerScore = (updatedState: MultiplayerSessionState, eventType: 'point' | 'game' | 'match', lastScorer?: 1 | 2) => {
    if (!SpeechService.isSpeechEnabled()) return;

    const lang = language || 'pt';
    let text = '';

    const tSpeech = {
      pt: {
        love: 'zero',
        all: 'iguais',
        to: 'a',
        deuce: 'Ponto de Ouro',
        gameWon: (names: string, g1: number, g2: number) => `Jogo para ${names}. Placar de games: ${g1} a ${g2}`,
        matchWon: (names: string) => `Partida concluída. Vitória de ${names}!`,
        rotationOut: (names: string) => `${names} atingiu o limite de vitórias e foi para a fila.`,
        nextIn: (names: string) => `Próximo a entrar: ${names}.`,
        nextMatch: (t1: string, t2: string) => `Próximo jogo: ${t1} contra ${t2}.`,
      },
      en: {
        love: 'love',
        all: 'all',
        to: 'to',
        deuce: 'Golden Point',
        gameWon: (names: string, g1: number, g2: number) => `Game for ${names}. Games score: ${g1} to ${g2}`,
        matchWon: (names: string) => `Match finished. Winner: ${names}!`,
        rotationOut: (names: string) => `${names} reached the win limit and rotated to the queue.`,
        nextIn: (names: string) => `Next to enter: ${names}.`,
        nextMatch: (t1: string, t2: string) => `Next match: ${t1} versus ${t2}.`,
      },
      es: {
        love: 'cero',
        all: 'iguales',
        to: 'a',
        deuce: 'Punto de Oro',
        gameWon: (names: string, g1: number, g2: number) => `Juego para ${names}. Marcador de games: ${g1} a ${g2}`,
        matchWon: (names: string) => `Partido concluido. ¡Victoria de ${names}!`,
        rotationOut: (names: string) => `${names} alcanzó el límite de victorias y fue a la fila.`,
        nextIn: (names: string) => `Próximo a entrar: ${names}.`,
        nextMatch: (t1: string, t2: string) => `Próximo partido: ${t1} contra ${t2}.`,
      }
    };

    const s = tSpeech[lang] || tSpeech.pt;

    const team1Names = stateRef.current.team1?.players.map(p => p.name).join(' e ') || '';
    const team2Names = stateRef.current.team2?.players.map(p => p.name).join(' e ') || '';

    if (eventType === 'match') {
      const winnerName = lastScorer === 1 ? team1Names : team2Names;
      text = s.matchWon(winnerName);
      // If winner rotated out, announce it
      const wasTeam1 = lastScorer === 1;
      const oldConsecWins = wasTeam1 
        ? stateRef.current.team1ConsecutiveWins 
        : stateRef.current.team2ConsecutiveWins;
      const reachedLimit = oldConsecWins + 1 >= 3;

      if (reachedLimit) {
        text += ' ' + s.rotationOut(winnerName);
        
        // Announce the new two teams entering the court
        const nextT1 = updatedState.team1?.players.map(p => p.name).join(' e ') || '';
        const nextT2 = updatedState.team2?.players.map(p => p.name).join(' e ') || '';
        text += ' ' + s.nextMatch(nextT1, nextT2);
      } else {
        // Announce the next incoming player/team from queue
        const nextInNames = (lastScorer === 1 ? updatedState.team2 : updatedState.team1)?.players.map(p => p.name).join(' e ') || '';
        text += ' ' + s.nextIn(nextInNames);
      }
      
      SpeechService.speak(text, lang);
      return;
    }

    if (eventType === 'game') {
      const winnerName = lastScorer === 1 ? team1Names : team2Names;
      text = s.gameWon(winnerName, updatedState.team1Games, updatedState.team2Games);
      SpeechService.speak(text, lang);
      return;
    }

    // Normal points announcement
    const { p1Display, p2Display } = getMultiplayerDisplayPoints(updatedState.team1Points, updatedState.team2Points);

    if (updatedState.team1Points === 3 && updatedState.team2Points === 3) {
      text = s.deuce;
    } else {
      const translatePoint = (pts: string) => {
        if (pts === '0') return s.love;
        return pts;
      };

      if (p1Display === p2Display) {
        text = `${translatePoint(p1Display)} ${s.all}`;
      } else {
        text = `${translatePoint(p1Display)} ${s.to} ${translatePoint(p2Display)}`;
      }
    }

    SpeechService.speak(text, lang);
  };

  const handleAddPoint = (scorerTeam: 1 | 2) => {
    const oldGames1 = state.team1Games;
    const oldGames2 = state.team2Games;
    const oldMatches = state.totalMatchesPlayed;

    const updated = addPointMultiplayer(state, scorerTeam);
    setState(updated);

    // Determine what event to speak
    if (updated.totalMatchesPlayed > oldMatches) {
      // Match ended and rotated players
      announceMultiplayerScore(updated, 'match', scorerTeam);
    } else if (updated.team1Games > oldGames1 || updated.team2Games > oldGames2) {
      // Game won
      announceMultiplayerScore(updated, 'game', scorerTeam);
    } else {
      // Point scored
      announceMultiplayerScore(updated, 'point', scorerTeam);
    }
  };

  const handleUndo = () => {
    if (state.history.length === 0) return;
    const rolledBack = undoMultiplayer(state);
    setState(rolledBack);
    SpeechService.speak(language === 'pt' ? 'Correção.' : language === 'en' ? 'Correction.' : 'Corrección.', language);
  };

  const handleAddNewPlayer = () => {
    const trimmed = newPlayerName.trim();
    if (!trimmed) return;
    if (state.players.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert(t.warning, t.playerExists);
      return;
    }
    const updated = addPlayerToSession(state, trimmed);
    setState(updated);
    setNewPlayerName('');
  };

  const handleSkipPlayer = (playerId: string) => {
    const updated = skipPlayerInQueue(state, playerId);
    setState(updated);
  };

  const handleRemovePlayer = (playerId: string) => {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return;

    Alert.alert(
      t.removeConfirmTitle,
      t.removeConfirmMsg(player.name),
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.remove,
          style: 'destructive',
          onPress: () => {
            const updated = removePlayerFromSession(state, playerId);
            setState(updated);
          },
        },
      ]
    );
  };

  const handleExitSession = () => {
    Alert.alert(
      t.exitTitle,
      t.exitMsg,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.exitWithoutSaving,
          style: 'destructive',
          onPress: onExit,
        },
        {
          text: t.saveAndExit,
          onPress: async () => {
            // Compile leaderboard
            const sortedPlayers = [...state.players].sort((a, b) => b.totalWins - a.totalWins);
            const sessionData = {
              type: 'multiplayer' as const,
              mode: state.mode,
              bestOfGames: state.bestOfGames,
              players: sortedPlayers.map(p => ({ name: p.name, wins: p.totalWins })),
              winnerName: sortedPlayers.length > 0 ? sortedPlayers[0].name : '',
              totalMatches: state.totalMatchesPlayed,
            };
            const success = await historyService.saveMatch(sessionData);
            if (success) {
              onExit();
            } else {
              Alert.alert(t.warning, 'Erro ao salvar treino.');
            }
          },
        },
      ]
    );
  };

  const { p1Display, p2Display } = getMultiplayerDisplayPoints(state.team1Points, state.team2Points);

  const team1Names = state.team1?.players.map(p => p.name).join(' / ') || '';
  const team2Names = state.team2?.players.map(p => p.name).join(' / ') || '';

  const labels = {
    pt: {
      consecutiveWins: (count: number) => `🔥 ${count} vitórias seguidas`,
      queueTitle: 'Fila de Espera',
      queueEmpty: 'Nenhum jogador na fila.',
      addPlayerTitle: 'Entrar no Treino (Atrasado)',
      addPlaceholder: 'Nome do jogador',
      addBtn: 'Cadastrar',
      undo: 'Desfazer',
      finish: 'Finalizar Treino',
      quit: 'Sair',
      bestOf3: 'Melhor de 3 games',
      bestOf5: 'Melhor de 5 games',
      warning: 'Aviso',
      playerExists: 'Jogador já cadastrado.',
      removeConfirmTitle: 'Remover Jogador',
      removeConfirmMsg: (name: string) => `Deseja remover ${name} do treino e da fila?`,
      cancel: 'Cancelar',
      remove: 'Remover',
      skip: 'Pular',
      exitTitle: 'Sair do Treino',
      exitMsg: 'Deseja salvar a classificação deste treino no Histórico ou apenas sair?',
      exitWithoutSaving: 'Sair sem Salvar',
      saveAndExit: 'Salvar e Sair',
      serving: 'Saque',
      goldPoint: 'PONTO DE OURO',
    },
    en: {
      consecutiveWins: (count: number) => `🔥 ${count} wins in a row`,
      queueTitle: 'Waiting List',
      queueEmpty: 'No players in queue.',
      addPlayerTitle: 'Join Match (Late Arrival)',
      addPlaceholder: 'Player name',
      addBtn: 'Register',
      undo: 'Undo',
      finish: 'Finish Session',
      quit: 'Exit',
      bestOf3: 'Best of 3 games',
      bestOf5: 'Best of 5 games',
      warning: 'Warning',
      playerExists: 'Player already registered.',
      removeConfirmTitle: 'Remove Player',
      removeConfirmMsg: (name: string) => `Do you want to remove ${name} from the training and queue?`,
      cancel: 'Cancel',
      remove: 'Remove',
      skip: 'Skip',
      exitTitle: 'Exit Training',
      exitMsg: 'Do you want to save the standings of this session to History or just exit?',
      exitWithoutSaving: 'Exit without Saving',
      saveAndExit: 'Save and Exit',
      serving: 'Serve',
      goldPoint: 'GOLDEN POINT',
    },
    es: {
      consecutiveWins: (count: number) => `🔥 ${count} victorias seguidas`,
      queueTitle: 'Fila de Espera',
      queueEmpty: 'Ningún jugador en la fila.',
      addPlayerTitle: 'Entrar al Juego (Tardío)',
      addPlaceholder: 'Nombre del jugador',
      addBtn: 'Registrar',
      undo: 'Deshacer',
      finish: 'Finalizar',
      quit: 'Salir',
      bestOf3: 'Mejor de 3 games',
      bestOf5: 'Mejor de 5 games',
      warning: 'Aviso',
      playerExists: 'Jugador ya registrado.',
      removeConfirmTitle: 'Remover Jugador',
      removeConfirmMsg: (name: string) => `¿Desea remover a ${name} del juego y de la fila?`,
      cancel: 'Cancelar',
      remove: 'Remover',
      skip: 'Saltar',
      exitTitle: 'Salir del Entrenamiento',
      exitMsg: '¿Desea guardar la clasificación de este entrenamiento en el Historial o solo salir?',
      exitWithoutSaving: 'Salir sin Guardar',
      saveAndExit: 'Guardar y Salir',
      serving: 'Saque',
      goldPoint: 'PUNTO DE ORO',
    }
  };

  const t = labels[language] || labels.pt;

  const scoreFontSize = isLandscape ? Math.min(height * 0.58, 220) : 90;

  return (
    <View 
      style={[styles.container, isLandscape && styles.containerLandscape]}
      onStartShouldSetResponder={handleStartShouldSetResponder}
      onMoveShouldSetResponderCapture={handleMoveShouldSetResponderCapture}
      onResponderRelease={handleResponderRelease}
    >
      {/* Top Bar Info */}
      <View style={[styles.header, isLandscape && styles.headerLandscape]}>
        <Text style={styles.formatText}>
          {state.bestOfGames === 3 ? t.bestOf3 : t.bestOf5}
        </Text>
        <Text style={[styles.formatText, { color: '#10b981' }]}>
          {t.serving}: {t.goldPoint}
        </Text>
      </View>

      {/* Main Scoreboard Wrapper */}
      <View style={[styles.scoreboardWrapper, isLandscape && styles.scoreboardWrapperLandscape]}>
        {/* Team 1 (Left) */}
        <TouchableOpacity
          style={[
            styles.playerCard,
            styles.playerCardP1,
            isLandscape && styles.playerCardLandscape,
          ]}
          onPress={() => handleAddPoint(1)}
        >
          <View style={styles.cardDetails}>
            <Text style={[styles.playerNameText, isLandscape && styles.playerNameTextLandscape]} numberOfLines={1}>
              {team1Names}
            </Text>
            <Text style={styles.consecutiveWinsText}>
              {t.consecutiveWins(state.team1ConsecutiveWins)}
            </Text>
          </View>
          <View style={styles.scoreNumberContainer}>
            <Text style={[styles.scoreNumberText, { fontSize: scoreFontSize, color: '#06b6d4' }]}>
              {p1Display}
            </Text>
          </View>
          <View style={styles.gamesRow}>
            <Text style={styles.gamesLabelText}>GAMES:</Text>
            <Text style={styles.gamesValueText}>{state.team1Games}</Text>
          </View>
        </TouchableOpacity>

        {/* Team 2 (Right) */}
        <TouchableOpacity
          style={[
            styles.playerCard,
            styles.playerCardP2,
            isLandscape && styles.playerCardLandscape,
          ]}
          onPress={() => handleAddPoint(2)}
        >
          <View style={styles.cardDetails}>
            <Text style={[styles.playerNameText, isLandscape && styles.playerNameTextLandscape]} numberOfLines={1}>
              {team2Names}
            </Text>
            <Text style={styles.consecutiveWinsText}>
              {t.consecutiveWins(state.team2ConsecutiveWins)}
            </Text>
          </View>
          <View style={styles.scoreNumberContainer}>
            <Text style={[styles.scoreNumberText, { fontSize: scoreFontSize, color: '#f97316' }]}>
              {p2Display}
            </Text>
          </View>
          <View style={styles.gamesRow}>
            <Text style={styles.gamesLabelText}>GAMES:</Text>
            <Text style={styles.gamesValueText}>{state.team2Games}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Queue and Late Arrivals Area */}
      {!isLandscape && (
        <ScrollView style={styles.queueCard} showsVerticalScrollIndicator={false}>
          <Text style={styles.queueTitle}>{t.queueTitle}</Text>

          {/* Queue List */}
          {state.queue.length === 0 ? (
            <Text style={styles.emptyQueueText}>{t.queueEmpty}</Text>
          ) : (
            state.queue.map((playerId, qIdx) => {
              const player = state.players.find(p => p.id === playerId);
              if (!player) return null;
              const isNext = qIdx === 0;

              return (
                <View key={playerId} style={[styles.queueItem, isNext && styles.queueItemNext]}>
                  <Text style={[styles.queueIndex, isNext && styles.textNeon]}>#{qIdx + 1}</Text>
                  <Text style={styles.queueName} numberOfLines={1}>
                    {player.name}
                  </Text>
                  <View style={styles.queueActions}>
                    {isNext && (
                      <TouchableOpacity
                        style={styles.queueBtn}
                        onPress={() => handleSkipPlayer(playerId)}
                      >
                        <Text style={styles.queueBtnText}>{t.skip}</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.queueBtn, styles.queueBtnDelete]}
                      onPress={() => handleRemovePlayer(playerId)}
                    >
                      <Ionicons name="trash-outline" size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          {/* Late Arrival input */}
          <View style={styles.addPlayerContainer}>
            <Text style={styles.addPlayerTitle}>{t.addPlayerTitle}</Text>
            <View style={styles.addPlayerRow}>
              <TextInput
                style={styles.smallInput}
                value={newPlayerName}
                onChangeText={setNewPlayerName}
                placeholder={t.addPlaceholder}
                placeholderTextColor="#64748b"
                onSubmitEditing={handleAddNewPlayer}
              />
              <TouchableOpacity style={styles.smallAddBtn} onPress={handleAddNewPlayer}>
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Bottom controls panel */}
      <View style={[styles.footer, isLandscape && styles.footerLandscape]}>
        <TouchableOpacity style={styles.controlBtn} onPress={handleUndo} disabled={state.history.length === 0}>
          <Ionicons name="arrow-undo" size={18} color={state.history.length === 0 ? '#475569' : '#fff'} />
          <Text style={[styles.controlBtnText, state.history.length === 0 && styles.disabledText]}>{t.undo}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.controlBtn, styles.finishBtn]} onPress={() => onFinish(state)}>
          <Ionicons name="trophy" size={18} color="#ccff00" />
          <Text style={[styles.controlBtnText, { color: '#ccff00' }]}>{t.finish}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.controlBtn, styles.dangerBtn]} onPress={handleExitSession}>
          <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
          <Text style={[styles.controlBtnText, { color: '#ef4444' }]}>{t.quit}</Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  headerLandscape: {
    marginTop: 2,
    marginBottom: 4,
  },
  formatText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  scoreboardWrapper: {
    flex: 1,
    marginVertical: 12,
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
  cardDetails: {
    flexDirection: 'column',
    marginTop: 4,
    gap: 4,
  },
  playerNameText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#f8fafc',
  },
  playerNameTextLandscape: {
    fontSize: 13,
  },
  consecutiveWinsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ccff00',
  },
  scoreNumberContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumberText: {
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  gamesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(9, 13, 22, 0.4)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  gamesLabelText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
  },
  gamesValueText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ccff00',
  },
  queueCard: {
    flex: 0.8,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    padding: 12,
    marginBottom: 12,
  },
  queueTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10b981',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  emptyQueueText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 10,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(9, 13, 22, 0.3)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  queueItemNext: {
    borderColor: 'rgba(16, 185, 129, 0.2)',
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
  },
  queueIndex: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    width: 22,
  },
  textNeon: {
    color: '#ccff00',
  },
  queueName: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  queueActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  queueBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  queueBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ccff00',
  },
  queueBtnDelete: {
    borderColor: 'rgba(239, 68, 68, 0.1)',
  },
  addPlayerContainer: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 12,
  },
  addPlayerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  addPlayerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  smallInput: {
    flex: 1,
    backgroundColor: '#090d16',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    color: '#f8fafc',
    paddingHorizontal: 10,
    height: 38,
    fontSize: 13,
    fontWeight: '600',
  },
  smallAddBtn: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingBottom: 5,
  },
  footerLandscape: {
    paddingBottom: 0,
  },
  controlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  disabledText: {
    color: '#475569',
  },
  finishBtn: {
    borderColor: 'rgba(204, 255, 0, 0.2)',
  },
  dangerBtn: {
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  controlBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#f8fafc',
  },
});
