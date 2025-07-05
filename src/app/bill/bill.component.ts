import { Component, input, effect, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Player } from '../players/player';
import { CommonModule } from '@angular/common';
import * as defaults from './constant';
@Component({
  selector: 'app-bill',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './bill.component.html',
  styleUrl: './bill.component.css',
})
export class BillComponent {
  players = input<Player[]>([]);
  totalCourts = signal<number>(defaults.DEFAULT_TOTAL_COURTS);
  courtPrice = signal<number>(defaults.DEFAULT_COURT_PRICE);
  totalShuttleUsed = signal<number>(defaults.DEFAULT_TOTAL_SHUTTLE_USED);
  shuttlePrice = signal<number>(defaults.DEFAULT_SHUTTLE_PRICE);

  totalCourtPrice = computed(() => this.courtPrice() * this.totalCourts());
  totalShuttlePrice = computed(
    () => this.totalShuttleUsed() * this.shuttlePrice()
  );
  totalPrice = computed(
    () => this.totalCourtPrice() + this.totalShuttlePrice()
  );
  totalGamesPlayedFromAllPlayer = computed(() => {
    return this.players().reduce(
      (acc, cur) => acc + cur.actualTotalRoundsPlayed,
      0
    );
  });
  updateCourts(newValue: number) {
    this.totalCourts.set(newValue);
  }
  updateCourtPrice(newValue: number) {
    this.courtPrice.set(newValue);
  }
  updateShuttleUsed(newValue: number) {
    this.totalShuttleUsed.set(newValue);
  }
  updateShuttlePrice(newValue: number) {
    this.shuttlePrice.set(newValue);
  }
  getPlayerList(): Player[] {
    return Array.from(this.players());
  }
  getWhatPlayerHaveToPay(player: Player) {
    return (
      (this.totalPrice() * player.actualTotalRoundsPlayed) /
      this.totalGamesPlayedFromAllPlayer()
    );
  }
}
