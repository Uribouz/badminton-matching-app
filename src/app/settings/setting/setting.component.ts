import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PlayerService } from '../../players/player.service';
import { MatchService } from '../../matches/match.service';
import { SettingService } from '../../settings/setting.service';
import { AuthService } from '../../auth/auth.service';

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

  shuffleMode: 'tiered' | 'spread' | 'mixed' | 'novel' | 'auto' = 'auto';
  tieredPct = 40;
  spreadPct = 20;
  novelPct = 10;
  get mixedPct() { return 100 - this.tieredPct - this.spreadPct - this.novelPct; }
  playerNames: string[] = [];

  constructor(private playerService: PlayerService, private matchService: MatchService, private settingService: SettingService, private authService: AuthService, private router: Router) {
      this.forceTeamates = this.settingService.loadForceTeamates();
      this.nemesisTeamates = this.settingService.loadNemesisTeamates();
      this.shuffleMode = this.settingService.loadShuffleMode();
      const weights = this.settingService.loadShuffleModeWeights();
      this.tieredPct = weights.tiered;
      this.spreadPct = weights.spread;
      this.novelPct = weights.novel;
      this.playerNames = Array.from(this.playerService.loadPlayerList().keys());
  }

  setShuffleMode(mode: 'tiered' | 'spread' | 'mixed' | 'novel' | 'auto') {
    this.shuffleMode = mode;
    this.settingService.saveShuffleMode(mode);
  }

  onTieredPctChange() {
    this.clampOthers(['spreadPct', 'novelPct']);
    this.saveWeights();
  }
  onSpreadPctChange() {
    this.clampOthers(['novelPct', 'tieredPct']);
    this.saveWeights();
  }
  onNovelPctChange() {
    this.clampOthers(['spreadPct', 'tieredPct']);
    this.saveWeights();
  }
  // Reduces the listed sliders (in order) so tiered+spread+novel never exceeds 100;
  // mixed is always the remainder.
  private clampOthers(others: Array<'tieredPct' | 'spreadPct' | 'novelPct'>) {
    let excess = this.tieredPct + this.spreadPct + this.novelPct - 100;
    for (const key of others) {
      if (excess <= 0) break;
      const reduce = Math.min(this[key], excess);
      this[key] -= reduce;
      excess -= reduce;
    }
  }
  private saveWeights() {
    this.settingService.saveShuffleModeWeights({ tiered: this.tieredPct, spread: this.spreadPct, mixed: this.mixedPct, novel: this.novelPct });
  }

  onSelectForcePlayer(name: string) {
    if (!this.forceTeamatePlayer1) {
      this.forceTeamatePlayer1 = name;
    } else if (!this.forceTeamatePlayer2 && this.forceTeamatePlayer1 !== name) {
      this.forceTeamatePlayer2 = name;
    }
  }

  onSelectNemesisPlayer(name: string) {
    if (!this.nemesisTeamatePlayer1) {
      this.nemesisTeamatePlayer1 = name;
    } else if (!this.nemesisTeamatePlayer2 && this.nemesisTeamatePlayer1 !== name) {
      this.nemesisTeamatePlayer2 = name;
    }
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
    this.settingService.saveForceTeamates([]);
    this.settingService.saveNemesisTeamates([]);
    this.forceTeamates = [];
    this.nemesisTeamates = [];
    this.forceTeamatePlayer1 = '';
    this.forceTeamatePlayer2 = '';
    this.nemesisTeamatePlayer1 = '';
    this.nemesisTeamatePlayer2 = '';
    this.playerNames = [];
  }
  async logout() {
    await this.authService.signOut();
    this.router.navigate(['/login']);
  }
}
