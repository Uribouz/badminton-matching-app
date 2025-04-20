import { Routes } from '@angular/router';
import { PlayerListComponent } from './players/player-list/player-list.component';
import { MatchListComponent } from './matches/match-list/match-list.component';
import { SettingComponent } from './settings/setting/setting.component';
import { MatchmakerComponent } from './matchmaker/matchmaker.component';

export const routes: Routes = [
  { path: '', redirectTo: 'player-list', pathMatch: 'full' },
  { path: 'player-list', component: PlayerListComponent },
  { path: 'match-list', component: MatchListComponent },
  { path: 'matchmaker', component: MatchmakerComponent},
  { path: 'settings', component: SettingComponent },
];
