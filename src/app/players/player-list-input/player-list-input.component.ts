import { Component, input, output } from '@angular/core';
import { PlayerService } from '../player.service';
import { Player } from '../player';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-player-list-input',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './player-list-input.component.html',
  styleUrl: './player-list-input.component.css'
})
export class PlayerListInputComponent {
  playerMap: Map<string, Player> = new Map<string, Player>
  //WIP Load data into textarea
  myTextarea = "kub,zzzz"
  inputPlayersMap = input.required<Map<string, Player>>()
  outputPlayersMap = output<Map<string, Player>>()
  playerService = new PlayerService();
  constructor() {
    this.playerMap = this.playerService.loadPlayerList()
    this.myTextarea = "kub,zzzz"
  }
  addPlayerList(newPlayers: string) {
    let leastPlayed = this.playerService.loadPlayerStatus().leastPlayed;
    this.outputPlayersMap.emit(
      this.playerService.addPlayerList(leastPlayed, this.inputPlayersMap(), newPlayers)
    );
    // this.loadStandbyList();
  }
}
