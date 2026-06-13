import { Component } from '@angular/core';
import { Match, Teammate } from '../match';
import { Player } from '../../players/player';
import { CommonModule } from '@angular/common';
import { PlayerService } from '../../players/player.service';
import { MatchService } from '../match.service';
import { XorShift } from '../../shared/random/xorshift';
import { Status } from '../../players/status';
import { BillComponent } from '../../bill/bill.component';
import { SettingService } from '../../settings/setting.service';

enum COURT_STATUS {
  AVAILABLE = 'available',
  PLAYING = 'playing',
  DONE = 'done',
}
enum PLAYER_STATUS {
  READY = 'ready',
  BREAK = 'break',
  SELECTED = 'selected',
}
const PLAYERS_PER_COURT = 4;
const TEAMS_PER_COURT = 2;
const DEFAULT_TOTAL_COURT = 2;
const DEFAULT_PLAYER_POINT = 0.5;
@Component({
  selector: 'app-match-list',
  standalone: true,
  imports: [CommonModule, BillComponent],
  templateUrl: './match-list.component.html',
  styleUrl: './match-list.component.css',
})
export class MatchListComponent {
  status: Status = new Status();
  matchList: Match[] = [];
  matchHistory: Match[] = [];
  standbyList: Player[] = [];
  playersMap = new Map<string, Player>();
  playersOpponents = new Map<string, string[]>();
  logData: String[] = [];
  rng = new XorShift();
  totalCourt = DEFAULT_TOTAL_COURT;
  playerStatus = PLAYER_STATUS;
  courtStatus = COURT_STATUS;
  forceMatchTeamate: {player1:string, player2: string}[] = [];
  nemesisTeamate: {player1:string, player2: string}[] = [];

  constructor(private playerService: PlayerService, private matchService: MatchService, private settingService: SettingService) {
    this.playersMap = this.playerService.loadPlayerList();
    this.log('playersMap: ', this.playersMap);
    this.matchHistory = this.matchService.loadMatchHistory();
    this.playersOpponents = this.matchService.loadPlayerOpponents();
    this.log(`playersOpponents:`);
    this.log(this.playersOpponents);
    this.matchList = this.matchService.loadMatchList();
    this.log(`matchList: ${this.matchList}`);
    this.log(this.matchList);
    if (this.matchList.length <= 0) {
      for (let i = 0; i < this.totalCourt; i++) {
        this.addCourt();
      }
    }
    this.reloadStandbyList();
    this.status = this.playerService.loadPlayerStatus();
    this.rng = new XorShift();
    this.forceMatchTeamate = this.settingService.loadForceTeamates();
    this.nemesisTeamate = this.settingService.loadNemesisTeamates();
    this.log(`forceMatchTeamate: ${this.forceMatchTeamate.flatMap(each => [each.player1, each.player2])}`)
    this.log(`nemesisTeamate: ${this.nemesisTeamate.flatMap(each => [each.player1, each.player2])}`)
  }

// ================================================================================
// PUBLIC METHODS (Template Callable)
// ================================================================================


  // UI Helper ==============================
  getPlayerList(): Player[] {
    return Array.from(this.playersMap.values());
  }
  getMatchTime(match: Match): String {
    return new Date(match.matchTime).toLocaleTimeString();
  }
  getOpponentHistory(): {name: string, opponents: string[]}[] {
    return Array.from(this.playersOpponents.entries()).map(([key, values]) => ({name: key, opponents: values})) 
  }

  // Court Management  ======================
  addCourt() {
    let newMatch = new Match();
    newMatch.courtNo = this.matchList.length+1
    this.clearCourt(newMatch);
    this.matchList.push(newMatch);
    this.matchService.saveMatchList(this.matchList);
  }
  deleteCourt(matchIdx: number) {
    let deletedMatch = this.matchList.splice(matchIdx, 1);
    this.log(`deleteCourt: ${deletedMatch[0]}`);
    this.matchService.saveMatchList(this.matchList);
    this.reloadStandbyList();
  }
  confirmCourts() {
    this.log('CONFIRM_COURT start...');
    // this.log('confirmCourt:', this.matchList)
    this.matchList.forEach((court) => {
      this.confirmCourt(court);
    });
    this.confirmPlayersWait();
    this.status = this.playerService.revalidateStatus(
      this.status,
      this.playersMap
    );
    this.matchService.saveMatchList(this.matchList);
    this.log('CONFIRM_COURT end...');
  }
  freeCourt(currentCourt: Match) {
    this.log('FREE_COURT start...');
    if (currentCourt.status !== COURT_STATUS.AVAILABLE
      && currentCourt.whoWon === ''
    ) {
    this.log('cannot free court, still didnt have a winner');
      return;
    }
    if (currentCourt.status === COURT_STATUS.PLAYING) {
      currentCourt.status = COURT_STATUS.DONE
      this.matchHistory = this.matchService.updateMatchHistory(currentCourt);
      this.playersMap = this.confirmPlayersInCourt(this.playersMap, currentCourt);
      this.playersOpponents = this.matchService.loadPlayerOpponents();
    }
    currentCourt.status = COURT_STATUS.AVAILABLE;
    this.clearCourt(currentCourt);
    this.matchService.saveMatchList(this.matchList);
    this.reloadStandbyList();
    this.log('FREE_COURT end...');
  }
  swapTeamates(match: Match) {
    if (match.status == COURT_STATUS.PLAYING) return;
    let tmpTeamBPlayer2 = match.teamB.player2;
    match.teamB.player2 = match.teamA.player2;
    match.teamA.player2 = match.teamB.player1;
    match.teamB.player1 = tmpTeamBPlayer2;
  }

