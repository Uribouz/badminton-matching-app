import { Player } from "../player/player"

class teammate {
    player1: Player = new Player('');
    player2: Player = new Player('');
}

export class Match {
    status: string = 'available'
    teamA: teammate = new teammate;
    teamB: teammate = new teammate;
}
