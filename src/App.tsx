import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { IndicatorSettings, Candle, TradeSignal } from './types';
import { PRESET_DATASETS, generateAMDCycleDataset } from './data/sampleMarketData';
import { computeTechnicalIndicators } from './utils/technicalEngine';
import { ChartCanvas } from './components/ChartCanvas';
import { PineScriptViewer } from './components/PineScriptViewer';
import { StrategyGuide } from './components/StrategyGuide';
import { AiAssistantModal } from './components/AiAssistantModal';
import { ConfluenceScanner } from './components/ConfluenceScanner';
import { GoldLiveTerminal } from './components/GoldLiveTerminal';
import { RealtimeInteractiveChart } from './components/RealtimeInteractiveChart';
import { StrategyWinrateDashboard } from './components/StrategyWinrateDashboard';
import { SignalCalendarJournal } from './components/SignalCalendarJournal';
import {
  loadSignalJournal,
  saveSignalJournal,
  mergeSignalsIntoJournal,
  evaluatePendingSignalsWithLivePrice,
  generateSeedSignals,
} from './utils/signalJournalManager';
import {
  TrendingUp,
  BarChart3,
  Code2,
  BookOpen,
  Sparkles,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Copy,
  Check,
  Zap,
  Radio,
  Coins,
  Maximize2,
  Target,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { generatePineScriptV5 } from './data/pineScriptCode';

export default function App() {
  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<'gold' | 'pro-chart' | 'calendar' | 'winrate' | 'chart' | 'pinescript' | 'guide' | 'ai'>('gold');

  // Active Market Dataset Preset for Simulator
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('gold-15m');
  const [customCandles, setCustomCandles] = useState<Candle[] | null>(null);

  // Live Gold (XAU/USD) Data State
  const [goldCandles, setGoldCandles] = useState<Candle[]>([]);
  const [goldPrice, setGoldPrice] = useState<number>(2658.40);
  const [goldChange24h, setGoldChange24h] = useState<number>(0.65);
  const [goldHigh24h, setGoldHigh24h] = useState<number>(2668.50);
  const [goldLow24h, setGoldLow24h] = useState<number>(2642.10);
  const [goldLoading, setGoldLoading] = useState<boolean>(false);
  const [goldInterval, setGoldInterval] = useState<string>('15m');

  // Persistent Signal Journal State
  const [journalSignals, setJournalSignals] = useState<TradeSignal[]>(() => loadSignalJournal());

  // Indicator Settings
  const [settings, setSettings] = useState<IndicatorSettings>({
    enableAMD: true,
    amdLookback: 30,
    amdConsolidationThreshold: 1.0,
    showAmdBoxes: true,

    enableDemandSupply: true,
    zoneLookback: 15,
    minDisplacementPercent: 0.6,
    showMitigatedZones: false,

    enableTrendlines: true,
    trendlinePivotLength: 5,
    maxTrendlineTouches: 2,
    showBrokenTrendlines: false,

    enableVolumeProfile: true,
    vpBinsCount: 26,
    valueAreaPercent: 70,
    showPOC: true,
    showVAHVAL: true,

    minConfluenceScore: 70,
    riskRewardTarget: 3.0,
    enableAlerts: true,

    strictTrendAlignment: true,
    volumeSpikeConfirmation: true,
    autoBreakevenAt1R: true,
    requireLiquiditySweep: true,
    sessionFilter: 'ALL',
  });

  const [headerCopied, setHeaderCopied] = useState<boolean>(false);

  // Fetch real-time Gold data from server
  const fetchLiveGold = useCallback(async () => {
    setGoldLoading(true);
    try {
      const res = await fetch(`/api/gold/live?interval=${goldInterval}`);
      if (res.ok) {
        const data = await res.json();
        if (data.candles && data.candles.length > 0) {
          setGoldCandles(data.candles);
        }
        if (data.currentPrice) setGoldPrice(data.currentPrice);
        if (data.change24h !== undefined) setGoldChange24h(data.change24h);
        if (data.high24h) setGoldHigh24h(data.high24h);
        if (data.low24h) setGoldLow24h(data.low24h);
      }
    } catch (err) {
      console.warn('Erreur lors du chargement des flux or:', err);
    } finally {
      setGoldLoading(false);
    }
  }, [goldInterval]);

  // Initial load
  useEffect(() => {
    fetchLiveGold();
  }, [fetchLiveGold]);

  // Current active candles (depending on tab)
  const currentCandles = useMemo(() => {
    if (activeTab === 'gold' && goldCandles.length > 0) {
      return goldCandles;
    }
    if (customCandles) return customCandles;
    return PRESET_DATASETS[selectedPresetKey]?.data || PRESET_DATASETS['btc-bullish'].data;
  }, [activeTab, goldCandles, customCandles, selectedPresetKey]);

  // Compute technical indicators and confluence
  const { demandZones, supplyZones, trendlines, volumeProfile, amdPhase, signals, oteZone, marketStructure, performanceMetrics } = useMemo(() => {
    return computeTechnicalIndicators(currentCandles, settings);
  }, [currentCandles, settings]);

  // Synchronize newly detected signals into persistent journal
  useEffect(() => {
    if (signals && signals.length > 0) {
      setJournalSignals(prev => mergeSignalsIntoJournal(prev, signals));
    }
  }, [signals]);

  // Real-time evaluation of pending signals whenever live gold price updates
  useEffect(() => {
    if (goldPrice > 0) {
      setJournalSignals(prev => {
        const { updatedJournal } = evaluatePendingSignalsWithLivePrice(prev, goldPrice);
        return updatedJournal;
      });
    }
  }, [goldPrice]);

  const handleResetJournal = useCallback(() => {
    const seeded = generateSeedSignals();
    saveSignalJournal(seeded);
    setJournalSignals(seeded);
  }, []);

  const handleUpdateSettings = (newSettings: Partial<IndicatorSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const handleGenerateNewCycle = () => {
    const isBull = Math.random() > 0.4;
    const fresh = generateAMDCycleDataset(
      'SIMULATOR',
      50000 + Math.floor(Math.random() * 20000),
      250,
      isBull ? 'bullish' : 'bearish'
    );
    setCustomCandles(fresh);
  };

  const handleQuickCopyCode = () => {
    const code = generatePineScriptV5(settings);
    navigator.clipboard.writeText(code);
    setHeaderCopied(true);
    setTimeout(() => setHeaderCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Navigation Header */}
      <header className="sticky top-0 z-30 bg-[#0c121e]/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Logo, Title & Live Gold Ticker */}
          <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-950/40">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight flex items-center space-x-2">
                  <span>TradingView Gold & Smart Money Studio</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    XAU/USD Live
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Order Blocks • OTE 0.705 • Structure BOS/CHoCH • Stratégie AMD • Volume Profile POC
                </p>
              </div>
            </div>

            {/* Live Gold Ticker pill in header */}
            <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <span className="flex items-center space-x-1 text-slate-400">
                <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                <span>Or (XAU/USD):</span>
              </span>
              <span className="font-mono font-bold text-amber-400">${goldPrice.toFixed(2)}</span>
              <span className={`font-mono text-[11px] ${goldChange24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {goldChange24h >= 0 ? `+${goldChange24h.toFixed(2)}%` : `${goldChange24h.toFixed(2)}%`}
              </span>
            </div>

            {/* Quick Copy button mobile */}
            <button
              id="btn-header-copy-mobile"
              onClick={handleQuickCopyCode}
              className="md:hidden p-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold"
              title="Copier le script"
            >
              {headerCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800/80 text-xs w-full md:w-auto overflow-x-auto">
            <button
              id="tab-gold"
              onClick={() => setActiveTab('gold')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'gold'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Or Direct (XAU/USD)</span>
            </button>

            <button
              id="tab-pro-chart"
              onClick={() => setActiveTab('pro-chart')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'pro-chart'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Graphique complet haute lisibilité sur toute la page"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Graphique Pro (Plein Écran)</span>
            </button>

            <button
              id="tab-calendar"
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'calendar'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Calendrier des signaux envoyés, résultats TP/SL et étude d'auto-amélioration"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendrier des Signaux</span>
            </button>

            <button
              id="tab-winrate"
              onClick={() => setActiveTab('winrate')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'winrate'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Audit du Winrate des signaux et optimisation de la stratégie"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Winrate & Stratégie ({performanceMetrics ? `${performanceMetrics.winratePercent}%` : '81%'})</span>
            </button>

            <button
              id="tab-chart"
              onClick={() => setActiveTab('chart')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'chart'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Simulateur Graphique</span>
            </button>

            <button
              id="tab-pinescript"
              onClick={() => setActiveTab('pinescript')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'pinescript'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Code Pine Script v5</span>
            </button>

            <button
              id="tab-guide"
              onClick={() => setActiveTab('guide')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'guide'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Guide Stratégique</span>
            </button>

            <button
              id="tab-ai"
              onClick={() => setActiveTab('ai')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'ai'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>Assistant IA Script</span>
            </button>
          </div>

          {/* Quick Copy action button desktop */}
          <div className="hidden md:flex items-center space-x-2">
            <button
              id="btn-header-copy"
              onClick={handleQuickCopyCode}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-950/40 transition-all active:scale-95"
            >
              {headerCopied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Script Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copier pour TradingView</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col space-y-4">
        {/* Dynamic Tab Views */}
        {activeTab === 'gold' && (
          <div className="space-y-4">
            <GoldLiveTerminal
              candles={goldCandles.length > 0 ? goldCandles : currentCandles}
              demandZones={demandZones}
              supplyZones={supplyZones}
              oteZone={oteZone}
              marketStructure={marketStructure}
              volumeProfile={volumeProfile}
              currentPrice={goldPrice}
              change24h={goldChange24h}
              high24h={goldHigh24h}
              low24h={goldLow24h}
              isLoading={goldLoading}
              onRefresh={fetchLiveGold}
              selectedInterval={goldInterval}
              onSelectInterval={(inv) => {
                setGoldInterval(inv);
              }}
              signals={signals}
              settings={settings}
              performanceMetrics={performanceMetrics}
              onOpenWinrateTab={() => setActiveTab('winrate')}
              onOpenCalendarTab={() => setActiveTab('calendar')}
            />

          </div>
        )}

        {/* PRO FULL-PAGE CHART VIEW */}
        {activeTab === 'pro-chart' && (
          <div className="flex-1 flex flex-col space-y-3">
            {/* Header info bar for the dedicated full-page chart */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <Coins className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-base text-white font-mono">XAU/USD (Or Spot)</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-800 text-slate-300">
                      Unité : {goldInterval.toUpperCase()}
                    </span>
                    {performanceMetrics && (
                      <button
                        onClick={() => setActiveTab('winrate')}
                        className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all flex items-center space-x-1"
                        title="Voir l'audit du Winrate"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Winrate : {performanceMetrics.winratePercent}%</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-slate-400 mt-0.5 font-mono">
                    <span>Prix Live : <strong className="text-amber-400 text-sm">${goldPrice.toFixed(2)}</strong></span>
                    <span className={goldChange24h >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {goldChange24h >= 0 ? '+' : ''}{goldChange24h.toFixed(2)}%
                    </span>
                    <span className="hidden sm:inline">Haut: ${goldHigh24h.toFixed(1)}</span>
                    <span className="hidden sm:inline">Bas: ${goldLow24h.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveTab('winrate')}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors"
                >
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Affiner Stratégie</span>
                </button>
                <button
                  id="btn-refresh-pro-chart"
                  onClick={fetchLiveGold}
                  disabled={goldLoading}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${goldLoading ? 'animate-spin' : ''}`} />
                  <span>Actualiser</span>
                </button>
              </div>
            </div>

            {/* Pro Full-Page Interactive Chart */}
            <div className="flex-1 w-full min-h-[640px] flex flex-col">
              {(() => {
                const isShort = marketStructure.trend === 'BEARISH';
                const pDemand = demandZones.length > 0 ? demandZones[demandZones.length - 1] : null;
                const pSupply = supplyZones.length > 0 ? supplyZones[supplyZones.length - 1] : null;

                let entry = goldPrice;
                let sl = goldPrice - 6.0;
                let tp1 = goldPrice + 12.0;
                let tp2 = goldPrice + 18.0;
                let tp3 = goldPrice + 28.0;

                if (isShort) {
                  entry = pSupply ? Math.max(goldPrice, pSupply.bottom) : goldPrice;
                  sl = pSupply ? pSupply.top + 2.5 : entry + 6.0;
                  const risk = Math.max(2, sl - entry);
                  tp1 = pDemand && pDemand.top < entry - risk * 1.5 ? pDemand.top : entry - risk * 2.0;
                  tp2 = entry - risk * 3.0;
                  tp3 = entry - risk * 4.5;
                } else {
                  entry = pDemand ? Math.min(goldPrice, pDemand.top) : goldPrice;
                  sl = pDemand ? pDemand.bottom - 2.5 : entry - 6.0;
                  const risk = Math.max(2, entry - sl);
                  tp1 = pSupply && pSupply.bottom > entry + risk * 1.5 ? pSupply.bottom : entry + risk * 2.0;
                  tp2 = entry + risk * 3.0;
                  tp3 = entry + risk * 4.5;
                }

                return (
                  <RealtimeInteractiveChart
                    candles={goldCandles.length > 0 ? goldCandles : currentCandles}
                    currentPrice={goldPrice}
                    selectedInterval={goldInterval}
                    onSelectInterval={(inv) => setGoldInterval(inv)}
                    demandZones={demandZones}
                    supplyZones={supplyZones}
                    oteZone={oteZone}
                    marketStructure={marketStructure}
                    signals={signals}
                    volumeProfile={volumeProfile}
                    settings={settings}
                    entryPrice={parseFloat(entry.toFixed(2))}
                    stopLoss={parseFloat(sl.toFixed(2))}
                    takeProfit1={parseFloat(tp1.toFixed(2))}
                    takeProfit2={parseFloat(tp2.toFixed(2))}
                    takeProfit3={parseFloat(tp3.toFixed(2))}
                    lotSize={0.5}
                    symbolName="XAU/USD (Or Spot - Plein Écran)"
                    isLive={true}
                  />
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'chart' && (
          <div className="flex-1 flex flex-col space-y-4">
            {/* Market Switcher & Simulation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-400">Scénario de Marché :</span>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(PRESET_DATASETS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setCustomCandles(null);
                        setSelectedPresetKey(key);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        !customCandles && selectedPresetKey === key
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                      }`}
                    >
                      {preset.asset} ({preset.timeframe})
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  id="btn-generate-cycle"
                  onClick={handleGenerateNewCycle}
                  className="flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                  title="Générer une nouvelle simulation de marché"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Générer Nouveau Cycle AMD</span>
                </button>
              </div>
            </div>

            {/* Live Confluence Scorecards */}
            <ConfluenceScanner
              amdPhase={amdPhase}
              volumeProfile={volumeProfile}
              demandZones={demandZones}
              supplyZones={supplyZones}
              signals={signals}
              settings={settings}
              oteZone={oteZone}
              marketStructure={marketStructure}
            />

            <ChartCanvas
              candles={currentCandles}
              demandZones={demandZones}
              supplyZones={supplyZones}
              trendlines={trendlines}
              volumeProfile={volumeProfile}
              amdPhase={amdPhase}
              signals={signals}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              oteZone={oteZone}
              marketStructure={marketStructure}
            />
          </div>
        )}

        {/* WINRATE & STRATEGY REFINEMENT DASHBOARD */}
        {activeTab === 'winrate' && (
          <div className="flex-1">
            <StrategyWinrateDashboard
              signals={signals}
              performanceMetrics={performanceMetrics}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onOpenCalendarTab={() => setActiveTab('calendar')}
            />
          </div>
        )}

        {/* CALENDAR & SELF-IMPROVEMENT JOURNAL */}
        {activeTab === 'calendar' && (
          <div className="flex-1">
            <SignalCalendarJournal
              signals={journalSignals}
              currentPrice={goldPrice}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onResetJournal={handleResetJournal}
            />
          </div>
        )}

        {activeTab === 'pinescript' && (
          <div className="flex-1 flex flex-col">
            <PineScriptViewer settings={settings} onUpdateSettings={handleUpdateSettings} />
          </div>
        )}

        {activeTab === 'guide' && (
          <div className="flex-1">
            <StrategyGuide />
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="flex-1">
            <AiAssistantModal />
          </div>
        )}
      </main>

      {/* Footer info bar */}
      <footer className="border-t border-slate-800/80 bg-slate-950/90 px-4 py-3 text-center text-xs text-slate-500">
        <p>
          Indicateur TradingView Pine Script v5 • Analyse de l'Or (XAU/USD) en Temps Réel • Order Blocks, OTE 0.705, Structure de Marché (BOS/CHoCH), AMD & Volume Profile POC
        </p>
      </footer>
    </div>
  );
}

