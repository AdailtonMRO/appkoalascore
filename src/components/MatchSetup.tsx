import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TennisConfig, INITIAL_CONFIG } from '../utils/tennisEngine';
import { SpeechService } from '../services/speechService';

interface MatchSetupProps {
  onStartMatch: (config: TennisConfig, firstServer: 1 | 2) => void;
  onBack: () => void;
  language: 'pt' | 'en' | 'es';
  initialConfig?: TennisConfig;
}

export default function MatchSetup({
  onStartMatch,
  onBack,
  language,
  initialConfig = INITIAL_CONFIG,
}: MatchSetupProps) {
  const [player1Name, setPlayer1Name] = useState(initialConfig.player1Name);
  const [player2Name, setPlayer2Name] = useState(initialConfig.player2Name);
  const [setsToWin, setSetsToWin] = useState<number>(initialConfig.setsToWin);
  const [gamesPerSet, setGamesPerSet] = useState<number>(initialConfig.gamesPerSet);
  const [noAdScoring, setNoAdScoring] = useState<boolean>(initialConfig.noAdScoring);
  const [useTieBreak, setUseTieBreak] = useState<boolean>(initialConfig.useTieBreak);
  const [tieBreakPoints, setTieBreakPoints] = useState<number>(initialConfig.tieBreakPoints);
  const [useMatchTieBreakForFinalSet, setUseMatchTieBreakForFinalSet] = useState<boolean>(
    initialConfig.useMatchTieBreakForFinalSet
  );
  const [firstServer, setFirstServer] = useState<1 | 2>(initialConfig.autoSideChange !== undefined ? (initialConfig.player1Name === player1Name ? 1 : 2) : 1); // fallback check
  const [speechEnabled, setSpeechEnabled] = useState<boolean>(true);
  const [autoSideChange, setAutoSideChange] = useState<boolean>(initialConfig.autoSideChange ?? true);
  const [showTieBreak, setShowTieBreak] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    const loadSavedConfig = async () => {
      try {
        const saved = await AsyncStorage.getItem('@koala_tennis_config');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.player1Name !== undefined) setPlayer1Name(parsed.player1Name);
          if (parsed.player2Name !== undefined) setPlayer2Name(parsed.player2Name);
          if (parsed.setsToWin !== undefined) setSetsToWin(parsed.setsToWin);
          if (parsed.gamesPerSet !== undefined) setGamesPerSet(parsed.gamesPerSet);
          if (parsed.noAdScoring !== undefined) setNoAdScoring(parsed.noAdScoring);
          if (parsed.useTieBreak !== undefined) setUseTieBreak(parsed.useTieBreak);
          if (parsed.tieBreakPoints !== undefined) setTieBreakPoints(parsed.tieBreakPoints);
          if (parsed.useMatchTieBreakForFinalSet !== undefined) setUseMatchTieBreakForFinalSet(parsed.useMatchTieBreakForFinalSet);
          if (parsed.firstServer !== undefined) setFirstServer(parsed.firstServer);
          if (parsed.autoSideChange !== undefined) setAutoSideChange(parsed.autoSideChange);
          if (parsed.speechEnabled !== undefined) {
            setSpeechEnabled(parsed.speechEnabled);
            SpeechService.setSpeechEnabled(parsed.speechEnabled);
          }
        }
      } catch (e) {
        console.warn('Failed to load saved match config:', e);
      }
    };
    loadSavedConfig();
  }, []);

  // Localized Dictionary for Setup Screen
  const localization = {
    pt: {
      title: 'CONFIGURAR PARTIDA',
      subtitle: 'Defina as regras e comece a pontuar',
      players: 'Jogadores',
      p1Label: 'Jogador 1 (Servindo de Azul)',
      p1Placeholder: 'Nome do Jogador 1',
      p2Label: 'Jogador 2 (Servindo de Laranja)',
      p2Placeholder: 'Nome do Jogador 2',
      serverLabel: 'Quem inicia sacando?',
      format: 'Formato do Jogo',
      setsLabel: 'Sets para vencer a partida',
      set1: '1 Set Único',
      set3: 'Melhor de 3',
      set5: 'Melhor de 5',
      gamesLabel: 'Games por Set',
      g4: '4 Games (Curto)',
      g6: '6 Games (Padrão)',
      g8: '8 Games (Pro)',
      noAd: 'Ponto de Ouro (No-Ad)',
      noAdDesc: 'No deuce (40-40), quem ganhar o próximo ponto vence o game.',
      tbTitle: 'Tie-Break',
      tbEnable: 'Habilitar Tie-Break no set',
      tbEnableDesc: 'Joga-se um tie-break ao empatar em games (ex: 6-6).',
      tbPoints: 'Pontos do Tie-break',
      tb7: '7 Pontos',
      tb10: '10 Pontos',
      superTB: 'Super Tie-break no set final',
      superTBDesc: 'O set decisivo é substituído por um tie-break de 10 pontos.',
      preferences: 'Preferências',
      tts: 'Falar Placar (TTS)',
      ttsDesc: 'O celular anunciará o placar em voz alta a cada alteração.',
      autoSide: 'Troca Automática de Lado',
      autoSideDesc: 'Alterna automaticamente o lado dos jogadores no placar conforme a regra do tênis.',
      start: 'INICIAR PARTIDA',
    },
    en: {
      title: 'CONFIGURE MATCH',
      subtitle: 'Define the rules and start scoring',
      players: 'Players',
      p1Label: 'Player 1 (Serving Cyan)',
      p1Placeholder: 'Player 1 Name',
      p2Label: 'Player 2 (Serving Orange)',
      p2Placeholder: 'Player 2 Name',
      serverLabel: 'Who serves first?',
      format: 'Game Format',
      setsLabel: 'Sets to win the match',
      set1: 'Single Set',
      set3: 'Best of 3',
      set5: 'Best of 5',
      gamesLabel: 'Games per Set',
      g4: '4 Games (Short)',
      g6: '6 Games (Standard)',
      g8: '8 Games (Pro)',
      noAd: 'Golden Point (No-Ad)',
      noAdDesc: 'At deuce (40-40), the next point wins the game.',
      tbTitle: 'Tie-Break',
      tbEnable: 'Enable Set Tie-Break',
      tbEnableDesc: 'Play a tie-break when games are tied (e.g. 6-6).',
      tbPoints: 'Tie-break Points',
      tb7: '7 Points',
      tb10: '10 Points',
      superTB: 'Super Tie-break in final set',
      superTBDesc: 'The deciding final set is replaced by a 10-point tie-break.',
      preferences: 'Preferences',
      tts: 'Speak Score (TTS)',
      ttsDesc: 'The device will announce the score out loud on changes.',
      autoSide: 'Automatic Side Change',
      autoSideDesc: 'Automatically switch player sides on the scoreboard according to tennis rules.',
      start: 'START MATCH',
    },
    es: {
      title: 'CONFIGURAR PARTIDO',
      subtitle: 'Define las reglas y empieza a puntuar',
      players: 'Jugadores',
      p1Label: 'Jugador 1 (Sirve de Azul)',
      p1Placeholder: 'Nombre del Jugador 1',
      p2Label: 'Jugador 2 (Sirve de Naranja)',
      p2Placeholder: 'Nombre del Jugador 2',
      serverLabel: '¿Quién saca primero?',
      format: 'Formato del Juego',
      setsLabel: 'Sets para ganar el partido',
      set1: '1 Set Único',
      set3: 'Mejor de 3',
      set5: 'Mejor de 5',
      gamesLabel: 'Games por Set',
      g4: '4 Games (Corto)',
      g6: '6 Games (Estándar)',
      g8: '8 Games (Pro)',
      noAd: 'Punto de Oro (No-Ad)',
      noAdDesc: 'En el deuce (40-40), el que gane el siguiente punto gana el juego.',
      tbTitle: 'Tie-Break',
      tbEnable: 'Activar Tie-Break en el set',
      tbEnableDesc: 'Se juega un tie-break al empatar en games (ej: 6-6).',
      tbPoints: 'Puntos de Tie-break',
      tb7: '7 Puntos',
      tb10: '10 Puntos',
      superTB: 'Súper Tie-break en set final',
      superTBDesc: 'El set decisivo es sustituido por un tie-break de 10 puntos.',
      preferences: 'Preferencias',
      tts: 'Cantar Marcador (TTS)',
      ttsDesc: 'El dispositivo anunciará el marcador en voz alta al cambiar.',
      autoSide: 'Cambio Automático de Lado',
      autoSideDesc: 'Alterna automáticamente el lado de los jugadores en el marcador según las reglas del tenis.',
      start: 'INICIAR PARTIDO',
    },
  };

  const t = localization[language] || localization.pt;

  const handleStart = async () => {
    const finalConfig: TennisConfig = {
      player1Name: player1Name.trim() || (language === 'pt' ? 'Jogador 1' : language === 'en' ? 'Player 1' : 'Jugador 1'),
      player2Name: player2Name.trim() || (language === 'pt' ? 'Jogador 2' : language === 'en' ? 'Player 2' : 'Jugador 2'),
      setsToWin,
      gamesPerSet,
      useTieBreak,
      tieBreakPoints,
      useMatchTieBreakForFinalSet,
      matchTieBreakPoints: 10,
      noAdScoring,
      language,
      autoSideChange,
    };
    
    try {
      const configToSave = {
        ...finalConfig,
        firstServer,
        speechEnabled,
      };
      await AsyncStorage.setItem('@koala_tennis_config', JSON.stringify(configToSave));
    } catch (e) {
      console.warn('Failed to save match config:', e);
    }
    
    onStartMatch(finalConfig, firstServer);
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Top navigation Back button */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#ccff00" />
        </TouchableOpacity>
      </View>

      {/* Title */}
      <View style={styles.header}>
        <Ionicons name="tennisball" size={42} color="#ccff00" style={styles.ballIcon} />
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.subtitle}>{t.subtitle}</Text>
      </View>

      {/* Players Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.players}</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t.p1Label}</Text>
          <View style={styles.textInputWrapper}>
            <Ionicons name="person" size={20} color="#06b6d4" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={player1Name}
              onChangeText={setPlayer1Name}
              placeholder={t.p1Placeholder}
              placeholderTextColor="#64748b"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t.p2Label}</Text>
          <View style={styles.textInputWrapper}>
            <Ionicons name="person" size={20} color="#f97316" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={player2Name}
              onChangeText={setPlayer2Name}
              placeholder={t.p2Placeholder}
              placeholderTextColor="#64748b"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t.serverLabel}</Text>
          <View style={styles.serverRow}>
            <TouchableOpacity
              style={[
                styles.serverButton,
                firstServer === 1 && styles.serverButtonActiveP1,
              ]}
              onPress={() => setFirstServer(1)}
            >
              <Ionicons
                name="tennisball-outline"
                size={18}
                color={firstServer === 1 ? '#fff' : '#06b6d4'}
              />
              <Text style={[styles.serverButtonText, firstServer === 1 && styles.textWhite]}>
                {player1Name || (language === 'pt' ? 'Jogador 1' : 'Player 1')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.serverButton,
                firstServer === 2 && styles.serverButtonActiveP2,
              ]}
              onPress={() => setFirstServer(2)}
            >
              <Ionicons
                name="tennisball-outline"
                size={18}
                color={firstServer === 2 ? '#fff' : '#f97316'}
              />
              <Text style={[styles.serverButtonText, firstServer === 2 && styles.textWhite]}>
                {player2Name || (language === 'pt' ? 'Jogador 2' : 'Player 2')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Rules Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.format}</Text>

        {/* Sets Options */}
        <Text style={styles.inputLabel}>{t.setsLabel}</Text>
        <View style={styles.btnGroup}>
          <TouchableOpacity
            style={[styles.btnGroupItem, setsToWin === 1 && styles.btnGroupItemActive]}
            onPress={() => setSetsToWin(1)}
          >
            <Text style={[styles.btnGroupText, setsToWin === 1 && styles.textBlack]}>{t.set1}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnGroupItem, setsToWin === 2 && styles.btnGroupItemActive]}
            onPress={() => setSetsToWin(2)}
          >
            <Text style={[styles.btnGroupText, setsToWin === 2 && styles.textBlack]}>{t.set3}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnGroupItem, setsToWin === 3 && styles.btnGroupItemActive]}
            onPress={() => setSetsToWin(3)}
          >
            <Text style={[styles.btnGroupText, setsToWin === 3 && styles.textBlack]}>{t.set5}</Text>
          </TouchableOpacity>
        </View>

        {/* Games per set */}
        <Text style={styles.inputLabel}>{t.gamesLabel}</Text>
        <View style={styles.btnGroup}>
          <TouchableOpacity
            style={[styles.btnGroupItem, gamesPerSet === 4 && styles.btnGroupItemActive]}
            onPress={() => setGamesPerSet(4)}
          >
            <Text style={[styles.btnGroupText, gamesPerSet === 4 && styles.textBlack]}>{t.g4}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnGroupItem, gamesPerSet === 6 && styles.btnGroupItemActive]}
            onPress={() => setGamesPerSet(6)}
          >
            <Text style={[styles.btnGroupText, gamesPerSet === 6 && styles.textBlack]}>{t.g6}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnGroupItem, gamesPerSet === 8 && styles.btnGroupItemActive]}
            onPress={() => setGamesPerSet(8)}
          >
            <Text style={[styles.btnGroupText, gamesPerSet === 8 && styles.textBlack]}>{t.g8}</Text>
          </TouchableOpacity>
        </View>

        {/* Deuce Option */}
        <View style={styles.switchRow}>
          <View style={styles.switchLabelCol}>
            <Text style={styles.switchLabel}>{t.noAd}</Text>
            <Text style={styles.switchDesc}>{t.noAdDesc}</Text>
          </View>
          <Switch
            value={noAdScoring}
            onValueChange={setNoAdScoring}
            trackColor={{ false: '#334155', true: '#ccff00' }}
            thumbColor={Platform.OS === 'ios' ? undefined : '#f8fafc'}
          />
        </View>
      </View>

      {/* Tie Break Settings Card */}
      <View style={styles.card}>
        <TouchableOpacity 
          style={styles.accordionHeader} 
          onPress={() => setShowTieBreak(!showTieBreak)}
          activeOpacity={0.7}
        >
          <View style={styles.accordionHeaderLeft}>
            <Ionicons name="git-branch-outline" size={20} color="#ccff00" style={{ marginRight: 10 }} />
            <Text style={styles.accordionTitle}>{t.tbTitle}</Text>
          </View>
          <Ionicons 
            name={showTieBreak ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#ccff00" 
          />
        </TouchableOpacity>

        {showTieBreak && (
          <View style={styles.accordionContent}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelCol}>
                <Text style={styles.switchLabel}>{t.tbEnable}</Text>
                <Text style={styles.switchDesc}>{t.tbEnableDesc}</Text>
              </View>
              <Switch
                value={useTieBreak}
                onValueChange={setUseTieBreak}
                trackColor={{ false: '#334155', true: '#ccff00' }}
                thumbColor={Platform.OS === 'ios' ? undefined : '#f8fafc'}
              />
            </View>

            {useTieBreak && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t.tbPoints}</Text>
                <View style={styles.btnGroup}>
                  <TouchableOpacity
                    style={[styles.btnGroupItem, tieBreakPoints === 7 && styles.btnGroupItemActive]}
                    onPress={() => setTieBreakPoints(7)}
                  >
                    <Text style={[styles.btnGroupText, tieBreakPoints === 7 && styles.textBlack]}>{t.tb7}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btnGroupItem, tieBreakPoints === 10 && styles.btnGroupItemActive]}
                    onPress={() => setTieBreakPoints(10)}
                  >
                    <Text style={[styles.btnGroupText, tieBreakPoints === 10 && styles.textBlack]}>{t.tb10}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {setsToWin > 1 && (
              <View style={styles.switchRow}>
                <View style={styles.switchLabelCol}>
                  <Text style={styles.switchLabel}>{t.superTB}</Text>
                  <Text style={styles.switchDesc}>{t.superTBDesc}</Text>
                </View>
                <Switch
                  value={useMatchTieBreakForFinalSet}
                  onValueChange={setUseMatchTieBreakForFinalSet}
                  trackColor={{ false: '#334155', true: '#ccff00' }}
                  thumbColor={Platform.OS === 'ios' ? undefined : '#f8fafc'}
                />
              </View>
            )}
          </View>
        )}
      </View>

      {/* Preferences */}
      <View style={styles.card}>
        <TouchableOpacity 
          style={styles.accordionHeader} 
          onPress={() => setShowPreferences(!showPreferences)}
          activeOpacity={0.7}
        >
          <View style={styles.accordionHeaderLeft}>
            <Ionicons name="options-outline" size={20} color="#ccff00" style={{ marginRight: 10 }} />
            <Text style={styles.accordionTitle}>{t.preferences}</Text>
          </View>
          <Ionicons 
            name={showPreferences ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#ccff00" 
          />
        </TouchableOpacity>

        {showPreferences && (
          <View style={styles.accordionContent}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelCol}>
                <Text style={styles.switchLabel}>{t.tts}</Text>
                <Text style={styles.switchDesc}>{t.ttsDesc}</Text>
              </View>
              <Switch
                value={speechEnabled}
                onValueChange={(val) => {
                  setSpeechEnabled(val);
                  SpeechService.setSpeechEnabled(val);
                }}
                trackColor={{ false: '#334155', true: '#ccff00' }}
                thumbColor={Platform.OS === 'ios' ? undefined : '#f8fafc'}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchLabelCol}>
                <Text style={styles.switchLabel}>{t.autoSide}</Text>
                <Text style={styles.switchDesc}>{t.autoSideDesc}</Text>
              </View>
              <Switch
                value={autoSideChange}
                onValueChange={setAutoSideChange}
                trackColor={{ false: '#334155', true: '#ccff00' }}
                thumbColor={Platform.OS === 'ios' ? undefined : '#f8fafc'}
              />
            </View>
          </View>
        )}
      </View>

      {/* Start Button */}
      <TouchableOpacity style={styles.startButton} onPress={handleStart}>
        <Text style={styles.startButtonText}>{t.start}</Text>
        <Ionicons name="play-forward" size={24} color="#0f172a" />
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
    marginTop: 10,
  },
  backButton: {
    padding: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 25,
    marginTop: 5,
  },
  ballIcon: {
    textShadowColor: 'rgba(204, 255, 0, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 2,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ccff00',
    marginBottom: 15,
    letterSpacing: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090d16',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    height: 48,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '600',
  },
  serverRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
  serverButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingVertical: 12,
  },
  serverButtonActiveP1: {
    backgroundColor: '#06b6d4',
    borderColor: '#06b6d4',
  },
  serverButtonActiveP2: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  serverButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
  },
  textWhite: {
    color: '#fff',
  },
  btnGroup: {
    flexDirection: 'row',
    backgroundColor: '#090d16',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 4,
    marginBottom: 16,
  },
  btnGroupItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnGroupItemActive: {
    backgroundColor: '#ccff00',
  },
  btnGroupText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  textBlack: {
    color: '#0f172a',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 8,
  },
  switchLabelCol: {
    flex: 1,
    marginRight: 15,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  switchDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
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
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ccff00',
    letterSpacing: 1,
  },
  accordionContent: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 10,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 1,
  },
});
