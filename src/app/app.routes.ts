import { Routes } from '@angular/router';
import { PlayerListComponent } from './player-list/player-list.component';
import { MatchListComponent } from './match-list/match-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'player-list', pathMatch: 'full' },
  { path: 'player-list', component: PlayerListComponent },
  { path: 'match-list', component: MatchListComponent },
];
