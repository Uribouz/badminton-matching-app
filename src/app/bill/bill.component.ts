import { Component, input, effect, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Player } from '../players/player';
@Component({
  selector: 'app-bill',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './bill.component.html',
  styleUrl: './bill.component.css',
})
export class BillComponent {
  players = input<Player[]>([]);
  totalPlayers = computed(() => 
    this.players().length
  );
  totalCourts = signal<number>(4);
  courtPrice = signal<number>(279);
  totalShuttleUsed = signal<number>(1);
  shuttlePrice = signal<number>(67.5);

  // Computed signals - automatically recalculate when dependencies change
  totalCourtPrice = computed(() => this.courtPrice() * this.totalCourts());
  totalShuttlePrice = computed(() => this.totalShuttleUsed() * this.shuttlePrice());
  priceToPay = computed(() => 
    +((this.totalCourtPrice() + this.totalShuttlePrice()) / this.totalPlayers()).toFixed(2)
  );
  // Methods to update values (will trigger recalculation)
  updateCourts(newValue: number) {
    this.totalCourts.set(newValue);
    // priceToPay automatically recalculates!
  }

  updateCourtPrice(newValue: number) {
    this.courtPrice.set(newValue);
    // priceToPay automatically recalculates!
  }

  updateShuttleUsed(newValue: number) {
    this.totalShuttleUsed.set(newValue);
    // priceToPay automatically recalculates!
  }

  updateShuttlePrice(newValue: number) {
    this.shuttlePrice.set(newValue);
    // priceToPay automatically recalculates!
  }
}
