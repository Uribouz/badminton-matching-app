import { Injectable } from '@angular/core';
import { Player } from './player';
import { Status } from './status';
import { Constants } from '../shared/constants';
import { AuthService } from '../auth/auth.service';
import { EventService } from '../events/event.service';

@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  constructor(private authService: AuthService, private eventService: EventService) {}

  savePlayer(player: Player): Map<string, Player> {
    let playerMap = this.loadPlayerList();
    playerMap.set(player.name, player);
    this.savePlayerList(playerMap);
    return playerMap;
  }
  savePlayerList(playersMap: Map<string, Player>) {
    localStorage.setItem(
      'player-list',
      JSON.stringify(Array.from(playersMap.entries()))
    );
    this.syncPlayersToSupabase(playersMap);
  }
  savePreviousPlayer(newPlayer: Player): Map<string, Player> {
    let playersMap = this.loadPreviousPlayerList()
    playersMap.set(newPlayer.name, newPlayer)
    localStorage.setItem(
      'previous-player-list',
      JSON.stringify(Array.from(playersMap.entries()))
    );
    return playersMap;
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
  loadPreviousPlayerList(): Map<string, Player> {
    let playerList = localStorage.getItem('previous-player-list');
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
  deletePreviousPlayer(previousPlayerMap: Map<string, Player>, playerName: string): Map<string, Player> {
    previousPlayerMap.delete(playerName)
    localStorage.setItem(
      'previous-player-list',
      JSON.stringify(Array.from(previousPlayerMap.entries()))
    );
    return previousPlayerMap;
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

  async syncPlayersToSupabase(playersMap: Map<string, Player>) {
    const today = new Date();
    const eventKey = `${Constants.eventIdPrefix}:${today.toLocaleDateString()}`;

    await this.eventService.ensureEventExists(eventKey);

    const supabase = this.authService.getClient();
    const session = await this.authService.getSession();
    const userId = session?.user?.id ?? null;

    const rows = Array.from(playersMap.values()).map(player => ({
      event_id: eventKey,
      user_id: userId,
      player_name: player.name,
      total_rounds_played: player.totalRoundsPlayed,
      actual_total_rounds_played: player.actualTotalRoundsPlayed,
      rounds_waited: player.roundsWaited,
      rounds_won: player.roundsWon,
      status: player.status,
      last_won_match: player.lastWonMatch,
      teammate_history: player.teamateHistory,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('players')
      .upsert(rows, { onConflict: 'event_id,player_name' });

    if (error) {
      console.error('Error syncing players to Supabase:', error);
    } else {
      console.debug('Players synced to Supabase');
    }
  }
}
