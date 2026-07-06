import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MultiplayerSessionState, createInitialSession } from '../utils/multiplayerEngine';

interface MultiplayerSetupProps {
  onStart: (state: MultiplayerSessionState) => void;
  onBack: () => void;
  language: 'pt' | 'en' | 'es';
}

export default function MultiplayerSetup({ onStart, onBack, language }: MultiplayerSetupProps) {
  const [mode, setMode] = useState<'singles' | 'doubles'>('singles');
  const [bestOfGames, setBestOfGames] = useState<3 | 5>(3);
  const [playerInput, setPlayerInput] = useState('');
  const [playerList, setPlayerList] = useState<string[]>([]);

  const addPlayer = () => {
    const trimmed = playerInput.trim();
    if (!trimmed) return;
    if (playerList.includes(trimmed)) {
      Alert.alert(t.errorTitle, t.playerExistsMsg);
      return;
    }
    setPlayerList([...playerList, trimmed]);
    setPlayerInput('');
  };

  const removePlayer = (index: number) => {
    setPlayerList(playerList.filter((_, idx) => idx !== index));
  };

  const handleStart = () => {
    const minPlayers = mode === 'singles' ? 2 : 4;
    if (playerList.length < minPlayers) {
      Alert.alert(
        t.errorTitle,
        mode === 'singles' ? t.minSinglesMsg : t.minDoublesMsg
      );
      return;
    }

    const sessionState = createInitialSession(playerList, mode, bestOfGames);
    onStart(sessionState);
  };

  const localization = {
    pt: {
      title: 'JOGOS TREINO (MULTIPLAYER)',
      subtitle: 'Organize fila e revezamento de jogadores',
      back: 'Voltar',
      modeLabel: 'Modalidade',
      singles: 'Individual',
      doubles: 'Duplas',
      formatLabel: 'Duração da Partida',
      bestOf3: 'Melhor de 3 Games',
      bestOf3Desc: 'Vence quem fizer 2 games',
      bestOf5: 'Melhor de 5 Games',
      bestOf5Desc: 'Vence quem fizer 3 games',
      playersLabel: 'Jogadores Cadastrados',
      addPlaceholder: 'Nome do jogador',
      addBtn: 'Adicionar',
      startBtn: 'SORTEAR E INICIAR',
      playerExistsMsg: 'Já existe um jogador com este nome.',
      minSinglesMsg: 'Para o modo Individual, cadastre no mínimo 2 jogadores.',
      minDoublesMsg: 'Para o modo Duplas, cadastre no mínimo 4 jogadores.',
      errorTitle: 'Aviso',
      registeredTitle: 'Lista de Espera:',
    },
    en: {
      title: 'TRAINING MATCHES (MULTIPLAYER)',
      subtitle: 'Organize player queue and rotation',
      back: 'Back',
      modeLabel: 'Match Mode',
      singles: 'Singles',
      doubles: 'Doubles',
      formatLabel: 'Match Format',
      bestOf3: 'Best of 3 Games',
      bestOf3Desc: 'First to win 2 games wins',
      bestOf5: 'Best of 5 Games',
      bestOf5Desc: 'First to win 3 games wins',
      playersLabel: 'Registered Players',
      addPlaceholder: 'Player name',
      addBtn: 'Add',
      startBtn: 'DRAW & START MATCH',
      playerExistsMsg: 'A player with this name already exists.',
      minSinglesMsg: 'For Singles mode, register at least 2 players.',
      minDoublesMsg: 'For Doubles mode, register at least 4 players.',
      errorTitle: 'Warning',
      registeredTitle: 'Waiting List:',
    },
    es: {
      title: 'ENTRENAMIENTOS (MULTIPLAYER)',
      subtitle: 'Organiza fila y relevo de jugadores',
      back: 'Volver',
      modeLabel: 'Modalidad',
      singles: 'Individuales',
      doubles: 'Dobles',
      formatLabel: 'Duración del Partido',
      bestOf3: 'Mejor de 3 Games',
      bestOf3Desc: 'Gana el que haga 2 games',
      bestOf5: 'Mejor de 5 Games',
      bestOf5Desc: 'Gana el que haga 3 games',
      playersLabel: 'Jugadores Registrados',
      addPlaceholder: 'Nombre del jugador',
      addBtn: 'Añadir',
      startBtn: 'SORTEAR E INICIAR',
      playerExistsMsg: 'Ya existe un jugador con este nombre.',
      minSinglesMsg: 'Para el modo Individuales, registra al menos 2 jugadores.',
      minDoublesMsg: 'Para el modo Dobles, registra al menos 4 jugadores.',
      errorTitle: 'Aviso',
      registeredTitle: 'Lista de Espera:',
    }
  };

  const t = localization[language] || localization.pt;

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Top navigation Back button */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#ccff00" />
          <Text style={styles.backButtonText}>{t.back}</Text>
        </TouchableOpacity>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="people" size={42} color="#10b981" style={styles.peopleIcon} />
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.subtitle}>{t.subtitle}</Text>
      </View>

      {/* Mode Selection Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.modeLabel}</Text>
        <View style={styles.btnGroup}>
          <TouchableOpacity
            style={[styles.btnGroupItem, mode === 'singles' && styles.btnGroupItemActive]}
            onPress={() => setMode('singles')}
          >
            <Ionicons
              name="person"
              size={18}
              color={mode === 'singles' ? '#0f172a' : '#64748b'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.btnGroupText, mode === 'singles' && styles.textBlack]}>
              {t.singles}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnGroupItem, mode === 'doubles' && styles.btnGroupItemActive]}
            onPress={() => setMode('doubles')}
          >
            <Ionicons
              name="people"
              size={18}
              color={mode === 'doubles' ? '#0f172a' : '#64748b'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.btnGroupText, mode === 'doubles' && styles.textBlack]}>
              {t.doubles}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Format Selection Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.formatLabel}</Text>
        
        <TouchableOpacity
          style={[styles.formatItem, bestOfGames === 3 && styles.formatItemActive]}
          onPress={() => setBestOfGames(3)}
        >
          <View style={styles.formatTextCol}>
            <Text style={[styles.formatText, bestOfGames === 3 && styles.textNeon]}>{t.bestOf3}</Text>
            <Text style={styles.formatDesc}>{t.bestOf3Desc}</Text>
          </View>
          {bestOfGames === 3 && <Ionicons name="checkmark-circle" size={20} color="#ccff00" />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.formatItem, bestOfGames === 5 && styles.formatItemActive]}
          onPress={() => setBestOfGames(5)}
        >
          <View style={styles.formatTextCol}>
            <Text style={[styles.formatText, bestOfGames === 5 && styles.textNeon]}>{t.bestOf5}</Text>
            <Text style={styles.formatDesc}>{t.bestOf5Desc}</Text>
          </View>
          {bestOfGames === 5 && <Ionicons name="checkmark-circle" size={20} color="#ccff00" />}
        </TouchableOpacity>
      </View>

      {/* Players Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.playersLabel}</Text>

        {/* Add Player Input */}
        <View style={styles.addInputRow}>
          <TextInput
            style={styles.textInput}
            value={playerInput}
            onChangeText={setPlayerInput}
            placeholder={t.addPlaceholder}
            placeholderTextColor="#64748b"
            onSubmitEditing={addPlayer}
          />
          <TouchableOpacity style={styles.addButton} onPress={addPlayer}>
            <Text style={styles.addButtonText}>{t.addBtn}</Text>
          </TouchableOpacity>
        </View>

        {/* Registered Players List */}
        {playerList.length > 0 && (
          <View style={styles.playerListContainer}>
            <Text style={styles.listTitle}>{t.registeredTitle}</Text>
            {playerList.map((player, idx) => (
              <View key={idx} style={styles.playerItem}>
                <Text style={styles.playerIndex}>#{idx + 1}</Text>
                <Text style={styles.playerNameText}>{player}</Text>
                <TouchableOpacity onPress={() => removePlayer(idx)} style={styles.removeBtn}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Start Button */}
      <TouchableOpacity
        style={[
          styles.startButton,
          playerList.length < (mode === 'singles' ? 2 : 4) && styles.startButtonDisabled,
        ]}
        onPress={handleStart}
        disabled={playerList.length < (mode === 'singles' ? 2 : 4)}
      >
        <Text style={styles.startButtonText}>{t.startBtn}</Text>
        <Ionicons name="shuffle" size={24} color="#0f172a" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#090d16',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    marginTop: Platform.OS === 'android' ? 10 : 0,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#ccff00',
    fontSize: 15,
    fontWeight: '700',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  peopleIcon: {
    textShadowColor: 'rgba(16, 185, 129, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10b981',
    marginBottom: 15,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  btnGroup: {
    flexDirection: 'row',
    backgroundColor: '#090d16',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 4,
  },
  btnGroupItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  btnGroupItemActive: {
    backgroundColor: '#ccff00',
  },
  btnGroupText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
  },
  textBlack: {
    color: '#0f172a',
  },
  formatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090d16',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 14,
    marginBottom: 10,
  },
  formatItemActive: {
    borderColor: '#ccff00',
    backgroundColor: 'rgba(204, 255, 0, 0.03)',
  },
  formatTextCol: {
    flex: 1,
  },
  formatText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#94a3b8',
  },
  formatDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  textNeon: {
    color: '#ccff00',
  },
  addInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#090d16',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#f8fafc',
    paddingHorizontal: 12,
    height: 48,
    fontSize: 15,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  playerListContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 15,
  },
  listTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(9, 13, 22, 0.5)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  playerIndex: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10b981',
    marginRight: 10,
    width: 24,
  },
  playerNameText: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  removeBtn: {
    padding: 4,
  },
  startButton: {
    backgroundColor: '#ccff00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 10,
    shadowColor: '#ccff00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  startButtonDisabled: {
    backgroundColor: 'rgba(204, 255, 0, 0.15)',
    shadowOpacity: 0,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 1,
  },
});
