import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MatchState, getDisplayPoints } from '../utils/tennisEngine';

interface GrandSlamScoreboardProps {
  matchState: MatchState;
  onAddPoint: (player: 1 | 2) => void;
  currentTime: string;
  elapsedTime: string;
  isVoiceMuted: boolean;
  onToggleMute: () => void;
}

export default function GrandSlamScoreboard({
  matchState,
  onAddPoint,
  currentTime,
  elapsedTime,
  isVoiceMuted,
  onToggleMute,
}: GrandSlamScoreboardProps) {
  const { config, setScores, currentSetIndex, isTieBreak, isMatchTieBreak, server, winner } = matchState;
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // Localized Labels
  const labels = {
    pt: { points: 'PONTOS', set: 'SET', court: 'QUADRA 11' },
    en: { points: 'POINTS', set: 'SET', court: 'COURT 11' },
    es: { points: 'PUNTOS', set: 'SET', court: 'CANCHA 11' },
  };
  const t = labels[config.language || 'pt'] || labels.pt;

  // Helper to split name into first name and uppercase last name
  const formatPlayerName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 1) {
      return { first: '', last: fullName.toUpperCase() };
    }
    const last = parts[parts.length - 1].toUpperCase();
    const first = parts.slice(0, -1).join(' ');
    return { first, last };
  };

  // Convert raw points to display points
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

  const playersOrder: (1 | 2)[] = matchState.courtSideSwapped ? [2, 1] : [1, 2];

  const maxSets = config.setsToWin * 2 - 1;
  const setColumns = Array.from({ length: maxSets }, (_, i) => i);

  // DYNAMIC SIZES (Where size values are adjusted dynamically according to window dimensions)
  const headerFontSize = isLandscape ? Math.max(height * 0.026, 9) : Math.max(width * 0.024, 9);
  const nameFontSize = isLandscape ? Math.max(height * 0.05, 14) : Math.max(width * 0.046, 12);
  const nameSubFontSize = nameFontSize * 0.65;
  const pointsFontSize = isLandscape ? Math.max(height * 0.09, 18) : Math.max(width * 0.075, 16);
  const setScoreFontSize = isLandscape ? Math.max(height * 0.08, 16) : Math.max(width * 0.07, 14);

  return (
    <View style={styles.outerContainer}>
      {/* 1. Header (Time, Location/Rolex, Match Timer) */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="time-outline" size={headerFontSize} color="#a1a1aa" style={{ marginRight: 4 }} />
          <Text style={[styles.headerText, { fontSize: headerFontSize }]}>{currentTime}</Text>
        </View>

        <View style={styles.headerCenter}>
          <Text style={[styles.courtName, { fontSize: headerFontSize * 0.9 }]}>{t.court}</Text>
          <View style={styles.sponsorRow}>
            <Text style={[styles.sponsorBrand, { fontSize: headerFontSize * 0.65 }]}>ROLEX</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <Text style={[styles.elapsedLabel, { fontSize: headerFontSize * 0.65 }]}>MATCH TIME</Text>
          <Text style={[styles.elapsedValue, { fontSize: headerFontSize }]}>{elapsedTime}</Text>
          <TouchableOpacity onPress={onToggleMute} style={styles.muteButton}>
            <Ionicons 
              name={isVoiceMuted ? "volume-mute" : "volume-high"} 
              size={headerFontSize} 
              color={isVoiceMuted ? "#ef4444" : "#02c39a"} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Main Scoreboard Grid Container */}
      <View style={styles.gridContainer}>
        {/* Header Titles */}
        <View style={styles.gridHeaderRow}>
          <Text style={[styles.columnHeader, styles.playerColumn, { fontSize: headerFontSize }]}>PLAYER</Text>
          <Text style={[styles.columnHeader, styles.pointsColumn, { fontSize: headerFontSize }]}>{t.points}</Text>
          {setColumns.map((idx) => (
            <Text key={idx} style={[styles.columnHeader, styles.setColumn, { fontSize: headerFontSize }]}>
              {idx + 1}
            </Text>
          ))}
        </View>

        {/* Rows for Players */}
        {playersOrder.map((playerNum) => {
          const isP1 = playerNum === 1;
          const name = isP1 ? config.player1Name : config.player2Name;
          const country = isP1 ? config.player1Country : config.player2Country;
          const seed = isP1 ? config.player1Seed : config.player2Seed;
          const isServing = server === playerNum && winner === null;
          const isWinner = winner === playerNum;

          const parsed = formatPlayerName(name);
          const pointsDisplay = isP1 ? p1Display : p2Display;

          return (
            <TouchableOpacity
              key={playerNum}
              style={[
                styles.gridPlayerRow,
                isServing && styles.servingPlayerRow,
                isWinner && styles.winnerPlayerRow,
              ]}
              onPress={() => {
                if (winner === null) {
                  onAddPoint(playerNum);
                }
              }}
              disabled={winner !== null}
            >
              {/* Name, Country, Seed, Serve dot */}
              <View style={[styles.playerCell, styles.playerColumn]}>
                <View style={styles.serveDotWrapper}>
                  {isServing && (
                    <View style={styles.luminousServeDot} />
                  )}
                </View>
                <View style={styles.playerIdentity}>
                  <Text style={[styles.playerNameContainer, { fontSize: nameFontSize }]} numberOfLines={1}>
                    {parsed.first ? <Text style={styles.playerFirstName}>{parsed.first} </Text> : null}
                    <Text style={styles.playerLastName}>{parsed.last}</Text>
                  </Text>
                  {country || seed ? (
                    <Text style={[styles.playerSubDetails, { fontSize: nameSubFontSize }]}>
                      {country ? <Text style={styles.countryCode}>{country}</Text> : null}
                      {seed ? <Text style={styles.seedText}> ({seed})</Text> : null}
                    </Text>
                  ) : null}
                </View>
                {isWinner && (
                  <Ionicons name="trophy" size={nameFontSize} color="#eab308" style={styles.rowTrophy} />
                )}
              </View>

              {/* Game Points column */}
              <View style={[styles.cell, styles.pointsColumn, styles.pointsCellBackground]}>
                <Text style={[
                  styles.pointsText, 
                  isServing && styles.activePointsText,
                  (pointsDisplay === 'AD' || pointsDisplay === 'A') && styles.advantageText,
                  { fontSize: pointsFontSize }
                ]}>
                  {pointsDisplay}
                </Text>
              </View>

              {/* Individual Sets columns */}
              {setColumns.map((setIdx) => {
                const scoreEntry = setScores[setIdx];
                const hasScore = scoreEntry !== undefined;
                
                const games = hasScore
                  ? (isP1 ? scoreEntry.player1Games : scoreEntry.player2Games)
                  : '';
                const tieBreakPoints = hasScore
                  ? (isP1 ? scoreEntry.player1TieBreakPoints : scoreEntry.player2TieBreakPoints)
                  : undefined;

                const isCurrentSet = setIdx === currentSetIndex && winner === null;
                const isSetFinished = setIdx < currentSetIndex || (winner !== null && hasScore);

                return (
                  <View 
                    key={setIdx} 
                    style={[
                      styles.cell, 
                      styles.setColumn,
                      isCurrentSet && styles.activeSetCell,
                      isSetFinished && styles.pastSetCell
                    ]}
                  >
                    <Text style={[
                      styles.setScoreText,
                      isCurrentSet && styles.activeSetScoreText,
                      isSetFinished && styles.pastSetScoreText,
                      { fontSize: setScoreFontSize }
                    ]}>
                      {games}
                      {tieBreakPoints !== undefined ? (
                        <Text style={styles.tbPointsText}>({tieBreakPoints})</Text>
                      ) : null}
                    </Text>
                  </View>
                );
              })}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1, // Dynamically fill the entire remaining vertical space
    backgroundColor: '#0a1c12', // Grand Slam deep Rolex-style forest green
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#0b5930', // Deep gold-green border
    padding: 12,
    marginVertical: 4,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#0b5930',
    paddingBottom: 8,
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '25%',
  },
  headerText: {
    color: '#cbd5e1',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  headerCenter: {
    alignItems: 'center',
    width: '50%',
  },
  courtName: {
    color: '#ccff00', // Neon highlight
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  sponsorRow: {
    marginTop: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#a3a3a3',
    borderRadius: 2,
  },
  sponsorBrand: {
    color: '#ffffff',
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    width: '25%',
  },
  elapsedLabel: {
    color: '#64748b',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  elapsedValue: {
    color: '#ffffff',
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  muteButton: {
    padding: 2,
  },
  gridContainer: {
    flex: 1, // Dynamically fill vertical space within the outerContainer
    flexDirection: 'column',
    width: '100%',
  },
  gridHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(11, 89, 48, 0.5)',
  },
  columnHeader: {
    color: '#475569',
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
  },
  playerColumn: {
    flex: 3,
    textAlign: 'left',
    paddingLeft: 6,
  },
  pointsColumn: {
    flex: 1.2,
  },
  setColumn: {
    flex: 0.8,
  },
  gridPlayerRow: {
    flex: 1, // Flex rows to share the remaining height inside gridContainer equally
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c2e1c', // Deep forest background
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
    minHeight: 52, // Ensure a minimum height exists
  },
  servingPlayerRow: {
    borderColor: '#02c39a', // Luminous glow for server
    backgroundColor: '#0a3620',
  },
  winnerPlayerRow: {
    borderColor: '#eab308',
    backgroundColor: 'rgba(234, 179, 8, 0.05)',
  },
  playerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    paddingLeft: 4,
  },
  serveDotWrapper: {
    width: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  luminousServeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccff00', // Luminous neon green dot
    shadowColor: '#ccff00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
  },
  playerIdentity: {
    flex: 1,
    flexDirection: 'column',
    marginLeft: 6,
    justifyContent: 'center',
  },
  playerNameContainer: {
    color: '#ffffff',
  },
  playerFirstName: {
    fontWeight: '300',
    color: '#cbd5e1',
  },
  playerLastName: {
    fontWeight: '800',
    color: '#ffffff',
  },
  playerSubDetails: {
    fontWeight: '700',
    color: '#64748b',
    marginTop: 1.5,
  },
  countryCode: {
    color: '#94a3b8',
  },
  seedText: {
    color: '#ccff00', // Highlighted seed index
  },
  rowTrophy: {
    marginRight: 8,
  },
  cell: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(11, 89, 48, 0.4)',
  },
  pointsCellBackground: {
    backgroundColor: '#05180f', // Dark contrasting background for current game points
  },
  pointsText: {
    color: '#a1a1aa',
    fontWeight: '800',
  },
  activePointsText: {
    color: '#ccff00', // Gold/yellow active points
    fontWeight: '900',
  },
  advantageText: {
    color: '#ff9f1c', // Advantange gold
  },
  setScoreText: {
    color: '#64748b',
    fontWeight: '700',
  },
  activeSetScoreText: {
    color: '#ffffff', // Current set is bright white
    fontWeight: '900',
  },
  pastSetScoreText: {
    color: '#475569', // Muted past set points
  },
  activeSetCell: {
    backgroundColor: 'rgba(2, 195, 154, 0.1)',
  },
  pastSetCell: {
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  tbPointsText: {
    fontSize: 9,
    color: '#02c39a',
    fontWeight: '600',
  },
});
