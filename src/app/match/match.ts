import { Player } from "../player/player"

export class Teammate {
    player1: Player = new Player('');
    player2: Player = new Player('');
}

export class Match {
    status: string = 'available'
    teamA: Teammate = new Teammate;
    teamB: Teammate = new Teammate;
}
