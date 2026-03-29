import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GuestService, GuestEvent } from '../guest.service';

@Component({
  selector: 'app-guest-event-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guest-event-list.component.html',
  styleUrl: './guest-event-list.component.css',
})
export class GuestEventListComponent implements OnInit {
  events: GuestEvent[] = [];
  loading = true;
  error = '';

  constructor(private guestService: GuestService, private router: Router) {}

  async ngOnInit() {
    try {
      this.events = await this.guestService.getAllEvents();
    } catch {
      this.error = 'Failed to load events.';
    } finally {
      this.loading = false;
    }
  }

  selectEvent(eventKey: string) {
    this.router.navigate(['/guest/event', encodeURIComponent(eventKey), 'matches']);
  }

  formatLabel(eventKey: string): string {
    return this.guestService.formatEventLabel(eventKey);
  }
}
