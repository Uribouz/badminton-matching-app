import { Component, input, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-bill',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './bill.component.html',
  styleUrl: './bill.component.css',
})
export class BillComponent {
  totalPlayers = input<number>(1);
  totalCourts: number = 4;
  courtPrice: number = 279;
  totalShuttleUsed: number = 1;
  shuttlePrice: number = 67.5;
  totalCourtPrice: number = 0;
  totalShuttlePrice: number = 0;
  priceToPay: number = 0;
  constructor() {
    effect(() => {
      this.calculatePrice();
    });
    this.calculatePrice();
  }
  calculatePrice() {
    this.totalCourtPrice = this.courtPrice * this.totalCourts;
    this.totalShuttlePrice = this.totalShuttleUsed * this.shuttlePrice;
    this.priceToPay =
      +((this.totalCourtPrice + this.totalShuttlePrice) / this.totalPlayers()).toFixed(2);
  }
}
