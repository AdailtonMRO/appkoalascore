export interface TennisConfig {
  player1Name: string;
  player2Name: string;
  player1Country?: string;
  player2Country?: string;
  player1Seed?: string;
  player2Seed?: string;
  setsToWin: number; // 1, 2 (best of 3), or 3 (best of 5)
  gamesPerSet: number; // e.g., 6 or 4
  useTieBreak: boolean; // default true
  tieBreakPoints: number; // default 7
  useMatchTieBreakForFinalSet: boolean; // default false
  matchTieBreakPoints: number; // default 10
  noAdScoring: boolean; // default false (false = Advantage, true = No-Ad)
  language: 'pt' | 'en' | 'es';
  autoSideChange: boolean; // default true
}

export interface PointHistoryEntry {
  pointIndex: number;          // Index of the point in the match (1, 2, 3...)
  setIndex: number;            // Which set (0, 1, 2...)
  gameIndex: number;           // Which game of the set
  server: 1 | 2;               // Who served in this point
  scorer: 1 | 2;               // Who won the point
  scoreBefore: {               // Game points score before the point
    player1Points: number;
    player2Points: number;
  };
  scoreAfter: {                // Game points score after the point
    player1Points: number;
    player2Points: number;
  };
  isBreakpoint: boolean;       // Was this a breakpoint opportunity?
  breakpointPlayer?: 1 | 2;    // Which player had the breakpoint opportunity?
  isBreakpointConverted: boolean; // Did this point result in a break of service?
  isTieBreak: boolean;         // Was this point in a tie-break?
}

export interface PlayerStats {
  breakpointsWon: number;      // Converted breakpoints
  breakpointsTotal: number;    // Total breakpoint opportunities
  serviceGamesWon: number;     // Service games won (hold)
  serviceGamesTotal: number;   // Total service games played
  totalPointsWon: number;      // Total points won in the match
}

export interface MatchStats {
  player1: PlayerStats;
  player2: PlayerStats;
}

export interface SetScore {
  player1Games: number;
  player2Games: number;
  player1TieBreakPoints?: number;
  player2TieBreakPoints?: number;
}

export interface MatchState {
  config: TennisConfig;
  player1Points: number; // raw points in the current game: 0, 1, 2, 3, etc.
  player2Points: number;
  player1Sets: number; // sets won so far
  player2Sets: number;
  setScores: SetScore[];
  currentSetIndex: number;
  isTieBreak: boolean;
  isMatchTieBreak: boolean;
  server: 1 | 2; // who is serving in the current game/point
  firstServerOfMatch: 1 | 2; // who served first in the match
  firstServerOfActiveSet: 1 | 2; // who served first in the active set
  winner: 1 | 2 | null;
  courtSideSwapped: boolean; // false = player 1 on left/top, true = player 2 on left/top
  pointsHistory: PointHistoryEntry[]; // point-by-point history tracking
  history: Omit<MatchState, 'history'>[];
}

export const INITIAL_CONFIG: TennisConfig = {
  player1Name: 'Jogador 1',
  player2Name: 'Jogador 2',
  setsToWin: 2, // Best of 3
  gamesPerSet: 6,
  useTieBreak: true,
  tieBreakPoints: 7,
  useMatchTieBreakForFinalSet: false,
  matchTieBreakPoints: 10,
  noAdScoring: false,
  language: 'pt',
  autoSideChange: true,
};

export function createInitialState(config: TennisConfig = INITIAL_CONFIG, firstServer: 1 | 2 = 1): MatchState {
  return {
    config,
    player1Points: 0,
    player2Points: 0,
    player1Sets: 0,
    player2Sets: 0,
    setScores: [{ player1Games: 0, player2Games: 0 }],
    currentSetIndex: 0,
    isTieBreak: false,
    isMatchTieBreak: false,
    server: firstServer,
    firstServerOfMatch: firstServer,
    firstServerOfActiveSet: firstServer,
    winner: null,
    courtSideSwapped: false,
    pointsHistory: [],
    history: [],
  };
}

