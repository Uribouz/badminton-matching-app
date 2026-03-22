import { Routes } from '@angular/router';
import { PlayerListComponent } from './players/player-list/player-list.component';
import { MatchListComponent } from './matches/match-list/match-list.component';
import { SettingComponent } from './settings/setting/setting.component';
import { LoginComponent } from './auth/login/login.component';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'player-list', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'player-list', component: PlayerListComponent, canActivate: [authGuard] },
  { path: 'match-list', component: MatchListComponent, canActivate: [authGuard] },
  { path: 'settings', component: SettingComponent, canActivate: [authGuard] },
];
