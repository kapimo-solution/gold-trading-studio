import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Candle,
  Zone,
  Trendline,
  VolumeProfileData,
  AMDPhase,
  TradeSignal,
  IndicatorSettings,
  OTEZone,
  MarketStructure,
} from '../types';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Crosshair,
  Layers,
  Sparkles,
  Compass,
  Eye,
  EyeOff,
} from 'lucide-react';

interface ChartCanvasProps {
  candles: Candle[];
  demandZones: Zone[];
  supplyZones: Zone[];
  trendlines: Trendline[];
  volumeProfile: VolumeProfileData | null;
  amdPhase: AMDPhase | null;
  signals: TradeSignal[];
  settings: IndicatorSettings;
  onUpdateSettings: (newSettings: Partial<IndicatorSettings>) => void;
  oteZone?: OTEZone | null;
  marketStructure?: MarketStructure | null;
}

export const ChartCanvas: React.FC<ChartCanvasProps> = ({
  candles,
  demandZones,
  supplyZones,
  trendlines,
  volumeProfile,
  amdPhase,
  signals,
  settings,
  onUpdateSettings,
  oteZone,
  marketStructure,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Playback / Replay state
  const [playbackBar, setPlaybackBar] = useState<number>(candles.length);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(350); // ms per bar

  // Mouse hover / crosshair state
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number; price: number } | null>(null);

  // Zoom & Pan state
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<number>(0);

  // Fullscreen and Clean Mode states
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [cleanMode, setCleanMode] = useState<boolean>(false);

  // Escape key exits fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Update playback bar when dataset changes
  useEffect(() => {
    setPlaybackBar(candles.length);
    setIsPlaying(false);
  }, [candles]);

  // Replay interval timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setPlaybackBar(prev => {
        if (prev >= candles.length) {
          setIsPlaying(false);
          return candles.length;
        }
        return prev + 1;
      });
    }, playSpeed);
    return () => clearInterval(interval);
  }, [isPlaying, candles.length, playSpeed]);

  // Visible candles up to playback bar
  const activeCandles = useMemo(() => {
    return candles.slice(0, playbackBar);
  }, [candles, playbackBar]);

  // Filter signals up to playback bar
  const activeSignals = useMemo(() => {
    return signals.filter(s => s.barIndex < playbackBar);
  }, [signals, playbackBar]);

  // Render chart on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || activeCandles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);

    // Padding & layout
    const paddingLeft = 10;
    const paddingRight = 75;
    const paddingTop = 30;
    const volumeHeight = 70;
    const mainChartHeight = height - paddingTop - volumeHeight - 30;

    // Price scaling
    const prices = activeCandles.flatMap(c => [c.high, c.low]);
    if (amdPhase) {
      prices.push(amdPhase.accHigh, amdPhase.accLow, amdPhase.sweepExtremePrice);
    }
    demandZones.forEach(z => prices.push(z.top, z.bottom));
    supplyZones.forEach(z => prices.push(z.top, z.bottom));
    if (volumeProfile) {
      prices.push(volumeProfile.pocPrice, volumeProfile.vahPrice, volumeProfile.valPrice);
    }

    const minPrice = Math.min(...prices) * 0.998;
    const maxPrice = Math.max(...prices) * 1.002;
    const priceRange = maxPrice - minPrice || 1;

    const priceToY = (p: number) => {
      return paddingTop + mainChartHeight - ((p - minPrice) / priceRange) * mainChartHeight;
    };

    const yToPrice = (y: number) => {
      return minPrice + ((paddingTop + mainChartHeight - y) / mainChartHeight) * priceRange;
    };

    // Bar coordinate calculations
    const chartWidth = width - paddingLeft - paddingRight;
    const barSpacing = (chartWidth / Math.max(candles.length, 30)) * zoomLevel;
    const candleWidth = Math.max(3, barSpacing * 0.65);

    const barToX = (index: number) => {
      return paddingLeft + index * barSpacing + panOffset;
    };

    // Clear background
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = '#1e293b'; // slate-800
    ctx.lineWidth = 1;
    const gridRows = 6;
    for (let i = 0; i <= gridRows; i++) {
      const y = paddingTop + (mainChartHeight / gridRows) * i;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();

      // Price labels on right axis
      const p = yToPrice(y);
      ctx.fillStyle = '#64748b'; // slate-500
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(p >= 100 ? p.toFixed(1) : p.toFixed(4), width - paddingRight + 8, y + 4);
    }

    // 1. DRAW DEMAND & SUPPLY ZONES
    if (settings.enableDemandSupply) {
      // Demand Zones (Cyan / Teal)
      demandZones.forEach(z => {
        if (z.startBar >= activeCandles.length) return;
        const x1 = barToX(z.startBar);
        const x2 = Math.min(barToX(z.endBar) + candleWidth, width - paddingRight);
        const yTop = priceToY(z.top);
        const yBot = priceToY(z.bottom);
        const zHeight = Math.max(3, yBot - yTop);

        ctx.fillStyle = z.isMitigated ? 'rgba(6, 182, 212, 0.08)' : 'rgba(6, 182, 212, 0.18)';
        ctx.fillRect(x1, yTop, x2 - x1, zHeight);

        ctx.strokeStyle = z.isMitigated ? 'rgba(6, 182, 212, 0.3)' : 'rgba(6, 182, 212, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x1, yTop, x2 - x1, zHeight);

        // Zone label
        ctx.fillStyle = '#06b6d4';
        ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(
          z.isMitigated ? 'DEMAND (Atténuée)' : 'ZONE DE DEMANDE (BUY)',
          x1 + 4,
          yTop + 12
        );
      });

      // Supply Zones (Rose / Pink)
      supplyZones.forEach(z => {
        if (z.startBar >= activeCandles.length) return;
        const x1 = barToX(z.startBar);
        const x2 = Math.min(barToX(z.endBar) + candleWidth, width - paddingRight);
        const yTop = priceToY(z.top);
        const yBot = priceToY(z.bottom);
        const zHeight = Math.max(3, yBot - yTop);

        ctx.fillStyle = z.isMitigated ? 'rgba(236, 72, 153, 0.08)' : 'rgba(236, 72, 153, 0.18)';
        ctx.fillRect(x1, yTop, x2 - x1, zHeight);

        ctx.strokeStyle = z.isMitigated ? 'rgba(236, 72, 153, 0.3)' : 'rgba(236, 72, 153, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x1, yTop, x2 - x1, zHeight);

        ctx.fillStyle = '#ec4899';
        ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(
          z.isMitigated ? 'OFFRE (Atténuée)' : 'ZONE D’OFFRE (SELL)',
          x1 + 4,
          yTop + 12
        );
      });
    }

    // 1.5 DRAW ICT OPTIMAL TRADE ENTRY (OTE - FIBONACCI 0.62 / 0.705 / 0.79)
    if (oteZone && oteZone.swingHighBar < activeCandles.length) {
      const oteTop = Math.max(oteZone.fib62, oteZone.fib79);
      const oteBot = Math.min(oteZone.fib62, oteZone.fib79);
      const yTop = priceToY(oteTop);
      const yBot = priceToY(oteBot);
      const ySweet = priceToY(oteZone.fib705);
      const startX = barToX(Math.min(oteZone.swingLowBar, oteZone.swingHighBar));
      const endX = width - paddingRight;

      // OTE shaded area (Soft green)
      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.fillRect(startX, yTop, endX - startX, yBot - yTop);

      // OTE boundary border
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.strokeRect(startX, yTop, endX - startX, yBot - yTop);

      // OTE 0.705 Golden Sweet Spot Line
      ctx.strokeStyle = '#f59e0b'; // golden amber
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(startX, ySweet);
      ctx.lineTo(endX, ySweet);
      ctx.stroke();
      ctx.setLineDash([]);

      // OTE Label
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`★ OTE SWEET SPOT 0.705 ($${oteZone.fib705.toFixed(1)})`, startX + 6, ySweet - 4);

      ctx.fillStyle = 'rgba(16, 185, 129, 0.8)';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillText(`OTE 0.62 ($${oteZone.fib62.toFixed(1)})`, startX + 6, priceToY(oteZone.fib62) - 3);
      ctx.fillText(`OTE 0.79 ($${oteZone.fib79.toFixed(1)})`, startX + 6, priceToY(oteZone.fib79) + 9);
    }

    // 1.6 DRAW MARKET STRUCTURE (BOS & CHOCH)
    if (marketStructure && marketStructure.bos) {
      const { bos, choch } = marketStructure;
      const endX = width - paddingRight;

      // BOS line
      const bosY = priceToY(bos.price);
      ctx.strokeStyle = bos.type === 'bullish' ? '#10b981' : '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(barToX(Math.max(0, bos.bar - 10)), bosY);
      ctx.lineTo(endX, bosY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = bos.type === 'bullish' ? '#10b981' : '#ef4444';
      ctx.font = 'bold 8px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`BOS (${bos.price.toFixed(1)})`, endX - 6, bosY - 4);

      // CHoCH line
      if (choch) {
        const chochY = priceToY(choch.price);
        ctx.strokeStyle = '#a855f7'; // purple
        ctx.lineWidth = 1.2;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(barToX(Math.max(0, choch.bar - 8)), chochY);
        ctx.lineTo(endX, chochY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#c084fc';
        ctx.fillText(`CHoCH / MSS (${choch.price.toFixed(1)})`, endX - 6, chochY - 4);
      }
    }

    // 2. DRAW AMD (ACCUMULATION, MANIPULATION, DISTRIBUTION) PHASES
    if (!cleanMode && settings.enableAMD && amdPhase) {
      const { accStartBar, accEndBar, accHigh, accLow, manipulationBar, manipulationType } = amdPhase;

      if (accStartBar < activeCandles.length) {
        const x1 = barToX(accStartBar);
        const x2 = barToX(Math.min(accEndBar, activeCandles.length - 1));
        const yTop = priceToY(accHigh);
        const yBot = priceToY(accLow);

        // Accumulation box
        ctx.fillStyle = 'rgba(245, 158, 11, 0.12)'; // Amber
        ctx.fillRect(x1, yTop, x2 - x1, yBot - yTop);

        ctx.strokeStyle = '#f59e0b';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x1, yTop, x2 - x1, yBot - yTop);
        ctx.setLineDash([]);

        // Accumulation tag
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('1. ACCUMULATION (Range)', x1 + 6, yTop - 6);
      }

      // Manipulation indicator
      if (manipulationBar < activeCandles.length) {
        const mCandle = activeCandles[manipulationBar];
        const mX = barToX(manipulationBar);
        const extremeY = priceToY(amdPhase.sweepExtremePrice);

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mX, extremeY, 6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.fill();

        // Manipulation label
        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        const labelY = manipulationType === 'bullish_sweep' ? extremeY + 18 : extremeY - 10;
        ctx.fillText('2. MANIPULATION (Judas Swing)', mX, labelY);
      }

      // Distribution indicator
      if (amdPhase.distStartBar < activeCandles.length) {
        const dX = barToX(amdPhase.distStartBar);
        const lastX = barToX(activeCandles.length - 1);
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('3. DISTRIBUTION', dX + 8, priceToY(activeCandles[activeCandles.length - 1].close) - 10);
      }
    }

    // 3. DRAW FIXED RANGE VOLUME PROFILE (FRVP) & POINT OF CONTROL (POC)
    if (!cleanMode && settings.enableVolumeProfile && volumeProfile && volumeProfile.startBar < activeCandles.length) {
      const startX = barToX(volumeProfile.startBar);
      const endX = barToX(Math.min(volumeProfile.endBar, activeCandles.length - 1));
      const profileWidth = Math.min(180, (endX - startX) * 0.8);

      // Draw volume histogram bars
      volumeProfile.bins.forEach(bin => {
        const binY = priceToY(bin.price);
        const barLen = (bin.volume / volumeProfile.maxBinVolume) * profileWidth;
        const buyLen = (bin.buyVolume / bin.volume) * barLen;
        const sellLen = barLen - buyLen;

        // Buy volume (cyan)
        ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.fillRect(startX, binY - 2, buyLen, 4);

        // Sell volume (indigo)
        ctx.fillStyle = 'rgba(99, 102, 241, 0.4)';
        ctx.fillRect(startX + buyLen, binY - 2, sellLen, 4);
      });

      // POINT OF CONTROL (POC) Prominent Golden Line
      if (settings.showPOC) {
        const pocY = priceToY(volumeProfile.pocPrice);
        ctx.strokeStyle = '#eab308'; // bright gold yellow
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(startX, pocY);
        ctx.lineTo(width - paddingRight, pocY);
        ctx.stroke();

        // Golden POC badge on the right
        ctx.fillStyle = '#eab308';
        ctx.fillRect(width - paddingRight + 2, pocY - 9, 68, 18);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`POC ${volumeProfile.pocPrice.toFixed(1)}`, width - paddingRight + 36, pocY + 3);
      }

      // VAH & VAL
      if (settings.showVAHVAL) {
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.6)'; // Blue 400
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;

        const vahY = priceToY(volumeProfile.vahPrice);
        ctx.beginPath();
        ctx.moveTo(startX, vahY);
        ctx.lineTo(width - paddingRight, vahY);
        ctx.stroke();

        const valY = priceToY(volumeProfile.valPrice);
        ctx.beginPath();
        ctx.moveTo(startX, valY);
        ctx.lineTo(width - paddingRight, valY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#60a5fa';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('VAH', startX + 4, vahY - 3);
        ctx.fillText('VAL', startX + 4, valY + 10);
      }
    }

    // 4. DRAW DYNAMIC TRENDLINES
    if (!cleanMode && settings.enableTrendlines) {
      trendlines.forEach(tl => {
        if (tl.x1 >= activeCandles.length) return;
        const x1 = barToX(tl.x1);
        const y1 = priceToY(tl.y1);
        const x2 = barToX(Math.min(tl.x2 + 10, candles.length));
        const projectedY = tl.y1 + tl.slope * (Math.min(tl.x2 + 10, candles.length) - tl.x1);
        const y2 = priceToY(projectedY);

        ctx.strokeStyle = tl.type === 'support' ? '#22c55e' : '#f43f5e';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = tl.type === 'support' ? '#22c55e' : '#f43f5e';
        ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(
          tl.type === 'support' ? 'TRENDLINE SUPPORT' : 'TRENDLINE RÉSISTANCE',
          x1 + 4,
          y1 + (tl.type === 'support' ? 14 : -6)
        );
      });
    }

    // 5. DRAW CANDLESTICKS & VOLUME BARS
    const maxVolume = Math.max(...activeCandles.map(c => c.volume), 1);
    const volumeBaseY = height - 25;

    activeCandles.forEach((c, idx) => {
      const x = barToX(idx);
      const isBull = c.close >= c.open;
      const candleColor = isBull ? '#10b981' : '#ef4444';

      // Candlestick Wick
      const highY = priceToY(c.high);
      const lowY = priceToY(c.low);
      ctx.strokeStyle = candleColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Candlestick Body
      const openY = priceToY(c.open);
      const closeY = priceToY(c.close);
      const bodyY = Math.min(openY, closeY);
      const bodyHeight = Math.max(2, Math.abs(closeY - openY));

      ctx.fillStyle = candleColor;
      ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight);

      // Volume Bar
      const vBarHeight = (c.volume / maxVolume) * (volumeHeight - 10);
      ctx.fillStyle = isBull ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)';
      ctx.fillRect(x - candleWidth / 2, volumeBaseY - vBarHeight, candleWidth, vBarHeight);
    });

    // 6. DRAW SNIPER SIGNALS (CLEAN, ELEGANT, NON-OVERLAPPING)
    const latestSignal = activeSignals.length > 0 ? activeSignals[activeSignals.length - 1] : null;

    activeSignals.forEach(sig => {
      const x = barToX(sig.barIndex);
      const isBuy = sig.type === 'BUY';

      if (isBuy) {
        const y = priceToY(sig.price);
        // Clean upward chevron / triangle
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.moveTo(x, y + 14);
        ctx.lineTo(x - 5, y + 23);
        ctx.lineTo(x + 5, y + 23);
        ctx.closePath();
        ctx.fill();

        // Compact pill badge with backtest outcome
        let outcomeSuffix = '';
        if (sig.outcome === 'WIN_TP2') outcomeSuffix = ' ✓ TP2';
        else if (sig.outcome === 'WIN_TP1') outcomeSuffix = ' ✓ TP1';
        else if (sig.outcome === 'BREAKEVEN') outcomeSuffix = ' 🛡 BE';
        else if (sig.outcome === 'LOSS') outcomeSuffix = ' ✗ SL';

        const tagText = `▲ BUY ${sig.confluenceScore}%${outcomeSuffix}`;
        ctx.font = 'bold 8.5px "Plus Jakarta Sans", sans-serif';
        const textWidth = ctx.measureText(tagText).width;
        const pillW = textWidth + 10;
        const pillH = 15;

        ctx.fillStyle = sig.outcome === 'LOSS' ? 'rgba(76, 29, 149, 0.92)' : 'rgba(6, 78, 59, 0.92)';
        ctx.strokeStyle = sig.outcome === 'LOSS' ? '#a855f7' : '#10b981';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x - pillW / 2, y + 25, pillW, pillH, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(tagText, x, y + 36);
      } else {
        const y = priceToY(sig.price);
        // Clean downward chevron / triangle
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(x, y - 14);
        ctx.lineTo(x - 5, y - 23);
        ctx.lineTo(x + 5, y - 23);
        ctx.closePath();
        ctx.fill();

        // Compact pill badge with backtest outcome
        let outcomeSuffix = '';
        if (sig.outcome === 'WIN_TP2') outcomeSuffix = ' ✓ TP2';
        else if (sig.outcome === 'WIN_TP1') outcomeSuffix = ' ✓ TP1';
        else if (sig.outcome === 'BREAKEVEN') outcomeSuffix = ' 🛡 BE';
        else if (sig.outcome === 'LOSS') outcomeSuffix = ' ✗ SL';

        const tagText = `▼ SELL ${sig.confluenceScore}%${outcomeSuffix}`;
        ctx.font = 'bold 8.5px "Plus Jakarta Sans", sans-serif';
        const textWidth = ctx.measureText(tagText).width;
        const pillW = textWidth + 10;
        const pillH = 15;

        ctx.fillStyle = sig.outcome === 'LOSS' ? 'rgba(76, 29, 149, 0.92)' : 'rgba(127, 29, 29, 0.92)';
        ctx.strokeStyle = sig.outcome === 'LOSS' ? '#a855f7' : '#ef4444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x - pillW / 2, y - 25 - pillH, pillW, pillH, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(tagText, x, y - 29);
      }
    });

    // 6.1 DRAW SL & TP PROJECTIONS ONLY FOR THE MOST RECENT ACTIVE SIGNAL (No line clutter!)
    if (latestSignal) {
      const sigX = barToX(latestSignal.barIndex);
      const slY = priceToY(latestSignal.stopLoss);
      const tpY = priceToY(latestSignal.takeProfit1);

      // Stop Loss Red Dashed Line
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sigX, slY);
      ctx.lineTo(width - paddingRight + 5, slY);
      ctx.stroke();

      // SL Price pill in right margin
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(width - paddingRight + 5, slY - 8, 68, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`SL: $${latestSignal.stopLoss.toFixed(1)}`, width - paddingRight + 8, slY + 4);

      // Take Profit Green Line
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.9)';
      ctx.beginPath();
      ctx.moveTo(sigX, tpY);
      ctx.lineTo(width - paddingRight + 5, tpY);
      ctx.stroke();
      ctx.setLineDash([]);

      // TP Price pill in right margin
      ctx.fillStyle = '#10b981';
      ctx.fillRect(width - paddingRight + 5, tpY - 8, 68, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`TP: $${latestSignal.takeProfit1.toFixed(1)}`, width - paddingRight + 8, tpY + 4);
    }

    // 7. CROSSHAIR & HOVER CURSOR
    if (hoverPos) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(paddingLeft, hoverPos.y);
      ctx.lineTo(width - paddingRight, hoverPos.y);
      ctx.stroke();

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(hoverPos.x, paddingTop);
      ctx.lineTo(hoverPos.x, height - 25);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price tag on axis
      ctx.fillStyle = '#475569';
      ctx.fillRect(width - paddingRight + 2, hoverPos.y - 8, 68, 16);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(hoverPos.price.toFixed(2), width - paddingRight + 36, hoverPos.y + 4);
    }
  }, [
    activeCandles,
    demandZones,
    supplyZones,
    trendlines,
    volumeProfile,
    amdPhase,
    activeSignals,
    settings,
    zoomLevel,
    panOffset,
    hoverPos,
  ]);

  // Mouse move handler for crosshair & tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || activeCandles.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const paddingLeft = 10;
    const paddingRight = 75;
    const chartWidth = canvas.clientWidth - paddingLeft - paddingRight;
    const barSpacing = (chartWidth / Math.max(candles.length, 30)) * zoomLevel;

    const candleIdx = Math.round((x - paddingLeft - panOffset) / barSpacing);
    if (candleIdx >= 0 && candleIdx < activeCandles.length) {
      setHoverIndex(candleIdx);
      const prices = activeCandles.flatMap(c => [c.high, c.low]);
      const minPrice = Math.min(...prices) * 0.998;
      const maxPrice = Math.max(...prices) * 1.002;
      const mainChartHeight = canvas.clientHeight - 30 - 70 - 30;
      const calculatedPrice = minPrice + ((30 + mainChartHeight - y) / mainChartHeight) * (maxPrice - minPrice);
      setHoverPos({ x, y, price: calculatedPrice });
    } else {
      setHoverIndex(null);
      setHoverPos(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setHoverPos(null);
  };

  const hoveredCandle = hoverIndex !== null && hoverIndex < activeCandles.length ? activeCandles[hoverIndex] : null;

  return (
    <div
      className={`flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none border-0 h-screen w-screen p-2 bg-slate-950/98 backdrop-blur-xl'
          : 'h-[560px] md:h-[640px] w-full'
      }`}
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs gap-2">
        {/* Playback simulation controls */}
        <div className="flex items-center space-x-2">
          <button
            id="btn-play-pause"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Replay AMD'}</span>
          </button>

          <button
            id="btn-step-next"
            onClick={() => setPlaybackBar(p => Math.min(candles.length, p + 1))}
            disabled={playbackBar >= candles.length}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md disabled:opacity-40 transition-colors"
            title="Avancer d'une bougie"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-reset-playback"
            onClick={() => setPlaybackBar(15)}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            title="Recommencer au début du cycle AMD"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <span className="text-slate-400 font-mono text-[11px] ml-1 hidden sm:inline">
            Barre {playbackBar} / {candles.length}
          </span>
        </div>

        {/* Quick visual toggles */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto py-1">
          <button
            id="toggle-clean-mode"
            onClick={() => setCleanMode(!cleanMode)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
              cleanMode
                ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Mode épuré : masque les superpositions complexes"
          >
            {cleanMode ? <Eye className="w-3 h-3 text-indigo-400" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
            <span>{cleanMode ? 'Mode Épuré : Actif' : 'Mode Épuré'}</span>
          </button>

          {!cleanMode && (
            <>
              <button
                id="toggle-amd"
                onClick={() => onUpdateSettings({ enableAMD: !settings.enableAMD })}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  settings.enableAMD
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Phase AMD
              </button>

              <button
                id="toggle-demand"
                onClick={() => onUpdateSettings({ enableDemandSupply: !settings.enableDemandSupply })}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  settings.enableDemandSupply
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Zones Demande/Offre
              </button>

              <button
                id="toggle-vp-poc"
                onClick={() => onUpdateSettings({ enableVolumeProfile: !settings.enableVolumeProfile })}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  settings.enableVolumeProfile
                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Volume POC
              </button>

              <button
                id="toggle-trendlines"
                onClick={() => onUpdateSettings({ enableTrendlines: !settings.enableTrendlines })}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  settings.enableTrendlines
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Trends
              </button>
            </>
          )}
        </div>

        {/* Zoom & Fullscreen Controls */}
        <div className="flex items-center space-x-1.5">
          <button
            id="btn-zoom-in"
            onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.2))}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            title="Zoom avant"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-zoom-out"
            onClick={() => setZoomLevel(z => Math.max(0.7, z - 0.2))}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            title="Zoom arrière"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-zoom-reset"
            onClick={() => {
              setZoomLevel(1);
              setPanOffset(0);
            }}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            title="Réinitialiser la vue"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Dedicated Fullscreen / Full Page button */}
          <button
            id="btn-toggle-fullscreen"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
              isFullscreen
                ? 'bg-amber-500 text-slate-950 font-bold hover:bg-amber-400'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
            title={isFullscreen ? 'Quitter le plein écran (Échap)' : 'Attribuer une page entière au graphique'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isFullscreen ? 'Quitter Plein Écran' : 'Page Entière'}</span>
          </button>
        </div>
      </div>

      {/* Candlestick HUD info on top of chart */}
      <div className="relative flex-1 w-full" ref={containerRef}>
        {hoveredCandle ? (
          <div className="absolute top-2 left-3 z-10 flex flex-wrap items-center gap-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs font-mono shadow-lg">
            <span className="text-slate-400 font-sans font-semibold text-[11px]">
              {hoveredCandle.dateStr}
            </span>
            <span className="text-slate-300">
              O: <span className="text-white">{hoveredCandle.open}</span>
            </span>
            <span className="text-slate-300">
              H: <span className="text-emerald-400">{hoveredCandle.high}</span>
            </span>
            <span className="text-slate-300">
              L: <span className="text-rose-400">{hoveredCandle.low}</span>
            </span>
            <span className="text-slate-300">
              C:{' '}
              <span className={hoveredCandle.close >= hoveredCandle.open ? 'text-emerald-400' : 'text-rose-400'}>
                {hoveredCandle.close}
              </span>
            </span>
            <span className="text-slate-300">
              Vol: <span className="text-cyan-300">{hoveredCandle.volume.toLocaleString()}</span>
            </span>
            {volumeProfile && (
              <span className="text-yellow-400 font-medium">
                POC: {volumeProfile.pocPrice.toFixed(2)}
              </span>
            )}
          </div>
        ) : (
          <div className="absolute top-2 left-3 z-10 flex items-center space-x-2 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] text-slate-400 font-mono">
            <Crosshair className="w-3 h-3 text-cyan-400" />
            <span>Survolez le graphique pour explorer les bougies et niveaux POC</span>
          </div>
        )}

        {/* Legend pills bottom left */}
        <div className="absolute bottom-4 left-3 z-10 flex flex-wrap gap-2 text-[10px] pointer-events-none">
          <div className="flex items-center space-x-1.5 bg-slate-900/80 px-2 py-0.5 rounded border border-amber-500/30 text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Accumulation</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-slate-900/80 px-2 py-0.5 rounded border border-red-500/30 text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>Manipulation (Judas)</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-slate-900/80 px-2 py-0.5 rounded border border-cyan-500/30 text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>Zone Demande</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-slate-900/80 px-2 py-0.5 rounded border border-yellow-500/30 text-yellow-300">
            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
            <span>POC (Point of Control)</span>
          </div>
        </div>

        {/* The HTML5 Canvas */}
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full cursor-crosshair block"
        />
      </div>
    </div>
  );
};