  // Player management ======================
  setPlayerStatus(name: string, status: PLAYER_STATUS) {
    let player = this.playersMap.get(name);
    if (!player) return;
    player.status = status;
    this.log(`player: ${name} ${status}`);
    this.playersMap.set(player.name, player);
    this.playerService.savePlayerList(this.playersMap);
  }

  changePlayerStatus(name: string) {
    // this.log('CHANGE_PLAYER_STATUS start...')
    let player = this.playersMap.get(name);
    if (!player) {
      this.log(`error not found player ${name}`);
      return;
    }
    if (player.status === PLAYER_STATUS.READY) {
      player.status = PLAYER_STATUS.BREAK;
      this.log(`player: ${name} break`);
    } else if (player.status === PLAYER_STATUS.BREAK) {
      player.status = PLAYER_STATUS.SELECTED;
      this.log(`player: ${name} selected`);
    } else {
      player.status = PLAYER_STATUS.READY;
      this.log(`player: ${name} ready`);
    }
    this.playersMap.set(player.name, player);
    this.playerService.savePlayerList(this.playersMap);
    // this.log('CHANGE_PLAYER_STATUS end ...')
  }

  // Shuffle Logic ==========================
  shufflePlayersIntoCourt() {
    this.log('SHUFFLE start...');

    const availablePlayerList = this.getAvailablePlayerList();
    let totalAvailableSlots = this.getTotalAvailableSlotsInCourts();
    if (totalAvailableSlots <= 0) return;

    const sortedPlayerList = this.getSortedPlayerList(availablePlayerList);
    totalAvailableSlots = this.recalculateTotalAvailableSlots(totalAvailableSlots, sortedPlayerList.length);
    const eligiblePlayers = this.getAvailablePlayers(sortedPlayerList, totalAvailableSlots);

    const mode = this.resolveMode();
    this.log(`SHUFFLE mode: ${mode}`);

    let teamateList: Teammate[];
    if (mode === 'balanced') {
      const result = this.shuffleBalanced(eligiblePlayers);
      if (result === null) {
        this.log('Balanced fallback → novel (no same-rank partners available)');
        teamateList = this.shuffleNovel(eligiblePlayers);
      } else {
        teamateList = result;
      }
    } else if (mode === 'mixed') {
      teamateList = this.shuffleMixed(eligiblePlayers);
    } else {
      teamateList = this.shuffleNovel(eligiblePlayers);
    }

    const resultCourt = this.calculateMatchInCourtsRankBased(teamateList);
    this.log('resultCourt', resultCourt.map(e =>
      `[${e.team1.player1.name}:${e.team1.player2.name}] vs [${e.team2.player1.name}:${e.team2.player2.name}]`
    ));

    this.putPlayerIntoCourts(resultCourt, mode);
    this.reloadStandbyList();
    this.log('SHUFFLE end.');
  }

