import { Component, ChangeDetectionStrategy, signal, computed, WritableSignal, inject, OnInit, HostBinding } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { PAIR_DATA, PairInfo, CalculationHistory } from './models/pair.model';
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
  standalone: true
})
export class AppComponent implements OnInit {
  themeService = inject(ThemeService);
  
  @HostBinding('class') get themeClass() {
    return this.themeService.isDarkMode() ? 'dark' : '';
  }

  // --- State Signals ---
  pairData = signal(PAIR_DATA);
  pairSymbols = computed(() => Object.keys(this.pairData()));
  
  selectedPair = signal<string>('XAUUSD');
  balance = signal<number | null>(10000);
  riskMode = signal<'percent' | 'usd'>('percent');
  riskValue = signal<number | null>(1);
  stopLossPips = signal<number | null>(20);
  
  calculationResult = signal<CalculationResult | null>(null);
  calculationHistory = signal<CalculationHistory[]>([]);
  showHistory = signal<boolean>(false);

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


  ngOnInit(): void {
    // Lazy load calculation history
    setTimeout(() => {
      this.loadCalculationHistory();
    }, 100);
  }

  // --- History Management ---
  private loadCalculationHistory(): void {
    try {
      const historyJson = localStorage.getItem('calculationHistory');
      if (historyJson) {
        const history = JSON.parse(historyJson) as CalculationHistory[];
        this.calculationHistory.set(history);
      }
    } catch (error) {
      console.error('Failed to load calculation history:', error);
      // If there's an error, reset the history
      this.calculationHistory.set([]);
    }
  }

  private saveCalculationHistory(history: CalculationHistory[]): void {
    try {
      // Debounce saving to localStorage to improve performance
      if (this._saveTimeout) {
        clearTimeout(this._saveTimeout);
      }
      this._saveTimeout = setTimeout(() => {
        localStorage.setItem('calculationHistory', JSON.stringify(history));
      }, 300);
    } catch (error) {
      console.error('Failed to save calculation history:', error);
    }
  }
  
  private _saveTimeout: any;

  toggleHistoryDisplay(): void {
    this.showHistory.update(value => !value);
    console.log('History display toggled:', this.showHistory());
  }

  clearHistory(): void {
    this.calculationHistory.set([]);
    this.saveCalculationHistory([]);
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

    // Calculate risk in USD
    const riskUsd = this.riskMode() === 'percent' ? 
      balance * (riskValue / 100.0) : riskValue;

    // Early return for invalid values
    if (pipValuePerLot <= 0 || slPips <= 0) {
        this.calculationResult.set({ lots: 0, microLots: 0, riskUsd });
        return;
    }

    // Calculate lot size
    const pipRiskTotal = pipValuePerLot * slPips;
    const lots = riskUsd / pipRiskTotal;
    const roundedLots = Math.round(lots * 10000) / 10000; // Round to 4 decimal places
    const microLots = Math.floor(roundedLots * 100);

    const result = { lots: roundedLots, microLots, riskUsd };
    this.calculationResult.set(result);
    
    // Save to history with performance optimization
    const timestamp = Date.now();
    const historyEntry: CalculationHistory = {
      id: timestamp.toString(),
      timestamp,
      pair: this.selectedPair(),
      balance,
      riskMode: this.riskMode(),
      riskValue,
      stopLossPips: slPips,
      result
    };
    
    const currentHistory = this.calculationHistory();
    const updatedHistory = [historyEntry, ...currentHistory].slice(0, 10); // Keep only the last 10 entries
    this.calculationHistory.set(updatedHistory);
    this.saveCalculationHistory(updatedHistory);
  }
}