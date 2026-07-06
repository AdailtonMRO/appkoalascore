export interface MultiplayerPlayer {
  id: string;
  name: string;
  totalWins: number; // For ranking
}

export interface MultiplayerTeam {
  players: MultiplayerPlayer[]; // 1 player for singles, 2 players for doubles
}

export interface MultiplayerSessionState {
  players: MultiplayerPlayer[]; // All registered players
  queue: string[]; // Queue of player IDs
  team1: MultiplayerTeam | null; // Active Team on Left
  team2: MultiplayerTeam | null; // Active Team on Right
  team1Games: number; // Current match games
  team2Games: number;
  team1Points: number; // Current game points (0, 1, 2, 3, etc.)
  team2Points: number;
  team1ConsecutiveWins: number; // Track consecutive match wins
  team2ConsecutiveWins: number;
  bestOfGames: 3 | 5; // Best of 3 (first to 2 games) or 5 (first to 3 games)
  mode: 'singles' | 'doubles';
  totalMatchesPlayed: number;
  history: string[]; // Stringified previous states for undo
}

// Format point values for display (0, 15, 30, 40, AD)
export function getMultiplayerDisplayPoints(
  p1: number,
  p2: number
): { p1Display: string; p2Display: string } {
  // Always use Gold Point (No-Ad scoring) as requested:
  // "sistema de jogo onde ha mais de 2 jogadores e querem todos jogar rápido"
  // Gold Point: at 3-3 (40-40), the next point wins.
  const pointsText = ['0', '15', '30', '40'];
  return {
    p1Display: pointsText[Math.min(p1, 3)],
    p2Display: pointsText[Math.min(p2, 3)],
  };
}

export function createInitialSession(
  playerNames: string[],
  mode: 'singles' | 'doubles',
  bestOfGames: 3 | 5
): MultiplayerSessionState {
  const players: MultiplayerPlayer[] = playerNames.map(name => ({
    id: Math.random().toString(36).substr(2, 9),
    name,
    totalWins: 0,
  }));

  // Perform initial random draw
  const shuffledIds = [...players].map(p => p.id).sort(() => Math.random() - 0.5);

  const teamSize = mode === 'singles' ? 1 : 2;
  const initialTeam1Ids = shuffledIds.splice(0, teamSize);
  const initialTeam2Ids = shuffledIds.splice(0, teamSize);

  const team1: MultiplayerTeam = {
    players: initialTeam1Ids.map(id => players.find(p => p.id === id)!)
  };

  const team2: MultiplayerTeam = {
    players: initialTeam2Ids.map(id => players.find(p => p.id === id)!)
  };

  return {
    players,
    queue: shuffledIds,
    team1,
    team2,
    team1Games: 0,
    team2Games: 0,
    team1Points: 0,
    team2Points: 0,
    team1ConsecutiveWins: 0,
    team2ConsecutiveWins: 0,
    bestOfGames,
    mode,
    totalMatchesPlayed: 0,
    history: [],
  };
}

export function saveMultiplayerHistory(state: MultiplayerSessionState): string[] {
  const { history, ...rest } = state;
  return [...history, JSON.stringify(rest)];
}

export function undoMultiplayer(state: MultiplayerSessionState): MultiplayerSessionState {
  if (state.history.length === 0) return state;
  const historyCopy = [...state.history];
  const prevStateStr = historyCopy.pop()!;
  const prevState = JSON.parse(prevStateStr);
  return {
    ...prevState,
    history: historyCopy,
  };
}

export function addPointMultiplayer(
  state: MultiplayerSessionState,
  scorerTeam: 1 | 2
): MultiplayerSessionState {
  const history = saveMultiplayerHistory(state);
  const newState = { ...state, history };

  if (scorerTeam === 1) {
    newState.team1Points += 1;
  } else {
    newState.team2Points += 1;
  }

  // Check game win
  // No-Ad scoring (Gold Point): first to reach 4 points wins the game (at 3-3, next wins)
  const targetPoints = 4;
  if (newState.team1Points >= targetPoints) {
    return winGameMultiplayer(newState, 1);
  } else if (newState.team2Points >= targetPoints) {
    return winGameMultiplayer(newState, 2);
  }

  return newState;
}

function winGameMultiplayer(
  state: MultiplayerSessionState,
  winnerTeam: 1 | 2
): MultiplayerSessionState {
  state.team1Points = 0;
  state.team2Points = 0;

  if (winnerTeam === 1) {
    state.team1Games += 1;
  } else {
    state.team2Games += 1;
  }

  // Check match win
  // Best of 3 games -> first to 2 games wins
  // Best of 5 games -> first to 3 games wins
  const gamesToWin = state.bestOfGames === 3 ? 2 : 3;

  if (state.team1Games >= gamesToWin) {
    return endMatchMultiplayer(state, 1);
  } else if (state.team2Games >= gamesToWin) {
    return endMatchMultiplayer(state, 2);
  }

  return state;
}