// Convert raw points to standard tennis displays (0, 15, 30, 40, AD)
export function getDisplayPoints(
  p1Points: number,
  p2Points: number,
  isTieBreak: boolean,
  noAd: boolean
): { p1Display: string; p2Display: string } {
  if (isTieBreak) {
    return { p1Display: p1Points.toString(), p2Display: p2Points.toString() };
  }

  if (noAd) {
    // No-Ad: 0, 15, 30, 40, no AD.
    const pts = ['0', '15', '30', '40'];
    return {
      p1Display: pts[Math.min(p1Points, 3)],
      p2Display: pts[Math.min(p2Points, 3)],
    };
  }

  // Standard Advantage scoring
  if (p1Points >= 3 && p2Points >= 3) {
    if (p1Points === p2Points) {
      return { p1Display: '40', p2Display: '40' }; // Deuce
    }
    if (p1Points > p2Points) {
      return { p1Display: 'AD', p2Display: '40' };
    }
    return { p1Display: '40', p2Display: 'AD' };
  }

  const pts = ['0', '15', '30', '40'];
  return {
    p1Display: pts[p1Points],
    p2Display: pts[p2Points],
  };
}

// Determine if the serve is from the deuce court (right side) or ad court (left side)
export function isServingFromDeuceCourt(state: MatchState): boolean {
  if (state.isTieBreak || state.isMatchTieBreak) {
    const activeSet = state.setScores[state.currentSetIndex];
    const p1TB = activeSet.player1TieBreakPoints || 0;
    const p2TB = activeSet.player2TieBreakPoints || 0;
    const totalTBPoints = p1TB + p2TB;
    // Tie-break: first point from deuce court, next two points from ad then deuce.
    // Mathematically, if total points played is even, it's the Deuce court. If odd, Ad court.
    return totalTBPoints % 2 === 0;
  }

  // Normal game: total points played in the current game decides the court.
  // 0 points: Deuce, 1 point: Ad, 2 points: Deuce, etc.
  const totalPoints = state.player1Points + state.player2Points;
  return totalPoints % 2 === 0;
}

// Helper to copy state for history (stripping history itself to avoid deep recursion)
function copyStateForHistory(state: MatchState): Omit<MatchState, 'history'> {
  const { history, ...rest } = state;
  return JSON.parse(JSON.stringify(rest));
}

// Undo the last action
export function undo(state: MatchState): MatchState {
  if (state.history.length === 0) {
    return state;
  }
  const historyCopy = [...state.history];
  const prevState = historyCopy.pop()!;
  return {
    ...prevState,
    history: historyCopy,
  };
}

