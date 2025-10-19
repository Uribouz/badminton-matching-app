export class Player {
  name: string = '';
  totalRoundsPlayed: number = 0;
  actualTotalRoundsPlayed: number = 0;
  isPreviouslyInteracted: boolean = false;

  teamateHistory: string[] = [];
  roundsWaited: number = 0;
  status: string = 'ready';
  roundsWon: number = 0;
  lastWonMatch: string = '';

  constructor(name: string) {
    this.name = name;
  }
}

export function NewPlayer(name: string, totalRoundsPlayed: number, teamateHistory: string[]) {
  let player:Player = new Player(name);
  player.totalRoundsPlayed = totalRoundsPlayed;
  player.teamateHistory = teamateHistory;
  return player;
}