  //Confirm Winning Team
  onClickConfirmWinningTeam(match: Match, whichTeam: string) {
    if (match.status != COURT_STATUS.PLAYING){
      return;
    }
    let wonMatchId = `${match.courtNo}:${new Date(match.matchTime).getTime()}`;
    match.whoWon = whichTeam;
    console.log(`Winning team of a match ${wonMatchId} is ${whichTeam}`)

    let playerName1 = whichTeam === 'teamA'? match.teamA.player1.name: match.teamB.player1.name;
    let playerName2 = whichTeam === 'teamA'? match.teamA.player2.name: match.teamB.player2.name;
    let player1 = this.playersMap.get(playerName1);
    let player2 = this.playersMap.get(playerName2);
    if(!player1) {
      this.log(`error not found player ${playerName1}`);
      return;
    }
    if(!player2) {
      this.log(`error not found player ${playerName2}`);
      return;
    }
    if (player1.lastWonMatch !== wonMatchId) {
      player1.roundsWon += 1
      player1.lastWonMatch = wonMatchId;
      this.playersMap.set(playerName1, player1);
    }
    if (player2.lastWonMatch !== wonMatchId) {
      player2.roundsWon += 1
      player2.lastWonMatch = wonMatchId;
      this.playersMap.set(playerName2, player2);
     }
    console.log(`Won: ${player1.name}: ${player1.roundsWon}, ${player2.name}: ${player2.roundsWon}`);


    let lostPlayerName1 = whichTeam === 'teamB'? match.teamA.player1.name: match.teamB.player1.name;
    let lostPlayerName2 = whichTeam === 'teamB'? match.teamA.player2.name: match.teamB.player2.name;
    let lostPlayer1 = this.playersMap.get(lostPlayerName1);
    let lostPlayer2 = this.playersMap.get(lostPlayerName2);
    if(!lostPlayer1) {
      this.log(`error not found lost player ${lostPlayerName1}`);
      return;
    }
    if(!lostPlayer2) {
      this.log(`error not found lost player ${lostPlayerName2}`);
      return;
    }
    if (lostPlayer1.lastWonMatch === wonMatchId) {
      lostPlayer1.roundsWon -= 1;
      lostPlayer1.lastWonMatch = '';
      this.playersMap.set(lostPlayerName1, lostPlayer1);
    }
    if (lostPlayer2.lastWonMatch === wonMatchId) {
      lostPlayer2.roundsWon -= 1;
      lostPlayer2.lastWonMatch = '';
      this.playersMap.set(lostPlayerName2, lostPlayer2);
    }
    console.log(`Lost: ${lostPlayer1.name}: ${lostPlayer1.roundsWon}, ${lostPlayer2.name}: ${lostPlayer2.roundsWon}`);

    this.playerService.savePlayerList(this.playersMap);
    this.matchService.saveMatchList(this.matchList);
  }

  // Others =================================
  shareGuestUrl() {
    const eventKey = `root-event:${new Date().toLocaleDateString()}`;
    const url = `${window.location.origin}/guest/event/${encodeURIComponent(eventKey)}/matches`;
    if (navigator.share) {
      navigator.share({ title: 'Badminton Match', url });
    } else {
      navigator.clipboard.writeText(url).then(() => alert('Link copied!'));
    }
  }

