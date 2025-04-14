import { Component } from '@angular/core';
import { PlayerService } from '../../players/player.service';
import { MatchService } from '../../matches/match.service';

@Component({
  selector: 'app-setting',
  standalone: true,
  imports: [],
  templateUrl: './setting.component.html',
  styleUrl: './setting.component.css'
})
export class SettingComponent {
  playerService: any;
  matchService: any;
  constructor() {
      this.playerService = new PlayerService();
      this.matchService = new MatchService();
  }
  clearAllData() {
    this.playerService.clearAllData();
    this.matchService.clearAllData();
  }
}
