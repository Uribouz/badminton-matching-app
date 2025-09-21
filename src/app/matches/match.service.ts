import { Injectable } from '@angular/core';
import { Match } from './match';
import { HttpClient } from '@angular/common/http';
import { Constants } from '../shared/constants';
import { environment } from '../../envionments/environment';


@Injectable({
  providedIn: 'root'
})
export class MatchService {
  constructor(private http: HttpClient) {}
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
    this.syncMatchHistoryToAPI(match)
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
   syncMatchHistoryToAPI(match: Match) {
      let today = new Date();
      const eventId = `${Constants.eventIdPrefix}:${today.toLocaleDateString()}`;
      const apiUrl = `${environment.apiUrl}/matches`;
      const payload = {
        event_id: eventId,
        court_no: match.courtNo,
        date_time: match.matchTime,
        status: match.status,
        team_a: {player_1: match.teamA.player1.name, 
                player_2: match.teamA.player2.name},
        team_b: {player_1: match.teamB.player1.name, 
                player_2: match.teamB.player2.name},
        who_won: match.whoWon,
      };
      
      this.http.post(apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      }).subscribe({
        next: (response) => {
          console.log(`Match court ${match.courtNo} synced successfully:`, response);
        },
        error: (error) => {
          console.error(`Error syncing match court ${match.courtNo}:`, error);
        }
      });
    }
}
