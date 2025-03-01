export class Player {
  name: string = '';
  totalRoundsPlayed: number = 0;
  isPreviouslyInteracted: boolean = false;

  teamateHistory: string[] = [];
  // totalRoundsWon: number = 0;
  // isBreaking: boolean = false;

  constructor(name: string) {
    this.name = name;
  }
}
