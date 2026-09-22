export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  dateStr: string;
}

export interface OTEZone {
  swingHigh: number;
  swingLow: number;
  swingHighBar: number;
  swingLowBar: number;
  fib50: number;    // Equilibre
  fib62: number;    // Début OTE
  fib705: number;   // Sweet Spot ICT (Optimal Trade Entry)
  fib79: number;    // Fin OTE
  type: 'bullish' | 'bearish';
  isActive: boolean;
}

export interface MarketStructure {
  trend: 'BULLISH' | 'BEARISH' | 'RANGING';
  confidence: number;
  bos: { price: number; bar: number; type: 'bullish' | 'bearish' } | null;
  choch: { price: number; bar: number; type: 'bullish' | 'bearish' } | null;
  summary: string;
}

export interface Zone {
  id: string;
  type: 'demand' | 'supply';
  top: number;
  bottom: number;
  startBar: number;
  endBar: number;
  isMitigated: boolean;
  mitigationBar?: number;
  strength: number; // 1 - 3
}

export interface Trendline {
  id: string;
  type: 'support' | 'resistance';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  slope: number;
  isBroken: boolean;
  touches: number;
}

export interface VolumeProfileBin {
  price: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
  percentage: number;
}

export interface VolumeProfileData {
  startBar: number;
  endBar: number;
  bins: VolumeProfileBin[];
  pocPrice: number;
  vahPrice: number;
  valPrice: number;
  totalVolume: number;
  maxBinVolume: number;
}

export interface AMDPhase {
  id: string;
  // Accumulation
  accStartBar: number;
  accEndBar: number;
  accHigh: number;
  accLow: number;
  // Manipulation (Judas Swing)
  manipulationBar: number;
  manipulationType: 'bullish_sweep' | 'bearish_sweep';
  sweepExtremePrice: number;
  // Distribution
  distStartBar: number;
  distEndBar: number;
  targetPrice: number;
  status: 'accumulating' | 'manipulated' | 'distributing' | 'completed';
}

export type SignalOutcome = 'WIN_TP1' | 'WIN_TP2' | 'LOSS' | 'PENDING' | 'BREAKEVEN';

export interface TradeSignal {
  id: string;
  barIndex: number;
  type: 'BUY' | 'SELL';
  price: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3?: number;
  riskReward: number;
  confluenceScore: number; // e.g. 95%
  reasons: string[];
  time: string;
  // Outcome & Backtest verification
  outcome?: SignalOutcome;
  targetHit?: 'TP1' | 'TP2' | 'TP3' | 'SL' | 'BREAKEVEN' | 'NONE';
  exitPrice?: number;
  exitBar?: number;
  exitTime?: string;
  exitTimestamp?: number;
  pnlPoints?: number;
  pnlRiskRatio?: number; // e.g. +2.0 R or -1.0 R
  maxProfitPoints?: number;
  timestamp?: number;
  dateIso?: string; // YYYY-MM-DD
  session?: 'LONDON' | 'NEW_YORK' | 'ASIAN' | 'OVERLAP' | 'OTHER';
  isLiveRealtime?: boolean;
}

export interface DailyCalendarStats {
  dateIso: string; // YYYY-MM-DD
  totalSignals: number;
  wonSignals: number;
  lostSignals: number;
  breakevenSignals: number;
  pendingSignals: number;
  winrate: number; // %
  netRProfit: number;
  netPointsProfit: number;
  signals: TradeSignal[];
}

export interface AutoImprovementStudyData {
  totalAnalyzed: number;
  currentWinrate: number;
  bestSession: string;
  worstSession: string;
  highConfluenceWinrate: number; // score >= 80%
  lowConfluenceWinrate: number;  // score < 80%
  optimalConfluenceThreshold: number;
  optimalRiskReward: number;
  keyWeaknesses: string[];
  recommendedRules: string[];
  suggestedSettings: Partial<IndicatorSettings>;
  aiExecutiveSummary?: string;
  timestamp: number;
}

export interface StrategyPerformanceMetrics {
  totalTrades: number;
  wonTrades: number;
  lostTrades: number;
  breakevenTrades: number;
  pendingTrades: number;
  winratePercent: number; // e.g. 78.5%
  profitFactor: number;   // e.g. 2.45
  avgRiskReward: number;  // e.g. 2.1
  totalPnlPoints: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  buyWinratePercent: number;
  sellWinratePercent: number;
  reliabilityScore: number; // 0 - 100
}

export interface IndicatorSettings {
  // AMD settings
  enableAMD: boolean;
  amdLookback: number;
  amdConsolidationThreshold: number;
  showAmdBoxes: boolean;

  // Demand & Supply settings
  enableDemandSupply: boolean;
  zoneLookback: number;
  minDisplacementPercent: number;
  showMitigatedZones: boolean;

  // Trendline settings
  enableTrendlines: boolean;
  trendlinePivotLength: number;
  maxTrendlineTouches: number;
  showBrokenTrendlines: boolean;

  // Volume Profile (FRVP) settings
  enableVolumeProfile: boolean;
  vpBinsCount: number;
  valueAreaPercent: number; // default 70%
  showPOC: boolean;
  showVAHVAL: boolean;

  // Sniper Signals & Confluence
  minConfluenceScore: number;
  riskRewardTarget: number;
  enableAlerts: boolean;

  // Strategy Refinement for High Winrate
  strictTrendAlignment: boolean;      // Ne trader que dans le sens strict de la tendance (BOS/CHoCH)
  volumeSpikeConfirmation: boolean;   // Exiger un pic de volume institutionnel (> 1.2x la moyenne)
  autoBreakevenAt1R: boolean;         // Déplacer automatiquement le SL au prix d'entrée dès 1R atteint
  requireLiquiditySweep: boolean;     // Exiger une chasse de liquidité préalable (Judas swing)
  sessionFilter: 'ALL' | 'LONDON_NY'; // Filtrer sur les sessions actives (Londres / New York)
}

export interface LiveSimulatedPosition {
  id: string;
  signalId?: string;
  type: 'BUY' | 'SELL';
  lotSize: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  openTimestamp: number;
  openTime: string;
  status: 'OPEN' | 'CLOSED';
  currentPrice: number;
  unrealizedPnlDollars: number;
  unrealizedPnlPercent: number;
  unrealizedPnlPoints: number;
  riskDollars: number;
  riskPercent: number; // e.g. 2.0%
  closePrice?: number;
  closeTimestamp?: number;
  closeTime?: string;
  closeReason?: 'MANUAL' | 'TP1' | 'TP2' | 'TP3' | 'SL' | 'BREAKEVEN';
  realizedPnlDollars?: number;
  isBreakevenProtected?: boolean;
}

export interface VirtualTradingAccount {
  initialBalance: number;
  balance: number;
  equity: number;
  maxRiskPercent: number; // default 2.0%
  openPositions: LiveSimulatedPosition[];
  closedPositions: LiveSimulatedPosition[];
  totalRealizedPnl: number;
  winCount: number;
  lossCount: number;
}

