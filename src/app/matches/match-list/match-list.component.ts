import { Component } from '@angular/core';
import { Match, Teammate } from '../match';
import { Player } from '../../players/player';
import { CommonModule } from '@angular/common';
import { PlayerService } from '../../players/player.service';
import { MatchService } from '../match.service';
import { XorShift } from '../../shared/random/xorshift';
import { Status } from '../../players/status';
import { BillComponent } from '../../bill/bill.component';

enum COURT_STATUS {
  AVAILABLE = 'available',
  PLAYING = 'playing',
}
enum PLAYER_STATUS {
  READY = 'ready',
  BREAK = 'break',
  SELECTED = 'selected',
}
const PLAYERS_PER_COURT = 4;
const TEAMS_PER_COURT = 2;
const DEFAULT_TOTAL_COURT = 2;
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
  playerService = new PlayerService();
  playersOpponents = new Map<string, string[]>();
  matchService = new MatchService();
  logData: String[] = [];
  rng = new XorShift();
  totalCourt = DEFAULT_TOTAL_COURT;
  playerStatus = PLAYER_STATUS;
  courtStatus = COURT_STATUS;

  constructor() {
    this.playersMap = this.playerService.loadPlayerList();
    this.log('playersMap: ', this.playersMap);
    this.matchHistory = this.matchService.loadMatchHistory();
    this.playersOpponents = this.matchService.loadPlayerOpponents();
    this.log(`playersOpponents:`);
    this.log(this.playersOpponents);
    this.matchList = this.matchService.loadMatchList();
    if (this.matchList.length > 0) {
      return;
    }
    for (let i = 0; i < this.totalCourt; i++) {
      this.addCourt();
    }
    this.reloadStandbyList();
    this.status = this.playerService.loadPlayerStatus();
    this.rng = new XorShift();
  }

