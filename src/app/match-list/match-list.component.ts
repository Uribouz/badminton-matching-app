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
    this.matchList = this.matchService.loadMatchList();
    let playerNames = this.matchList.flatMap(each => [each.teamA.player1.name, each.teamA.player2.name, each.teamB.player1.name, each.teamB.player2.name])
    this.standbyList = Array.from(this.playersMap.values()).filter(each => !playerNames.includes(each.name))
    console.log('standbyList: ', this.standbyList)
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


  randomPlayer(arr: Player[]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]; // Swap elements
    }
    return arr;
  }
  shuffleWithPriority() {
    let mapStandbyList = new Map(this.standbyList.map((each) => [each.name, each]));
    let playerList = this.randomPlayer(Array.from(this.playersMap.values()))
    .sort((a, b) => {
      let aIsStandBy = mapStandbyList.has(a.name)
      let bIsStandBy = mapStandbyList.has(b.name)

      if (aIsStandBy && !bIsStandBy) {
        return -1
      }
      if (!aIsStandBy && bIsStandBy) {
        return 1
      }
      return 0
    })
    .sort((a, b) => a.totalRoundsPlayed - b.totalRoundsPlayed )
    this.matchList.map((each) => {
      if (each.status === COURT_STATUS.PLAYING)
        return
      each.teamA.player1 = playerList[0]
      each.teamA.player2 = playerList[1]
      each.teamB.player1 = playerList[2]
      each.teamB.player2 = playerList[3]
      playerList.splice(0, 4);
    })
    this.standbyList = []
    playerList.forEach((each) => {
      this.standbyList.push(each)
    })
    this.matchService.saveMatchList(this.matchList)
  }
}
