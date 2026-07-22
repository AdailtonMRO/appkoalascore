import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MultiplayerSessionState } from '../utils/multiplayerEngine';
import { historyService } from '../services/historyService';

interface MultiplayerRankingProps {
  sessionState: MultiplayerSessionState;
  onExit: () => void;
  language: 'pt' | 'en' | 'es';
}

const LOCALIZATION = {
  pt: {
    title: 'RANKING DO TREINO',
    subtitle: 'Classificação geral por número de vitórias',
    champTitle: 'CAMPEÃO DO TREINO!',
    noWins: 'Sem partidas disputadas',
    saveBtn: 'Salvar no Histórico',
    savedBtn: 'Salvo!',
    exitBtn: 'Voltar ao Menu',
    playerLabel: 'Jogador',
    winsLabel: 'Vitórias',
    successTitle: 'Sucesso',
    successMsg: 'Treino salvo com sucesso no seu Histórico!',
    errorTitle: 'Erro',
    errorMsg: 'Não foi possível salvar o treino.',
    gamesPlayed: (count: number) => `Partidas Jogadas: ${count}`,
  },
  en: {
    title: 'TRAINING RANKING',
    subtitle: 'Overall standings by number of wins',
    champTitle: 'SESSION CHAMPION!',
    noWins: 'No matches played',
    saveBtn: 'Save to History',
    savedBtn: 'Saved!',
    exitBtn: 'Back to Menu',
    playerLabel: 'Player',
    winsLabel: 'Wins',
    successTitle: 'Success',
    successMsg: 'Training session successfully saved to History!',
    errorTitle: 'Error',
    errorMsg: 'Could not save the training session.',
    gamesPlayed: (count: number) => `Matches Played: ${count}`,
  },
  es: {
    title: 'RANKING DEL ENTRENAMIENTO',
    subtitle: 'Clasificación general por número de victorias',
    champTitle: '¡CAMPEÓN DEL ENTRENAMIENTO!',
    noWins: 'Sin partidos jugados',
    saveBtn: 'Guardar Historial',
    savedBtn: '¡Guardado!',
    exitBtn: 'Volver al Menú',
    playerLabel: 'Jugador',
    winsLabel: 'Victorias',
    successTitle: 'Éxito',
    successMsg: '¡Entrenamiento guardado con éxito en tu Historial!',
    errorTitle: 'Error',
    errorMsg: 'No se pudo guardar el entrenamiento.',
    gamesPlayed: (count: number) => `Partidos Jugados: ${count}`,
  }
};

