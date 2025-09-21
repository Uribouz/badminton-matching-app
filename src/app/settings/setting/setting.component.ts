import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PlayerService } from '../../players/player.service';
import { MatchService } from '../../matches/match.service';
import { SettingService } from '../../settings/setting.service';

@Component({
  selector: 'app-setting',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './setting.component.html',
  styleUrl: './setting.component.css'
})
export class SettingComponent {
  public forceTeamates: {player1:string, player2: string}[] = [];
  public nemesisTeamates: {player1:string, player2: string}[] = [];
  settingService = new SettingService();
  forceTeamatePlayer1: string = "";
  forceTeamatePlayer2: string = "";
  nemesisTeamatePlayer1: string = "";
  nemesisTeamatePlayer2: string = "";
  constructor(private playerService: PlayerService, private matchService: MatchService) {
      this.forceTeamates = this.settingService.loadForceTeamates();
      this.nemesisTeamates = this.settingService.loadNemesisTeamates();
  }
  onSubmitForceTeamate() {
    this.settingService.addForceTeamate({player1: this.forceTeamatePlayer1, player2: this.forceTeamatePlayer2});
    this.clearForceTeamateInputs();
    this.forceTeamates = this.settingService.loadForceTeamates();
  }
  private clearForceTeamateInputs(): void {
    this.forceTeamatePlayer1 = '';
    this.forceTeamatePlayer2 = '';
  }
  onClickDeleteForceTeamate(forceTeamate: {player1: string, player2: string}) {
    this.settingService.deleteForceTeamate(forceTeamate)
    this.forceTeamates = this.settingService.loadForceTeamates();
  }
  onSubmitNemesisTeamate() {
    this.settingService.addNemesisTeamate({player1: this.nemesisTeamatePlayer1, player2: this.nemesisTeamatePlayer2});
    this.clearNemesisTeamateInputs();
    this.nemesisTeamates = this.settingService.loadNemesisTeamates();
  }
  private clearNemesisTeamateInputs(): void {
    this.nemesisTeamatePlayer1 = '';
    this.nemesisTeamatePlayer2 = '';
  }
  onClickDeleteNemesis(nemesis: {player1: string, player2: string}) {
    this.settingService.deleteNemesisTeamate(nemesis)
    this.nemesisTeamates = this.settingService.loadNemesisTeamates();
  }
  clearAllData() {
    this.playerService.clearAllData();
    this.matchService.clearAllData();
  }
}
