import { Player } from "../players/player"

export class Teammate {
    player1: Player = new Player('');
    player2: Player = new Player('');
}

export class Match {
    courtNo: number = 0;
    matchTime: Date = new Date();
    status: string = 'available';
    teamA: Teammate = new Teammate;
    teamB: Teammate = new Teammate;
    whoWon: string = '';
    mode: string = '';
    format: CourtFormat = 'double';
}

export type CourtFormat = 'single' | 'double';

// Matches stored before the format field existed have no format — they were all doubles.
export function isSingles(match: Match): boolean {
    return match.format === 'single';
}

// Non-empty player names on a team. A singles team only ever fills player1.
export function teamPlayerNames(team: Teammate): string[] {
    return [team.player1?.name, team.player2?.name].filter((name): name is string => !!name);
}
