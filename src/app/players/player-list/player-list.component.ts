import { Component } from '@angular/core';
import { Player } from '../player';
import { CommonModule, KeyValue } from '@angular/common';
import { max } from 'rxjs';
import { Status } from '../status';
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
  constructor(private playerService: PlayerService) {
    this.loadPlayerData();
  }
  getPlayerList(): Player[] {
    return Array.from(this.playersMap.values());
  }
  loadPlayerData() {
    this.playersMap = this.playerService.loadPlayerList();
    this.status = this.playerService.loadPlayerStatus();
  }
  addPlayerList(newPlayers: string) {
    this.playersMap = this.playerService.addPlayerList(
      this.status.leastPlayed,
      this.playersMap,
      newPlayers
    );
  }
  deletePlayer(playerName: string) {
    console.log('deletePlayer: ' + playerName);
    this.playerService.deletePlayer(this.playersMap, playerName);
    this.status = this.playerService.revalidateStatus(
      this.status,
      this.playersMap
    );
    this.lastInteractPlayers.delete(playerName);
  }

  addRoundsPlayed(playerName: string) {
    this.updatePlayerRoundsPlayed(playerName, 1);
  }

  subtractRoundsPlayed(playerName: string) {
    this.updatePlayerRoundsPlayed(playerName, -1);
  }
  addActualGamesPlayed(playerName: string) {
    this.updatePlayerActualGamesPlayed(playerName, 1);
  }

  subtractActualGamesPlayed(playerName: string) {
    this.updatePlayerActualGamesPlayed(playerName, -1);
  }

  //Internal ----------------------------------------------------------------
  updatePlayerActualGamesPlayed(playerName: string, value: number) {
    this.playersMap = this.playerService.updatePlayerActualGamesPlayed(
      this.playersMap,
      playerName,
      value
    );
    this.status = this.playerService.revalidateStatus(
      this.status,
      this.playersMap
    );
  }
  updatePlayerRoundsPlayed(playerName: string, value: number) {
    this.playersMap = this.playerService.updatePlayerRoundsPlayed(
      this.playersMap,
      playerName,
      value
    );
    this.status = this.playerService.revalidateStatus(
      this.status,
      this.playersMap
    );
    this.checkLastInteractivePlayer(playerName);
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
  setInteractivePlayer(playerName: string | undefined, status: boolean) {
    if (!playerName) {
      return;
    }
    let player = this.playersMap.get(playerName);
    if (!player) {
      return;
    }
    player.isPreviouslyInteracted = status;
    this.playersMap.set(playerName, player);
  }
}
