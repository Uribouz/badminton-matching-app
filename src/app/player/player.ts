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
