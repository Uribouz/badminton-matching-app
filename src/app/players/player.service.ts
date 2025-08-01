import { Injectable } from '@angular/core';
import { Player } from './player';
import { Status } from './status';
@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  constructor() {}
  addPlayerList(
    leastPlayed: number | 0,
    playersMap: Map<string, Player>,
    newPlayers: string
  ): Map<string, Player> {
    newPlayers.split(',').forEach((player) => {
      if (!playersMap.has(player)) {
        console.log('New player: ' + player);
        let newPlayer = new Player(player);
        newPlayer.totalRoundsPlayed = leastPlayed;
        playersMap.set(player, newPlayer);
      }
    });
    this.savePlayerList(playersMap);
    return playersMap;
  }
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
  updatePlayerRoundsPlayed(
    playerMap: Map<string, Player>,
    playerName: string,
    value: number
  ): Map<string, Player> {
    console.log('updatePlayerRoundsPlayed: ' + playerName + ': ' + value);
    let player = playerMap.get(playerName);
    if (!player) {
      return playerMap;
    }
    player.totalRoundsPlayed += value;
    if (player.totalRoundsPlayed < 0) {
      player.totalRoundsPlayed = 0;
    }
    player.isPreviouslyInteracted = true;
    playerMap.set(playerName, player);
    console.log('player:');
    console.log(player);
    this.savePlayerList(playerMap);
    return playerMap;
  }
  updatePlayerActualGamesPlayed(
    playerMap: Map<string, Player>,
    playerName: string,
    value: number
  ): Map<string, Player> {
    console.log('updatePlayerActualGamesPlayed: ' + playerName + ': ' + value);
    let player = playerMap.get(playerName);
    if (!player) {
      return playerMap;
    }
    player.actualTotalRoundsPlayed += value;
    if (player.actualTotalRoundsPlayed < 0) {
      player.actualTotalRoundsPlayed = 0;
    }
    player.isPreviouslyInteracted = true;
    playerMap.set(playerName, player);
    console.log('player:');
    console.log(player);
    this.savePlayerList(playerMap);
    return playerMap;
  }
  deletePlayer(
    playerMap: Map<string, Player>,
    playerName: string
  ): Map<string, Player> {
    playerMap.delete(playerName);
    this.savePlayerList(playerMap);
    return playerMap;
  }

  //Status
  revalidateStatus(
    playerStatus: Status,
    playerMap: Map<string, Player>
  ): Status {
    if (playerMap.size <= 0) {
      playerStatus = new Status();
      return playerStatus;
    }
    console.log(
      'playerMap.values().next().value: ' + playerMap.values().next().value
    );
    if (playerMap) {
      playerStatus.leastPlayed =
        playerMap?.values()?.next()?.value?.totalRoundsPlayed ?? 0;
      playerStatus.mostPlayed =
        playerMap?.values()?.next()?.value?.totalRoundsPlayed ?? 0;
      playerMap.forEach((value) => {
        if (playerStatus.leastPlayed > value.totalRoundsPlayed) {
          playerStatus.leastPlayed = value.totalRoundsPlayed;
        }
        if (playerStatus.mostPlayed < value.totalRoundsPlayed) {
          playerStatus.mostPlayed = value.totalRoundsPlayed;
        }
        // console.log('player:' + player + ': ' + value.totalRoundsPlayed);
      });
    }
    console.log(
      'revalidateStatus: ' +
        playerStatus.leastPlayed +
        ' - ' +
        playerStatus.mostPlayed
    );
    this.savePlayerStatus(playerStatus);
    return playerStatus;
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
