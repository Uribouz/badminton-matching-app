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


  addMatchHistory(match:Match):Match[] {
    let matchHistory: Match[] = []
    let data = localStorage.getItem('match-history')
    if (data) {
      matchHistory = JSON.parse(data)
    }
    match = structuredClone(match)
    matchHistory.push(match)
    localStorage.setItem('match-history', JSON.stringify(matchHistory))
    return matchHistory
  }

  loadMatchHistory():Match[]{
    let data = localStorage.getItem('match-history')
    if (!data) {
      return []
    }
    return JSON.parse(data)
  }
  loadPlayerOpponents():Map<string, string[]>{
    let result = new Map<string, string[]>();
    let history: Match[] = this.loadMatchHistory();
    let setEachResult = function (currentPlayer: string, oppositePlayer1: string,oppositePlayer2: string):string[] {
      let oldVal = result.get(currentPlayer);
      let nowResult = [oppositePlayer1, oppositePlayer2];
      if (oldVal) {
        nowResult = [...oldVal, ...nowResult]
      }
      return nowResult;
    }
    history.forEach( each => {
      result.set(each.teamA.player1.name, setEachResult(each.teamA.player1.name, each.teamB.player1.name,each.teamB.player2.name));
      result.set(each.teamA.player2.name, setEachResult(each.teamA.player2.name, each.teamB.player1.name,each.teamB.player2.name));
      result.set(each.teamB.player1.name, setEachResult(each.teamB.player1.name, each.teamA.player1.name,each.teamA.player2.name));
      result.set(each.teamB.player2.name, setEachResult(each.teamB.player2.name, each.teamA.player1.name,each.teamA.player2.name));
    })
    return result
  }
  clearMatchHistory() {
    localStorage.removeItem('match-history')
  }
}