// ================================================================================
// PUBLIC METHODS (Template Callable)
// ================================================================================

  // Player List Management =================
  addPlayerList(newPlayers: string) {
    let leastPlayed = this.playerService.loadPlayerStatus().leastPlayed;
    this.playersMap = this.playerService.addPlayerList(
      leastPlayed,
      this.playersMap,
      newPlayers
    );
    this.reloadStandbyList();
  }

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
  freeCourt(i: number) {
    let currentCourt = this.matchList[i];
    this.log('FREE_COURT start...');
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
    const maxRetries = 10;
    this.log(`SHUFFLE start(maxRetries = ${maxRetries}) ...`);

   let availablePlayerList = this.getAvailablePlayerList();

    let totalAvailableSlots = this.getTotalAvailableSlotsInCourts();
    if (totalAvailableSlots <= 0) {
      return;
    }

    /* features:
    ถ้าผลลัพธ์ของการเลือกจับคู่ _ไม่เป็นที่น่าพอใจ_ จะทำการ _จับคู่ใหม่_ สูงสุดเป็นจำนวน {maxRetries} ครั้ง
      _ไม่เป็นที่น่าพอใจ_ = คำนวนจากสูตรว่า "คู่ที่เพิ่งได้มานั้นเคยคู่กันไปแล้ว" และ {A - B < X - Y} หรือไม่
        โดย {A} = จำนวนเกมที่เล่นไปของบุคคลผู้นั้น, {B} = คู่ที่ได้นั้น ซ้ำกันไปแล้วเป็นลำดับที่เท่าไหร่
          , {X} = คนทั้งหมด ที่เป็นไปได้ในการจับคู่, {Y} = ตัวแปรที่จะเท่ากับ (แต่ละครั้งที่มีการ _จับคู่ใหม่_ / 3) ปัดเศษขึ้น
    */
    let teamateList: Teammate[] = [];
    let retries = 0;
    for (retries = 0; retries <= maxRetries; retries++) {
      let sortedPlayerList = this.getSortedPlayerList(availablePlayerList);
      totalAvailableSlots = this.recalculateTotalAvailableSlots(totalAvailableSlots, sortedPlayerList.length)
      teamateList = this.calculateTeamates( sortedPlayerList.slice(0, totalAvailableSlots));
      if (this.isAllTeamatesValid(retries,availablePlayerList.length,teamateList)) {
        break;
      }
    }
    let resultCourt = this.calculateMatchInCourts(teamateList);
    console.log('resultCourt');
    console.log(resultCourt.flatMap(each => {
      return `[${each.team1.player1.name}:${each.team1.player2.name}] : [${each.team2.player1.name}:${each.team2.player2.name}]`
    }));

    this.putPlayerIntoCourts(resultCourt);

    this.reloadStandbyList();
    
    this.log(`SHUFFLE end ... (retries:${retries})`);
  }

  // Others =================================
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
    this.playersMap = this.confirmPlayersInCourt(this.playersMap, court);
    this.matchHistory = this.matchService.addMatchHistory(court);
    this.playersOpponents = this.matchService.loadPlayerOpponents();
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
    let sortedPlayerList = availablePlayerList.sort((a, b) => {
      let aPoint = this.calculatePlayerPriorityPoint(a);
      let bPoint = this.calculatePlayerPriorityPoint(b);
      if (aPoint == bPoint) {
        return this.rng.random() - this.rng.random();
      }
      return aPoint - bPoint;
    });
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

  private calculateTeamates(players: Player[]): Teammate[] {
    let teamates: Teammate[] = [];
    let remainingPlayers = this.calculateTeamatesGetSortedPlayerMostRecentTeamateWithOther(players);

    while (remainingPlayers.length > 0) {
      const currentPlayer = remainingPlayers[0];
      let currentPlayerTeamate: Player;
      let otherPlayers = remainingPlayers.slice(1);
      if (otherPlayers.length <= 0) {
        break;
      }
      otherPlayers.sort((a, b) => {
        let aPoint = this.calculateTeamatesPoint(currentPlayer, a);
        let bPoint = this.calculateTeamatesPoint(currentPlayer, b);
        if (aPoint === bPoint) {
          return this.rng.random() - this.rng.random();
        }
        return aPoint - bPoint;
      });
      currentPlayerTeamate = otherPlayers[0];
      teamates = [...teamates, { player1: currentPlayer, player2: currentPlayerTeamate }];
      remainingPlayers = remainingPlayers.filter(
        (each) => currentPlayer.name != each.name && currentPlayerTeamate.name != each.name
      );
    }
    return teamates;
  }
  private calculateTeamatesGetSortedPlayerMostRecentTeamateWithOther(playerList: Player[]) {
    let mapPriorityPlayers = new Map<string, number>();
    playerList.forEach((currentPlayer) => {
      let teamateHistory = currentPlayer.teamateHistory
      let leastPoint = 999;
      this.log(`currentPlayer ${currentPlayer.name} each: ${teamateHistory}`);
      playerList
        .filter((each) => each.name != currentPlayer.name)
        .forEach((each) => {
          let currentPoint = 999;
          if (teamateHistory.includes(each.name)) {
            currentPoint = teamateHistory.length - teamateHistory.lastIndexOf(each.name);
          }
          if (currentPoint < leastPoint) {
            leastPoint = currentPoint;
          }
        });
      mapPriorityPlayers.set(currentPlayer.name, leastPoint);
    });
    let sortedPlayers: Player[] = playerList.slice().sort((a, b) => {
      let aPoint = mapPriorityPlayers.get(a.name) ?? 0;
      let bPoint = mapPriorityPlayers.get(b.name) ?? 0;
      if (aPoint === bPoint) {
        return this.rng.random() - this.rng.random();
      }
      return aPoint - bPoint;
    });
    this.log('calculateTeamatesGetSortedPlayerMostRecentTeamateWithOther: sortedPlayers: ', sortedPlayers);
    return sortedPlayers;
  }

  private calculateTeamatesPoint(playerA: Player, playerB: Player): number {
    if (!playerA.teamateHistory.includes(playerB.name)) {
      return 0;
    }
    return playerA.teamateHistory.lastIndexOf(playerB.name) + 1;
  }
  private isAllTeamatesValid(
    retries: number,
    totalPlayersAvailable: number,
    teamatesList: Teammate[]
  ): boolean {
    let isStillValid: boolean = true;
    const offsetValidatePlayers = Math.ceil((retries + 1) / 3);
    this.log(`retries: ${retries}, offsetValidatePlayers: ${offsetValidatePlayers}`);
    teamatesList.forEach((each) => {
      if (isStillValid === false || each.player1.teamateHistory.length <= 0) {
        return;
      }
      let previousTeamateIndex = each.player1.teamateHistory.lastIndexOf(each.player2.name);
      if (previousTeamateIndex < 0) {
        return;
      }
      if ( each.player1.totalRoundsPlayed - previousTeamateIndex < totalPlayersAvailable - offsetValidatePlayers ) {
        isStillValid = false;
        return;
      }
    });
    return isStillValid;
  }
  private calculateMatchInCourts(teamateList: Teammate[]): {team1:Teammate,team2:Teammate}[] {
    let result:{team1:Teammate,team2:Teammate}[] = [];
    let remainingTeams = [...teamateList];
    while (remainingTeams.length > 1) {
      let currentTeam = remainingTeams[0];
      let otherTeam = remainingTeams.slice(1);
      otherTeam.sort( (a,b) => {
        let aPoint = (this.calculateOppositePlayerPoint(currentTeam.player1.name, a.player1.name) + this.calculateOppositePlayerPoint(currentTeam.player1.name, a.player2.name))
              + (this.calculateOppositePlayerPoint(currentTeam.player2.name, a.player1.name) + this.calculateOppositePlayerPoint(currentTeam.player2.name, a.player2.name));
        let bPoint = (this.calculateOppositePlayerPoint(currentTeam.player1.name, b.player1.name) + this.calculateOppositePlayerPoint(currentTeam.player1.name, b.player2.name))
              + (this.calculateOppositePlayerPoint(currentTeam.player2.name, b.player1.name) + this.calculateOppositePlayerPoint(currentTeam.player2.name, b.player2.name));
        return aPoint - bPoint;
      })
      remainingTeams = remainingTeams.filter(each => each != currentTeam && each != otherTeam[0]);
      result = [...result, {team1: currentTeam, team2: otherTeam[0]}];
    }
    return result;
  }
  private calculateOppositePlayerPoint(playerA: string, playerB: string): number {
    let playerAOpponents = this.playersOpponents.get(playerA);
    if (!playerAOpponents || !playerAOpponents.includes(playerB)) {
      return 0;
    }
    return playerAOpponents.lastIndexOf(playerB) + 1;
  }
  private putPlayerIntoCourts(teamateList: {team1: Teammate; team2: Teammate;}[]) {
    this.matchList.map((each) => {
      if (each.status === COURT_STATUS.PLAYING) return;
      if (teamateList.length <= 0) return;
      let currentTeam = teamateList[0]
      each.teamA.player1 = currentTeam.team1.player1;
      each.teamA.player2 = currentTeam.team1.player2;
      each.teamB.player1 = currentTeam.team2.player1;
      each.teamB.player2 = currentTeam.team2.player2;
      teamateList.splice(0, 1);
    });
    this.matchService.saveMatchList(this.matchList);
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
