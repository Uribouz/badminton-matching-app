import { Component, input, computed, signal, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Player } from '../players/player';
import { CommonModule } from '@angular/common';
import * as defaults from './constant';
import html2canvas from 'html2canvas';
@Component({
  selector: 'app-bill',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './bill.component.html',
  styleUrl: './bill.component.css',
})
export class BillComponent {
  @ViewChild('captureRef') captureRef!: ElementRef;
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
    ).toFixed(2);
  }

  buildPaymentText(): string {
    const lines = [
      `💳 Payment Summary`,
      `Court: ${this.courtPrice()} × ${this.totalCourts()} = ${this.totalCourtPrice()}`,
      `Shuttle: ${this.shuttlePrice()} × ${this.totalShuttleUsed()} = ${this.totalShuttlePrice()}`,
      `Total: ${this.totalPrice()}`,
      ``,
    ];
    this.getPlayerList().forEach(p => {
      lines.push(`${p.name} [G:${p.actualTotalRoundsPlayed}]: ${this.getWhatPlayerHaveToPay(p)}`);
    });
    return lines.join('\n');
  }

  async shareScreenshot() {
    const text = this.buildPaymentText();
    const el = this.captureRef.nativeElement;
    const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2 });
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'payment.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Payment Summary', text });
      } else if (navigator.share) {
        await navigator.share({ title: 'Payment Summary', text });
      } else {
        await navigator.clipboard.writeText(text);
        alert('Payment summary copied to clipboard!');
      }
    }, 'image/png');
  }
}
