import { Component } from '@angular/core';
import { Player } from '../player/player';
import { CommonModule, KeyValue } from '@angular/common';
import { max } from 'rxjs';
import { Status } from '../status/status';
import { PlayerService } from '../player.service';
@Component({
  selector: 'app-player-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-list.component.html',
  styleUrl: './player-list.component.css',
})
export class PlayerListComponent {
  lastInteractPlayers: Map<string, string> = new Map<string, string>();
  playersPerCourt = 4;
  maximumInteractPlayers = this.playersPerCourt * 2;
  status = new Status();
  playersMap = new Map<string, Player>();
  playerService = new PlayerService();
  players$ = this.playerService.players$;
  constructor() {
    this.playerService.clearAllData();
    this.players$.subscribe(data => {
      console.log('players$.subscribe: ', data[0])
      this.playersMap = new Map(data.map(each => [each.name, each]));
    })
    this.loadPlayerData();
  }
  getPlayerList(): Player[] {
    return Array.from(this.playersMap.values());
  }  
  savePlayerData() {
    // this.playerService.savePlayerList(this.getPlayerList());
    this.playerService.savePlayerStatus(this.status);
  }
  loadPlayerData() {
    // this.playersMap = this.playerService.loadPlayerList();
    this.status = this.playerService.loadPlayerStatus();
  }
  addPlayerList(newPlayers: string) {
    newPlayers.split(',').forEach((player) => {
      if (!this.playersMap.has(player)) {
        console.log('New player: ' + player);
        let newPlayer = new Player(player);
        newPlayer.totalRoundsPlayed = this.status.leastPlayed;
        this.playerService.addPlayer(newPlayer)
      }
    });
    this.savePlayerData();
  }
  deletePlayer(playerName: string) {
    console.log('deletePlayer: ' + playerName);
    this.playerService.removePlayer(playerName);
    this.revalidateStatus();
    this.savePlayerData();
    this.lastInteractPlayers.delete(playerName);
  }

  addRoundsPlayed(playerName: string) {
    this.updatePlayerRoundsPlayed(playerName, 1);
    // this.savePlayerData();
  }

  subtractRoundsPlayed(playerName: string) {
    this.updatePlayerRoundsPlayed(playerName, -1);
    // this.savePlayerData();
  }

  //Internal ----------------------------------------------------------------
  updatePlayerRoundsPlayed(playerName: string, value: number) {
    console.log('updatePlayerRoundsPlayed: ' + playerName + ': ' + value);
    let player = this.playersMap.get(playerName);
    if (!player) {
      return;
    }
    player.totalRoundsPlayed += value;
    if (player.totalRoundsPlayed < 0) {
      player.totalRoundsPlayed = 0;
    }
    this.revalidateStatus();
    player.isPreviouslyInteracted = true;
    // this.playersMap.set(playerName, player);
    this.playerService.updatePlayer(player)
    this.checkLastInteractivePlayer(playerName);
    console.log('player:');
    console.log(player);
  }
  checkLastInteractivePlayer(playerName: string) {
    console.log(
      'this.lastInteractPlayers.size: ',
      this.lastInteractPlayers.size
    );
    console.log('this.maximumInteractPlayers: ', this.maximumInteractPlayers);
    this.lastInteractPlayers.set(playerName, playerName);
    // this.setInteractivePlayer(playerName, true);
    if (this.lastInteractPlayers.size <= this.maximumInteractPlayers) {
      return;
    }
    const popPlayerName = this.lastInteractPlayers.keys().next().value ?? '';
    this.lastInteractPlayers.delete(popPlayerName);
    this.setInteractivePlayer(popPlayerName, false);
  }
  revalidateStatus() {
    if (this.playersMap.size <= 0) {
      this.status = new Status();
      return;
    }
    console.log(
      'this.playersMap.values().next().value: ' +
        this.playersMap.values().next().value
    );
    if (this.playersMap) {
      this.status.leastPlayed =
        this.playersMap?.values()?.next()?.value?.totalRoundsPlayed ?? 0;
      this.status.mostPlayed =
        this.playersMap?.values()?.next()?.value?.totalRoundsPlayed ?? 0;
      this.playersMap.forEach((value, player) => {
        if (this.status.leastPlayed > value.totalRoundsPlayed) {
          this.status.leastPlayed = value.totalRoundsPlayed;
        }
        if (this.status.mostPlayed < value.totalRoundsPlayed) {
          this.status.mostPlayed = value.totalRoundsPlayed;
        }
        // console.log('player:' + player + ': ' + value.totalRoundsPlayed);
      });
    }
    console.log(
      'validateStatus: ' +
        this.status.leastPlayed +
        ' - ' +
        this.status.mostPlayed
    );
  }
  setInteractivePlayer(playerName: string | undefined, status: boolean) {
    if (!playerName) {
      return;
    }
    let player = this.playersMap.get(playerName);
    if (!player) {
      return;
    }
    player.isPreviouslyInteracted = status;
    this.playerService.updatePlayer(player)
    // this.playersMap.set(playerName, player);
  }
}
