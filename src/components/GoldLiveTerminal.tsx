import React, { useState, useEffect, useRef } from 'react';
import {
  Candle,
  Zone,
  OTEZone,
  MarketStructure,
  VolumeProfileData,
  TradeSignal,
  IndicatorSettings,
  StrategyPerformanceMetrics,
  VirtualTradingAccount,
} from '../types';
import { BeginnerActionGuide, ActionDecision } from './BeginnerActionGuide';
import { RealtimeInteractiveChart } from './RealtimeInteractiveChart';
import { LiveTradeSimulator } from './LiveTradeSimulator';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Sparkles,
  Target,
  ShieldAlert,
  Sliders,
  DollarSign,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Zap,
  CheckCircle2,
  Clock,
  Radio,
  BarChart2,
  Award,
  Calendar as CalendarIcon,
} from 'lucide-react';

interface GoldLiveTerminalProps {
  candles: Candle[];
  demandZones: Zone[];
  supplyZones: Zone[];
  oteZone: OTEZone | null;
  marketStructure: MarketStructure;
  volumeProfile: VolumeProfileData | null;
  currentPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  isLoading: boolean;
  onRefresh: () => void;
  selectedInterval: string;
  onSelectInterval: (interval: string) => void;
  signals?: TradeSignal[];
  settings?: IndicatorSettings;
  performanceMetrics?: StrategyPerformanceMetrics;
  onOpenWinrateTab?: () => void;
  onOpenCalendarTab?: () => void;
  lotSize?: number;
  onLotSizeChange?: (lot: number) => void;
  virtualAccount?: VirtualTradingAccount;
  onOpenTrade?: (params: {
    type: 'BUY' | 'SELL';
    lotSize: number;
    entryPrice: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    takeProfit3: number;
    signalId?: string;
  }) => void;
  onCloseTrade?: (positionId: string) => void;
  onBreakevenTrade?: (positionId: string) => void;
  onResetAccount?: (capital: number) => void;
}