export function addPoint(state: MatchState, scorer: 1 | 2): MatchState {
  if (state.winner !== null) {
    return state; // Match already finished
  }

  // Calculate breakpoint status before modifying state
  const server = state.server;
  const receiver = server === 1 ? 2 : 1;
  const isTB = state.isTieBreak || state.isMatchTieBreak;

  let isBreakpoint = false;
  let breakpointPlayer: 1 | 2 | undefined = undefined;

  if (!isTB) {
    const sPoints = server === 1 ? state.player1Points : state.player2Points;
    const rPoints = server === 1 ? state.player2Points : state.player1Points;
    if (rPoints >= 3) {
      if (rPoints > sPoints) {
        isBreakpoint = true;
        breakpointPlayer = receiver;
      } else if (rPoints === sPoints && state.config.noAdScoring && rPoints === 3) {
        isBreakpoint = true;
        breakpointPlayer = receiver;
      }
    }
  }
  const isBreakpointConverted = isBreakpoint && (scorer === receiver);

  const appendPointHistory = (finalState: MatchState): MatchState => {
    const entry: PointHistoryEntry = {
      pointIndex: (state.pointsHistory || []).length + 1,
      setIndex: state.currentSetIndex,
      gameIndex: state.setScores[state.currentSetIndex].player1Games + state.setScores[state.currentSetIndex].player2Games,
      server,
      scorer,
      scoreBefore: {
        player1Points: state.player1Points,
        player2Points: state.player2Points,
      },
      scoreAfter: {
        player1Points: finalState.player1Points,
        player2Points: finalState.player2Points,
      },
      isBreakpoint,
      breakpointPlayer,
      isBreakpointConverted,
      isTieBreak: isTB,
    };
    return {
      ...finalState,
      pointsHistory: [...(state.pointsHistory || []), entry],
    };
  };

  // Save current state to history
  const historyCopy = [...state.history, copyStateForHistory(state)];
  let newState: MatchState = {
    ...state,
    setScores: state.setScores.map(score => ({ ...score })),
    history: historyCopy,
  };

  const opponent = scorer === 1 ? 2 : 1;

  // 1. Check if we are in a Match Tie-Break (instead of a final set)
  if (newState.isMatchTieBreak) {
    const activeSet = { ...newState.setScores[newState.currentSetIndex] };
    if (scorer === 1) {
      activeSet.player1TieBreakPoints = (activeSet.player1TieBreakPoints || 0) + 1;
    } else {
      activeSet.player2TieBreakPoints = (activeSet.player2TieBreakPoints || 0) + 1;
    }
    newState.setScores[newState.currentSetIndex] = activeSet;

    const p1TB = activeSet.player1TieBreakPoints || 0;
    const p2TB = activeSet.player2TieBreakPoints || 0;
    const targetPoints = newState.config.matchTieBreakPoints;

    // Check tie-break server rotation (server changes after point 1, and then every 2 points)
    const totalTBPoints = p1TB + p2TB;
    newState.server = getTieBreakServer(
      newState.firstServerOfActiveSet,
      totalTBPoints
    );

    // Check if a side swap should occur in Match Tie-break (every 6 points)
    // Only if the match tie-break is not won on this point
    const isMatchTieBreakWon = (p1TB >= targetPoints && p1TB - p2TB >= 2) || (p2TB >= targetPoints && p2TB - p1TB >= 2);
    if (newState.config.autoSideChange && !isMatchTieBreakWon && totalTBPoints > 0 && totalTBPoints % 6 === 0) {
      newState.courtSideSwapped = !newState.courtSideSwapped;
    }

    // Check if match tie-break is won (needs to reach target points and lead by at least 2)
    if (p1TB >= targetPoints && p1TB - p2TB >= 2) {
      newState.player1Sets += 1;
      activeSet.player1Games = 1; // Represent match tiebreak win as 1-0 games or similar
      activeSet.player2Games = 0;
      newState.winner = 1;
    } else if (p2TB >= targetPoints && p2TB - p1TB >= 2) {
      newState.player2Sets += 1;
      activeSet.player2Games = 1;
      activeSet.player1Games = 0;
      newState.winner = 2;
    }

    return appendPointHistory(newState);
  }

  // 2. Check if we are in a standard Set Tie-Break
  if (newState.isTieBreak) {
    const activeSet = { ...newState.setScores[newState.currentSetIndex] };
    if (scorer === 1) {
      activeSet.player1TieBreakPoints = (activeSet.player1TieBreakPoints || 0) + 1;
    } else {
      activeSet.player2TieBreakPoints = (activeSet.player2TieBreakPoints || 0) + 1;
    }
    newState.setScores[newState.currentSetIndex] = activeSet;

    const p1TB = activeSet.player1TieBreakPoints || 0;
    const p2TB = activeSet.player2TieBreakPoints || 0;
    const targetPoints = newState.config.tieBreakPoints;

    const totalTBPoints = p1TB + p2TB;
    newState.server = getTieBreakServer(
      newState.firstServerOfActiveSet,
      totalTBPoints
    );

    // Check if a side swap should occur in Set Tie-break (every 6 points)
    // Only if the tie-break is not won on this point
    const isTieBreakWon = (p1TB >= targetPoints && p1TB - p2TB >= 2) || (p2TB >= targetPoints && p2TB - p1TB >= 2);
    if (newState.config.autoSideChange && !isTieBreakWon && totalTBPoints > 0 && totalTBPoints % 6 === 0) {
      newState.courtSideSwapped = !newState.courtSideSwapped;
    }

    // Check if tie-break is won (needs to reach target points and lead by at least 2)
    if (p1TB >= targetPoints && p1TB - p2TB >= 2) {
      activeSet.player1Games += 1;
      newState.player1Sets += 1;
      newState.isTieBreak = false;
      return appendPointHistory(checkSetOrMatchEnd(newState, 1));
    } else if (p2TB >= targetPoints && p2TB - p1TB >= 2) {
      activeSet.player2Games += 1;
      newState.player2Sets += 1;
      newState.isTieBreak = false;
      return appendPointHistory(checkSetOrMatchEnd(newState, 2));
    }

    return appendPointHistory(newState);
  }

  // 3. Regular Game Play
  let p1Points = newState.player1Points;
  let p2Points = newState.player2Points;

  if (scorer === 1) {
    p1Points += 1;
  } else {
    p2Points += 1;
  }

  // Check game-winning conditions
  let gameWon = false;
  if (newState.config.noAdScoring) {
    // No-Ad: first to win 4 points wins the game (at 3-3, next point wins)
    if (p1Points >= 4 && scorer === 1) {
      gameWon = true;
    } else if (p2Points >= 4 && scorer === 2) {
      gameWon = true;
    }
  } else {
    // Standard Advantage scoring: must have at least 4 points and lead by 2
    if (p1Points >= 4 && p1Points - p2Points >= 2) {
      gameWon = true;
    } else if (p2Points >= 4 && p2Points - p1Points >= 2) {
      gameWon = true;
    } else if (p1Points >= 4 && p2Points >= 4 && p1Points === p2Points) {
      // If advantage goes back to deuce, reset points to 3-3 to avoid infinite growth
      p1Points = 3;
      p2Points = 3;
    }
  }

  if (gameWon) {
    // Reset game points
    newState.player1Points = 0;
    newState.player2Points = 0;

    // Increment games in active set
    const activeSet = { ...newState.setScores[newState.currentSetIndex] };
    if (scorer === 1) {
      activeSet.player1Games += 1;
    } else {
      activeSet.player2Games += 1;
    }
    newState.setScores[newState.currentSetIndex] = activeSet;

    // Server changes after every completed game
    newState.server = newState.server === 1 ? 2 : 1;

    // Check set-winning conditions
    const gamesToWin = newState.config.gamesPerSet;
    const g1 = activeSet.player1Games;
    const g2 = activeSet.player2Games;

    if (newState.config.useTieBreak && g1 === gamesToWin && g2 === gamesToWin) {
      // Tie-break starts at 6-6 (or 4-4)
      newState.isTieBreak = true;
      activeSet.player1TieBreakPoints = 0;
      activeSet.player2TieBreakPoints = 0;
      newState.setScores[newState.currentSetIndex] = activeSet;
      // In tie-break, the player whose turn it was to serve serves the first point.
      newState.firstServerOfActiveSet = newState.server;
    } else {
      // Check standard set win (must win gamesToWin games AND lead by 2, or reach gamesToWin+1 (7-5) when tiebreak is used)
      let setWon = false;
      if (scorer === 1) {
        if (g1 >= gamesToWin && g1 - g2 >= 2) {
          setWon = true;
        } else if (newState.config.useTieBreak && g1 === gamesToWin + 1 && g2 === gamesToWin - 1) {
          // e.g. 7-5 set win
          setWon = true;
        }
      } else {
        if (g2 >= gamesToWin && g2 - g1 >= 2) {
          setWon = true;
        } else if (newState.config.useTieBreak && g2 === gamesToWin + 1 && g1 === gamesToWin - 1) {
          setWon = true;
        }
      }

      if (setWon) {
        if (scorer === 1) {
          newState.player1Sets += 1;
        } else {
          newState.player2Sets += 1;
        }
        return appendPointHistory(checkSetOrMatchEnd(newState, scorer));
      } else {
        // Regular game won, set NOT completed.
        // Check if total games in active set is odd!
        const totalGames = g1 + g2;
        if (newState.config.autoSideChange && totalGames % 2 !== 0) {
          newState.courtSideSwapped = !newState.courtSideSwapped;
        }
      }
    }
  } else {
    // Game not completed yet, update raw points
    newState.player1Points = p1Points;
    newState.player2Points = p2Points;
  }

  return appendPointHistory(newState);
}


