export class Player {
  name: string = '';
  totalRoundsPlayed: number = 0;
  isPreviouslyInteracted: boolean = false;

  teamateHistory: string[] = [];
  // totalRoundsWon: number = 0;
  roundsWaited: number = 0;

  constructor(name: string) {
    this.name = name;
  }
  
}


export function NewPlayer(name: string, totalRoundsPlayed: number, teamateHistory: string[]): Player{
  let player:Player = new Player(name)
  player.totalRoundsPlayed = totalRoundsPlayed;
  player.teamateHistory = teamateHistory;
  return player
}