export default function MultiplayerRanking({ sessionState, onExit, language }: MultiplayerRankingProps) {
  const [isSaved, setIsSaved] = useState(false);

  // Sort players by total wins descending
  const sortedPlayers = [...sessionState.players].sort((a, b) => b.totalWins - a.totalWins);
  const champion = sortedPlayers.length > 0 ? sortedPlayers[0] : null;

  const handleSave = async () => {
    if (isSaved) return;

    const sessionData = {
      type: 'multiplayer' as const,
      mode: sessionState.mode,
      bestOfGames: sessionState.bestOfGames,
      players: sortedPlayers.map(p => ({ name: p.name, wins: p.totalWins })),
      winnerName: champion ? champion.name : '',
      totalMatches: sessionState.totalMatchesPlayed,
    };

    const success = await historyService.saveMatch(sessionData);
    if (success) {
      setIsSaved(true);
      Alert.alert(t.successTitle, t.successMsg);
    } else {
      Alert.alert(t.errorTitle, t.errorMsg);
    }
  };

  const t = LOCALIZATION[language] || LOCALIZATION.pt;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="ribbon" size={42} color="#eab308" style={styles.ribbonIcon} />
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.subtitle}>{t.subtitle}</Text>
      </View>

      {/* Champion Celebration Panel */}
      {champion && champion.totalWins > 0 ? (
        <View style={styles.champCard}>
          <Ionicons name="trophy" size={54} color="#eab308" style={styles.trophyIcon} />
          <Text style={styles.champTitleText}>{t.champTitle}</Text>
          <Text style={styles.champNameText}>{champion.name}</Text>
          <Text style={styles.champWinsText}>
            {champion.totalWins} {champion.totalWins === 1 ? (language === 'pt' ? 'vitória' : language === 'en' ? 'win' : 'victoria') : (language === 'pt' ? 'vitórias' : language === 'en' ? 'wins' : 'victorias')}
          </Text>
        </View>
      ) : (
        <View style={styles.champCard}>
          <Ionicons name="flag-outline" size={42} color="#64748b" style={styles.trophyIcon} />
          <Text style={styles.champTitleText}>{t.noWins}</Text>
        </View>
      )}

      {/* Stats Counter */}
      <View style={styles.statsPanel}>
        <Text style={styles.statsLabel}>{t.gamesPlayed(sessionState.totalMatchesPlayed)}</Text>
      </View>

      {/* Rankings Leaderboard */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>#</Text>
        <Text style={[styles.tableHeaderCell, { flex: 5 }]}>{t.playerLabel}</Text>
        <Text style={[styles.tableHeaderCell, { flex: 2, textAlign: 'right' }]}>{t.winsLabel}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.rankingList} showsVerticalScrollIndicator={false}>
        {sortedPlayers.map((player, idx) => {
          const isChamp = idx === 0 && player.totalWins > 0;
          return (
            <View key={player.id} style={[styles.playerRow, isChamp && styles.playerRowChamp]}>
              <Text style={[styles.playerPosText, isChamp && styles.textGold]}>
                {idx + 1}
              </Text>
              <Text style={[styles.playerNameText, isChamp && styles.textWhiteBold]} numberOfLines={1}>
                {player.name}
              </Text>
              <Text style={[styles.playerWinsText, isChamp && styles.textGoldBold]}>
                {player.totalWins}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Actions */}
      <View style={styles.footerActions}>
        <TouchableOpacity
          style={[styles.saveBtn, isSaved && styles.saveBtnSaved]}
          onPress={handleSave}
          disabled={isSaved}
        >
          <Ionicons
            name={isSaved ? "checkmark-circle" : "save-outline"}
            size={20}
            color={isSaved ? "#0f172a" : "#ccff00"}
          />
          <Text style={[styles.saveBtnText, isSaved && styles.saveBtnTextSaved]}>
            {isSaved ? t.savedBtn : t.saveBtn}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
          <Text style={styles.exitBtnText}>{t.exitBtn}</Text>
          <Ionicons name="home-outline" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 30 : 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  ribbonIcon: {
    textShadowColor: 'rgba(234, 179, 8, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '600',
  },
  champCard: {
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#eab308',
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  trophyIcon: {
    marginBottom: 8,
    textShadowColor: 'rgba(234, 179, 8, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  champTitleText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#eab308',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  champNameText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fef08a',
    marginTop: 4,
  },
  champWinsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#eab308',
    marginTop: 2,
  },
  statsPanel: {
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    marginBottom: 12,
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  rankingList: {
    gap: 8,
    paddingBottom: 20,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  playerRowChamp: {
    backgroundColor: 'rgba(234, 179, 8, 0.04)',
    borderColor: 'rgba(234, 179, 8, 0.15)',
  },
  playerPosText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
    textAlign: 'center',
  },
  playerNameText: {
    flex: 5,
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
  },
  playerWinsText: {
    flex: 2,
    fontSize: 15,
    fontWeight: '800',
    color: '#94a3b8',
    textAlign: 'right',
    paddingRight: 8,
  },
  textGold: {
    color: '#eab308',
  },
  textWhiteBold: {
    color: '#f8fafc',
    fontWeight: '900',
  },
  textGoldBold: {
    color: '#eab308',
    fontWeight: '900',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    marginBottom: Platform.OS === 'android' ? 20 : 10,
  },
  saveBtn: {
    flex: 1.2,
    backgroundColor: 'rgba(204, 255, 0, 0.08)',
    borderWidth: 1,
    borderColor: '#ccff00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  saveBtnSaved: {
    backgroundColor: '#ccff00',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ccff00',
  },
  saveBtnTextSaved: {
    color: '#0f172a',
  },
  exitBtn: {
    flex: 1,
    backgroundColor: '#ccff00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  exitBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
});