// Determine who is serving during a tie-break
// First server of set serves 1 point (P1).
// Then other player serves 2 points (P2, P2).
// Then P1 serves 2 points (P1, P1), and so on.
function getTieBreakServer(firstServer: 1 | 2, totalPointsPlayed: number): 1 | 2 {
  // Sequence of servers for total points 0, 1, 2, 3, 4, 5, 6, 7, 8...
  // Let firstServer be A, other server be B.
  // Pts played before current point:
  // 0: A
  // 1, 2: B
  // 3, 4: A
  // 5, 6: B
  // 7, 8: A
  // Mathematically, after point 0, we group in blocks of 2.
  // Let's analyze: (totalPointsPlayed + 1) / 2
  // For pt 0: (0+1)/2 = 0 -> A
  // For pt 1: (1+1)/2 = 1 -> B
  // For pt 2: (2+1)/2 = 1 -> B
  // For pt 3: (3+1)/2 = 2 -> A
  // For pt 4: (4+1)/2 = 2 -> A
  // For pt 5: (5+1)/2 = 3 -> B
  // For pt 6: (6+1)/2 = 3 -> B
  // If result is even, it's A (firstServer). If result is odd, it's B (otherServer).
  // Yes! The formula `Math.floor((totalPointsPlayed + 1) / 2) % 2 === 0` holds:
  // pt 0: floor(0.5)%2 = 0 -> firstServer
  // pt 1: floor(1.0)%2 = 1 -> otherServer
  // pt 2: floor(1.5)%2 = 1 -> otherServer
  // pt 3: floor(2.0)%2 = 0 -> firstServer
  // pt 4: floor(2.5)%2 = 0 -> firstServer
  // pt 5: floor(3.0)%2 = 1 -> otherServer
  // pt 6: floor(3.5)%2 = 1 -> otherServer
  const otherServer = firstServer === 1 ? 2 : 1;
  const cycleIndex = Math.floor((totalPointsPlayed + 1) / 2);
  return cycleIndex % 2 === 0 ? firstServer : otherServer;
}

