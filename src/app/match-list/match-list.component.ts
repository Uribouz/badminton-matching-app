import { Component } from '@angular/core';
import { Match, Teammate } from '../match/match';
import { Player } from '../player/player';
import { CommonModule } from '@angular/common';
import { PlayerService } from '../player.service';
import { MatchService } from '../match.service';
enum COURT_STATUS {
  AVAILABLE = 'available',
  PLAYING = 'playing'
}
enum PLAYER_STATUS {
  READY = 'READY',
  BREAK = 'BREAK'
}
const PLAYERS_PER_COURT = 4
const TEAMS_PER_COURT = 2
const TOTAL_COURT = 2
@Component({
  selector: 'app-match-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './match-list.component.html',
  styleUrl: './match-list.component.css'
})
export class MatchListComponent {
  matchList: Match[] = []
  standbyList: Player[] = []
  playersMap = new Map<string, Player>();
  playerService = new PlayerService();
  matchService = new MatchService();
  logData :String[] = []
  constructor() {
    // this.playerService.clearAllData();
    // this.matchService.clearCache();
    this.playersMap = this.playerService.loadPlayerList();
    this.log('playersMap: ', this.playersMap)
    this.matchList = this.matchService.loadMatchList();
    this.loadStandbyList();
    if (this.matchList.length > 0) {
      return
    }
    let firstMatch = new Match
    this.clearCourt(firstMatch)
    this.matchList.push(firstMatch)
    let secondMatch = new Match
    this.clearCourt(secondMatch)
    this.matchList.push(secondMatch)
  }
  log(...args:any[]) {
    console.log(...args)
    this.logData.push(args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' '));
  }
  getPlayerList(): Player[] {
    return Array.from(this.playersMap.values())
  }
  clearCourt(currentCourt: Match) {
    currentCourt.status = 'available'
    currentCourt.teamA.player1 = new Player('');
    currentCourt.teamA.player2 = new Player('');
    currentCourt.teamB.player1 = new Player('');
    currentCourt.teamB.player2 = new Player('');
  }

  confirmCourt() {
    this.log('CONFIRM_COURT start...')
    // this.log('confirmCourt:', this.matchList)
    this.matchList.forEach(court => {
      this.log('court.status:', court)
      if (court.status === COURT_STATUS.PLAYING) {
        return
      }
      if (!court.teamA.player1.name ||
         !court.teamA.player2.name ||
         !court.teamB.player1.name ||
         !court.teamB.player2.name ) {
        this.log('error: court is not full')
        return
      }
      court.status = COURT_STATUS.PLAYING
      this.log('set court.status to playing', court)

      let confirmedPlayerNames = [court.teamA.player1?.name||'', court.teamA.player2?.name||'', court.teamB.player1?.name||'', court.teamB.player2?.name||'']
      this.confirmedPlayerPlayed(confirmedPlayerNames)
      this.confirmedCourt(court)
      this.matchService.saveMatchList(this.matchList);
    })
    let playingPlayersName = this.matchList.filter(each => each.status === COURT_STATUS.PLAYING)
    .flatMap(each => [each.teamA.player1.name, each.teamA.player2.name, each.teamB.player1.name, each.teamB.player2.name])
    let currentStandbyList = Array.from(this.playersMap.values()).filter(each => !playingPlayersName.includes(each.name)).map(each => each.name)
    this.confirmedPlayerWaited(currentStandbyList)

    this.playerService.savePlayerList(this.playersMap);
    this.log('CONFIRM_COURT end...')
  }

  loadStandbyList() {
    let playingPlayers = this.matchList.flatMap(each => [each.teamA.player1?.name||'', each.teamA.player2?.name||'', each.teamB.player1?.name||'', each.teamB.player2?.name||''])
    this.log(`loadStandbyList: ${this.matchList[0]}: ${this.matchList[1]}`)
    this.standbyList = Array.from(this.playersMap.values()).filter(each => !playingPlayers.includes(each.name))
    this.log('standbyList: ', this.standbyList)
  }
  freeCourt(i:number) {
    this.log('FREE_COURT start...')
    let currentCourt = this.matchList[i]
    currentCourt.status = COURT_STATUS.AVAILABLE
    this.clearCourt(currentCourt)
    this.matchService.saveMatchList(this.matchList)
    this.loadStandbyList();
    this.log('FREE_COURT end...')
  }


  confirmedPlayerPlayed(names:string[]) {
    names.forEach((name) => {
      let player = this.playersMap.get(name);
      if (!player) {
        player = new Player(name)
      }
      player.totalRoundsPlayed += 1;
      player.roundsWaited = 0;
      this.playersMap.set(name, player)
    })
    this.log(`players played: \n`, names.join(', '))
  }
  confirmedPlayerWaited(names:string[]) {
    let logData: string[] = []
    names.forEach((name) => {
      let player = this.playersMap.get(name);
      if (!player) {
        player = new Player(name)
      }
      if (player.status === PLAYER_STATUS.BREAK) {
        player.roundsWaited = 0;
      } else {
        player.roundsWaited += 1;
      }
      logData.push(`${name}:${player.roundsWaited}`)
      this.playersMap.set(name, player)
    })
    this.log(`player waited: \n`, logData.join(', '))
  }
  confirmedCourt(court: Match) {
    this.confirmedTeamate(court.teamA)
    this.confirmedTeamate(court.teamB)
  }
  confirmedTeamate(team: Teammate) {
    this.log('confirmedTeamate: ', team)
    this.confirmedTeamatePlayer(team.player1.name, team.player2.name)
    this.confirmedTeamatePlayer(team.player2.name, team.player1.name)
  }
  confirmedTeamatePlayer(playerName1: string, playerName2: string) {
    let player1 = this.playersMap.get(playerName1)
    if (!player1) {
      return
    }
    player1.teamateHistory = [...player1.teamateHistory, playerName2]
    this.playersMap.set(player1.name, player1)
  }

  //Fuzzy Logic
  calculatePriorityPoint(player: Player, multiplier_rounds_waited: number): number {
    const multiplier_rounds_played = 1;
    return (multiplier_rounds_played*player.totalRoundsPlayed||0) - (multiplier_rounds_waited*player.roundsWaited||0)
  }
  shuffleWithPriority() {
    this.log('SHUFFLE start ...')
    const multiplier_rounds_waited = 1/(this.playersMap.size-(TOTAL_COURT*PLAYERS_PER_COURT));
    this.log('multiplier_rounds_waited: ', multiplier_rounds_waited)
    let playingPlayers = this.matchList
    .filter(each => each.status === COURT_STATUS.PLAYING)
    .flatMap(each => [each.teamA.player1.name, each.teamA.player2.name, each.teamB.player1.name, each.teamB.player2.name])

    this.log('playingPlayers:', playingPlayers)
    let playerList = Array.from(this.playersMap.values())
    .filter(each => !playingPlayers.includes(each.name))
    .filter(each => each.status !== PLAYER_STATUS.BREAK)
    .sort((a, b) => {
      let aPoint = this.calculatePriorityPoint(a, multiplier_rounds_waited)
      let bPoint = this.calculatePriorityPoint(b, multiplier_rounds_waited)
      if (aPoint == bPoint) {
        return Math.random() - Math.random()
      }
      return aPoint - bPoint
    })
    this.log('shuffleWithPriority:', playerList.map((each) => {
      return `${each.name}: ${this.calculatePriorityPoint(each, multiplier_rounds_waited)} [${each.totalRoundsPlayed}, ${each.roundsWaited}]`
    }))

    let totalAvailablePlayers = 0;
    this.matchList.forEach(each => {
      if (each.status === COURT_STATUS.AVAILABLE) {
        totalAvailablePlayers += PLAYERS_PER_COURT
      }
    })
    this.log('totalAvailablePlayers: ',totalAvailablePlayers)
    if (totalAvailablePlayers <= 0 ){
      return
    }
    let teamateList = this.calculateTeamates(playerList.slice(0,totalAvailablePlayers ))
    this.matchList.map((each) => {
      if (each.status === COURT_STATUS.PLAYING)
        return
      each.teamA.player1 = teamateList[0].player1
      each.teamA.player2 = teamateList[0].player2
      each.teamB.player1 = teamateList[1].player1
      each.teamB.player2 = teamateList[1].player2
      teamateList.splice(0, TEAMS_PER_COURT);
    })
    this.loadStandbyList();
    this.matchService.saveMatchList(this.matchList)
    this.log('SHUFFLE end ...')
  }

  //Fuzzy Logic
  calculateTeamates(players: Player[]): {player1: Player; player2: Player}[] {
   let teamates: {player1: Player; player2: Player}[] = []
   let remainingPlayers: Player[] = players.slice().sort((a,b) => {
    let aPoint = this.calculateFirstPriorityPlayer(a, players);
    let bPoint = this.calculateFirstPriorityPlayer(b, players);
    if (aPoint === bPoint) {
      return Math.random() - Math.random()
    }
    return aPoint - bPoint
   });
   this.log("first: remainingPlayers: ", remainingPlayers)

   while (remainingPlayers.length > 0) {
    const currentPlayer = remainingPlayers[0]
    let teamate:Player
    let otherPlayers = remainingPlayers.slice(1)
    if (otherPlayers.length <= 0) {
      break;
    }
    otherPlayers.sort((a, b) => {
      let aPoint = this.calculateTeamatePoint(currentPlayer, a);
      let bPoint = this.calculateTeamatePoint(currentPlayer, b);
      if (aPoint === bPoint) {
        return Math.random() - Math.random()
      }
      return aPoint - bPoint
    })
    teamate = otherPlayers[0]
    teamates = [...teamates, {player1:currentPlayer, player2: teamate}]
    remainingPlayers = remainingPlayers.filter(each => currentPlayer.name != each.name && teamate.name != each.name)
    // this.log("teamates: ", teamates)
    // this.log("remainingPlayers: ", remainingPlayers)
   }
    return teamates
  }

  calculateTeamatePoint(playerA: Player, playerB: Player): number {
    if (!playerA.teamateHistory.includes(playerB.name)) {
      return 0;
    }
    return playerA.teamateHistory.lastIndexOf(playerB.name) +1
  }

  calculateFirstPriorityPlayer(currentPlayer: Player, otherPlayers: Player[]): number {
    let leastPoint = 999
    this.log(`currentPlayer ${currentPlayer.name} each: ${currentPlayer.teamateHistory}`)
    this.log(`otherPlayers ${otherPlayers.flatMap(each => each.name)}`)
    otherPlayers.filter(each => each.name != currentPlayer.name).forEach(each => {
      let currentPoint = 999;
      if (currentPlayer.teamateHistory.includes(each.name)) {
        currentPoint = currentPlayer.teamateHistory.length - currentPlayer.teamateHistory.lastIndexOf(each.name)
      }
      // this.log(`currentPoint = ${currentPoint}`)
      if (currentPoint < leastPoint) {
        leastPoint = currentPoint
      }
    })
    this.log(`name: ${currentPlayer.name} = ${leastPoint}`)
    return leastPoint
  }
  downloadLog() {
    const logData = this.logData.join('\n');
    const blob = new Blob([logData], { type: 'text'});
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'badminton-debug.log'
    link.click();
    window.URL.revokeObjectURL(url);
  }

  changePlayerStatus(name:string) {
    // this.log('CHANGE_PLAYER_STATUS start...')
    let player = this.playersMap.get(name)
    if (!player) {
      this.log(`error not found player ${name}`)
      return
    }
    if (player.status !== PLAYER_STATUS.BREAK) {
      player.status = PLAYER_STATUS.BREAK;
      this.log(`player: ${name} break`)
    }
    else {
      player.status = PLAYER_STATUS.READY;
      this.log(`player: ${name} ready`)
    }
    this.playersMap.set(player.name,player)
    this.playerService.savePlayerList(this.playersMap);
    // this.log('CHANGE_PLAYER_STATUS end ...')
  }
}