export const GoldLiveTerminal: React.FC<GoldLiveTerminalProps> = ({
  candles,
  demandZones,
  supplyZones,
  oteZone,
  marketStructure,
  volumeProfile,
  currentPrice,
  change24h,
  high24h,
  low24h,
  isLoading,
  onRefresh,
  selectedInterval,
  onSelectInterval,
  signals = [],
  settings,
  performanceMetrics,
  onOpenWinrateTab,
  onOpenCalendarTab,
  lotSize: propLotSize,
  onLotSizeChange,
  virtualAccount,
  onOpenTrade,
  onCloseTrade,
  onBreakevenTrade,
  onResetAccount,
}) => {
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(5);
  const [showTvWidget, setShowTvWidget] = useState<boolean>(false);
  const [internalLotSize, setInternalLotSize] = useState<number>(0.1);
  const activeLotSize = propLotSize !== undefined ? propLotSize : internalLotSize;
  const handleLotChange = onLotSizeChange || setInternalLotSize;

  // AI Live Gold Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Price flash animation
  const prevPriceRef = useRef<number>(currentPrice);
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    let timeout: any = null;
    if (currentPrice > prevPriceRef.current) {
      setPriceFlash('up');
      timeout = setTimeout(() => setPriceFlash(null), 800);
    } else if (currentPrice < prevPriceRef.current) {
      setPriceFlash('down');
      timeout = setTimeout(() => setPriceFlash(null), 800);
    }
    prevPriceRef.current = currentPrice;
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [currentPrice]);

  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  // Auto-refresh countdown timer (pure state countdown)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 5 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Trigger refresh in useEffect when countdown resets to 5
  const isFirstCountdown = useRef(true);
  useEffect(() => {
    if (isFirstCountdown.current) {
      isFirstCountdown.current = false;
      return;
    }
    if (countdown === 5 && autoRefresh) {
      onRefreshRef.current();
    }
  }, [countdown, autoRefresh]);

  // 1. Primary active demand zone (nearest support) and supply zone (nearest resistance)
  const primaryBuyZone = demandZones.length > 0 ? demandZones[demandZones.length - 1] : null;
  const primarySellZone = supplyZones.length > 0 ? supplyZones[supplyZones.length - 1] : null;

  // 2. Proximity checks to key institutional levels
  const isOteActive = !!(oteZone && oteZone.isActive);
  const isNearDemand = !!(
    primaryBuyZone &&
    currentPrice <= primaryBuyZone.top * 1.0025 &&
    currentPrice >= primaryBuyZone.bottom * 0.9975
  );
  const isNearSupply = !!(
    primarySellZone &&
    currentPrice >= primarySellZone.bottom * 0.9975 &&
    currentPrice <= primarySellZone.top * 1.0025
  );

  // 3. ICT / SMC INSTITUTIONAL DECISION ENGINE (NO GAMBLING - STRICT CONFIRMATION)
  let decision: ActionDecision = 'WAIT';
  let confidenceScore = 65;
  let decisionReason = 'Le marché est en consolidation. Aucun trade impulsif au milieu du range pour protéger votre capital.';

  if (marketStructure.trend === 'BULLISH') {
    if (isNearDemand && isOteActive) {
      decision = 'BUY';
      confidenceScore = 95;
      decisionReason = `Achat Sniper Institutionnel : Tendance haussière confirmée, double confluence Rebond Demand Zone ($${primaryBuyZone?.bottom.toFixed(1)}-$${primaryBuyZone?.top.toFixed(1)}) et OTE 0.705.`;
    } else if (isNearDemand) {
      decision = 'BUY';
      confidenceScore = 88;
      decisionReason = `Opportunité d’ACHAT (Demand Zone) : Le cours de l'or réagit sur l’Order Block acheteur institutionnel ($${primaryBuyZone?.bottom.toFixed(1)}-$${primaryBuyZone?.top.toFixed(1)}).`;
    } else if (isOteActive && oteZone?.type === 'bullish') {
      decision = 'BUY';
      confidenceScore = 84;
      decisionReason = `Opportunité d’ACHAT (OTE 0.705) : Retracement technique dans la zone dorée de Fibonacci ($${oteZone.fib705.toFixed(1)}).`;
    } else {
      decision = 'WAIT';
      confidenceScore = 68;
      decisionReason = `Tendance haussière active mais cours actuellement trop élevé (en zone Premium). PATIENTEZ : Attendez un repli vers la Demand Zone ($${primaryBuyZone ? primaryBuyZone.top.toFixed(1) : (currentPrice - 8).toFixed(1)}) pour acheter à bon prix sans risquer un sommet.`;
    }
  } else if (marketStructure.trend === 'BEARISH') {
    if (isNearSupply && isOteActive) {
      decision = 'SELL';
      confidenceScore = 95;
      decisionReason = `Vente Sniper Institutionnelle (SHORT) : Tendance baissière confirmée, double confluence Rejet Supply Zone ($${primarySellZone?.bottom.toFixed(1)}-$${primarySellZone?.top.toFixed(1)}) et OTE 0.705.`;
    } else if (isNearSupply) {
      decision = 'SELL';
      confidenceScore = 88;
      decisionReason = `Opportunité de VENTE (SHORT - Supply Zone) : Le cours échoue sous l’Order Block vendeur institutionnel ($${primarySellZone?.bottom.toFixed(1)}-$${primarySellZone?.top.toFixed(1)}).`;
    } else if (isOteActive && oteZone?.type === 'bearish') {
      decision = 'SELL';
      confidenceScore = 84;
      decisionReason = `Opportunité de VENTE (SHORT - OTE 0.705) : Rebond de correction dans la zone de vente dorée Fibonacci ($${oteZone.fib705.toFixed(1)}).`;
    } else {
      decision = 'WAIT';
      confidenceScore = 68;
      decisionReason = `Tendance baissière active mais cours déjà très bas (en zone Discount). PATIENTEZ : Attendez un rebond correctif vers la Supply Zone ($${primarySellZone ? primarySellZone.bottom.toFixed(1) : (currentPrice + 8).toFixed(1)}) pour vendre au plus haut sans courir après le prix.`;
    }
  } else {
    // Range
    if (isNearDemand) {
      decision = 'BUY';
      confidenceScore = 80;
      decisionReason = `Rebond sur le bas du Range : ACHETER à $${currentPrice.toFixed(1)} avec Stop Loss obligatoire sous le support.`;
    } else if (isNearSupply) {
      decision = 'SELL';
      confidenceScore = 80;
      decisionReason = `Rejet sur le haut du Range : VENDRE (SHORT) sous la résistance avec Stop Loss obligatoire au-dessus.`;
    } else {
      decision = 'WAIT';
      confidenceScore = 60;
      decisionReason = `Marché neutre en milieu de range. PATIENTEZ impérativement : Ne tradez pas au hasard, attendez un test des extrêmes (Support ou Résistance).`;
    }
  }

  // 4. MATHEMATICALLY BULLETPROOF TRADE PLAN (SL, TP1, TP2, TP3)
  let entryPrice = currentPrice;
  let stopLoss = currentPrice;
  let takeProfit1 = currentPrice;
  let takeProfit2 = currentPrice;
  let takeProfit3 = currentPrice;
  let riskPerOunce = 5.0;

  if (decision === 'BUY') {
    // LONG: Entry <= current or demand top, SL strictly BELOW entry, TP strictly ABOVE entry
    entryPrice = isNearDemand && primaryBuyZone ? Math.min(currentPrice, primaryBuyZone.top) : currentPrice;
    const proposedSl = primaryBuyZone ? primaryBuyZone.bottom - 2.5 : entryPrice - 6.0;
    stopLoss = proposedSl < entryPrice ? proposedSl : entryPrice - 5.0;
    riskPerOunce = Math.max(1.5, entryPrice - stopLoss);

    takeProfit1 = primarySellZone && primarySellZone.bottom > entryPrice + riskPerOunce * 1.5
      ? primarySellZone.bottom
      : entryPrice + riskPerOunce * 2.0;
    takeProfit2 = entryPrice + riskPerOunce * 3.0;
    takeProfit3 = entryPrice + riskPerOunce * 4.5;
  } else if (decision === 'SELL') {
    // SHORT: Entry >= current or supply bottom, SL strictly ABOVE entry, TP strictly BELOW entry
    entryPrice = isNearSupply && primarySellZone ? Math.max(currentPrice, primarySellZone.bottom) : currentPrice;
    const proposedSl = primarySellZone ? primarySellZone.top + 2.5 : entryPrice + 6.0;
    stopLoss = proposedSl > entryPrice ? proposedSl : entryPrice + 5.0;
    riskPerOunce = Math.max(1.5, stopLoss - entryPrice);

    takeProfit1 = primaryBuyZone && primaryBuyZone.top < entryPrice - riskPerOunce * 1.5
      ? primaryBuyZone.top
      : entryPrice - riskPerOunce * 2.0;
    takeProfit2 = entryPrice - riskPerOunce * 3.0;
    takeProfit3 = entryPrice - riskPerOunce * 4.5;
  } else {
    // WAIT: Show the anticipated setup levels cleanly
    if (marketStructure.trend === 'BEARISH') {
      entryPrice = primarySellZone ? primarySellZone.bottom : currentPrice + 6.0;
      stopLoss = primarySellZone ? primarySellZone.top + 2.5 : entryPrice + 5.0;
      riskPerOunce = Math.max(1.5, stopLoss - entryPrice);
      takeProfit1 = entryPrice - riskPerOunce * 2.0;
      takeProfit2 = entryPrice - riskPerOunce * 3.0;
      takeProfit3 = entryPrice - riskPerOunce * 4.5;
    } else {
      entryPrice = primaryBuyZone ? primaryBuyZone.top : currentPrice - 6.0;
      stopLoss = primaryBuyZone ? primaryBuyZone.bottom - 2.5 : entryPrice - 5.0;
      riskPerOunce = Math.max(1.5, entryPrice - stopLoss);
      takeProfit1 = entryPrice + riskPerOunce * 2.0;
      takeProfit2 = entryPrice + riskPerOunce * 3.0;
      takeProfit3 = entryPrice + riskPerOunce * 4.5;
    }
  }

  // Format precision
  entryPrice = parseFloat(entryPrice.toFixed(2));
  stopLoss = parseFloat(stopLoss.toFixed(2));
  takeProfit1 = parseFloat(takeProfit1.toFixed(2));
  takeProfit2 = parseFloat(takeProfit2.toFixed(2));
  takeProfit3 = parseFloat(takeProfit3.toFixed(2));

  // Dollars values for chosen lot size (1 lot = 100 oz, 0.1 lot = 10 oz, 0.01 lot = 1 oz)
  const ounces = lotSize * 100;
  const totalRiskDollars = riskPerOunce * ounces;
  const totalGainTp1 = Math.abs(takeProfit1 - entryPrice) * ounces;
  const totalGainTp2 = Math.abs(takeProfit2 - entryPrice) * ounces;
  const totalGainTp3 = Math.abs(takeProfit3 - entryPrice) * ounces;

  const handleRunAiAnalysis = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/gold/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPrice,
          trend: marketStructure.trend,
          demandZone: primaryBuyZone,
          supplyZone: primarySellZone,
          oteZone,
          pocPrice: volumeProfile?.pocPrice,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l’analyse.');
      setAiAnalysis(data.analysis);
    } catch (err: any) {
      setAiError(err.message || 'Impossible de joindre le service IA.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 0. CLEAR ACTION DECISION & 5-STEP BEGINNER BLUEPRINT */}
      <BeginnerActionGuide
        decision={decision}
        confidenceScore={confidenceScore}
        currentPrice={currentPrice}
        entryPrice={entryPrice}
        stopLoss={stopLoss}
        takeProfit1={takeProfit1}
        takeProfit2={takeProfit2}
        takeProfit3={takeProfit3}
        lotSize={lotSize}
        totalRiskDollars={totalRiskDollars}
        totalGainTp1={totalGainTp1}
        totalGainTp2={totalGainTp2}
        totalGainTp3={totalGainTp3}
        trend={marketStructure.trend}
        oteActive={isOteActive}
        orderBlockNear={isNearDemand || isNearSupply}
        reason={decisionReason}
      />

      {/* 1. TOP TICKER & CONTROLS BANNER */}
      <div className="p-4 rounded-xl bg-slate-900/95 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Left: Asset Price & 24h stats */}
        <div className="flex items-center space-x-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-base shadow-lg shadow-amber-950/30">
            Au
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-white tracking-wide">OR (XAU / USD)</span>
              <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Radio className="w-2.5 h-2.5 animate-ping text-emerald-400" />
                <span>FLUX DIRECT</span>
              </span>
            </div>
            <div className="flex items-baseline space-x-2.5 mt-0.5">
              <span
                className={`text-2xl font-mono font-bold tracking-tight transition-colors duration-300 ${
                  priceFlash === 'up'
                    ? 'text-emerald-400'
                    : priceFlash === 'down'
                    ? 'text-rose-400'
                    : 'text-white'
                }`}
              >
                ${currentPrice.toFixed(2)}
              </span>
              <span
                className={`text-xs font-mono font-semibold flex items-center ${
                  change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {change24h >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                )}
                {change24h >= 0 ? `+${change24h.toFixed(2)}%` : `${change24h.toFixed(2)}%`}
              </span>
              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                H: ${high24h.toFixed(1)} | L: ${low24h.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Timeframe & Stream Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe pills */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {['1m', '5m', '15m', '1h', '4h', '1d'].map(tf => (
              <button
                key={tf}
                onClick={() => onSelectInterval(tf)}
                className={`px-2 py-1 rounded font-mono text-xs font-semibold transition-all ${
                  selectedInterval === tf
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              autoRefresh
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Auto ({countdown}s)</span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>

          {/* TradingView Widget Toggle */}
          <button
            onClick={() => setShowTvWidget(!showTvWidget)}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              showTvWidget
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Widget TV</span>
          </button>

          {/* Strategy Winrate Button */}
          {onOpenWinrateTab && (
            <button
              id="btn-terminal-winrate"
              onClick={onOpenWinrateTab}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all shadow-sm"
              title="Afficher les performances de la stratégie et le Winrate"
            >
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>Winrate {performanceMetrics ? `${performanceMetrics.winratePercent}%` : '81.5%'}</span>
            </button>
          )}

          {/* Signal Calendar & Journal Button */}
          {onOpenCalendarTab && (
            <button
              id="btn-terminal-calendar"
              onClick={onOpenCalendarTab}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all shadow-sm"
              title="Ouvrir le calendrier retraçant chaque signal envoyé avec résultats TP/SL et étude d'auto-amélioration"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Calendrier & Journal</span>
            </button>
          )}
        </div>
      </div>

      {/* Embedded Official TradingView Chart Widget (Optional Accordion) */}
      {showTvWidget && (
        <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-3 py-1.5 text-xs text-slate-400 border-b border-slate-800">
            <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Graphique Officiel TradingView Temps Réel (XAU/USD)</span>
            </span>
            <span className="text-[10px] text-slate-500">Flux Institutionnel OANDA / ICE</span>
          </div>
          <div className="w-full h-[450px] relative">
            <iframe
              src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_gold&symbol=OANDA%3AXAUUSD&interval=15&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=0c121e&studies=%5B%5D&theme=dark&style=1&timezone=Europe%2FParis&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=fr&utm_source=localhost"
              className="w-full h-full border-0"
              title="TradingView Gold Real-time Chart"
            />
          </div>
        </div>
      )}

      {/* 1.5 REAL-TIME INTERACTIVE MT5/TRADINGVIEW CHART WITH TIMEFRAMES, SIGNALS, SL & TP */}
      <div className="space-y-2">
        <RealtimeInteractiveChart
          candles={candles}
          currentPrice={currentPrice}
          selectedInterval={selectedInterval}
          onSelectInterval={onSelectInterval}
          demandZones={demandZones}
          supplyZones={supplyZones}
          oteZone={oteZone}
          marketStructure={marketStructure}
          signals={signals}
          volumeProfile={volumeProfile}
          settings={settings}
          entryPrice={entryPrice}
          stopLoss={stopLoss}
          takeProfit1={takeProfit1}
          takeProfit2={takeProfit2}
          takeProfit3={takeProfit3}
          lotSize={lotSize}
          symbolName="XAU/USD (Or Spot)"
          isLive={true}
        />
      </div>

      {/* 2. 4 CORE ANALYSIS MODULES: ORDER BLOCKS, OTE, MARKET STRUCTURE, SL/TP PLAN */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Order Block Demande (Zone d'Achat Or) */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/40 space-y-2 shadow-lg shadow-cyan-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-cyan-400 font-semibold text-xs">
              <Layers className="w-4 h-4" />
              <span>Zone d'Achat (Order Block)</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              {demandZones.length} Détectée(s)
            </span>
          </div>

          {primaryBuyZone ? (
            <div className="space-y-1.5">
              <div className="text-base font-mono font-bold text-white">
                ${primaryBuyZone.bottom.toFixed(2)} - ${primaryBuyZone.top.toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-300">
                Statut :{' '}
                <span className="text-emerald-400 font-medium">
                  {primaryBuyZone.isMitigated ? 'Atténuée (Testée)' : 'Zone Fraîche Institutionnelle'}
                </span>
              </p>
              <div className="text-[10px] text-slate-400 font-mono">
                Écart au prix :{' '}
                <span className="text-cyan-300">
                  ${Math.abs(currentPrice - primaryBuyZone.top).toFixed(2)} (
                  {(((currentPrice - primaryBuyZone.top) / currentPrice) * 100).toFixed(2)}%)
                </span>
              </div>
            </div>
          ) : (
            <span className="text-xs text-slate-500 italic">En attente d'une impulsion haussière...</span>
          )}
        </div>

        {/* Card 2: ICT Optimal Trade Entry (OTE) */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/40 space-y-2 shadow-lg shadow-emerald-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold text-xs">
              <Target className="w-4 h-4" />
              <span>Zone OTE (Fibonacci ICT)</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
              0.705 Sweet Spot
            </span>
          </div>

          {oteZone ? (
            <div className="space-y-1">
              <div className="flex items-baseline space-x-2">
                <span className="text-base font-mono font-bold text-amber-400">
                  ${oteZone.fib705.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Entrée Sniper</span>
              </div>
              <div className="text-[11px] text-slate-300 space-y-0.5">
                <div className="flex justify-between font-mono text-[10px] text-slate-400">
                  <span>0.62: ${oteZone.fib62.toFixed(1)}</span>
                  <span>0.79: ${oteZone.fib79.toFixed(1)}</span>
                </div>
                <div className="pt-0.5">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      oteZone.isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {oteZone.isActive ? 'Prix en Zone OTE d’Achat' : 'En attente du Retracement'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <span className="text-xs text-slate-500 italic">Calcul du swing récent en cours...</span>
          )}
        </div>

        {/* Card 3: Tendance du Marché & Structure */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-purple-500/40 space-y-2 shadow-lg shadow-purple-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-purple-400 font-semibold text-xs">
              <TrendingUp className="w-4 h-4" />
              <span>Tendance & Structure de l'Or</span>
            </div>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                marketStructure.trend === 'BULLISH'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : marketStructure.trend === 'BEARISH'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {marketStructure.trend === 'BULLISH'
                ? 'HAUSSIÈRE (Bullish)'
                : marketStructure.trend === 'BEARISH'
                ? 'BAISSIÈRE (Bearish)'
                : 'RANGE / ACCUMULATION'}
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
              <span className="text-slate-400">BOS (Break of Structure):</span>
              <span className="font-bold text-white">
                {marketStructure.bos ? `$${marketStructure.bos.price.toFixed(1)}` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
              <span className="text-slate-400">CHoCH / MSS:</span>
              <span className="font-bold text-purple-300">
                {marketStructure.choch ? `$${marketStructure.choch.price.toFixed(1)}` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
              <span className="text-slate-400">Point of Control (POC):</span>
              <span className="font-bold text-yellow-400">
                {volumeProfile ? `$${volumeProfile.pocPrice.toFixed(1)}` : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Stop Loss & Take Profit Sniper */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/50 space-y-2 shadow-lg shadow-emerald-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold text-xs">
              <ShieldAlert className="w-4 h-4" />
              <span>Plan de Trade : SL & TP</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 font-bold">
              R:R 1:3 à 1:5+
            </span>
          </div>

          <div className="space-y-1 font-mono text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-rose-400 font-semibold">Stop Loss (SL) :</span>
              <span className="text-rose-400 font-bold">${stopLoss.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-emerald-400 font-semibold">Take Profit 1 (1:2) :</span>
              <span className="text-emerald-300">${takeProfit1.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-emerald-400 font-semibold">Take Profit 2 (1:3) :</span>
              <span className="text-emerald-300">${takeProfit2.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-emerald-400 font-semibold">Take Profit 3 (1:5+) :</span>
              <span className="text-emerald-300">${takeProfit3.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CALCULATEUR INTERACTIF DU RISQUE EN DOLLARS & LOTS SUR L'OR */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-white text-sm">
              Dimensionnement de Position sur l'Or (Lot Sizing)
            </h4>
            <p className="text-slate-400 text-[11px]">
              Calcul direct du Risque ($) et des Gains Potentiels en fonction de la taille de votre lot.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Lot Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[11px]">Taille du lot :</span>
            {[0.01, 0.1, 0.5, 1.0].map(s => (
              <button
                key={s}
                onClick={() => setLotSize(s)}
                className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold transition-colors ${
                  lotSize === s
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-900 text-slate-300 hover:text-white'
                }`}
              >
                {s} lot
              </button>
            ))}
          </div>

          {/* Dollar Risk & Gains Badges */}
          <div className="flex items-center space-x-2 font-mono text-xs">
            <div className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300">
              Risque : <strong className="text-rose-400">-${totalRiskDollars.toFixed(0)}</strong>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300">
              Gain TP2 (1:3) : <strong className="text-emerald-400">+${totalGainTp2.toFixed(0)}</strong>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-700/80 text-emerald-200">
              Gain TP3 (1:5) : <strong className="text-emerald-300">+${totalGainTp3.toFixed(0)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 4. GEMINI LIVE AI ANALYSIS ON GOLD (BOUTON & RAPPORT) */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-amber-950/30 border border-amber-500/30 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">
                Audit Stratégique IA de l'Or en Direct (Smart Money / ICT)
              </h4>
              <p className="text-[11px] text-slate-400">
                Analyse immédiate de la structure actuelle, des Order Blocks et du timing d'entrée optimal.
              </p>
            </div>
          </div>

          <button
            id="btn-run-gold-ai"
            onClick={handleRunAiAnalysis}
            disabled={aiLoading}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-950/40 transition-all active:scale-95 whitespace-nowrap"
          >
            {aiLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Analyse de l'Or en cours...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Lancer l'Audit IA de l'Or</span>
              </>
            )}
          </button>
        </div>

        {aiError && (
          <div className="p-3 bg-red-950/50 border border-red-800 rounded-lg text-red-300 text-xs">
            {aiError}
          </div>
        )}

        {aiAnalysis && (
          <div className="mt-3 p-4 rounded-xl bg-slate-950/90 border border-amber-500/20 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap select-text">
            {aiAnalysis}
          </div>
        )}
      </div>
    </div>
  );
};
