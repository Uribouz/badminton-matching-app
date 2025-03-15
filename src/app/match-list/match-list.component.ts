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
const PLAYERS_PER_COURT = 4
const TEAMS_PER_COURT = 2
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

  constructor() {
    // this.playerService.clearAllData();
    // this.matchService.clearCache();
    this.playersMap = this.playerService.loadPlayerList();
    console.log('playersMap: ', this.playersMap)
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
    // console.log('confirmCourt:', this.matchList)
    this.matchList.forEach(court => {
      console.log('court.status:', court)
      if (court.status === COURT_STATUS.PLAYING) {
        return
      }
      court.status = COURT_STATUS.PLAYING
      console.log('set court.status to playing', court)
    
      let confirmedPlayerNames = [court.teamA.player1?.name||'', court.teamA.player2?.name||'', court.teamB.player1?.name||'', court.teamB.player2?.name||'']
      this.confirmedPlayerPlayed(confirmedPlayerNames)
      this.confirmedCourt(court)
      this.matchService.saveMatchList(this.matchList);

      let playingPlayersName = this.matchList.filter(each => each.status === COURT_STATUS.PLAYING)
      .flatMap(each => [each.teamA.player1.name, each.teamA.player2.name, each.teamB.player1.name, each.teamB.player2.name])
      let currentStandbyList = Array.from(this.playersMap.values()).filter(each => !playingPlayersName.includes(each.name)).map(each => each.name)
      this.confirmedPlayerWaited(currentStandbyList)

      this.playerService.savePlayerList(this.playersMap);
    })
  }

  loadStandbyList() {
    let playingPlayers = this.matchList.flatMap(each => [each.teamA.player1?.name||'', each.teamA.player2?.name||'', each.teamB.player1?.name||'', each.teamB.player2?.name||''])
    console.log(`loadStandbyList: ${this.matchList[0]}: ${this.matchList[1]}`)
    this.standbyList = Array.from(this.playersMap.values()).filter(each => !playingPlayers.includes(each.name))
    console.log('standbyList: ', this.standbyList)
  }
  freeCourt(i:number) {
    let currentCourt = this.matchList[i]
    currentCourt.status = COURT_STATUS.AVAILABLE
    this.clearCourt(currentCourt)
    this.matchService.saveMatchList(this.matchList)
    this.loadStandbyList();
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
  }
  confirmedPlayerWaited(names:string[]) {
    names.forEach((name) => {
      let player = this.playersMap.get(name);
      if (!player) {
        player = new Player(name)
      }
      player.roundsWaited += 1;
      this.playersMap.set(name, player)
    })
  }
  confirmedCourt(court: Match) {
    this.confirmedTeamate(court.teamA)
    this.confirmedTeamate(court.teamB)
  }
  confirmedTeamate(team: Teammate) {
    console.log('confirmedTeamate: ', team)
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
  calculatePriorityPoint(player: Player): number {
    const multiplier_rounds_played = 1;
    const multiplier_rounds_waited = 0.5;
    return (multiplier_rounds_played*player.totalRoundsPlayed||0) - (multiplier_rounds_waited*player.roundsWaited||0)
  }
  shuffleWithPriority() {
    let playingPlayers = this.matchList
    .filter(each => each.status === COURT_STATUS.PLAYING)
    .flatMap(each => [each.teamA.player1.name, each.teamA.player2.name, each.teamB.player1.name, each.teamB.player2.name])

    console.log('playingPlayers:', playingPlayers)
    let playerList = Array.from(this.playersMap.values())
    .filter(each => !playingPlayers.includes(each.name))
    .sort((a, b) => {
      let aPoint = this.calculatePriorityPoint(a)
      let bPoint = this.calculatePriorityPoint(b)
      if (aPoint == bPoint) {
        return Math.random() - Math.random()
      }
      return aPoint - bPoint
    })
    console.log('shuffleWithPriority:', playerList.map((each) => {
      return `${each.name}: ${this.calculatePriorityPoint(each)} [${each.totalRoundsPlayed}, ${each.roundsWaited}]`
    }))

    let totalAvailablePlayers = 0;
    this.matchList.forEach(each => {
      if (each.status === COURT_STATUS.AVAILABLE) {
        totalAvailablePlayers += PLAYERS_PER_COURT
      }
    })
    console.log('totalAvailablePlayers: ',totalAvailablePlayers)
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
  }

  //Fuzzy Logic
  calculateTeamates(players: Player[]): {player1: Player; player2: Player}[] {
   let teamates: {player1: Player; player2: Player}[] = []
   let selectedPlayers: string[] = [];
   for (let i =0; i < players.length; i++) {
    const currentPlayer = players[i]
    if (selectedPlayers.includes(currentPlayer.name)) {
      continue;
    }
    let teamate:Player
    if (players.length === i+1) {
      teamate = players[i]
    }
    else {
      let otherPlayers = players.slice(i+1)
      otherPlayers.sort((a, b) => {
        let aPoint = this.calculateTeamatePoint(currentPlayer, a);
        let bPoint = this.calculateTeamatePoint(currentPlayer, b);
        if (aPoint == bPoint) {
          return Math.random() - Math.random()
        }
        return aPoint - bPoint
      })
      teamate = otherPlayers[0]
    }
    teamates = [...teamates, {player1:currentPlayer, player2: teamate}]
    selectedPlayers = [...selectedPlayers, currentPlayer.name,  teamate.name]
   }
    return teamates
  }
  calculateTeamatePoint(playerA: Player, playerB: Player): number {
    if (!playerA.teamateHistory.includes(playerB.name)) {
      return 0;
    }
    return playerA.teamateHistory.lastIndexOf(playerB.name) +1
  }
}
