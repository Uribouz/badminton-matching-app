import { Injectable } from '@angular/core';
import { Player } from './player/player';
import { Status } from './status/status';
import { BehaviorSubject } from 'rxjs';
@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  // State
  private playerSubject = new BehaviorSubject<Player[]>([]);
  players$ = this.playerSubject.asObservable();
  constructor() {
    // this.clearAllData()
    //Load player-list from cached
    let playersList: Player[] = []
    let playerListTmp = localStorage.getItem('player-list');
    console.log('load player-list')
    if (playerListTmp) {
      playersList = new Array(JSON.parse(playerListTmp));
      console.log('playersList:', playersList)
      this.playerSubject.next(playersList)
    }
  }
  save(playersList: Player[]) {
    console.log('save player-list:', playersList)
    localStorage.setItem(
      'player-list',
      JSON.stringify(Array.from(playersList))
    )
  }
  savePlayerList(playersList: Player[]) {
    // let currentPlayerList = this.playerSubject.getValue();
    this.playerSubject.next(playersList)
    this.save(this.playerSubject.getValue())
  }
  addPlayer(player: Player) {
    const playersList = this.playerSubject.getValue()
    this.playerSubject.next([...playersList, player])
    this.save(this.playerSubject.getValue())
  }
  updatePlayer(player: Player){
    const playersList = this.playerSubject.getValue()
    this.playerSubject.next(playersList.map(
      each => each.name === player.name ? player : each
    ))
    this.save(this.playerSubject.getValue())
  }
  removePlayer(playerName: string) {
    const playersList = this.playerSubject.getValue();
    this.playerSubject.next(playersList.filter(each => each.name !== playerName));
    this.save(this.playerSubject.getValue())
  }
  

  // loadPlayerList(): Map<string, Player> {
  //   let playerList = localStorage.getItem('player-list');
  //   if (!playerList) {
  //     return new Map<string, Player>();
  //   }
  //   var playersMap: Map<string, Player>;
  //   playersMap = new Map(JSON.parse(playerList));
  //   //Temp fixed: Clear save data on load from cached.
  //   playersMap.forEach(
  //     (value, key, playerMap) => (value.isPreviouslyInteracted = false)
  //   );
  //   this.playerSubject.next(Array.from(playersMap.values()))
  //   return playersMap;
  // }

  savePlayerStatus(status: Status) {
    localStorage.setItem('players-status', JSON.stringify(status));
  }
  loadPlayerStatus(): Status {
    let status = localStorage.getItem('players-status');
    if (!status) {
      return new Status();
    }
    return JSON.parse(status);
  }
  clearAllData() {
    localStorage.removeItem('player-list');
    localStorage.removeItem('players-status');
  }
}
