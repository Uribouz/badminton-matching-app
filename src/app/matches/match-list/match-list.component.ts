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

  matchService = new MatchService();
  logData: String[] = [];
  rng = new XorShift();
  totalCourt = DEFAULT_TOTAL_COURT;
  playerStatus = PLAYER_STATUS;
  courtStatus = COURT_STATUS;

  constructor() {
    this.playersMap = this.playerService.loadPlayerList();
    // this.log('playersMap: ', this.playersMap);
    this.matchHistory = this.matchService.loadMatchHistory();
    this.matchList = this.matchService.loadMatchList();
    if (this.matchList.length > 0) {
      return;
    }
    for (let i = 0; i < this.totalCourt; i++) {
      this.addCourt();
    }
    this.loadStandbyList();
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
    this.loadStandbyList();
  }

  // UI Helper ==============================
  getPlayerList(): Player[] {
    return Array.from(this.playersMap.values());
  }
  getMatchTime(match: Match): String {
    return new Date(match.matchTime).toLocaleTimeString();
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
    this.loadStandbyList();
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
    this.loadStandbyList();
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
    /* features:
    ถ้าผลลัพธ์ของการเลือกจับคู่ _ไม่เป็นที่น่าพอใจ_ จะทำการ _จับคู่ใหม่_ สูงสุดเป็นจำนวน {maxRetries} ครั้ง
      _ไม่เป็นที่น่าพอใจ_ = คำนวนจากสูตรว่า "คู่ที่เพิ่งได้มานั้นเคยคู่กันไปแล้ว" และ {A - B < X - Y} หรือไม่
        โดย {A} = จำนวนเกมที่เล่นไปของบุคคลผู้นั้น, {B} = คู่ที่ได้นั้น ซ้ำกันไปแล้วเป็นลำดับที่เท่าไหร่
          , {X} = คนทั้งหมด ที่เป็นไปได้ในการจับคู่, {Y} = ตัวแปรที่จะเท่ากับ (แต่ละครั้งที่มีการ _จับคู่ใหม่_ / 3) ปัดเศษขึ้น
    */
    const maxRetries = 10;
    this.log(`SHUFFLE start(maxRetries = ${maxRetries}) ...`);

    // Get initialPlayerList
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

    //Check if totalAvailablePlayers > 0
    let totalAvailablePlayers = 0;
    this.matchList.forEach((each) => {
      if (each.status === COURT_STATUS.AVAILABLE) {
        totalAvailablePlayers += PLAYERS_PER_COURT;
      }
    });
    this.log('totalAvailablePlayers: ', totalAvailablePlayers);
    if (totalAvailablePlayers <= 0) {
      return;
    }

    // Find players to be put into courts
    let teamateList: { player1: Player; player2: Player }[] = [];
    let i = 0;
    for (i = 0; i <= maxRetries; i++) {
      const offsetValidatePlayers = Math.ceil((i + 1) / 3);
      this.log(`i: ${i}, offsetValidatePlayers: ${offsetValidatePlayers}`);
      let playerList = initialPlayerList.sort((a, b) => {
        let aPoint = this.calculatePlayerPriorityPoint(a);
        let bPoint = this.calculatePlayerPriorityPoint(b);
        if (aPoint == bPoint) {
          return this.rng.random() - this.rng.random();
        }
        return aPoint - bPoint;
      });
      this.log(
        'shufflePlayersIntoCourt:',
        playerList.map((each) => {
          return `${each.name}: ${this.calculatePlayerPriorityPoint(each)} [${
            each.totalRoundsPlayed
          }]`;
        })
      );
      let maxPlayers =
        Math.floor(playerList.length / PLAYERS_PER_COURT) * PLAYERS_PER_COURT;
      if (totalAvailablePlayers > maxPlayers) {
        totalAvailablePlayers = maxPlayers;
      }
      this.log('totalAvailablePlayers: ', totalAvailablePlayers);
      teamateList = this.calculateTeamates(
        playerList.slice(0, totalAvailablePlayers)
      );
      if (
        this.isAllTeamatesValid(
          offsetValidatePlayers,
          initialPlayerList.length,
          teamateList
        )
      ) {
        break;
      }
    }

    // Put players into courts
    this.matchList.map((each) => {
      if (each.status === COURT_STATUS.PLAYING) return;
      if (teamateList.length < TEAMS_PER_COURT) return;
      each.teamA.player1 = teamateList[0].player1;
      each.teamA.player2 = teamateList[0].player2;
      each.teamB.player1 = teamateList[1].player1;
      each.teamB.player2 = teamateList[1].player2;
      teamateList.splice(0, TEAMS_PER_COURT);
    });

    this.loadStandbyList();
    this.matchService.saveMatchList(this.matchList);
    this.log(`SHUFFLE end ... (retries:${i})`);
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
  private loadStandbyList() {
    let playingPlayers = this.matchList.flatMap((each) => [
      each.teamA.player1?.name || '',
      each.teamA.player2?.name || '',
      each.teamB.player1?.name || '',
      each.teamB.player2?.name || '',
    ]);
    this.log(`loadStandbyList: ${this.matchList[0]}: ${this.matchList[1]}`);
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
  private calculatePlayerPriorityPoint(player: Player): number {
    const multiplier_rounds_played = 1;
    if (player.status === PLAYER_STATUS.SELECTED) {
      return -1;
    }
    return (multiplier_rounds_played * player.totalRoundsPlayed || 0) - 0;
  }
  private calculateTeamates(players: Player[]): { player1: Player; player2: Player }[] {
    let teamates: { player1: Player; player2: Player }[] = [];
    let mapPriorityPlayers = this.calculateTeamatesFirstPriorityPlayers(players);
    let remainingPlayers: Player[] = players.slice().sort((a, b) => {
      let aPoint = mapPriorityPlayers.get(a.name) ?? 0;
      let bPoint = mapPriorityPlayers.get(b.name) ?? 0;
      if (aPoint === bPoint) {
        return this.rng.random() - this.rng.random();
      }
      return aPoint - bPoint;
    });
    this.log('first: remainingPlayers: ', remainingPlayers);

    while (remainingPlayers.length > 0) {
      const currentPlayer = remainingPlayers[0];
      let teamate: Player;
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
      teamate = otherPlayers[0];
      teamates = [...teamates, { player1: currentPlayer, player2: teamate }];
      remainingPlayers = remainingPlayers.filter(
        (each) => currentPlayer.name != each.name && teamate.name != each.name
      );
      // this.log("teamates: ", teamates)
      // this.log("remainingPlayers: ", remainingPlayers)
    }
    return teamates;
  }
  private calculateTeamatesFirstPriorityPlayers(playerList: Player[]): Map<string, number> {
    let result = new Map<string, number>();
    playerList.forEach((currentPlayer) => {
      let leastPoint = 999;
      this.log(
        `currentPlayer ${currentPlayer.name} each: ${currentPlayer.teamateHistory}`
      );
      // this.log(`otherPlayers ${playerList.flatMap((each) => each.name)}`);
      playerList
        .filter((each) => each.name != currentPlayer.name)
        .forEach((each) => {
          let currentPoint = 999;
          if (currentPlayer.teamateHistory.includes(each.name)) {
            currentPoint =
              currentPlayer.teamateHistory.length -
              currentPlayer.teamateHistory.lastIndexOf(each.name);
          }
          // this.log(`currentPoint = ${currentPoint}`)
          if (currentPoint < leastPoint) {
            leastPoint = currentPoint;
          }
        });
      this.log(
        `calculateTeamatesFirstPriorityPlayers name: ${currentPlayer.name} = ${leastPoint}`
      );
      result.set(currentPlayer.name, leastPoint);
    });
    return result;
  }
  private calculateTeamatesPoint(playerA: Player, playerB: Player): number {
    if (!playerA.teamateHistory.includes(playerB.name)) {
      return 0;
    }
    return playerA.teamateHistory.lastIndexOf(playerB.name) + 1;
  }
  private isAllTeamatesValid(
    offsetValidatePlayers: number,
    totalPlayersAvailable: number,
    teamatesList: { player1: Player; player2: Player }[]
  ): boolean {
    let isOk: boolean = true;
    teamatesList.forEach((each) => {
      if (isOk === false || each.player1.teamateHistory.length <= 0) {
        return;
      }
      let lastplayerIndex = each.player1.teamateHistory.lastIndexOf(
        each.player2.name
      );
      if (lastplayerIndex < 0) {
        return;
      }
      let totalPlayed = each.player1.totalRoundsPlayed;
      if (
        totalPlayed - lastplayerIndex <
        totalPlayersAvailable - offsetValidatePlayers
      ) {
        isOk = false;
        return;
      }
    });
    return isOk;
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
