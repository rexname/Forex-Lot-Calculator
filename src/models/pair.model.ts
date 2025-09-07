
export interface PairInfo {
  contractSize: number;
  pipValuePerLot: number;
  defaultSpread: number;
}

export const PAIR_DATA: { [key: string]: PairInfo } = {
  "XAUUSD": { contractSize: 100, pipValuePerLot: 10.0, defaultSpread: 18 },
  "EURUSD": { contractSize: 100_000, pipValuePerLot: 10.0, defaultSpread: 1 },
  "GBPUSD": { contractSize: 100_000, pipValuePerLot: 10.0, defaultSpread: 2 },
  "USDJPY": { contractSize: 100_000, pipValuePerLot: 10.0, defaultSpread: 2 },
  "USDCHF": { contractSize: 100_000, pipValuePerLot: 10.0, defaultSpread: 2 },
  "AUDUSD": { contractSize: 100_000, pipValuePerLot: 10.0, defaultSpread: 2 },
  "USDCAD": { contractSize: 100_000, pipValuePerLot: 10.0, defaultSpread: 2 },
  "NZDUSD": { contractSize: 100_000, pipValuePerLot: 10.0, defaultSpread: 2 },
};
