import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { historyService, HistoryItem, SavedMatch, SavedMultiplayerSession } from '../services/historyService';
import { PointHistoryEntry } from '../utils/tennisEngine';

interface HistoryScreenProps {
  onBack: () => void;
  language: 'pt' | 'en' | 'es';
}

export default function HistoryScreen({ onBack, language }: HistoryScreenProps) {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<HistoryItem | null>(null);
  const [selectedDetailsMatch, setSelectedDetailsMatch] = useState<SavedMatch | null>(null);

  // Edit form states
  const [editP1Name, setEditP1Name] = useState('');
  const [editP2Name, setEditP2Name] = useState('');
  const [editSetScores, setEditSetScores] = useState<{ player1Games: string; player2Games: string }[]>([]);
  const [editMultiplayers, setEditMultiplayers] = useState<{ index: number; name: string }[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    const data = await historyService.getMatches();
    setHistoryItems(data);
    setIsLoading(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      t.deleteTitle,
      t.deleteConfirmMsg,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete,
          style: 'destructive',
          onPress: async () => {
            const success = await historyService.deleteMatch(id);
            if (success) {
              loadHistory();
            } else {
              Alert.alert(t.errorTitle, t.deleteErrorMsg);
            }
          },
        },
      ]
    );
  };

  const startEdit = (item: HistoryItem) => {
    setEditingItem(item);
    if (item.type === 'classic') {
      setEditP1Name(item.player1Name);
      setEditP2Name(item.player2Name);
      setEditSetScores(
        item.setScores.map(score => ({
          player1Games: score.player1Games.toString(),
          player2Games: score.player2Games.toString(),
        }))
      );
    } else {
      setEditMultiplayers(
        item.players.map((p, idx) => ({
          index: idx,
          name: p.name,
        }))
      );
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    if (editingItem.type === 'classic') {
      const updatedScores = editSetScores.map(score => ({
        player1Games: parseInt(score.player1Games, 10) || 0,
        player2Games: parseInt(score.player2Games, 10) || 0,
      }));

      const updatedFields: Partial<SavedMatch> = {
        player1Name: editP1Name.trim() || 'Jogador 1',
        player2Name: editP2Name.trim() || 'Jogador 2',
        setScores: updatedScores,
      };

      const success = await historyService.updateMatch(editingItem.id, updatedFields);
      if (success) {
        setEditingItem(null);
        loadHistory();
      } else {
        Alert.alert(t.errorTitle, t.saveErrorMsg);
      }
    } else {
      // For multiplayer
      const updatedPlayers = editingItem.players.map((p, idx) => {
        const edited = editMultiplayers.find(emp => emp.index === idx);
        return {
          ...p,
          name: edited ? edited.name.trim() || p.name : p.name,
        };
      });

      const updatedFields: Partial<SavedMultiplayerSession> = {
        players: updatedPlayers,
        winnerName: updatedPlayers.length > 0 ? updatedPlayers[0].name : '',
      };

      const success = await historyService.updateMatch(editingItem.id, updatedFields);
      if (success) {
        setEditingItem(null);
        loadHistory();
      } else {
        Alert.alert(t.errorTitle, t.saveErrorMsg);
      }
    }
  };

  const handleSetScoreChange = (index: number, field: 'player1Games' | 'player2Games', value: string) => {
    // Only numeric input
    const cleanValue = value.replace(/[^0-9]/g, '');
    const newScores = [...editSetScores];
    newScores[index][field] = cleanValue;
    setEditSetScores(newScores);
  };

  const handleMultiplayerPlayerNameChange = (index: number, value: string) => {
    const newPlayers = editMultiplayers.map(item => {
      if (item.index === index) {
        return { ...item, name: value };
      }
      return item;
    });
    setEditMultiplayers(newPlayers);
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hour = d.getHours().toString().padStart(2, '0');
    const minute = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} - ${hour}:${minute}`;
  };

  const localization = {
    pt: {
      title: 'HISTÓRICO DE JOGOS',
      subtitle: 'Histórico de partidas armazenadas localmente',
      back: 'Voltar',
      emptyState: 'Nenhuma partida salva ainda.',
      deleteTitle: 'Excluir registro',
      deleteConfirmMsg: 'Deseja realmente excluir esta partida do histórico? Esta ação é irreversível.',
      cancel: 'Cancelar',
      delete: 'Excluir',
      errorTitle: 'Erro',
      deleteErrorMsg: 'Não foi possível excluir a partida.',
      saveErrorMsg: 'Não foi possível atualizar a partida.',
      editTitle: 'Editar Partida',
      save: 'Salvar',
      classicType: 'Partida Clássica',
      multiplayerType: 'Revezamento Multiplayer',
      winnerLabel: 'Vencedor:',
      scoreLabel: 'Placar:',
      totalMatches: 'Total de Jogos:',
      leaderboardLabel: 'Classificação final:',
    },
    en: {
      title: 'MATCH HISTORY',
      subtitle: 'History of locally stored matches',
      back: 'Back',
      emptyState: 'No saved matches yet.',
      deleteTitle: 'Delete Record',
      deleteConfirmMsg: 'Are you sure you want to delete this match? This action cannot be undone.',
      cancel: 'Cancel',
      delete: 'Delete',
      errorTitle: 'Error',
      deleteErrorMsg: 'Could not delete match.',
      saveErrorMsg: 'Could not update match.',
      editTitle: 'Edit Match',
      save: 'Save',
      classicType: 'Classic Match',
      multiplayerType: 'Multiplayer Rotation',
      winnerLabel: 'Winner:',
      scoreLabel: 'Score:',
      totalMatches: 'Total Matches:',
      leaderboardLabel: 'Final Standings:',
    },
    es: {
      title: 'HISTORIAL DE PARTIDOS',
      subtitle: 'Historial de partidos guardados localmente',
      back: 'Volver',
      emptyState: 'Ningún partido guardado aún.',
      deleteTitle: 'Eliminar Registro',
      deleteConfirmMsg: '¿Realmente desea eliminar este partido? Esta acción es irreversible.',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      errorTitle: 'Error',
      deleteErrorMsg: 'No se pudo eliminar el partido.',
      saveErrorMsg: 'No se pudo actualizar el partido.',
      editTitle: 'Editar Partido',
      save: 'Guardar',
      classicType: 'Partido Clásico',
      multiplayerType: 'Relevo Multiplayer',
      winnerLabel: 'Ganador:',
      scoreLabel: 'Marcador:',
      totalMatches: 'Partidos Totales:',
      leaderboardLabel: 'Clasificación final:',
    }
  };

  const t = localization[language] || localization.pt;

  return (
    <View style={styles.container}>
      {/* Top navigation Back button */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#ccff00" />
          <Text style={styles.backButtonText}>{t.back}</Text>
        </TouchableOpacity>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="time" size={42} color="#6366f1" style={styles.historyIcon} />
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.subtitle}>{t.subtitle}</Text>
      </View>

      {/* History List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <Text style={styles.infoText}>Carregando...</Text>
        </View>
      ) : historyItems.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="folder-open-outline" size={48} color="#475569" style={{ marginBottom: 12 }} />
          <Text style={styles.infoText}>{t.emptyState}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
          {historyItems.map((item) => {
            const isClassic = item.type === 'classic';
            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.typeBadgeContainer}>
                    <View
                      style={[
                        styles.typeDot,
                        { backgroundColor: isClassic ? '#06b6d4' : '#10b981' },
                      ]}
                    />
                    <Text style={styles.typeText}>
                      {isClassic ? t.classicType : t.multiplayerType}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                </View>

                {isClassic ? (
                  // Render Classic Match Summary
                  <View style={styles.cardContent}>
                    <View style={styles.scoreRow}>
                      <View style={styles.playerCol}>
                        <Text
                          style={[
                            styles.playerName,
                            item.winner === 1 && styles.winnerNameText,
                          ]}
                          numberOfLines={1}
                        >
                          {item.player1Name}
                        </Text>
                      </View>
                      <View style={styles.gamesScoresContainer}>
                        {item.setScores.map((score, sIdx) => (
                          <Text key={sIdx} style={styles.setScoreText}>
                            {score.player1Games}
                            {score.player1TieBreakPoints !== undefined && (
                              <Text style={styles.tbPointsSmall}>({score.player1TieBreakPoints})</Text>
                            )}
                            {':'}
                            {score.player2Games}
                            {score.player2TieBreakPoints !== undefined && (
                              <Text style={styles.tbPointsSmall}>({score.player2TieBreakPoints})</Text>
                            )}
                            {sIdx < item.setScores.length - 1 ? '  ' : ''}
                          </Text>
                        ))}
                      </View>
                      <View style={styles.playerCol}>
                        <Text
                          style={[
                            styles.playerName,
                            { textAlign: 'right' },
                            item.winner === 2 && styles.winnerNameText,
                          ]}
                          numberOfLines={1}
                        >
                          {item.player2Name}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  // Render Multiplayer Rotation Summary
                  <View style={styles.cardContent}>
                    <Text style={styles.statsText}>
                      {t.totalMatches} <Text style={styles.textWhite}>{item.totalMatches}</Text>
                    </Text>
                    <Text style={styles.statsText}>
                      {t.winnerLabel} <Text style={styles.textNeon}>{item.winnerName || '-'}</Text>
                    </Text>
                    
                    <Text style={styles.subCardTitle}>{t.leaderboardLabel}</Text>
                    <View style={styles.rankingContainer}>
                      {item.players.slice(0, 3).map((p, pIdx) => (
                        <View key={pIdx} style={styles.rankingRow}>
                          <Text style={styles.rankingPos}>#{pIdx + 1}</Text>
                          <Text style={styles.rankingName} numberOfLines={1}>
                            {p.name}
                          </Text>
                          <Text style={styles.rankingWins}>
                            {p.wins} {p.wins === 1 ? 'vitória' : 'vitórias'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Card footer actions */}
                <View style={styles.cardActions}>
                  {isClassic && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => setSelectedDetailsMatch(item as SavedMatch)}
                    >
                      <Ionicons name="stats-chart-outline" size={18} color="#06b6d4" />
                      <Text style={[styles.actionBtnText, { color: '#06b6d4' }]}>
                        {language === 'pt' ? 'Detalhes' : language === 'en' ? 'Details' : 'Detalles'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => startEdit(item)}
                  >
                    <Ionicons name="create-outline" size={18} color="#ccff00" />
                    <Text style={styles.actionBtnText}>{language === 'pt' ? 'Editar' : language === 'en' ? 'Edit' : 'Editar'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>{t.delete}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Edit Modal */}
      <Modal
        visible={editingItem !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingItem(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.editTitle}</Text>
              <TouchableOpacity onPress={() => setEditingItem(null)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {editingItem && (
              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                {editingItem.type === 'classic' ? (
                  // Classic match inputs
                  <View style={styles.formSection}>
                    <Text style={styles.inputLabel}>{language === 'pt' ? 'Jogador 1' : 'Player 1'}</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editP1Name}
                      onChangeText={setEditP1Name}
                    />

                    <Text style={styles.inputLabel}>{language === 'pt' ? 'Jogador 2' : 'Player 2'}</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editP2Name}
                      onChangeText={setEditP2Name}
                    />

                    <Text style={[styles.inputLabel, { marginTop: 15 }]}>Placar dos Games</Text>
                    {editSetScores.map((score, sIdx) => (
                      <View key={sIdx} style={styles.setEditRow}>
                        <Text style={styles.setEditLabel}>Set {sIdx + 1}:</Text>
                        <TextInput
                          style={styles.scoreInput}
                          keyboardType="numeric"
                          value={score.player1Games}
                          onChangeText={(val) => handleSetScoreChange(sIdx, 'player1Games', val)}
                        />
                        <Text style={styles.setEditDivider}>x</Text>
                        <TextInput
                          style={styles.scoreInput}
                          keyboardType="numeric"
                          value={score.player2Games}
                          onChangeText={(val) => handleSetScoreChange(sIdx, 'player2Games', val)}
                        />
                      </View>
                    ))}
                  </View>
                ) : (
                  // Multiplayer match inputs
                  <View style={styles.formSection}>
                    <Text style={styles.inputLabel}>Nomes dos Jogadores</Text>
                    {editMultiplayers.map((item) => (
                      <View key={item.index} style={styles.playerEditRow}>
                        <Text style={styles.playerEditIndex}>#{item.index + 1}</Text>
                        <TextInput
                          style={styles.textInput}
                          value={item.name}
                          onChangeText={(val) => handleMultiplayerPlayerNameChange(item.index, val)}
                        />
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setEditingItem(null)}
              >
                <Text style={styles.cancelModalBtnText}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveModalBtn}
                onPress={handleSaveEdit}
              >
                <Text style={styles.saveModalBtnText}>{t.save}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Details Modal */}
      <Modal
        visible={selectedDetailsMatch !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedDetailsMatch(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {language === 'pt' ? 'ESTATÍSTICAS & HISTÓRICO' : language === 'en' ? 'STATS & TIMELINE' : 'ESTADÍSTICAS Y HISTORIAL'}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDetailsMatch(null)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selectedDetailsMatch && (() => {
              const match = selectedDetailsMatch;
              const hasTimeline = match.pointsHistory && match.pointsHistory.length > 0;

              // Helper translations
              const dt = {
                pt: {
                  legados: 'Detalhes e estatísticas indisponíveis para partidas legadas.',
                  totalPoints: 'Total de Pontos Vencidos',
                  breakpoints: 'Aproveitamento de Breakpoints',
                  serviceHold: 'Confirmação de Saque (Hold)',
                  timeline: 'Linha do Tempo (Ponto a Ponto)',
                  close: 'Fechar',
                  points: 'pontos',
                  set: 'Set',
                  game: 'Game',
                  server: 'Sacador',
                  break: 'Quebra de Serviço!',
                  tiebreak: 'Tie-break',
                  breakpointChance: 'Chance de Quebra',
                },
                en: {
                  legados: 'Details and statistics unavailable for legacy matches.',
                  totalPoints: 'Total Points Won',
                  breakpoints: 'Breakpoint Conversion',
                  serviceHold: 'Service Hold Rate',
                  timeline: 'Timeline (Point by Point)',
                  close: 'Close',
                  points: 'points',
                  set: 'Set',
                  game: 'Game',
                  server: 'Server',
                  break: 'Service Break!',
                  tiebreak: 'Tie-break',
                  breakpointChance: 'Break Point Opportunity',
                },
                es: {
                  legados: 'Detalles y estadísticas no disponibles para partidos heredados.',
                  totalPoints: 'Total de Puntos Ganados',
                  breakpoints: 'Conversión de Breakpoints',
                  serviceHold: 'Confirmación de Saque (Hold)',
                  timeline: 'Línea de Tiempo (Punto a Punto)',
                  close: 'Cerrar',
                  points: 'points',
                  set: 'Set',
                  game: 'Game',
                  server: 'Sacador',
                  break: '¡Quiebre de Servicio!',
                  tiebreak: 'Tie-break',
                  breakpointChance: 'Oportunidad de Quiebre',
                }
              }[language] || {
                pt: {
                  legados: 'Detalhes e estatísticas indisponíveis para partidas legadas.',
                  totalPoints: 'Total de Pontos Vencidos',
                  breakpoints: 'Aproveitamento de Breakpoints',
                  serviceHold: 'Confirmação de Saque (Hold)',
                  timeline: 'Linha do Tempo (Ponto a Ponto)',
                  close: 'Fechar',
                  points: 'pontos',
                  set: 'Set',
                  game: 'Game',
                  server: 'Sacador',
                  break: 'Quebra de Serviço!',
                  tiebreak: 'Tie-break',
                  breakpointChance: 'Chance de Quebra',
                }
              }.pt;

              return (
                <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                  {/* Players Match Header */}
                  <View style={styles.detailsPlayersHeader}>
                    <View style={styles.detailsPlayerCol}>
                      <Text style={[styles.playerName, match.winner === 1 && styles.winnerNameText]} numberOfLines={1}>
                        {match.player1Name}
                      </Text>
                      {match.winner === 1 && <Ionicons name="trophy" size={14} color="#eab308" style={{ marginTop: 2 }} />}
                    </View>
                    <View style={styles.detailsScoreMiddle}>
                      <Text style={styles.detailsVS}>VS</Text>
                    </View>
                    <View style={[styles.detailsPlayerCol, { alignItems: 'flex-end' }]}>
                      <Text style={[styles.playerName, { textAlign: 'right' }, match.winner === 2 && styles.winnerNameText]} numberOfLines={1}>
                        {match.player2Name}
                      </Text>
                      {match.winner === 2 && <Ionicons name="trophy" size={14} color="#eab308" style={{ marginTop: 2 }} />}
                    </View>
                  </View>

                  {!hasTimeline ? (
                    <View style={styles.legacyContainer}>
                      <Ionicons name="alert-circle-outline" size={32} color="#64748b" />
                      <Text style={styles.legacyText}>{dt.legados}</Text>
                    </View>
                  ) : (
                    <View style={{ gap: 20, marginBottom: 20 }}>
                      {/* Durations summary */}
                      {match.totalDuration && (
                        <View style={styles.durationCard}>
                          <Ionicons name="time-outline" size={18} color="#ccff00" style={{ marginRight: 6 }} />
                          <Text style={styles.durationText}>
                            {language === 'pt' ? 'Tempo Total da Partida:' : language === 'en' ? 'Total Match Time:' : 'Tiempo Total del Partido:'}{' '}
                            <Text style={{ color: '#ccff00', fontWeight: '800' }}>{match.totalDuration}</Text>
                          </Text>
                        </View>
                      )}

                      {match.gameDurations && match.gameDurations.length > 0 && (
                        <View style={styles.gameDurationsCard}>
                          <Text style={styles.gameDurationsTitle}>
                            {language === 'pt' ? 'Tempo de cada Game' : language === 'en' ? 'Game Durations' : 'Duración de los Games'}
                          </Text>
                          <View style={styles.gameDurationsGrid}>
                            {match.gameDurations.map((dur: string, gIdx: number) => (
                              <View key={gIdx} style={styles.gameDurationBadge}>
                                <Text style={styles.gameDurationBadgeText}>
                                  G{gIdx + 1}: <Text style={{ color: '#ccff00', fontWeight: '700' }}>{dur}</Text>
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                      {/* Stats Section */}
                      {match.stats && (
                        <View style={styles.statsCardContainer}>
                          {/* Points Won */}
                          <View style={styles.statBox}>
                            <Text style={styles.statLabel}>{dt.totalPoints}</Text>
                            <View style={styles.statBarRow}>
                              <Text style={styles.statValText}>{match.stats.player1.totalPointsWon} pts</Text>
                              <View style={styles.statBarBG}>
                                <View 
                                  style={[
                                    styles.statBarP1, 
                                    { flex: match.stats.player1.totalPointsWon || 1 }
                                  ]} 
                                />
                                <View 
                                  style={[
                                    styles.statBarP2, 
                                    { flex: match.stats.player2.totalPointsWon || 1 }
                                  ]} 
                                />
                              </View>
                              <Text style={[styles.statValText, { textAlign: 'right' }]}>{match.stats.player2.totalPointsWon} pts</Text>
                            </View>
                          </View>

                          {/* Breakpoints */}
                          <View style={styles.statBox}>
                            <Text style={styles.statLabel}>{dt.breakpoints}</Text>
                            <View style={styles.statBarRow}>
                              <Text style={styles.statValText}>
                                {match.stats.player1.breakpointsWon}/{match.stats.player1.breakpointsTotal}
                                {` (${match.stats.player1.breakpointsTotal > 0 ? Math.round((match.stats.player1.breakpointsWon / match.stats.player1.breakpointsTotal) * 100) : 0}%)`}
                              </Text>
                              <Text style={[styles.statValText, { textAlign: 'right' }]}>
                                {match.stats.player2.breakpointsWon}/{match.stats.player2.breakpointsTotal}
                                {` (${match.stats.player2.breakpointsTotal > 0 ? Math.round((match.stats.player2.breakpointsWon / match.stats.player2.breakpointsTotal) * 100) : 0}%)`}
                              </Text>
                            </View>
                          </View>

                          {/* Service Hold Rate */}
                          <View style={styles.statBox}>
                            <Text style={styles.statLabel}>{dt.serviceHold}</Text>
                            <View style={styles.statBarRow}>
                              <Text style={styles.statValText}>
                                {match.stats.player1.serviceGamesWon}/{match.stats.player1.serviceGamesTotal}
                                {` (${match.stats.player1.serviceGamesTotal > 0 ? Math.round((match.stats.player1.serviceGamesWon / match.stats.player1.serviceGamesTotal) * 100) : 0}%)`}
                              </Text>
                              <Text style={[styles.statValText, { textAlign: 'right' }]}>
                                {match.stats.player2.serviceGamesWon}/{match.stats.player2.serviceGamesTotal}
                                {` (${match.stats.player2.serviceGamesTotal > 0 ? Math.round((match.stats.player2.serviceGamesWon / match.stats.player2.serviceGamesTotal) * 100) : 0}%)`}
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}

                      {/* Point by Point Progression */}
                      <Text style={styles.sectionTitle}>{dt.timeline}</Text>
                      
                      {(() => {
                        // Group point entries by set and game
                        const sets: { [key: number]: { [key: number]: PointHistoryEntry[] } } = {};
                        (match.pointsHistory || []).forEach(entry => {
                          if (!sets[entry.setIndex]) {
                            sets[entry.setIndex] = {};
                          }
                          if (!sets[entry.setIndex][entry.gameIndex]) {
                            sets[entry.setIndex][entry.gameIndex] = [];
                          }
                          sets[entry.setIndex][entry.gameIndex].push(entry);
                        });

                        return Object.keys(sets).map(sIndexStr => {
                          const sIdx = parseInt(sIndexStr, 10);
                          const games = sets[sIdx];
                          return (
                            <View key={sIdx} style={styles.setTimelineContainer}>
                              <Text style={styles.setTimelineTitle}>{dt.set} {sIdx + 1}</Text>
                              
                              {Object.keys(games).map(gIndexStr => {
                                const gIdx = parseInt(gIndexStr, 10);
                                const pts = games[gIdx];
                                if (pts.length === 0) return null;

                                const serverNum = pts[0].server;
                                const serverName = serverNum === 1 ? match.player1Name : match.player2Name;
                                const lastPt = pts[pts.length - 1];
                                
                                // Determine if service was broken in this game
                                const isTiebreakGame = pts[0].isTieBreak;
                                const isBroken = !isTiebreakGame && (lastPt.scorer !== serverNum) && 
                                                 ((lastPt.scoreAfter.player1Points === 0 && lastPt.scoreAfter.player2Points === 0) || 
                                                  lastPt.isBreakpointConverted);

                                const gameWinnerName = lastPt.scorer === 1 ? match.player1Name : match.player2Name;

                                return (
                                  <View key={gIdx} style={styles.gameTimelineCard}>
                                    <View style={styles.gameTimelineHeader}>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Ionicons name="tennisball" size={16} color="#ccff00" />
                                        <Text style={styles.gameTimelineLabel}>
                                          {isTiebreakGame ? `${dt.tiebreak}` : `${dt.game} ${gIdx + 1}`}
                                        </Text>
                                      </View>
                                      {!isTiebreakGame && (
                                        <Text style={styles.gameServerLabel}>
                                          {dt.server}: {serverName}
                                        </Text>
                                      )}
                                    </View>

                                    {/* Points list inside the game */}
                                    <View style={styles.gamePointsTimeline}>
                                      {pts.map((pt, pIndex) => {
                                        // Translate score for presentation
                                        const p1Disp = isTiebreakGame ? pt.scoreAfter.player1Points : 
                                                       (pt.scoreAfter.player1Points === 4 && pt.scoreAfter.player2Points === 3 ? 'AD' : 
                                                        pt.scoreAfter.player1Points === 3 && pt.scoreAfter.player2Points === 3 ? '40' :
                                                        ['0', '15', '30', '40'][Math.min(pt.scoreAfter.player1Points, 3)]);
                                        
                                        const p2Disp = isTiebreakGame ? pt.scoreAfter.player2Points : 
                                                       (pt.scoreAfter.player2Points === 4 && pt.scoreAfter.player1Points === 3 ? 'AD' : 
                                                        pt.scoreAfter.player1Points === 3 && pt.scoreAfter.player2Points === 3 ? '40' :
                                                        ['0', '15', '30', '40'][Math.min(pt.scoreAfter.player2Points, 3)]);

                                        // Translate score BEFORE
                                        const p1DispBef = isTiebreakGame ? pt.scoreBefore.player1Points : 
                                                          (pt.scoreBefore.player1Points === 4 && pt.scoreBefore.player2Points === 3 ? 'AD' : 
                                                           pt.scoreBefore.player1Points === 3 && pt.scoreBefore.player2Points === 3 ? '40' :
                                                           ['0', '15', '30', '40'][Math.min(pt.scoreBefore.player1Points, 3)]);
                                        
                                        const p2DispBef = isTiebreakGame ? pt.scoreBefore.player2Points : 
                                                          (pt.scoreBefore.player2Points === 4 && pt.scoreBefore.player1Points === 3 ? 'AD' : 
                                                           pt.scoreBefore.player1Points === 3 && pt.scoreBefore.player2Points === 3 ? '40' :
                                                           ['0', '15', '30', '40'][Math.min(pt.scoreBefore.player2Points, 3)]);

                                        const wonByText = pt.scorer === 1 ? match.player1Name : match.player2Name;

                                        return (
                                          <View key={pIndex} style={styles.pointTimelineRow}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 3 }}>
                                              <View style={[styles.scorerIndicator, { backgroundColor: pt.scorer === 1 ? '#06b6d4' : '#6366f1' }]} />
                                              <Text style={styles.pointDetailText}>
                                                {`${p1DispBef}:${p2DispBef} ➔ `}
                                                <Text style={{ fontWeight: '800', color: '#f8fafc' }}>{`${p1Disp}:${p2Disp}`}</Text>
                                                <Text style={{ fontSize: 10, color: '#94a3b8' }}>{` por ${wonByText}`}</Text>
                                              </Text>
                                            </View>

                                            {pt.isBreakpoint && (
                                              <View style={styles.timelineBreakpointBadge}>
                                                <Ionicons name="flash" size={10} color="#ccff00" />
                                                <Text style={styles.timelineBreakpointText}>
                                                  {pt.isBreakpointConverted ? 'Break!' : 'BP'}
                                                </Text>
                                              </View>
                                            )}
                                          </View>
                                        );
                                      })}
                                    </View>

                                    <View style={styles.gameTimelineFooter}>
                                      <Text style={[styles.gameWinnerAnnounce, isBroken && { color: '#f59e0b' }]}>
                                        {isBroken ? `⚡ ${dt.break} (${gameWinnerName})` : `🏆 Game: ${gameWinnerName}`}
                                      </Text>
                                    </View>
                                  </View>
                                );
                              })}
                            </View>
                          );
                        });
                      })()}
                    </View>
                  )}
                </ScrollView>
              );
            })()}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelModalBtn, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}
                onPress={() => setSelectedDetailsMatch(null)}
              >
                <Text style={styles.cancelModalBtnText}>
                  {language === 'pt' ? 'Fechar' : language === 'en' ? 'Close' : 'Cerrar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 5,
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
  historyIcon: {
    textShadowColor: 'rgba(99, 102, 241, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  infoText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
    paddingBottom: 10,
    marginBottom: 12,
  },
  typeBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  cardContent: {
    marginBottom: 10,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerCol: {
    flex: 3,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
  },
  winnerNameText: {
    color: '#f8fafc',
    fontWeight: '900',
  },
  gamesScoresContainer: {
    flex: 4,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  setScoreText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ccff00',
  },
  tbPointsSmall: {
    fontSize: 10,
    color: '#64748b',
  },
  statsText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 4,
  },
  subCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 6,
  },
  rankingContainer: {
    backgroundColor: 'rgba(9, 13, 22, 0.4)',
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankingPos: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ccff00',
    width: 24,
  },
  rankingName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  rankingWins: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.03)',
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  deleteBtn: {
    borderColor: 'rgba(239, 68, 68, 0.1)',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ccff00',
  },
  textWhite: {
    color: '#f8fafc',
  },
  textNeon: {
    color: '#ccff00',
    fontWeight: '800',
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 15, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ccff00',
    letterSpacing: 0.5,
  },
  modalForm: {
    padding: 16,
  },
  formSection: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#090d16',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#f8fafc',
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    fontWeight: '600',
  },
  setEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  setEditLabel: {
    flex: 2,
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  scoreInput: {
    flex: 1,
    backgroundColor: '#090d16',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#f8fafc',
    textAlign: 'center',
    height: 40,
    fontSize: 15,
    fontWeight: '800',
  },
  setEditDivider: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '700',
  },
  playerEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  playerEditIndex: {
    color: '#ccff00',
    fontWeight: '800',
    fontSize: 14,
    width: 24,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  cancelModalBtnText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  saveModalBtn: {
    flex: 1,
    backgroundColor: '#ccff00',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveModalBtnText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '900',
  },
  detailsPlayersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#090d16',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  detailsPlayerCol: {
    flex: 4,
    alignItems: 'flex-start',
  },
  detailsScoreMiddle: {
    flex: 2,
    alignItems: 'center',
  },
  detailsVS: {
    color: '#64748b',
    fontWeight: '800',
    fontSize: 12,
  },
  legacyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 8,
  },
  legacyText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  statsCardContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    gap: 12,
  },
  statBox: {
    gap: 6,
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  statValText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
    minWidth: 45,
  },
  statBarBG: {
    flex: 1,
    height: 8,
    backgroundColor: '#090d16',
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  statBarP1: {
    backgroundColor: '#06b6d4',
    height: '100%',
  },
  statBarP2: {
    backgroundColor: '#6366f1',
    height: '100%',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ccff00',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 10,
  },
  setTimelineContainer: {
    gap: 10,
    marginTop: 8,
  },
  setTimelineTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#06b6d4',
    backgroundColor: 'rgba(6, 182, 212, 0.05)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  gameTimelineCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    overflow: 'hidden',
  },
  gameTimelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  gameTimelineLabel: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
  },
  gameServerLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  gamePointsTimeline: {
    padding: 10,
    gap: 6,
  },
  pointTimelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  scorerIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pointDetailText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  timelineBreakpointBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(204, 255, 0, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 2,
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.2)',
  },
  timelineBreakpointText: {
    color: '#ccff00',
    fontSize: 8,
    fontWeight: '900',
  },
  gameTimelineFooter: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.02)',
  },
  gameWinnerAnnounce: {
    fontSize: 10,
    fontWeight: '800',
    color: '#06b6d4',
  },
  durationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  durationText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  gameDurationsCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
  },
  gameDurationsTitle: {
    color: '#ccff00',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gameDurationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  gameDurationBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  gameDurationBadgeText: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '600',
  },
});