// Check if the set win results in a match win, or if we need to start a new set
function checkSetOrMatchEnd(state: MatchState, setScorer: 1 | 2): MatchState {
  const setsToWin = state.config.setsToWin;

  if (state.player1Sets === setsToWin) {
    state.winner = 1;
    return state;
  }
  if (state.player2Sets === setsToWin) {
    state.winner = 2;
    return state;
  }

  // Check side swap at end of set (if games sum is odd)
  const completedSet = state.setScores[state.currentSetIndex];
  const totalGames = completedSet.player1Games + completedSet.player2Games;
  if (state.config.autoSideChange && totalGames % 2 !== 0) {
    state.courtSideSwapped = !state.courtSideSwapped;
  }

  // Match is not over, setup next set
  state.currentSetIndex += 1;
  state.setScores.push({ player1Games: 0, player2Games: 0 });

  // Determine if the new set is a Match Tie-Break (final set)
  // e.g. best of 3 sets, active set index is 2 (3rd set), and config says use match tie-break
  const isFinalSet = state.currentSetIndex === (setsToWin * 2 - 2);
  if (isFinalSet && state.config.useMatchTieBreakForFinalSet) {
    state.isMatchTieBreak = true;
    state.setScores[state.currentSetIndex].player1TieBreakPoints = 0;
    state.setScores[state.currentSetIndex].player2TieBreakPoints = 0;
  }

  // The first server of the new set is the one who did NOT serve first in the previous game/tiebreak?
  // Actually, standard tennis rule: The player who received service in the first game of the previous set
  // (or rather, the server rotation continues normally from the last game of the previous set).
  // In our engine, when a game/tiebreak ends, we've already set the correct server for the next point/game.
  // So state.server is already correct. We just record it as the first server of this set.
  state.firstServerOfActiveSet = state.server;

  return state;
}

// Toggle the court side manually (saves to history for undo compatibility)
export function toggleCourtSide(state: MatchState): MatchState {
  const historyCopy = [...state.history, copyStateForHistory(state)];
  return {
    ...state,
    courtSideSwapped: !state.courtSideSwapped,
    history: historyCopy,
  };
}

