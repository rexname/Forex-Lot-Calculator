import { Component, ChangeDetectionStrategy, signal, computed, WritableSignal, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { PAIR_DATA, PairInfo } from './models/pair.model';
import { ThemeService } from './services/theme.service';

interface CalculationResult {
  lots: number;
  microLots: number;
  riskUsd: number;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DecimalPipe],
})
export class AppComponent {
  themeService = inject(ThemeService);

  // --- State Signals ---
  pairData = signal(PAIR_DATA);
  pairSymbols = computed(() => Object.keys(this.pairData()));
  
  selectedPair = signal<string>('XAUUSD');
  balance = signal<number | null>(10000);
  riskMode = signal<'percent' | 'usd'>('percent');
  riskValue = signal<number | null>(1);
  stopLossPips = signal<number | null>(20);
  
  calculationResult = signal<CalculationResult | null>(null);

  // --- Validation Error Signals ---
  balanceError = signal<string>('');
  riskValueError = signal<string>('');
  stopLossPipsError = signal<string>('');
  
  // --- Computed Signals ---
  currentPairInfo = computed(() => this.pairData()[this.selectedPair()]);

  isFormValid = computed(() => {
    return this.balance() !== null && this.balance()! > 0 &&
           this.riskValue() !== null && this.riskValue()! > 0 &&
           this.stopLossPips() !== null && this.stopLossPips()! > 0 &&
           this.balanceError() === '' &&
           this.riskValueError() === '' &&
           this.stopLossPipsError() === '';
  });

  // --- Event Handlers ---
  onPairChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedPair.set(selectElement.value);
    this.calculationResult.set(null); // Reset result on pair change
  }

  onRiskModeChange(mode: 'percent' | 'usd'): void {
    this.riskMode.set(mode);
    // Sensible default when switching modes
    if (mode === 'percent' && (this.riskValue() === null || this.riskValue()! > 100)) {
        this.riskValue.set(1);
    } else if (mode === 'usd' && this.riskValue() === null) {
        this.riskValue.set(100);
    }
    this.calculationResult.set(null);
    this.validate();
  }
  
  updateSignalFromInput(signal: WritableSignal<number | null>, event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const value = parseFloat(inputElement.value);
    signal.set(isNaN(value) ? null : value);
    this.calculationResult.set(null);
    this.validate();
  }

  adjustValue(signal: WritableSignal<number | null>, amount: number, min: number): void {
    const currentValue = signal() ?? 0;
    let newValue = currentValue + amount;
    
    newValue = Math.max(min, newValue);

    const decimalPlaces = (String(amount).split('.')[1] || '').length;
    if (decimalPlaces > 0) {
      newValue = parseFloat(newValue.toFixed(decimalPlaces));
    }

    signal.set(newValue);
    this.calculationResult.set(null);
    this.validate();
  }


  private validate(): void {
    // Balance validation
    const balance = this.balance();
    if (balance === null) {
      this.balanceError.set('Account balance is required.');
    } else if (balance <= 0) {
      this.balanceError.set('Account balance must be a positive number.');
    } else {
      this.balanceError.set('');
    }

    // Risk Value validation
    const riskValue = this.riskValue();
    if (riskValue === null) {
      this.riskValueError.set('Risk value is required.');
    } else if (riskValue <= 0) {
      this.riskValueError.set('Risk value must be a positive number.');
    } else {
      this.riskValueError.set('');
    }

    // Stop-Loss validation
    const stopLossPips = this.stopLossPips();
    if (stopLossPips === null) {
      this.stopLossPipsError.set('Stop-loss is required.');
    } else if (stopLossPips <= 0) {
      this.stopLossPipsError.set('Stop-loss must be a positive number.');
    } else {
      this.stopLossPipsError.set('');
    }
  }


  // --- Core Logic ---
  calculate(): void {
    this.validate();
    if (!this.isFormValid()) {
      return;
    }
    
    const balance = this.balance()!;
    const riskValue = this.riskValue()!;
    const slPips = this.stopLossPips()!;
    const { pipValuePerLot } = this.currentPairInfo();

    let riskUsd = 0;
    if (this.riskMode() === 'percent') {
      riskUsd = balance * (riskValue / 100.0);
    } else {
      riskUsd = riskValue;
    }

    if (pipValuePerLot <= 0 || slPips <= 0) {
        this.calculationResult.set({ lots: 0, microLots: 0, riskUsd: riskUsd });
        return;
    }

    const lots = riskUsd / (pipValuePerLot * slPips);
    const roundedLots = Math.round(lots * 10000) / 10000; // Round to 4 decimal places
    const microLots = Math.floor(roundedLots * 100);

    this.calculationResult.set({
      lots: roundedLots,
      microLots: microLots,
      riskUsd: riskUsd
    });
  }
}