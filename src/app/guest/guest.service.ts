import { Injectable } from '@angular/core';
import { AuthService } from '../auth/auth.service';

export interface GuestMatch {
  courtNo: number;
  matchTime: string;
  status: string;
  teamAPlayer1: string;
  teamAPlayer2: string;
  teamBPlayer1: string;
  teamBPlayer2: string;
  whoWon: string;
}

export interface GuestPlayer {
  name: string;
  totalRoundsPlayed: number;
  actualTotalRoundsPlayed: number;
  teamateHistory: string[];
  roundsWon: number;
}

export interface GuestEvent {
  event_key: string;
}

@Injectable({
  providedIn: 'root',
})
export class GuestService {
  constructor(private authService: AuthService) {}

  async getAllEvents(): Promise<GuestEvent[]> {
    const supabase = this.authService.getClient();
    const { data, error } = await supabase
      .from('events')
      .select('event_key')
      .order('event_key', { ascending: false });
    if (error) {
      console.error('Error loading events:', error);
      return [];
    }
    return data ?? [];
  }

  async getActiveMatches(eventKey: string): Promise<GuestMatch[]> {
    const supabase = this.authService.getClient();
    const { data, error } = await supabase
      .from('matches')
      .select('court_no, match_time, status, team_a_player_1, team_a_player_2, team_b_player_1, team_b_player_2, who_won')
      .eq('event_id', eventKey)
      .eq('status', 'playing')
      .order('court_no', { ascending: true });
    if (error) {
      console.error('Error loading active matches:', error);
      return [];
    }
    return (data ?? []).map(this.mapMatch);
  }

  async getMatchHistory(eventKey: string): Promise<GuestMatch[]> {
    const supabase = this.authService.getClient();
    const { data, error } = await supabase
      .from('matches')
      .select('court_no, match_time, status, team_a_player_1, team_a_player_2, team_b_player_1, team_b_player_2, who_won')
      .eq('event_id', eventKey)
      .order('match_time', { ascending: false });
    if (error) {
      console.error('Error loading match history:', error);
      return [];
    }
    return (data ?? []).map(this.mapMatch);
  }

  async getPlayers(eventKey: string): Promise<GuestPlayer[]> {
    const supabase = this.authService.getClient();
    const { data, error } = await supabase
      .from('players')
      .select('player_name, total_rounds_played, actual_total_rounds_played, teammate_history, rounds_won')
      .eq('event_id', eventKey)
      .order('player_name', { ascending: true });
    if (error) {
      console.error('Error loading players:', error);
      return [];
    }
    return (data ?? []).map(row => ({
      name: row.player_name,
      totalRoundsPlayed: row.total_rounds_played,
      actualTotalRoundsPlayed: row.actual_total_rounds_played,
      teamateHistory: row.teammate_history ?? [],
      roundsWon: row.rounds_won,
    }));
  }

  private mapMatch(row: any): GuestMatch {
    return {
      courtNo: row.court_no,
      matchTime: row.match_time,
      status: row.status,
      teamAPlayer1: row.team_a_player_1,
      teamAPlayer2: row.team_a_player_2,
      teamBPlayer1: row.team_b_player_1,
      teamBPlayer2: row.team_b_player_2,
      whoWon: row.who_won,
    };
  }

  formatEventLabel(eventKey: string): string {
    // "root-event:M/D/YYYY" → "M/D/YYYY"
    const parts = eventKey.split(':');
    return parts.length > 1 ? parts[1] : eventKey;
  }
}
