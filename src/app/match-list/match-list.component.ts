import { Component } from '@angular/core';
import { Match } from '../match/match';
import { Player } from '../player/player';
import { CommonModule } from '@angular/common';
import { PlayerService } from '../player.service';
import { MatchService } from '../match.service';

enum COURT_STATUS {
  AVAILABLE = 'available',
  PLAYING = 'playing'
}
const PLAYERS_PER_COURT = 4
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
    this.playersMap = this.playerService.loadPlayerList();
    console.log('playersMap: ', this.playersMap)
    this.matchList = this.matchService.loadMatchList();
    this.loadStandbyList();
    if (this.matchList.length > 0) {
      return
    }
    let firstMatch = new Match
    firstMatch.teamA.player1 = new Player('');
    firstMatch.teamA.player2 = new Player('');
    firstMatch.teamB.player1 = new Player('');
    firstMatch.teamB.player2 = new Player('');
    this.matchList.push(firstMatch)
    let secondMatch = new Match
    secondMatch.teamA.player1 = new Player('');
    secondMatch.teamA.player2 = new Player('');
    secondMatch.teamB.player1 = new Player('');
    secondMatch.teamB.player2 = new Player('');
    this.matchList.push(secondMatch)
    
  }

  confirmCourt(i:number) {
    let court = this.matchList[i]
    this.matchList[i].status = COURT_STATUS.PLAYING
   
    let confirmedPlayerNames = [court.teamA.player1.name, court.teamA.player2.name, court.teamB.player1.name, court.teamB.player2.name]
    this.addTotalRoundPlayed(confirmedPlayerNames)
    this.matchService.saveMatchList(this.matchList);

    let playingPlayersName = this.matchList.filter(each => each.status = COURT_STATUS.PLAYING)
    .flatMap(each => [each.teamA.player1.name, each.teamA.player2.name, each.teamB.player1.name, each.teamB.player2.name])
    let currentStandbyList = Array.from(this.playersMap.values()).filter(each => !playingPlayersName.includes(each.name)).map(each => each.name)
    this.addTotalRoundWaited(currentStandbyList)

    this.playerService.savePlayerList(this.playersMap);
  }

  loadStandbyList() {
    let playerNames = this.matchList.flatMap(each => [each.teamA.player1.name, each.teamA.player2.name, each.teamB.player1.name, each.teamB.player2.name])
    this.standbyList = Array.from(this.playersMap.values()).filter(each => !playerNames.includes(each.name))
    console.log('standbyList: ', this.standbyList)
  }
  freeCourt(i:number) {
    let currentCourt = this.matchList[i]
    currentCourt.status = COURT_STATUS.AVAILABLE
    this.matchService.saveMatchList(this.matchList)
  }

  addTotalRoundPlayed(names:string[]) {
    names.forEach((name) => {
      let player = this.playersMap.get(name);
      if (!player) {
        player = new Player(name)
      }
      player.totalRoundsPlayed += 1;
      this.playersMap.set(name, player)
    })
  }
  addTotalRoundWaited(names:string[]) {
    names.forEach((name) => {
      let player = this.playersMap.get(name);
      if (!player) {
        player = new Player(name)
      }
      player.roundsWaited += 1;
      this.playersMap.set(name, player)
    })
  }


  //Fuzzy Logic
  calculatePoint(player: Player): number {
    const multiplier_rounds_played = 1;
    const multiplier_rounds_waited = 0.5;
    return (multiplier_rounds_played*player.totalRoundsPlayed||0) - (multiplier_rounds_waited*player.roundsWaited||0)
  }
  shuffleWithPriority() {
    let playerList = Array.from(this.playersMap.values())
    .sort((a, b) => {
      let aPoint = this.calculatePoint(a)
      let bPoint = this.calculatePoint(b)
      if (aPoint == bPoint) {
        return Math.random() - Math.random()
      }
      return this.calculatePoint(a) - this.calculatePoint(b)
    })
    console.log('shuffleWithPriority:', playerList.map((each) => {
      return `${each.name}: ${this.calculatePoint(each)} [${each.totalRoundsPlayed}, ${each.roundsWaited}]`
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
    let selectedPlayerList = playerList.splice(0,totalAvailablePlayers )
    .sort((a, b) => {
      //WIP: check player playedHistory
      return Math.random() - Math.random()
    })
    this.matchList.map((each) => {
      if (each.status === COURT_STATUS.PLAYING)
        return
      each.teamA.player1 = selectedPlayerList[0]
      each.teamA.player2 = selectedPlayerList[1]
      each.teamB.player1 = selectedPlayerList[2]
      each.teamB.player2 = selectedPlayerList[3]
      selectedPlayerList.splice(0, PLAYERS_PER_COURT);
      totalAvailablePlayers -= PLAYERS_PER_COURT
    })


    this.loadStandbyList();
    this.matchService.saveMatchList(this.matchList)
  }
}
