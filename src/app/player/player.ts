export class Player {
  name: string = '';
  totalRoundsPlayed: number = 0;
  totalRoundsWon: number = 0;
  isBreaking: boolean = false;
  isPreviouslyInteracted: boolean = false;

  constructor(name: string) {
    this.name = name;
  }
}
