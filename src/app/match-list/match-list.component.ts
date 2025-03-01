import { Component } from '@angular/core';
import { Match } from '../match/match';
import { Player } from '../player/player';
import { CommonModule } from '@angular/common';

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
  constructor() {
    let firstMatch = new Match
    firstMatch.courtNumber = 1
    firstMatch.teamA.player1 = new Player('Ball');
    firstMatch.teamA.player2 = new Player('Nice');
    firstMatch.teamB.player1 = new Player('Johan');
    firstMatch.teamB.player2 = new Player('Win');
    this.matchList.push(firstMatch)
    let secondMatch = new Match
    secondMatch.courtNumber = 2
    secondMatch.teamA.player1 = new Player('Gatwaux');
    secondMatch.teamA.player2 = new Player('P');
    secondMatch.teamB.player1 = new Player('Kwan');
    secondMatch.teamB.player2 = new Player('Ice');
    this.matchList.push(secondMatch)

    this.standbyList.push(new Player('Oat'))
    this.standbyList.push(new Player('Burg'))
    this.standbyList.push(new Player('Field'))
  }
}
