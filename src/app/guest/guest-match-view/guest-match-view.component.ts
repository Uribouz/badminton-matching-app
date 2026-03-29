import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { GuestService, GuestMatch, GuestPlayer } from '../guest.service';

@Component({
  selector: 'app-guest-match-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guest-match-view.component.html',
  styleUrl: './guest-match-view.component.css',
})
export class GuestMatchViewComponent implements OnInit {
  eventKey = '';
  eventLabel = '';
  loading = true;
  error = '';

  matchHistory: GuestMatch[] = [];
  players: GuestPlayer[] = [];

  constructor(private route: ActivatedRoute, private guestService: GuestService) {}

  async ngOnInit() {
    const raw = this.route.snapshot.paramMap.get('eventKey') ?? '';
    this.eventKey = decodeURIComponent(raw);
    this.eventLabel = this.guestService.formatEventLabel(this.eventKey);

    try {
      [this.matchHistory, this.players] = await Promise.all([
        this.guestService.getMatchHistory(this.eventKey),
        this.guestService.getPlayers(this.eventKey),
      ]);
    } catch {
      this.error = 'Failed to load match data.';
    } finally {
      this.loading = false;
    }
  }

  get activeCourts(): GuestMatch[] {
    const latest = new Map<number, GuestMatch>();
    for (const match of this.matchHistory) {
      const existing = latest.get(match.courtNo);
      if (!existing || new Date(match.matchTime) > new Date(existing.matchTime)) {
        latest.set(match.courtNo, match);
      }
    }
    return Array.from(latest.values()).sort((a, b) => a.courtNo - b.courtNo);
  }

  getMatchTime(match: GuestMatch): string {
    if (!match.matchTime) return '';
    const d = new Date(match.matchTime);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  winPercentage(player: GuestPlayer): string {
    if (!player.actualTotalRoundsPlayed) return 'N/A';
    return ((player.roundsWon / player.actualTotalRoundsPlayed) * 100).toFixed(1) + '%';
  }
}
