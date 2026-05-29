import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PlayerService } from '../../players/player.service';
import { MatchService } from '../../matches/match.service';
import { SettingService } from '../../settings/setting.service';
import { AuthService } from '../../auth/auth.service';
import { Player } from '../../players/player';

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
  forceTeamatePlayer1: string = "";
  forceTeamatePlayer2: string = "";
  nemesisTeamatePlayer1: string = "";
  nemesisTeamatePlayer2: string = "";

  shuffleMode: 'balanced' | 'mixed' | 'novel' | 'auto' = 'auto';
  playersMap = new Map<string, Player>();
  rankOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  constructor(private playerService: PlayerService, private matchService: MatchService, private settingService: SettingService, private authService: AuthService, private router: Router) {
      this.forceTeamates = this.settingService.loadForceTeamates();
      this.nemesisTeamates = this.settingService.loadNemesisTeamates();
      this.shuffleMode = this.settingService.loadShuffleMode();
      this.playersMap = this.playerService.loadPlayerList();
      this.playersMap.forEach(p => { p.rank = p.rank ?? 5; });
  }

  getPlayerList(): Player[] {
    return Array.from(this.playersMap.values());
  }

  setShuffleMode(mode: 'balanced' | 'mixed' | 'novel' | 'auto') {
    this.shuffleMode = mode;
    this.settingService.saveShuffleMode(mode);
  }

  onPlayerRankChange(playerName: string, rank: number) {
    const player = this.playersMap.get(playerName);
    if (!player) return;
    player.rank = Number(rank);
    this.playersMap.set(playerName, player);
    this.playerService.savePlayerList(this.playersMap);
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
  async logout() {
    await this.authService.signOut();
    this.router.navigate(['/login']);
  }
}
