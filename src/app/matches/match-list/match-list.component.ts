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
import { Constants } from '../../shared/constants';

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
// Games needed before win-rate fully influences effectiveRank (see effectiveRank).
const CONFIDENCE_GAMES = 3;

// One way to split a quad of 4 into two teams, by position in the quad (sorted best→worst).
type QuadSplit = [[number, number], [number, number]];
// [0,3] vs [1,2]: (best+worst) vs (2nd+3rd) — the most equal team strength.
// [0,2] vs [1,3]: (best+3rd) vs (2nd+worst).
// [0,1] vs [2,3]: (the two strongest) vs (the two weakest) — lopsided by construction.
// Tiered quads are contiguous, so their four players are already close in strength and
// even the lopsided split stays playable; it is the last resort when the other two are blocked.
const TIERED_SPLITS: QuadSplit[] = [
  [[0, 3], [1, 2]],
  [[0, 2], [1, 3]],
  [[0, 1], [2, 3]],
];
// Spread quads deliberately span the full skill range, so only best+worst vs the two
// middles produces two evenly-matched teams. Any other split would hand one team the
// session's strongest player alongside a middle. No second choice: the quad fails instead.
const SPREAD_SPLITS: QuadSplit[] = [
  [[0, 3], [1, 2]],
];

// Players tied on priority point at the eligiblePlayers cutoff: boundaryIn made it in
// (by the random tiebreaker), boundaryOut didn't, even though neither is more deserving.
// Used by Tiered/Spread's quad rescue (see rescueQuadWithSwap) to swap between them.
type BoundarySwapPool = { boundaryIn: Player[]; boundaryOut: Player[] };
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
    const swapPool = this.getBoundaryTieGroup(sortedPlayerList, eligiblePlayers, totalAvailableSlots);

    let mode = this.resolveMode();
    this.log(`SHUFFLE mode: ${mode}`);

    let teamateList: Teammate[] | null;
    switch (mode) {
      case 'tiered':
        teamateList = this.shuffleTiered(eligiblePlayers, swapPool);
        if (teamateList != null) break;
        this.log('Tiered fallback → spread (no nemesis-safe pairing in a quad)');
      case 'spread':
        mode = 'spread'
        teamateList = this.shuffleSpread(eligiblePlayers, swapPool);
        if (teamateList != null) break;
        this.log('Spread fallback → mixed (no nemesis-safe pairing in a quad)');
      case 'mixed': 
        mode = 'mixed'
        teamateList = this.shuffleMixed(eligiblePlayers);
        break;
      default:
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
    const eventKey = Constants.todayEventKey();
    const url = `${window.location.origin}/guest/event/${encodeURIComponent(eventKey)}/matches`;
    const courtLines = this.matchList
      .filter((match) => match.teamA.player1.name && match.teamB.player1.name)
      .map((match) =>
        `Court ${match.courtNo}: ${match.teamA.player1.name} & ${match.teamA.player2.name} vs ${match.teamB.player1.name} & ${match.teamB.player2.name}`
      );
    const title = courtLines.length ? `🏸 ${courtLines.join(' | ')}` : '🏸 Badminton Match';
    const text = courtLines.length ? courtLines.join('\n') : 'Badminton Match';
    if (navigator.share) {
      navigator.share({ title, text, url });
    } else {
      navigator.clipboard.writeText(`${text}\n${url}`).then(() => alert('Link copied!'));
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
  // Take the top-N slice by priority, then pull in any force-teammate partner who
  // landed just outside the cutoff: without this a force pair split across the
  // boundary is silently broken, because every mode only ever sees the sliced window.
  // The partner takes the slot of the window's lowest-priority (most rounds played)
  // member who isn't themselves half of a force pair that's present.
  private getAvailablePlayers(players: Player[], totalAvailableSlots: number) {
    const eligibleWindow = players.slice(0, totalAvailableSlots);
    const outside = players.slice(totalAvailableSlots);
    const forceMap = this.getForceTeamatesMap();
    if (forceMap.size === 0) return eligibleWindow;

    const inWindow = new Set(eligibleWindow.map(p => p.name));
    // Protected = would break an already-satisfied force pair if evicted.
    const isProtected = (player: Player) => {
      const partner = forceMap.get(player.name);
      return !!partner && inWindow.has(partner);
    };

    for (const player of [...eligibleWindow]) {
      const partnerName = forceMap.get(player.name);
      if (!partnerName || inWindow.has(partnerName)) continue;
      const partnerIdx = outside.findIndex(p => p.name === partnerName);
      if (partnerIdx < 0) continue; // partner isn't eligible at all (playing or on break)

      const partner = outside[partnerIdx];
      eligibleWindow.push(partner);
      inWindow.add(partner.name);

      // Window stays priority-sorted, so scan from the back for the least-deserving evictee.
      let evictIdx = -1;
      for (let i = eligibleWindow.length - 2; i >= 0; i--) {
        if (!isProtected(eligibleWindow[i])) { evictIdx = i; break; }
      }
      if (evictIdx < 0) { // nobody evictable — undo and leave the window as it was
        eligibleWindow.pop();
        inWindow.delete(partner.name);
        continue;
      }
      const [evicted] = eligibleWindow.splice(evictIdx, 1);
      inWindow.delete(evicted.name);
      outside.splice(partnerIdx, 1, evicted);
      this.log(`force pair pulled ${partner.name} into the round, ${evicted.name} sits out`);
    }
    return eligibleWindow;
  }
  // Players tied on priority point at the cutoff: boundaryIn (made the slice) vs
  // boundaryOut (just missed it). Both groups share the exact same priority point,
  // so swapping between them never lets a more-deserving player (fewer rounds played)
  // get bumped — it only changes which equally-deserving player fills the slot.
  private getBoundaryTieGroup(
    sortedPlayerList: Player[],
    eligiblePlayers: Player[],
    totalAvailableSlots: number
  ): BoundarySwapPool {
    if (totalAvailableSlots <= 0 || totalAvailableSlots > sortedPlayerList.length) {
      return { boundaryIn: [], boundaryOut: [] };
    }
    const boundaryPoint = this.calculatePlayerPriorityPoint(sortedPlayerList[totalAvailableSlots - 1]);
    const eligibleNames = new Set(eligiblePlayers.map(p => p.name));
    const boundaryIn = eligiblePlayers.filter(p => this.calculatePlayerPriorityPoint(p) === boundaryPoint);
    // Membership, not cutoff index: the force-pair pull-in in getAvailablePlayers can move
    // players across the boundary, so a player below the cutoff may already be in the round
    // (swapping them in again would duplicate them on court) and the player it evicted —
    // still tied at the boundary point — becomes a valid swap candidate.
    const boundaryOut = sortedPlayerList.filter(p =>
      !eligibleNames.has(p.name) && this.calculatePlayerPriorityPoint(p) === boundaryPoint
    );
    this.log('boundaryTieGroup:', { in: boundaryIn.map(p => p.name), out: boundaryOut.map(p => p.name) });
    return { boundaryIn, boundaryOut };
  }
  // === Mode Resolution =============================
  // Auto rolls between tiered, spread and mixed only — novel ignores rank entirely, so
  // letting it come up at random can drop a beginner onto a court of regulars mid-session.
  // It stays available by picking it explicitly in Settings.
  // The stored novel weight is left untouched but no longer rolled, so the other three are
  // renormalised against their own total and keep their relative proportions.
  private resolveMode(): 'tiered' | 'spread' | 'mixed' | 'novel' {
    const saved = this.settingService.loadShuffleMode();
    if (saved !== 'auto') return saved;
    const weights = this.settingService.loadShuffleModeWeights();
    const autoTotal = weights.tiered + weights.spread + weights.mixed;
    if (autoTotal <= 0) return 'tiered';
    const roll = this.rng.random() * autoTotal;
    if (roll < weights.tiered) return 'tiered';
    if (roll < weights.tiered + weights.spread) return 'spread';
    return 'mixed';
  }

  // === Effective Rank ==============================
  // Lower = stronger. At full confidence, win-rate can shift a player up to 1 full
  // rank tier from their baseline (rank-1)*1000, so a high-win-rate lower-ranked
  // player can naturally fall into a better quad.
  // Early-session results are deweighted: with few games played, winRate sits near
  // 0.5 anyway (Laplace smoothing), but `confidence` also shrinks any deviation from
  // 0.5 so a single early win/loss can't swing a player by a third of a tier.
  private effectiveRank(player: Player): number {
    const rank = player.rank ?? 5;
    const winRate = (player.roundsWon + 1) / (player.actualTotalRoundsPlayed + 2);
    const confidence = Math.min(1, player.actualTotalRoundsPlayed / CONFIDENCE_GAMES);
    return rank * 1000 - (winRate - 0.5) * 2000 * confidence - 1000;
  }

  // Convenience accessor: effectiveRank divided back down to tier units. Note it sits one
  // tier below raw `rank` (effectiveRank subtracts a flat 1000), which is harmless because
  // the offset cancels in the differences and sums calculateMatchInCourtsRankBased takes.
  private effectiveRankScore(player: Player): number {
    return this.effectiveRank(player) / 1000;
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
      // A player forced with themselves would be seated twice and push someone else out of
      // the round. The Settings UI cannot create one, but settings synced from Supabase can.
      if (partner && partner.name !== player.name && !used.has(partner.name)) {
        pairs.push({ player1: player, player2: partner });
        used.add(player.name);
        used.add(partner.name);
      }
    }
  }

  // === Modes A/B — Tiered & Spread ===================
  // Sort all eligible players by effectiveRank, group into quads of 4, then
  // pair within each quad via formQuadPairs (nemesis/recency rules).
  // A lower-ranked player with a high win-rate sorts into a higher-skill quad
  // automatically via effectiveRank. Tiered and Spread differ in two things only:
  // how players are assigned into quads (buildQuad) and which splits are allowed
  // once they are there (splits).
  private shuffleByQuads(
    players: Player[],
    buildQuad: (sorted: Player[], numQuads: number, quadIndex: number) => Player[],
    splits: QuadSplit[],
    swapPool?: BoundarySwapPool
  ): Teammate[] | null {
    const totalPlayers = players.length;
    const numQuads = Math.floor(players.length / 4);
    const sorted = [...players].sort((a, b) => this.effectiveRank(a) - this.effectiveRank(b));
    const forceMap = this.getForceTeamatesMap();
    const nemesisSet = this.getNemesisSet();
    const pairs: Teammate[] = [];

    const boundaryInNames = new Set((swapPool?.boundaryIn ?? []).map(p => p.name));
    const availableOut = [...(swapPool?.boundaryOut ?? [])];

    const quads: Player[][] = [];
    for (let quadIndex = 0; quadIndex < numQuads; quadIndex++) {
      quads.push(buildQuad(sorted, numQuads, quadIndex));
    }
    this.regroupForcePairsIntoSameQuad(quads, forceMap);

    for (const q of quads) {
      let quadPair = this.formQuadPairs(q, forceMap, nemesisSet, totalPlayers, splits);
      if (!quadPair) {
        quadPair = this.rescueQuadWithSwap(q, forceMap, nemesisSet, totalPlayers, splits, boundaryInNames, availableOut);
        if (quadPair) this.log('quad rescued via boundary tie swap:', q.map(p => p.name));
      }
      if (!quadPair) return null;
      pairs.push(quadPair[0], quadPair[1]);
    }
    return pairs;
  }

  // buildQuad groups purely by effectiveRank, so a force pair can land in two different
  // quads — formQuadPairs only ever sees one quad at a time and would silently break them.
  // Pull the partner over by swapping them with a member of the other quad who isn't
  // force-paired to someone present. Quad sizes are preserved; each quad is re-sorted by
  // effectiveRank afterwards because formQuadPairs' [0,3]/[1,2] splits assume best→worst.
  private regroupForcePairsIntoSameQuad(quads: Player[][], forceMap: Map<string, string>) {
    if (forceMap.size === 0) return;
    const quadOf = new Map<string, number>();
    quads.forEach((q, idx) => q.forEach(p => quadOf.set(p.name, idx)));
    const hasPresentPartner = (name: string) => {
      const partner = forceMap.get(name);
      return !!partner && quadOf.has(partner);
    };

    quads.forEach((quad, i) => {
      for (const player of [...quad]) {
        const partnerName = forceMap.get(player.name);
        if (!partnerName) continue;
        const j = quadOf.get(partnerName);
        if (j === undefined || j === i) continue;

        const partnerIdx = quads[j].findIndex(p => p.name === partnerName);
        const swapIdx = quads[i].findIndex(p => p.name !== player.name && !hasPresentPartner(p.name));
        if (partnerIdx < 0 || swapIdx < 0) continue;

        const moving = quads[i][swapIdx];
        quads[i][swapIdx] = quads[j][partnerIdx];
        quads[j][partnerIdx] = moving;
        quadOf.set(partnerName, i);
        quadOf.set(moving.name, j);
        this.log(`force pair regrouped into one quad: ${player.name}+${partnerName}`);
      }
    });

    quads.forEach(q => q.sort((a, b) => this.effectiveRank(a) - this.effectiveRank(b)));
  }

  // When a quad has no legal split, try swapping one boundary-tied member
  // (who got into eligiblePlayers by the random tiebreaker) for an equally-tied
  // candidate who got cut by that same coin flip (see getBoundaryTieGroup). Force-paired
  // players are never swap candidates. Consumes the chosen candidate from availableOut
  // so a later quad in the same shuffle can't reuse them.
  private rescueQuadWithSwap(
    q: Player[],
    forceMap: Map<string, string>,
    nemesisSet: Set<string>,
    totalPlayers: number,
    splits: QuadSplit[],
    boundaryInNames: Set<string>,
    availableOut: Player[]
  ): [Teammate, Teammate] | null {
    if (availableOut.length === 0) return null;

    const swappableIndices = q
      .map((_, idx) => idx)
      .filter(idx => boundaryInNames.has(q[idx].name) && !forceMap.has(q[idx].name));

    for (const idx of swappableIndices) {
      for (let outIdx = 0; outIdx < availableOut.length; outIdx++) {
        const swappedQuad = [...q];
        swappedQuad[idx] = availableOut[outIdx];
        // Boundary candidates are tied on rounds played, not rank, so the player swapped in
        // can sit anywhere on the skill scale. Re-sort before pairing: the splits address
        // quad positions and assume best→worst, so an unsorted quad would silently pair the
        // wrong people — [0,3] would stop meaning "strongest with weakest".
        swappedQuad.sort((a, b) => this.effectiveRank(a) - this.effectiveRank(b));
        const result = this.formQuadPairs(swappedQuad, forceMap, nemesisSet, totalPlayers, splits);
        if (result) {
          availableOut.splice(outIdx, 1);
          return result;
        }
      }
    }
    return null;
  }

  // Mode A — Tiered: contiguous slicing — quad 0 = the 4 strongest, quad 1 =
  // the next 4, etc. Deliberately clusters same-rank players, producing a
  // strong court and a weak court.
  private shuffleTiered(players: Player[], swapPool?: BoundarySwapPool): Teammate[] | null {
    return this.shuffleByQuads(players, (sorted, _numQuads, quadIndex) =>
      [0, 1, 2, 3].map(k => sorted[quadIndex * 4 + k]), TIERED_SPLITS, swapPool
    );
  }

  // Mode B — Spread: interleaved striding — player at sorted position i goes
  // to quad i % numQuads. For 8 players / 2 quads: Quad 0 = positions
  // [0,2,4,6], Quad 1 = [1,3,5,7]. This guarantees each quad spans the full
  // skill range instead of clustering the bottom rank tier together.
  private shuffleSpread(players: Player[], swapPool?: BoundarySwapPool): Teammate[] | null {
    return this.shuffleByQuads(players, (sorted, numQuads, quadIndex) =>
      [0, 1, 2, 3].map(k => sorted[quadIndex + k * numQuads]), SPREAD_SPLITS, swapPool
    );
  }

  // Within a quad of 4 players (sorted best→worst by effectiveRank):
  // Every pass checks not-nemesis; only the recency check regresses across 11 passes,
  // strictest first so the freshest legal pairing always wins:
  // Pass 0-4:  reject if EITHER pair is recent, lookback 5 → 1 rounds (strong: both pairs must be fresh).
  // Pass 5-9:  reject only if BOTH pairs are recent, lookback 5 → 1 rounds (weak: one fresh pair is enough).
  // Pass 10:  recency dropped entirely (not-nemesis only) — multi-split modes only.
  // Splits are tried in the caller's order within every pass, so the preferred split always
  // wins a tie — a later split is only reached when the preferred one is blocked.
  // Partner rank distance is deliberately unbounded: the quad is already the skill
  // bracket, and the preferred [0,3] split pairs its strongest with its weakest.
  // Returns null only when a nemesis conflict blocks every pass.
  private formQuadPairs(
    q: Player[],
    forceMap: Map<string, string>,
    nemesisSet: Set<string>,
    totalPlayers: number,
    splits: QuadSplit[]
  ): [Teammate, Teammate] | null {
    const RECENCY_LOOKBACKS = [5, 4, 3, 2]; // rounds-back window, regressing pass over pass

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

    // Which splits are on the table is the caller's choice — see TIERED_SPLITS / SPREAD_SPLITS.
    const options = splits;

    // Priority order — always prefer the caller's first split:
    // Pass 0-4:  not nemesis, not either-recent within a shrinking lookback (5 → 1 rounds).
    // Pass 5-9:  not nemesis, not both-recent within a shrinking lookback (5 → 1 rounds).
    // Pass 10:   not nemesis                             (recency dropped entirely)
    type CheckFn = (ai: number, bi: number, ci: number, di: number) => boolean;
    const nem = (a: number, b: number) => this.isNemesisPair(q[a].name, q[b].name, nemesisSet);
    const nemesisOk = (ai: number, bi: number, ci: number, di: number) =>
      !nem(ai, bi) && !nem(ci, di);
    // recentWithin(a, b, lookback): true if a/b were teammates within the last `lookback` rounds.
    const recentWithin = (a: number, b: number, lookback: number) =>
      this.isRecentTeammatePair(q[a], q[b], totalPlayers, totalPlayers - lookback);
    // "Both" — reject only when BOTH pairs are repeat partnerships (weak: one fresh pair is enough).
    const bothRecentWithin = (ai: number, bi: number, ci: number, di: number, lookback: number) =>
      recentWithin(ai, bi, lookback) && recentWithin(ci, di, lookback);
    // "Either" — reject when EITHER pair is a repeat partnership (strong: both pairs must be fresh).
    const eitherRecentWithin = (ai: number, bi: number, ci: number, di: number, lookback: number) =>
      recentWithin(ai, bi, lookback) || recentWithin(ci, di, lookback);

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

    // A mode holding several splits should take its least-bad option rather than fail, so its
    // ladder ends in a catch-all that ignores recency. A mode holding a single split has
    // nothing to choose between: if it accepted unconditionally too, recency could never
    // influence it and it would hand out the same partnerships every single round. Its ladder
    // therefore stops at the last window that can actually reject — a window of 1 never can,
    // since a pair's last meeting is always at least one round ago — and a failed quad falls
    // through to a mode that can still rotate. See SPREAD_SPLITS.
    const mustPair = splits.length > 1;
    const lookbacks = mustPair ? RECENCY_LOOKBACKS : RECENCY_LOOKBACKS.filter(each => each > 1);

    for (const lookback of lookbacks) {
      const result = tryOptions((ai, bi, ci, di) =>
        nemesisOk(ai, bi, ci, di) && !eitherRecentWithin(ai, bi, ci, di, lookback)
      );
      if (result) return result;
    }
    for (const lookback of lookbacks) {
      const result = tryOptions((ai, bi, ci, di) =>
        nemesisOk(ai, bi, ci, di) && !bothRecentWithin(ai, bi, ci, di, lookback)
      );
      if (result) return result;
    }
    return mustPair ? tryOptions(nemesisOk) : null;
  }

  // === Mode B — Mixed (top↔bottom) ==================
  // Mixed is also the terminal fallthrough for Tiered/Spread, so it has to be
  // nemesis-safe and it must always return a pairing.
  // The fold is tried once per lookback, strictest first: at lookback 5 the strongest
  // player only accepts a partner they haven't played with in the last 5 rounds, and the
  // window shrinks until every pick can be satisfied. If none can, the plain fold runs and
  // repairNemesisPairs cleans up afterwards — a repeat partnership is better than no round.
  private shuffleMixed(players: Player[]): Teammate[] {
    const RECENCY_LOOKBACKS = [3, 2, 1]; // rounds-back window, regressing pass over pass
    const totalPlayers = players.length;
    const sorted = [...players].sort((a, b) => this.effectiveRank(a) - this.effectiveRank(b));
    const forceMap = this.getForceTeamatesMap();
    const nemesisSet = this.getNemesisSet();
    const used = new Set<string>();
    const forcePairs: Teammate[] = [];

    this.lockForcePairs(players, forceMap, used, forcePairs);
    const remaining = sorted.filter(p => !used.has(p.name));

    for (const lookback of RECENCY_LOOKBACKS) {
      const folded = this.foldStrongestWithWeakest(remaining, nemesisSet, totalPlayers, lookback);
      if (folded) {
        return this.repairNemesisPairs([...forcePairs, ...folded], forceMap, nemesisSet);
      }
    }

    // Last resort — the plain fold with no constraints at all, so the round always happens
    // even when the pool strands a nemesis pair as the final two. repairNemesisPairs then
    // cross-swaps anything illegal; recency is given up for this round.
    const plain: Teammate[] = [];
    for (let lo = 0, hi = remaining.length - 1; lo < hi; lo++, hi--) {
      plain.push({ player1: remaining[lo], player2: remaining[hi] });
    }
    return this.repairNemesisPairs([...forcePairs, ...plain], forceMap, nemesisSet);
  }

  // Fold a strength-sorted pool: strongest takes the weakest, then the next strongest takes
  // the weakest of what's left. When the natural partner is a nemesis, or a repeat within
  // `lookback` rounds, walk inward for the next-weakest player who is neither — so the
  // top↔bottom shape survives while the exact partner rotates round to round.
  // Returns null when some pick has no acceptable partner at this lookback — including the
  // case where the walk strands a nemesis pair as the last two players in the pool.
  private foldStrongestWithWeakest(
    sortedPool: Player[],
    nemesisSet: Set<string>,
    totalPlayers: number,
    lookback: number
  ): Teammate[] | null {
    const pool = [...sortedPool];
    const pairs: Teammate[] = [];

    while (pool.length > 1) {
      const strongest = pool.shift()!;
      let idx = pool.length - 1;
      while (idx >= 0 && !this.isFoldPartnerOk(strongest, pool[idx], nemesisSet, totalPlayers, lookback)) {
        idx--;
      }
      if (idx < 0) return null;
      pairs.push({ player1: strongest, player2: pool[idx] });
      pool.splice(idx, 1);
    }
    return pairs;
  }

  private isFoldPartnerOk(
    player: Player,
    candidate: Player,
    nemesisSet: Set<string>,
    totalPlayers: number,
    lookback: number
  ): boolean {
    if (this.isNemesisPair(player.name, candidate.name, nemesisSet)) return false;
    return !this.isRecentTeammatePair(player, candidate, totalPlayers, totalPlayers - lookback);
  }

  // Break up any nemesis pair by cross-swapping player2 with another pair's player2,
  // keeping the first swap where BOTH resulting pairs are nemesis-free. Force pairs are
  // never touched (a force pair that is also a nemesis pair is a contradictory setting).
  private repairNemesisPairs(
    pairs: Teammate[],
    forceMap: Map<string, string>,
    nemesisSet: Set<string>
  ): Teammate[] {
    if (nemesisSet.size === 0) return pairs;
    const isForced = (t: Teammate) => forceMap.get(t.player1.name) === t.player2.name;
    const isNemesis = (a: Player, b: Player) => this.isNemesisPair(a.name, b.name, nemesisSet);

    for (let i = 0; i < pairs.length; i++) {
      if (isForced(pairs[i]) || !isNemesis(pairs[i].player1, pairs[i].player2)) continue;
      let repaired = false;
      for (let j = 0; j < pairs.length && !repaired; j++) {
        if (i === j || isForced(pairs[j])) continue;
        const swappedI: Teammate = { player1: pairs[i].player1, player2: pairs[j].player2 };
        const swappedJ: Teammate = { player1: pairs[j].player1, player2: pairs[i].player2 };
        if (isNemesis(swappedI.player1, swappedI.player2)) continue;
        if (isNemesis(swappedJ.player1, swappedJ.player2)) continue;
        pairs[i] = swappedI;
        pairs[j] = swappedJ;
        repaired = true;
      }
      if (!repaired) {
        this.log(`could not break nemesis pair ${pairs[i].player1.name}+${pairs[i].player2.name}`);
      }
    }
    return pairs;
  }

  // Standard Fisher–Yates: walk backwards, swap each element with a uniformly
  // random earlier-or-equal index. Every permutation is equally likely, unlike
  // sort()-with-random-comparator (engine-dependent, not a uniform shuffle).
  private fisherYatesShuffle<T>(items: T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
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
      const shuffled = this.fisherYatesShuffle(players);
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
  // Rank-sums use effectiveRank (rank + win-rate), so a team's recent form — not just
  // their assigned ranks — determines which courts are considered "evenly matched".
  private calculateMatchInCourtsRankBased(teamateList: Teammate[]): {team1: Teammate, team2: Teammate}[] {
    const result: {team1: Teammate, team2: Teammate}[] = [];
    let remaining = [...teamateList];

    while (remaining.length > 1) {
      const currentTeam = remaining[0];
      const rest = remaining.slice(1);
      const currentRankSum = this.effectiveRankScore(currentTeam.player1) + this.effectiveRankScore(currentTeam.player2);

      rest.sort((a, b) => {
        const aRankSum = this.effectiveRankScore(a.player1) + this.effectiveRankScore(a.player2);
        const bRankSum = this.effectiveRankScore(b.player1) + this.effectiveRankScore(b.player2);
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
