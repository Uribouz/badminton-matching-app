import { Injectable } from '@angular/core';
import { Player } from "./player/player";
@Injectable({
  providedIn: 'root'
})
export class PlayerService {
  constructor() { }
  savePlayerLlist(playersMap:Map<string,Player>) {
    localStorage.setItem(
      'player-list',
      JSON.stringify(Array.from(playersMap.entries()))
    );
  }
  loadPlayerList() {
    let playerList = localStorage.getItem('player-list');
    if (!playerList) {
      return;
    }
    var playersMap:Map<string,Player>
    playersMap = new Map(JSON.parse(playerList));
    //Temp fixed: Clear save data on load from cached.
    playersMap.forEach((value,key,playerMap) => value.isPreviouslyInteracted = false);
    return playersMap
  }
}
