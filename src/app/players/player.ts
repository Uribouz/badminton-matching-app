export class Player {
  name: string = '';
  totalRoundsPlayed: number = 0;
  actualTotalRoundsPlayed: number = 0;
  isPreviouslyInteracted: boolean = false;

  teamateHistory: string[] = [];
  roundsWaited: number = 0;
  status: string = 'ready';

  constructor(name: string) {
    this.name = name;
  }
}
