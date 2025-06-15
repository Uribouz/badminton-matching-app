import { Component, input, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-bill',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './bill.component.html',
  styleUrl: './bill.component.css',
})
export class BillComponent {
  totalPlayersInput = input<number>(0);
  totalCourts: number = 4;
  courtPrice: number = 279;
  totalShuttleUsed: number = 0;
  shuttlePrice: number = 67.5;
  totalCourtPrice: number = 0;
  totalShuttlePrice: number = 0;
  priceToPay: number = 0;
  totalPlayers = computed(() => this.totalPlayersInput());
  constructor() {
    this.calculatePrice();
  }
  calculatePrice() {
    this.totalCourtPrice = this.courtPrice * this.totalCourts;
    this.totalShuttlePrice = this.totalShuttleUsed * this.shuttlePrice;
    this.priceToPay =
      (this.totalCourtPrice + this.totalShuttlePrice) / this.totalPlayers();
  }
}