function endMatchMultiplayer(
  state: MultiplayerSessionState,
  winningTeamIndex: 1 | 2
): MultiplayerSessionState {
  state.totalMatchesPlayed += 1;

  const winnerTeam = winningTeamIndex === 1 ? state.team1! : state.team2!;
  const loserTeam = winningTeamIndex === 1 ? state.team2! : state.team1!;

  // 1. Increment total wins for each player in the winning team in the session
  state.players = state.players.map(p => {
    const isWinner = winnerTeam.players.some(wp => wp.id === p.id);
    if (isWinner) {
      return { ...p, totalWins: p.totalWins + 1 };
    }
    return p;
  });

  // Keep track of consecutive wins of the winner team
  const consecutiveWins = winningTeamIndex === 1 
    ? state.team1ConsecutiveWins + 1 
    : state.team2ConsecutiveWins + 1;

  // Loser team goes to the back of the queue
  const newQueue = [...state.queue, ...loserTeam.players.map(p => p.id)];

  // Prepare next match rotation
  const teamSize = state.mode === 'singles' ? 1 : 2;

  // Let's check if the winning team has reached 3 consecutive wins
  const reachedLimit = consecutiveWins >= 3;

  let nextTeam1: MultiplayerTeam | null = null;
  let nextTeam2: MultiplayerTeam | null = null;
  let finalQueue = newQueue;

  if (reachedLimit) {
    // Both teams rotate out! Winner goes to queue first (so they are after the loser of this match in the queue,
    // or rather, loser goes to queue first, then winner goes after them).
    // Let's push winner players to the queue
    finalQueue = [...finalQueue, ...winnerTeam.players.map(p => p.id)];

    // Pull next two teams from queue
    const team1Ids = finalQueue.splice(0, teamSize);
    const team2Ids = finalQueue.splice(0, teamSize);

    nextTeam1 = { players: team1Ids.map(id => state.players.find(p => p.id === id)!) };
    nextTeam2 = { players: team2Ids.map(id => state.players.find(p => p.id === id)!) };

    state.team1ConsecutiveWins = 0;
    state.team2ConsecutiveWins = 0;
  } else {
    // Only losing team rotates out. Winner stays on their side!
    // Next team enters from queue to play against the winner.
    const incomingIds = finalQueue.splice(0, teamSize);
    const nextIncomingTeam: MultiplayerTeam = {
      players: incomingIds.map(id => state.players.find(p => p.id === id)!)
    };

    if (winningTeamIndex === 1) {
      // Team 1 wins: Team 1 stays on left, next team goes to right (Team 2's side)
      nextTeam1 = winnerTeam;
      nextTeam2 = nextIncomingTeam;
      state.team1ConsecutiveWins = consecutiveWins;
      state.team2ConsecutiveWins = 0;
    } else {
      // Team 2 wins: Team 2 stays on right, next team goes to left (Team 1's side)
      nextTeam1 = nextIncomingTeam;
      nextTeam2 = winnerTeam;
      state.team1ConsecutiveWins = 0;
      state.team2ConsecutiveWins = consecutiveWins;
    }
  }

  state.team1 = nextTeam1;
  state.team2 = nextTeam2;
  state.queue = finalQueue;

  // Reset games and points
  state.team1Games = 0;
  state.team2Games = 0;
  state.team1Points = 0;
  state.team2Points = 0;

  return state;
}

// Skip a player in the queue (move them to the end of the queue)
export function skipPlayerInQueue(
  state: MultiplayerSessionState,
  playerId: string
): MultiplayerSessionState {
  const history = saveMultiplayerHistory(state);
  const newState = { ...state, history };

  const index = newState.queue.indexOf(playerId);
  if (index !== -1) {
    newState.queue.splice(index, 1);
    newState.queue.push(playerId);
  }
  return newState;
}

// Remove a player from the session entirely
export function removePlayerFromSession(
  state: MultiplayerSessionState,
  playerId: string
): MultiplayerSessionState {
  const history = saveMultiplayerHistory(state);
  const newState = { ...state, history };

  // Remove from players array
  newState.players = newState.players.filter(p => p.id !== playerId);

  // Remove from queue
  newState.queue = newState.queue.filter(id => id !== playerId);

  // Check if player is active on court. If they are, we must rotate them out.
  const inTeam1 = newState.team1?.players.some(p => p.id === playerId);
  const inTeam2 = newState.team2?.players.some(p => p.id === playerId);

  if (inTeam1 || inTeam2) {
    // Force end of match where the OTHER team wins to trigger normal rotation
    return endMatchMultiplayer(newState, inTeam1 ? 2 : 1);
  }

  return newState;
}

// Add a new player to the session
export function addPlayerToSession(
  state: MultiplayerSessionState,
  name: string
): MultiplayerSessionState {
  const history = saveMultiplayerHistory(state);
  const newState = { ...state, history };

  const newPlayer: MultiplayerPlayer = {
    id: Math.random().toString(36).substr(2, 9),
    name,
    totalWins: 0,
  };

  newState.players.push(newPlayer);
  newState.queue.push(newPlayer.id);

  return newState;
}
