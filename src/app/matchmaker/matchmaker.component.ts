import { Component } from '@angular/core';
import { PlayerListInputComponent } from '../players/player-list-input/player-list-input.component';
import { Player } from '../players/player';

@Component({
  selector: 'app-matchmaker',
  standalone: true,
  imports: [PlayerListInputComponent],
  templateUrl: './matchmaker.component.html',
  styleUrl: './matchmaker.component.css'
})
export class MatchmakerComponent {
  playersMap = new Map<string, Player>();
  outputPlayersMapEvent(newPlayerMap: Map<string, Player>) {
    this.playersMap = newPlayerMap;
    console.log(this.playersMap )
  }
}