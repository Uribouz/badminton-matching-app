import { Component } from '@angular/core';
import { Player } from '../player';
import { CommonModule, KeyValue } from '@angular/common';
import { max } from 'rxjs';
import { Status } from '../status';
import { PlayerService } from '../player.service';
import { FormsModule } from '@angular/forms'; // 1. Import FormsModule

@Component({
  selector: 'app-player-list',
  standalone: true,
  imports: [CommonModule,FormsModule ],
  templateUrl: './player-list.component.html',
  styleUrl: './player-list.component.css',
})
export class PlayerListComponent {
  playerTextArea: string = '';
  lastInteractPlayers: Map<string, string> = new Map<string, string>();
  playersPerCourt = 4;
  maximumInteractPlayers = this.playersPerCourt * 2;
  rankOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  status = new Status();
  playersMap = new Map<string, Player>();
  previousPlayerMap = new Map<string, Player>();
  constructor(private playerService: PlayerService) {
    this.loadPlayerData();
  }
  getPlayerList(): Player[] {
    return Array.from(this.playersMap.values());
  }
  getPreviousPlayerList(): string[] {
    return Array.from(this.previousPlayerMap.keys()).filter(name => !this.playersMap.has(name));
  }
  addPreviousPlayerToList(name: string) {
    const savedRank = this.previousPlayerMap.get(name)?.rank;
    this.addPlayer(name);
    if (savedRank != null) {
      const player = this.playersMap.get(name);
      if (player) {
        player.rank = savedRank;
        this.playerService.savePlayerList(this.playersMap);
      }
    }
  }
  deletePreviousPlayer(name: string) {
    this.playerService.deletePreviousPlayer(this.previousPlayerMap,name);
  }
  loadPlayerData() {
    this.playersMap = this.playerService.loadPlayerList();
    this.status = this.playerService.loadPlayerStatus();
    this.previousPlayerMap = this.playerService.loadPreviousPlayerList();
    this.mergeRanksFromSupabase();
  }

  private async mergeRanksFromSupabase() {
    const rankMap = await this.playerService.loadPlayerRanksFromSupabase();
    if (rankMap.size === 0) return;
    let changed = false;
    this.playersMap.forEach((player, name) => {
      const remoteRank = rankMap.get(name);
      if (remoteRank != null && player.rank !== remoteRank) {
        player.rank = remoteRank;
        changed = true;
      }
    });
    if (changed) {
      this.playersMap = new Map(this.playersMap);
      this.playerService.savePlayerList(this.playersMap);
    }
  }

  onAddPlayerTextArea() {
    this.addPlayer(this.playerTextArea);
    this.playerTextArea = '';
  }
  addPlayer(newPlayerName: string) {
    if (this.playersMap.has(newPlayerName)) {
      return;
      }
    console.log('New player: ' + newPlayerName);
    let newPlayer = new Player(newPlayerName);
    newPlayer.totalRoundsPlayed = this.status.leastPlayed;
    this.playersMap = this.playerService.savePlayer(newPlayer);
    this.previousPlayerMap = this.playerService.savePreviousPlayer(newPlayer);
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

  onPlayerRankChange(playerName: string, rank: number) {
    const player = this.playersMap.get(playerName);
    if (!player) return;
    player.rank = Number(rank);
    this.playersMap.set(playerName, player);
    this.playerService.savePlayerList(this.playersMap);
    this.previousPlayerMap = this.playerService.savePreviousPlayer(player);
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
