import { Player } from "../players/player"

export class Teammate {
    player1: Player = new Player('');
    player2: Player = new Player('');
}

export class Match {
    matchTime: Date = new Date();
    status: string = 'available';
    teamA: Teammate = new Teammate;
    teamB: Teammate = new Teammate;
    courtNo: number = 0;
    whoWon: string = '';
}
