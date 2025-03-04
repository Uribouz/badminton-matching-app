import { Injectable } from '@angular/core';
import { MatchListComponent } from './match-list/match-list.component';
import { Match } from './match/match';
import { Player } from './player/player';

@Injectable({
  providedIn: 'root'
})
export class MatchService {

  constructor() { }
  saveMatchList(matchList: Match[]) {
    localStorage.setItem('match-list', JSON.stringify(matchList))
  }
  loadMatchList():Match[] {
     var matchList: Match[] = []
     let data = localStorage.getItem('match-list')
     if (!data) {
      return matchList
     }
     matchList = JSON.parse(data)
    return matchList
  }
  saveStandbyList(standbyList: Player[]) {
    localStorage.setItem('standby-list', JSON.stringify(standbyList))
  }
  loadStandbyList():Player[] {
     var standbyList: Player[] = []
     let data = localStorage.getItem('standby-list')
     if (!data) {
      return standbyList
     }
     standbyList = JSON.parse(data)
    return standbyList
  }
}