  downloadLog() {
    const logData = this.logData.join('\n');
    const blob = new Blob([logData], { type: 'text' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'badminton-debug.log';
    link.click();
    window.URL.revokeObjectURL(url);
  }


// ================================================================================
// PRIVATE METHODS (Internal Helpers)
// ================================================================================

  // === Stand by list reload =================
  private reloadStandbyList() {
    let playingPlayers = this.matchList.flatMap((each) => [
      each.teamA.player1?.name || '',
      each.teamA.player2?.name || '',
      each.teamB.player1?.name || '',
      each.teamB.player2?.name || '',
    ]);
    this.log(`reloadStandbyList: ${this.matchList[0]}: ${this.matchList[1]}`);
    this.standbyList = Array.from(this.playersMap.values()).filter(
      (each) => !playingPlayers.includes(each.name)
    );
    this.log('standbyList: ', this.standbyList);
  }


  // === Add/Clear Court Operations ===========
  private clearCourt(currentCourt: Match) {
    currentCourt.status = 'available';
    currentCourt.teamA.player1 = new Player('');
    currentCourt.teamA.player2 = new Player('');
    currentCourt.teamB.player1 = new Player('');
    currentCourt.teamB.player2 = new Player('');
    currentCourt.whoWon = '';
  }

  // === Confirm Court Operations =============
  private confirmCourt(court: Match) {
    this.log('court.status:', court);
    if (court.status === COURT_STATUS.PLAYING) {
      return;
    }
    if (
      !court.teamA.player1.name ||
      !court.teamA.player2.name ||
      !court.teamB.player1.name ||
      !court.teamB.player2.name
    ) {
      this.log('error: court is not full');
      return;
    }
    court.matchTime = new Date();
    court.status = COURT_STATUS.PLAYING;
    this.log('set court.status to playing', court);

    let confirmedPlayerNames = [
      court.teamA.player1?.name || '',
      court.teamA.player2?.name || '',
      court.teamB.player1?.name || '',
      court.teamB.player2?.name || '',
    ];
    this.playersMap = this.confirmPlayersPlay(
      this.playersMap,
      confirmedPlayerNames
    );
    this.matchHistory = this.matchService.addMatchHistory(court);
  }
  private confirmPlayersWait() {
    let playingPlayersName = this.matchList
      .filter((each) => each.status === COURT_STATUS.PLAYING)
      .flatMap((each) => [
        each.teamA.player1.name,
        each.teamA.player2.name,
        each.teamB.player1.name,
        each.teamB.player2.name,
      ]);
    let currentStandbyList = Array.from(this.playersMap.values())
      .filter((each) => !playingPlayersName.includes(each.name))
      .map((each) => each.name);
    let logData: string[] = [];
    currentStandbyList.forEach((name) => {
      let player = this.playersMap.get(name);
      if (!player) {
        player = new Player(name);
      }
      if (player.status === PLAYER_STATUS.BREAK) {
        player.roundsWaited = 0;
      } else {
        player.roundsWaited += 1;
      }
      logData.push(`${name}:${player.roundsWaited}`);
      this.playersMap.set(name, player);
    });
    this.log(`player waited: \n`, logData.join(', '));
    this.playerService.savePlayerList(this.playersMap);
  }
  private confirmPlayersPlay(
    playerMap: Map<string, Player>,
    names: string[]
  ): Map<string, Player> {
    names.forEach((name) => {
      let player = this.playersMap.get(name);
      if (!player) {
        player = new Player(name);
      }
      player.totalRoundsPlayed += 1;
      player.actualTotalRoundsPlayed += 1;
      player.status = PLAYER_STATUS.READY;
      playerMap.set(name, player);
    });
    this.log(`players played: \n`, names.join(', '));
    this.playerService.savePlayerList(playerMap);
    return playerMap;
  }
  private confirmPlayersInCourt(
    playerMap: Map<string, Player>,
    court: Match
  ): Map<string, Player> {
    playerMap = this.confirmPlayersTeamate(playerMap, court.teamA);
    playerMap = this.confirmPlayersTeamate(playerMap, court.teamB);
    this.playerService.savePlayerList(playerMap);
    return playerMap;
  }
  private confirmPlayersTeamate(
    playerMap: Map<string, Player>,
    team: Teammate
  ): Map<string, Player> {
    this.log('confirmedTeamate: ', team);
    playerMap = this.confirmEachPlayerTeamate(
      playerMap,
      team.player1.name,
      team.player2.name
    );
    playerMap = this.confirmEachPlayerTeamate(
      playerMap,
      team.player2.name,
      team.player1.name
    );
    return playerMap;
  }
  private confirmEachPlayerTeamate(
    playerMap: Map<string, Player>,
    playerName1: string,
    playerName2: string
  ): Map<string, Player> {
    let player1 = playerMap.get(playerName1);
    if (!player1) {
      return playerMap;
    }
    player1.teamateHistory = [...player1.teamateHistory, playerName2];
    playerMap.set(player1.name, player1);
    return playerMap;
  }


  // === Shuffle players Operations ============
  private getAvailablePlayerList() {
    let playingPlayers = this.matchList
      .filter((each) => each.status === COURT_STATUS.PLAYING)
      .flatMap((each) => [
        each.teamA.player1.name,
        each.teamA.player2.name,
        each.teamB.player1.name,
        each.teamB.player2.name,
      ]);
    this.log('playingPlayers:', playingPlayers);
    let initialPlayerList: Player[] = Array.from(this.playersMap.values())
      .filter((each) => !playingPlayers.includes(each.name))
      .filter((each) => each.status !== PLAYER_STATUS.BREAK);
    this.log(
      `initialPlayerList: ${initialPlayerList.flatMap((each) => {
        return each.name, each.status;
      })}`
    );
    return initialPlayerList;
  }
  private getTotalAvailableSlotsInCourts() {
    let totalAvailableSlots = 0;
    this.matchList.forEach((each) => {
      if (each.status === COURT_STATUS.AVAILABLE) {
        totalAvailableSlots += PLAYERS_PER_COURT;
      }
    });
    this.log('totalAvailableSlots: ', totalAvailableSlots);
    return totalAvailableSlots;
  }
  private getSortedPlayerList(availablePlayerList: Player[]) {
    let sortedPlayerList = this.sortByPoint(availablePlayerList, p => this.calculatePlayerPriorityPoint(p));
    this.log(
      'shufflePlayersIntoCourt:',
      sortedPlayerList.map((each) => {
        return `${each.name}: ${this.calculatePlayerPriorityPoint(each)} [${
          each.totalRoundsPlayed
        }]`;
      })
    );
    return sortedPlayerList;
  }
  private calculatePlayerPriorityPoint(player: Player): number {
    const multiplier_rounds_played = 1;
    if (player.status === PLAYER_STATUS.SELECTED) {
      return -1;
    }
    return (multiplier_rounds_played * player.totalRoundsPlayed || 0) - 0;
  }
  private recalculateTotalAvailableSlots(currentTotalAvailableSlot:number, sortedPlayerListLength: number) {
    let maxPlayersCanBePutIntoCourt = Math.floor(sortedPlayerListLength / PLAYERS_PER_COURT) * PLAYERS_PER_COURT;
    if (currentTotalAvailableSlot > maxPlayersCanBePutIntoCourt) {
      currentTotalAvailableSlot = maxPlayersCanBePutIntoCourt;
    }
    this.log('totalAvailableSlots: ', currentTotalAvailableSlot);
    return currentTotalAvailableSlot;
  }
  private getAvailablePlayers(players: Player[], totalAvailableSlots: number) {
    let returnPlayerList = [...players];
    let playerNameList = players.map(each => each.name);
    // let selectedPlayers = players.slice(0, totalAvailableSlots);
    this.forceMatchTeamate.forEach(each => {
      let indexPlayer1 = playerNameList.indexOf(each.player1);
      let indexPlayer2 = playerNameList.indexOf(each.player2);
      if (indexPlayer1 <= 0 || indexPlayer2 <= 0) {
        return;
      }
      if (indexPlayer1 >= totalAvailableSlots && indexPlayer2 >= totalAvailableSlots) {
        return;
      }
      if ((indexPlayer1 >= totalAvailableSlots) || (indexPlayer2 >= totalAvailableSlots)) {
        let player1 = players[indexPlayer1];
        let player2 = players[indexPlayer2];
        returnPlayerList = returnPlayerList.filter(player => (player.name != each.player1) && (player.name != each.player2));
        returnPlayerList = [player1, player2, ...returnPlayerList.slice(0,totalAvailableSlots-1)];
      }
    })
    return returnPlayerList.slice(0, totalAvailableSlots);
  }
  // === Mode Resolution =============================
  private resolveMode(): 'balanced' | 'mixed' | 'novel' {
    const saved = this.settingService.loadShuffleMode();
    if (saved !== 'auto') return saved;
    const weights = this.settingService.loadShuffleModeWeights();
    const roll = this.rng.random() * 100;
    if (roll < weights.balanced) return 'balanced';
    if (roll < weights.balanced + weights.mixed) return 'mixed';
    return 'novel';
  }

  // === Effective Rank ==============================
  // Lower = stronger. Win-rate can shift a player up to 2 full rank positions,
  // so a high-win-rate lower-ranked player can naturally fall into a better quad.
  private effectiveRank(player: Player): number {
    const rank = player.rank ?? 5;
    const winRate = (player.roundsWon + 1) / (player.actualTotalRoundsPlayed + 2);
    return rank * 1000 - winRate * 2000;
  }

  // === Constraint Helpers ==========================
  private getForceTeamatesMap(): Map<string, string> {
    const map = new Map<string, string>();
    this.forceMatchTeamate.forEach(pair => {
      map.set(pair.player1, pair.player2);
      map.set(pair.player2, pair.player1);
    });
    return map;
  }

  private getNemesisSet(): Set<string> {
    const set = new Set<string>();
    this.nemesisTeamate.forEach(pair => {
      set.add(`${pair.player1}:${pair.player2}`);
      set.add(`${pair.player2}:${pair.player1}`);
    });
    return set;
  }

  private isNemesisPair(a: string, b: string, nemesisSet: Set<string>): boolean {
    return nemesisSet.has(`${a}:${b}`);
  }

  // Returns true when playerA and playerB paired too recently relative to the pool.
  // Formula mirrors old isAllTeamatesValid: elapsed rounds must be ≥ (totalPlayers - offset).
  // offset grows with each retry phase, progressively relaxing the constraint.
  private isRecentTeammatePair(
    playerA: Player,
    playerB: Player,
    totalPlayers: number,
    offset: number
  ): boolean {
    const lastIdx = playerA.teamateHistory.lastIndexOf(playerB.name);
    if (lastIdx < 0) return false;
    const requiredCooldown = Math.max(1, totalPlayers - offset);
    return (playerA.totalRoundsPlayed - lastIdx) < requiredCooldown;
  }

  // Pair force teammates first (shared by all modes)
  private lockForcePairs(players: Player[], forceMap: Map<string, string>, used: Set<string>, pairs: Teammate[]) {
    const sorted = [...players].sort((a, b) => this.effectiveRank(a) - this.effectiveRank(b));
    for (const player of sorted) {
      if (used.has(player.name)) continue;
      const forcedName = forceMap.get(player.name);
      if (!forcedName) continue;
      const partner = players.find(p => p.name === forcedName);
      if (partner && !used.has(partner.name)) {
        pairs.push({ player1: player, player2: partner });
        used.add(player.name);
        used.add(partner.name);
      }
    }
  }

  // === Mode A — Balanced ============================
  // Sort all eligible players by effectiveRank, group into quads of 4.
  // Within each quad, pair players so no partner pair exceeds 3 raw rank apart.
  // A lower-ranked player with a high win-rate sorts into a higher-skill quad
  // automatically via effectiveRank.
  // Interleaved assignment: player at sorted position i goes to quad i % numQuads.
  // For 8 players / 2 quads: Quad 0 = positions [0,2,4,6], Quad 1 = [1,3,5,7].
  // This guarantees each quad spans the full skill range instead of clustering
  // the bottom rank tier together when many same-rank players are in the pool.
  private shuffleBalanced(players: Player[]): Teammate[] | null {
    const totalPlayers = players.length;
    const numQuads = Math.floor(players.length / 4);
    const sorted = [...players].sort((a, b) => this.effectiveRank(a) - this.effectiveRank(b));
    const forceMap = this.getForceTeamatesMap();
    const nemesisSet = this.getNemesisSet();
    const pairs: Teammate[] = [];

    for (let qi = 0; qi < numQuads; qi++) {
      // Interleaved positions are already in ascending effectiveRank order — no re-sort needed
      const q = [0, 1, 2, 3].map(k => sorted[qi + k * numQuads]);
      const quadPair = this.formQuadPairs(q, forceMap, nemesisSet, totalPlayers);
      if (!quadPair) return null;
      pairs.push(quadPair[0], quadPair[1]);
    }
    return pairs;
  }

  // Within a quad of 4 players (sorted best→worst by effectiveRank):
  // Pass 0: rank ≤3, not nemesis, AND not recently paired — prevents deterministic repeat pairings.
  // Pass 1: rank ≤3, not nemesis (recency relaxed).
  // Pass 2: not nemesis only (rank and recency both relaxed).
  // Returns null only when every option is blocked by a nemesis conflict.
  private formQuadPairs(
    q: Player[],
    forceMap: Map<string, string>,
    nemesisSet: Set<string>,
    totalPlayers: number
  ): [Teammate, Teammate] | null {
    const MAX_RANK_DIFF = 3;
    const RECENCY_OFFSET = 1; // strict: cooldown = totalPlayers-1 rounds

    // Detect any force pair inside this quad
    for (let a = 0; a < 4; a++) {
      const forcedName = forceMap.get(q[a].name);
      if (!forcedName) continue;
      const b = q.findIndex((p, idx) => idx !== a && p.name === forcedName);
      if (b < 0) continue;
      // Force pair found at indices a and b; remaining two form the other team
      const rest = q.filter((_, idx) => idx !== a && idx !== b);
      if (this.isNemesisPair(rest[0].name, rest[1].name, nemesisSet)) return null;
      return [
        { player1: q[a], player2: q[b] },
        { player1: rest[0], player2: rest[1] },
      ];
    }

    // [0,3] vs [1,2]: (best+worst) vs (2nd+3rd) → most equal team strength
    // [0,2] vs [1,3]: (best+3rd) vs (2nd+worst)
    // [0,1] vs [2,3]: (best+2nd) vs (3rd+worst) → least balanced teams, last resort
    const options: [[number, number], [number, number]][] = [
      [[0, 3], [1, 2]],
      [[0, 2], [1, 3]],
      [[0, 1], [2, 3]],
    ];

    // Priority order — rank diversity always beats recency freshness:
    // Pass A: rank ≤3, not nemesis, not recent, cross-rank (rd > 0 for both pairs)  ← best
    // Pass B: rank ≤3, not nemesis,             cross-rank (recency relaxed)
    // Pass C: rank ≤3, not nemesis, not recent  (same-raw-rank allowed)
    // Pass D: rank ≤3, not nemesis              (recency also relaxed)
    // Pass E: not nemesis only                  (rank + recency both relaxed)
    type CheckFn = (ai: number, bi: number, ci: number, di: number) => boolean;
    const rd = (a: number, b: number) => Math.abs((q[a].rank ?? 5) - (q[b].rank ?? 5));
    const nem = (a: number, b: number) => this.isNemesisPair(q[a].name, q[b].name, nemesisSet);
    const recent = (a: number, b: number) => this.isRecentTeammatePair(q[a], q[b], totalPlayers, RECENCY_OFFSET);

    const tryOptions = (accept: CheckFn): [Teammate, Teammate] | null => {
      for (const [[ai, bi], [ci, di]] of options) {
        if (accept(ai, bi, ci, di)) {
          return [
            { player1: q[ai], player2: q[bi] },
            { player1: q[ci], player2: q[di] },
          ];
        }
      }
      return null;
    };

    return (
      tryOptions((ai,bi,ci,di) => rd(ai,bi)>0 && rd(ai,bi)<=MAX_RANK_DIFF && rd(ci,di)>0 && rd(ci,di)<=MAX_RANK_DIFF && !nem(ai,bi) && !nem(ci,di) && !recent(ai,bi) && !recent(ci,di)) ??
      tryOptions((ai,bi,ci,di) => rd(ai,bi)>0 && rd(ai,bi)<=MAX_RANK_DIFF && rd(ci,di)>0 && rd(ci,di)<=MAX_RANK_DIFF && !nem(ai,bi) && !nem(ci,di)) ??
      tryOptions((ai,bi,ci,di) => rd(ai,bi)<=MAX_RANK_DIFF && rd(ci,di)<=MAX_RANK_DIFF && !nem(ai,bi) && !nem(ci,di) && !recent(ai,bi) && !recent(ci,di)) ??
      tryOptions((ai,bi,ci,di) => rd(ai,bi)<=MAX_RANK_DIFF && rd(ci,di)<=MAX_RANK_DIFF && !nem(ai,bi) && !nem(ci,di)) ??
      tryOptions((ai,bi,ci,di) => !nem(ai,bi) && !nem(ci,di)) ??
      null
    );
  }

  // === Mode B — Mixed (top↔bottom) ==================
  private shuffleMixed(players: Player[]): Teammate[] {
    const sorted = [...players].sort((a, b) => this.effectiveRank(a) - this.effectiveRank(b));
    const forceMap = this.getForceTeamatesMap();
    const used = new Set<string>();
    const pairs: Teammate[] = [];

    this.lockForcePairs(players, forceMap, used, pairs);

    const remaining = sorted.filter(p => !used.has(p.name));
    let lo = 0;
    let hi = remaining.length - 1;
    while (lo < hi) {
      pairs.push({ player1: remaining[lo], player2: remaining[hi] });
      lo++;
      hi--;
    }
    return pairs;
  }

  // === Mode C — Novel (prioritise never-met) ========
  // 10 attempts divided into 3 phases of progressive relaxation (same formula as old isAllTeamatesValid):
  //   attempts 0-2: offset=1 (strict cooldown = totalPlayers-1 rounds)
  //   attempts 3-5: offset=2 (medium)
  //   attempts 6-8: offset=3 (relaxed)
  //   attempt  9:   offset=4 (very relaxed)
  // Each attempt hard-rejects recently-paired candidates first; falls back to soft-penalty-only
  // when hard-rejection empties the candidate list (small saturated pools).
  private shuffleNovel(players: Player[]): Teammate[] {
    const maxRetries = 10;
    const totalPlayers = players.length;
    const forceMap = this.getForceTeamatesMap();
    const nemesisSet = this.getNemesisSet();
    let bestPairs: Teammate[] = [];
    let bestScore = Infinity;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const offset = Math.ceil((attempt + 1) / 3);
      const shuffled = this.sortByPoint(players, () => this.rng.random());
      const used = new Set<string>();
      const pairs: Teammate[] = [];
      let totalScore = 0;
      let failed = false;

      this.lockForcePairs(players, forceMap, used, pairs);
      pairs.forEach(p => { totalScore += this.noveltyScore(p.player1, p.player2, totalPlayers); });

      for (const player of shuffled) {
        if (used.has(player.name)) continue;

        // Primary: exclude nemesis AND recently-paired (hard rejection)
        const strictCandidates = shuffled
          .filter(p =>
            !used.has(p.name) && p.name !== player.name &&
            !this.isNemesisPair(player.name, p.name, nemesisSet) &&
            !this.isRecentTeammatePair(player, p, totalPlayers, offset)
          )
          .sort((a, b) => this.noveltyScore(player, a, totalPlayers) - this.noveltyScore(player, b, totalPlayers));

        // Fallback: drop recency constraint when hard rejection empties candidates
        const candidates = strictCandidates.length > 0 ? strictCandidates :
          shuffled
            .filter(p =>
              !used.has(p.name) && p.name !== player.name &&
              !this.isNemesisPair(player.name, p.name, nemesisSet)
            )
            .sort((a, b) => this.noveltyScore(player, a, totalPlayers) - this.noveltyScore(player, b, totalPlayers));

        if (candidates.length === 0) { failed = true; break; }
        const partner = candidates[0];
        pairs.push({ player1: player, player2: partner });
        used.add(player.name);
        used.add(partner.name);
        totalScore += this.noveltyScore(player, partner, totalPlayers);
      }

      if (!failed && totalScore < bestScore) {
        bestScore = totalScore;
        bestPairs = pairs;
      }
    }
    return bestPairs;
  }

  // Penalty scales with how recently they paired relative to pool size.
  // 8-player pool + paired 2 rounds ago → max(0, 8-2)*100 = 600.
  // Same pairing in 4-player pool → max(0, 4-2)*100 = 200.
  // Penalty = 0 when elapsed rounds ≥ totalPlayers.
  private noveltyScore(playerA: Player, playerB: Player, totalPlayers: number): number {
    const lastIdx = playerA.teamateHistory.lastIndexOf(playerB.name);
    const teammatePenalty = lastIdx >= 0
      ? Math.max(0, totalPlayers - (playerA.totalRoundsPlayed - lastIdx)) * 100
      : 0;
    const opponentList = this.playersOpponents.get(playerA.name) ?? [];
    const opponentPenalty = opponentList.includes(playerB.name)
      ? opponentList.length - opponentList.lastIndexOf(playerB.name)
      : 0;
    return teammatePenalty + opponentPenalty;
  }

  // === Court Pairing (rank-sum balanced) ============
  private calculateMatchInCourtsRankBased(teamateList: Teammate[]): {team1: Teammate, team2: Teammate}[] {
    const result: {team1: Teammate, team2: Teammate}[] = [];
    let remaining = [...teamateList];

    while (remaining.length > 1) {
      const currentTeam = remaining[0];
      const rest = remaining.slice(1);
      const currentRankSum = (currentTeam.player1.rank ?? 5) + (currentTeam.player2.rank ?? 5);

      rest.sort((a, b) => {
        const aRankSum = (a.player1.rank ?? 5) + (a.player2.rank ?? 5);
        const bRankSum = (b.player1.rank ?? 5) + (b.player2.rank ?? 5);
        const aDiff = Math.abs(currentRankSum - aRankSum);
        const bDiff = Math.abs(currentRankSum - bRankSum);
        if (aDiff !== bDiff) return aDiff - bDiff;
        // Secondary tiebreak: when rank-sums are effectively equal (diff ≤ 1), prefer closer win-rate
        if (aDiff <= 1 && bDiff <= 1) {
          const laplace = (p: Player) => (p.roundsWon + 1) / (p.actualTotalRoundsPlayed + 2);
          const currentWR = laplace(currentTeam.player1) + laplace(currentTeam.player2);
          const aWRDiff = Math.abs(currentWR - (laplace(a.player1) + laplace(a.player2)));
          const bWRDiff = Math.abs(currentWR - (laplace(b.player1) + laplace(b.player2)));
          if (Math.abs(aWRDiff - bWRDiff) > 0.001) return aWRDiff - bWRDiff;
        }
        // Tertiary tiebreak: prefer opponents not recently faced
        const aPoint = this.calculateOppositePlayerPoint(currentTeam.player1.name, a.player1.name)
          + this.calculateOppositePlayerPoint(currentTeam.player1.name, a.player2.name)
          + this.calculateOppositePlayerPoint(currentTeam.player2.name, a.player1.name)
          + this.calculateOppositePlayerPoint(currentTeam.player2.name, a.player2.name);
        const bPoint = this.calculateOppositePlayerPoint(currentTeam.player1.name, b.player1.name)
          + this.calculateOppositePlayerPoint(currentTeam.player1.name, b.player2.name)
          + this.calculateOppositePlayerPoint(currentTeam.player2.name, b.player1.name)
          + this.calculateOppositePlayerPoint(currentTeam.player2.name, b.player2.name);
        return aPoint - bPoint;
      });

      result.push({ team1: currentTeam, team2: rest[0] });
      remaining = remaining.filter(t => t !== currentTeam && t !== rest[0]);
    }
    return result;
  }
  
  private calculateOppositePlayerPoint(playerA: string, playerB: string): number {
    let playerAOpponents = this.playersOpponents.get(playerA);
    if (!playerAOpponents || !playerAOpponents.includes(playerB)) {
      return 0;
    }
    return playerAOpponents.length - playerAOpponents.lastIndexOf(playerB);
  }
  private playerWinPercentage(player: Player): number {
    if (!player.actualTotalRoundsPlayed || player.actualTotalRoundsPlayed === 0) {
      return 50; // Default to 50% for new players
    }
    return Math.floor((player.roundsWon / player.actualTotalRoundsPlayed) * 100);
  }
  private putPlayerIntoCourts(teamateList: {team1: Teammate; team2: Teammate;}[], mode: string) {
    this.matchList.map((each) => {
      each.matchTime
      if (each.status === COURT_STATUS.PLAYING) return;
      if (teamateList.length <= 0) return;
      let currentTeam = teamateList[0]
      each.teamA.player1 = currentTeam.team1.player1;
      each.teamA.player2 = currentTeam.team1.player2;
      each.teamB.player1 = currentTeam.team2.player1;
      each.teamB.player2 = currentTeam.team2.player2;
      each.mode = mode;
      teamateList.splice(0, 1);
    });
    this.matchService.saveMatchList(this.matchList);
  }

  private sortByPoint(players: Player[], pointFn: (player: Player) => number): Player[] {
    const randomTiebreaker = new Map(players.map(p => [p.name, this.rng.random()]));
    return players.slice().sort((a, b) => {
      const aPoint = pointFn(a);
      const bPoint = pointFn(b);
      if (aPoint === bPoint) return randomTiebreaker.get(a.name)! - randomTiebreaker.get(b.name)!;
      return aPoint - bPoint;
    });
  }

  // === Others ===============================
  private log(...args: any[]) {
    console.log('log[' + new Date().toLocaleTimeString() + ']: ', ...args);
    this.logData.push(
      args
        .map((arg) =>
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        )
        .join(' ')
    );
  }


}