// Generate the speech text based on the match state
export function getScoreSpeechAnnouncement(state: MatchState, lastScorer?: 1 | 2): string {
  const lang = state.config.language || 'pt';

  // Translations dictionary
  const dict = {
    pt: {
      matchWon: (winner: string) => `Fim de jogo. Vitória de ${winner}!`,
      superTBAll: (pts: number) => `Super tie-break, ${pts} iguais`,
      superTB: (pts1: number, pts2: number) => `Super tie-break, ${pts1} a ${pts2}`,
      tbAll: (pts: number) => `Tie-break, ${pts} iguais`,
      tb: (pts1: number, pts2: number) => `Tie-break, ${pts1} a ${pts2}`,
      deuce: 'Iguais',
      advantage: (player: string) => `Vantagem ${player}`,
      love: 'zero',
      all: 'iguais',
      to: 'a',
      setWon: (winner: string, g1: number, g2: number, s1: number, s2: number) => 
        `Fim do set. Set para ${winner}, ${g1} a ${g2}. Placar em sets: ${s1} a ${s2}`,
      gameWon: (winner: string, g1: number, g2: number) => 
        `Jogo para ${winner}. Placar do set: ${g1} a ${g2}`,
    },
    en: {
      matchWon: (winner: string) => `Game, set and match, ${winner}!`,
      superTBAll: (pts: number) => `Super tie-break, ${pts} all`,
      superTB: (pts1: number, pts2: number) => `Super tie-break, ${pts1} to ${pts2}`,
      tbAll: (pts: number) => `Tie-break, ${pts} all`,
      tb: (pts1: number, pts2: number) => `Tie-break, ${pts1} to ${pts2}`,
      deuce: 'Deuce',
      advantage: (player: string) => `Advantage ${player}`,
      love: 'love',
      all: 'all',
      to: 'to',
      setWon: (winner: string, g1: number, g2: number, s1: number, s2: number) => 
        `Set won by ${winner}, ${g1} to ${g2}. Sets score: ${s1} to ${s2}`,
      gameWon: (winner: string, g1: number, g2: number) => 
        `Game for ${winner}. Set score: ${g1} to ${g2}`,
    },
    es: {
      matchWon: (winner: string) => `Fin del partido. ¡Victoria de ${winner}!`,
      superTBAll: (pts: number) => `Super tie-break, ${pts} iguales`,
      superTB: (pts1: number, pts2: number) => `Super tie-break, ${pts1} a ${pts2}`,
      tbAll: (pts: number) => `Tie-break, ${pts} iguales`,
      tb: (pts1: number, pts2: number) => `Tie-break, ${pts1} a ${pts2}`,
      deuce: 'Iguales',
      advantage: (player: string) => `Ventaja ${player}`,
      love: 'cero',
      all: 'iguales',
      to: 'a',
      setWon: (winner: string, g1: number, g2: number, s1: number, s2: number) => 
        `Fin del set. Set para ${winner}, ${g1} a ${g2}. Marcador de sets: ${s1} a ${s2}`,
      gameWon: (winner: string, g1: number, g2: number) => 
        `Juego para ${winner}. Marcador del set: ${g1} a ${g2}`,
    },
  };

  const t = dict[lang] || dict.pt;

  // If match is won
  if (state.winner !== null) {
    const winnerName = state.winner === 1 ? state.config.player1Name : state.config.player2Name;
    return t.matchWon(winnerName);
  }

  const activeSet = state.setScores[state.currentSetIndex];

  // If match tie-break
  if (state.isMatchTieBreak) {
    const p1TB = activeSet.player1TieBreakPoints || 0;
    const p2TB = activeSet.player2TieBreakPoints || 0;
    if (p1TB === p2TB) {
      return t.superTBAll(p1TB);
    }
    return t.superTB(p1TB, p2TB);
  }

  // If set tie-break
  if (state.isTieBreak) {
    const p1TB = activeSet.player1TieBreakPoints || 0;
    const p2TB = activeSet.player2TieBreakPoints || 0;
    if (p1TB === p2TB) {
      return t.tbAll(p1TB);
    }
    return t.tb(p1TB, p2TB);
  }

  // Normal game scores
  const { p1Display, p2Display } = getDisplayPoints(
    state.player1Points,
    state.player2Points,
    false,
    state.config.noAdScoring
  );

  // If game is completed
  if (lastScorer && state.player1Points === 0 && state.player2Points === 0) {
    const p1Games = activeSet.player1Games;
    const p2Games = activeSet.player2Games;

    if (p1Games === 0 && p2Games === 0 && state.currentSetIndex > 0) {
      const prevSet = state.setScores[state.currentSetIndex - 1];
      const p1Prev = prevSet.player1Games;
      const p2Prev = prevSet.player2Games;
      const setWinner = p1Prev > p2Prev ? state.config.player1Name : state.config.player2Name;
      return t.setWon(setWinner, p1Prev, p2Prev, state.player1Sets, state.player2Sets);
    }

    const gameWinner = lastScorer === 1 ? state.config.player1Name : state.config.player2Name;
    return t.gameWon(gameWinner, p1Games, p2Games);
  }

  // Normal point announce
  if (p1Display === '40' && p2Display === '40') {
    return t.deuce;
  }
  if (p1Display === 'AD') {
    return t.advantage(state.config.player1Name);
  }
  if (p2Display === 'AD') {
    return t.advantage(state.config.player2Name);
  }

  // Standard announce (e.g. "30 to 15", "15 all", "30 to love")
  const translatePoint = (pts: string) => {
    if (pts === '0') return t.love;
    return pts;
  };

  if (p1Display === p2Display) {
    return `${translatePoint(p1Display)} ${t.all}`;
  }

  return `${translatePoint(p1Display)} ${t.to} ${translatePoint(p2Display)}`;
}

