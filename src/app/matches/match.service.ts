import { Injectable } from '@angular/core';
import { Match } from './match';

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
  clearAllData() {
    this.clearMatchList();
    this.clearMatchHistory();
  }
  clearMatchList() {
    localStorage.removeItem('match-list');
  }


  addMatchHistory(match:Match) {
    let matchHistory: Match[] = []
    let data = localStorage.getItem('match-history')
    if (data) {
      matchHistory = JSON.parse(data)
    }
    matchHistory.push(match)
    localStorage.setItem('match-history', JSON.stringify(matchHistory))
  }

  loadMatchHistory():Match[]{
    let data = localStorage.getItem('match-history')
    if (!data) {
      return []
    }
    return JSON.parse(data)
  }
  clearMatchHistory() {
    localStorage.removeItem('match-history')
  }
}
