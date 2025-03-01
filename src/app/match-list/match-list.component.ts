import { Component } from '@angular/core';
import { Match } from '../match/match';
import { Player } from '../player/player';
import { CommonModule } from '@angular/common';
import { PlayerService } from '../player.service';

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

  constructor() {
    this.playersMap = this.playerService.loadPlayerList();
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
    let currentCourt = this.matchList[i]
    currentCourt.status = 'playing'
    
    this.addNewTotalRoundPlayed(currentCourt.teamA.player1.name)
    this.addNewTotalRoundPlayed(currentCourt.teamA.player2.name)
    this.addNewTotalRoundPlayed(currentCourt.teamB.player1.name)
    this.addNewTotalRoundPlayed(currentCourt.teamB.player2.name)

    this.playerService.savePlayerList(this.playersMap);
  }

  freeCourt(i:number) {
    let currentCourt = this.matchList[i]
    currentCourt.status = 'available'
  }

  addNewTotalRoundPlayed(name:string) {
    let player = this.playersMap.get(name);
    if (!player) {
      player = new Player(name)
    }
    player.totalRoundsPlayed += 1;
    this.playersMap.set(name, player)
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
    .sort((a, b) => a.totalRoundsPlayed - b.totalRoundsPlayed )
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
    this.matchList.map((each) => {
      if (each.status === 'playing')
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
  }
}