export function calculateMatchStats(pointsHistory: PointHistoryEntry[]): MatchStats {
  const stats: MatchStats = {
    player1: { breakpointsWon: 0, breakpointsTotal: 0, serviceGamesWon: 0, serviceGamesTotal: 0, totalPointsWon: 0 },
    player2: { breakpointsWon: 0, breakpointsTotal: 0, serviceGamesWon: 0, serviceGamesTotal: 0, totalPointsWon: 0 },
  };

  if (!pointsHistory || pointsHistory.length === 0) {
    return stats;
  }

  // 1. Calculate total points and breakpoints
  for (const entry of pointsHistory) {
    if (entry.scorer === 1) stats.player1.totalPointsWon++;
    if (entry.scorer === 2) stats.player2.totalPointsWon++;

    if (entry.isBreakpoint && entry.breakpointPlayer) {
      const p = entry.breakpointPlayer;
      if (p === 1) {
        stats.player1.breakpointsTotal++;
        if (entry.isBreakpointConverted) {
          stats.player1.breakpointsWon++;
        }
      } else if (p === 2) {
        stats.player2.breakpointsTotal++;
        if (entry.isBreakpointConverted) {
          stats.player2.breakpointsWon++;
        }
      }
    }
  }

  // 2. Calculate service games won / total
  // Group points by setIndex and gameIndex
  const gamesMap = new Map<string, PointHistoryEntry[]>();
  for (const entry of pointsHistory) {
    const key = `${entry.setIndex}-${entry.gameIndex}`;
    if (!gamesMap.has(key)) {
      gamesMap.set(key, []);
    }
    gamesMap.get(key)!.push(entry);
  }

  for (const [key, entries] of gamesMap.entries()) {
    if (entries.length === 0) continue;
    
    // Skip if tie-break
    if (entries[0].isTieBreak) continue;

    const server = entries[0].server;
    const lastEntry = entries[entries.length - 1];
    const gameWinner = lastEntry.scorer;

    // Check if game was actually finished
    const isGameFinished = (lastEntry.scoreAfter.player1Points === 0 && lastEntry.scoreAfter.player2Points === 0) || 
                           (lastEntry.pointIndex === pointsHistory[pointsHistory.length - 1].pointIndex && 
                            (lastEntry.scoreAfter.player1Points >= 4 || lastEntry.scoreAfter.player2Points >= 4 || lastEntry.isBreakpointConverted));

    if (isGameFinished) {
      if (server === 1) {
        stats.player1.serviceGamesTotal++;
        if (gameWinner === 1) {
          stats.player1.serviceGamesWon++;
        }
      } else if (server === 2) {
        stats.player2.serviceGamesTotal++;
        if (gameWinner === 2) {
          stats.player2.serviceGamesWon++;
        }
      }
    }
  }

  return stats;
}
