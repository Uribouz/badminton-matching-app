import { Injectable } from '@angular/core';
import { Player } from './player/player';
import { Status } from './status/status';
@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  constructor() {}
  savePlayerList(playersMap: Map<string, Player>) {
    localStorage.setItem(
      'player-list',
      JSON.stringify(Array.from(playersMap.entries()))
    );
  }
  loadPlayerList(): Map<string, Player> {
    let playerList = localStorage.getItem('player-list');
    if (!playerList) {
      return new Map<string, Player>();
    }
    var playersMap: Map<string, Player>;
    playersMap = new Map(JSON.parse(playerList));
    //Temp fixed: Clear save data on load from cached.
    playersMap.forEach(
      (value, key, playerMap) => (value.isPreviouslyInteracted = false)
    );
    return playersMap;
  }

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
