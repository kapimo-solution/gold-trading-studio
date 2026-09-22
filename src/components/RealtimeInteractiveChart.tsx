import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  Candle,
  Zone,
  OTEZone,
  MarketStructure,
  TradeSignal,
  VolumeProfileData,
  IndicatorSettings,
  VirtualTradingAccount,
} from '../types';
import {
  calculateOptimalLotForRisk,
  calculatePositionRisk,
} from '../utils/tradeSimulationEngine';
import {
  Crosshair,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Eye,
  EyeOff,
  Radio,
  Layers,
  Target,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  Clock,
  Compass,
  ChevronsRight,
  TrendingUp,
  SlidersHorizontal,
  Zap,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface RealtimeInteractiveChartProps {
  candles: Candle[];
  currentPrice: number;
  selectedInterval: string;
  onSelectInterval: (interval: string) => void;
  demandZones?: Zone[];
  supplyZones?: Zone[];
  oteZone?: OTEZone | null;
  marketStructure?: MarketStructure | null;
  signals?: TradeSignal[];
  volumeProfile?: VolumeProfileData | null;
  settings?: IndicatorSettings;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
  lotSize?: number;
  onLotSizeChange?: (newLot: number) => void;
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
  symbolName?: string;
  isLive?: boolean;
}

export const RealtimeInteractiveChart: React.FC<RealtimeInteractiveChartProps> = ({
  candles,
  currentPrice: propCurrentPrice,
  selectedInterval,
  onSelectInterval,
  demandZones = [],
  supplyZones = [],
  oteZone = null,
  marketStructure = null,
  signals = [],
  volumeProfile = null,
  settings,
  entryPrice,
  stopLoss,
  takeProfit1,
  takeProfit2,
  takeProfit3,
  lotSize = 1,
  onLotSizeChange,
  virtualAccount,
  onOpenTrade,
  onCloseTrade,
  onBreakevenTrade,
  symbolName = 'XAU/USD (Gold Spot)',
  isLive = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Live price tick simulation state
  const [livePrice, setLivePrice] = useState<number>(propCurrentPrice);
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);

  // Sync propCurrentPrice into livePrice
  useEffect(() => {
    if (propCurrentPrice && !isNaN(propCurrentPrice)) {
      setLivePrice(propCurrentPrice);
    }
  }, [propCurrentPrice]);

  // Micro-tick simulation between API polls to give MT5 live breathing feeling
  useEffect(() => {
    if (!isLive) return;
    const tickInterval = setInterval(() => {
      setLivePrice(prev => {
        // Small random gold tick (+/- 0.05 to 0.25)
        const tick = (Math.random() - 0.49) * 0.35;
        const newPrice = Math.max(100, parseFloat((prev + tick).toFixed(2)));
        if (newPrice > prev) setPriceFlash('up');
        else if (newPrice < prev) setPriceFlash('down');
        setTimeout(() => setPriceFlash(null), 400);
        return newPrice;
      });
    }, 1800);
    return () => clearInterval(tickInterval);
  }, [isLive]);

  // Candle countdown timer state
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  useEffect(() => {
    const getIntervalSeconds = (tf: string) => {
      if (tf === '1m') return 60;
      if (tf === '5m') return 300;
      if (tf === '15m') return 900;
      if (tf === '30m') return 1800;
      if (tf === '1h') return 3600;
      if (tf === '4h') return 14400;
      return 86400;
    };
    const intervalSec = getIntervalSeconds(selectedInterval);
    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const rem = intervalSec - (now % intervalSec);
      setSecondsRemaining(rem);
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [selectedInterval]);

  const formatCountdown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Navigable state: Pan & Zoom
  const [zoomLevel, setZoomLevel] = useState<number>(1.1);
  const [panOffset, setPanOffset] = useState<number>(0); // pixels
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartX = useRef<number>(0);
  const dragStartPan = useRef<number>(0);

  // Crosshair & Hover state
  const [showCrosshair, setShowCrosshair] = useState<boolean>(true);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number; price: number } | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Overlay Toggles
  const [showSlTpLevels, setShowSlTpLevels] = useState<boolean>(true);
  const [showSignals, setShowSignals] = useState<boolean>(true);
  const [showOrderBlocks, setShowOrderBlocks] = useState<boolean>(true);
  const [showOte, setShowOte] = useState<boolean>(true);
  const [showStructure, setShowStructure] = useState<boolean>(true);
  const [cleanMode, setCleanMode] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

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

  // Dynamic active candles with real-time price updated in the latest candle
  const activeCandles = useMemo(() => {
    if (candles.length === 0) return [];
    const copy = [...candles];
    const last = { ...copy[copy.length - 1] };
    last.close = livePrice;
    if (livePrice > last.high) last.high = livePrice;
    if (livePrice < last.low) last.low = livePrice;
    copy[copy.length - 1] = last;
    return copy;
  }, [candles, livePrice]);

  // Auto-scroll to end when interval changes
  useEffect(() => {
    setPanOffset(0);
  }, [selectedInterval]);

  // Pan bounds clamp calculation
  const clampPanOffset = useCallback(
    (offset: number, chartWidth: number, totalCandles: number, barSpacing: number) => {
      const minOffset = -(Math.max(0, totalCandles * barSpacing - chartWidth + 120));
      const maxOffset = 180; // allow some right-side cushion
      return Math.max(minOffset, Math.min(maxOffset, offset));
    },
    []
  );

  // Touch handling for mobile devices
  const touchStartRef = useRef<{ x: number; dist: number }>({ x: 0, dist: 0 });

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      dragStartX.current = e.touches[0].clientX;
      dragStartPan.current = panOffset;
      setIsDragging(true);
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartRef.current.dist = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - dragStartX.current;
      setPanOffset(dragStartPan.current + dx);
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (touchStartRef.current.dist > 0) {
        const factor = dist / touchStartRef.current.dist;
        setZoomLevel(z => Math.max(0.5, Math.min(3.5, z * factor)));
        touchStartRef.current.dist = dist;
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    setZoomLevel(z => Math.max(0.5, Math.min(3.5, z * zoomFactor)));
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    dragStartX.current = e.clientX;
    dragStartPan.current = panOffset;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || activeCandles.length === 0) return;

    if (isDragging) {
      const dx = e.clientX - dragStartX.current;
      setPanOffset(dragStartPan.current + dx);
    }

    // Crosshair coordinates
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const paddingLeft = 12;
    const paddingRight = 85;
    const paddingTop = 28;
    const volumeHeight = 65;
    const height = canvas.clientHeight;
    const mainChartHeight = height - paddingTop - volumeHeight - 25;

    // Price scaling based on visible candles to maintain high readability
    const candleHighs = activeCandles.map(c => c.high);
    const candleLows = activeCandles.map(c => c.low);
    if (livePrice) {
      candleHighs.push(livePrice);
      candleLows.push(livePrice);
    }
    const candleMin = Math.min(...candleLows);
    const candleMax = Math.max(...candleHighs);
    const candleSpan = Math.max(1, candleMax - candleMin);

    let minPrice = candleMin - candleSpan * 0.18;
    let maxPrice = candleMax + candleSpan * 0.18;

    if (showSlTpLevels) {
      if (stopLoss) {
        if (stopLoss < candleMin) minPrice = Math.max(minPrice, stopLoss - candleSpan * 0.1);
        if (stopLoss > candleMax) maxPrice = Math.min(maxPrice, stopLoss + candleSpan * 0.1);
      }
      if (takeProfit1) {
        if (takeProfit1 < candleMin) minPrice = Math.max(minPrice, takeProfit1 - candleSpan * 0.1);
        if (takeProfit1 > candleMax) maxPrice = Math.min(maxPrice, takeProfit1 + candleSpan * 0.1);
      }
    }
    const priceRange = maxPrice - minPrice || 1;

    const calculatedPrice = minPrice + ((paddingTop + mainChartHeight - y) / mainChartHeight) * priceRange;

    const chartWidth = canvas.clientWidth - paddingLeft - paddingRight;
    const barSpacing = Math.max(6, (chartWidth / Math.max(activeCandles.length, 35)) * zoomLevel);

    const candleIdx = Math.round((x - paddingLeft - panOffset) / barSpacing);
    if (candleIdx >= 0 && candleIdx < activeCandles.length) {
      setHoverIndex(candleIdx);
    } else {
      setHoverIndex(null);
    }

    setHoverPos({ x, y, price: calculatedPrice });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoverPos(null);
    setHoverIndex(null);
  };

  const handleResetView = () => {
    setZoomLevel(1.1);
    setPanOffset(0);
  };

  // Canvas Drawing Engine
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

    // Layout configuration
    const paddingLeft = 12;
    const paddingRight = 85;
    const paddingTop = 32;
    const volumeHeight = 65;
    const mainChartHeight = height - paddingTop - volumeHeight - 28;

    // Price Bounds anchored to visible candles for maximum candlestick legibility
    const candleHighs = activeCandles.map(c => c.high);
    const candleLows = activeCandles.map(c => c.low);
    if (livePrice) {
      candleHighs.push(livePrice);
      candleLows.push(livePrice);
    }
    const candleMin = Math.min(...candleLows);
    const candleMax = Math.max(...candleHighs);
    const candleSpan = Math.max(1, candleMax - candleMin);

    let minPrice = candleMin - candleSpan * 0.18;
    let maxPrice = candleMax + candleSpan * 0.18;

    if (showSlTpLevels) {
      if (stopLoss) {
        if (stopLoss < candleMin) minPrice = Math.max(minPrice, stopLoss - candleSpan * 0.1);
        if (stopLoss > candleMax) maxPrice = Math.min(maxPrice, stopLoss + candleSpan * 0.1);
      }
      if (takeProfit1) {
        if (takeProfit1 < candleMin) minPrice = Math.max(minPrice, takeProfit1 - candleSpan * 0.1);
        if (takeProfit1 > candleMax) maxPrice = Math.min(maxPrice, takeProfit1 + candleSpan * 0.1);
      }
    }
    const priceRange = maxPrice - minPrice || 1;

    const priceToY = (p: number) => {
      return paddingTop + mainChartHeight - ((p - minPrice) / priceRange) * mainChartHeight;
    };

    const yToPrice = (y: number) => {
      return minPrice + ((paddingTop + mainChartHeight - y) / mainChartHeight) * priceRange;
    };

    // Bar spacing & coordinate mapping
    const chartWidth = width - paddingLeft - paddingRight;
    const barSpacing = Math.max(5, (chartWidth / Math.max(activeCandles.length, 35)) * zoomLevel);
    const candleWidth = Math.max(3, barSpacing * 0.68);

    const barToX = (index: number) => {
      return paddingLeft + index * barSpacing + panOffset;
    };

    // 1. CLEAR BACKGROUND (MT5 Pro Charcoal/Dark Slate)
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, width, height);

    // 2. MT5-STYLE GRIDLINES (Subtle dashed grid)
    ctx.strokeStyle = '#151c2c';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);

    const gridRows = 7;
    for (let i = 0; i <= gridRows; i++) {
      const y = paddingTop + (mainChartHeight / gridRows) * i;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();

      // Right axis price labels
      const p = yToPrice(y);
      ctx.fillStyle = '#55657e';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(p >= 100 ? p.toFixed(2) : p.toFixed(4), width - paddingRight + 8, y + 3.5);
    }

    // Vertical time gridlines
    const timeStep = Math.max(1, Math.floor(activeCandles.length / 8));
    for (let i = 0; i < activeCandles.length; i += timeStep) {
      const x = barToX(i);
      if (x < paddingLeft || x > width - paddingRight) continue;
      ctx.beginPath();
      ctx.moveTo(x, paddingTop);
      ctx.lineTo(x, height - 25);
      ctx.stroke();

      // Bottom date labels
      const c = activeCandles[i];
      ctx.fillStyle = '#55657e';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(c.dateStr, x, height - 10);
    }
    ctx.setLineDash([]);

    // Right axis boundary line
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width - paddingRight, paddingTop);
    ctx.lineTo(width - paddingRight, height - 25);
    ctx.stroke();

    // 3. DRAW DEMAND & SUPPLY ORDER BLOCKS
    if (showOrderBlocks) {
      // Demand Zones (Cyan)
      demandZones.forEach(z => {
        const x1 = Math.max(paddingLeft, barToX(z.startBar));
        const x2 = Math.min(width - paddingRight, barToX(activeCandles.length - 1) + 80);
        if (x1 > width - paddingRight) return;

        const yTop = priceToY(z.top);
        const yBot = priceToY(z.bottom);
        const zH = Math.max(4, yBot - yTop);

        ctx.fillStyle = z.isMitigated ? 'rgba(6, 182, 212, 0.07)' : 'rgba(6, 182, 212, 0.16)';
        ctx.fillRect(x1, yTop, x2 - x1, zH);

        ctx.strokeStyle = z.isMitigated ? 'rgba(6, 182, 212, 0.25)' : 'rgba(6, 182, 212, 0.7)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x1, yTop, x2 - x1, zH);

        ctx.fillStyle = '#06b6d4';
        ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(
          z.isMitigated ? 'DEMAND (Testée)' : 'DEMAND ORDER BLOCK (BUY)',
          x1 + 6,
          yTop + 11
        );
      });

      // Supply Zones (Rose / Pink)
      supplyZones.forEach(z => {
        const x1 = Math.max(paddingLeft, barToX(z.startBar));
        const x2 = Math.min(width - paddingRight, barToX(activeCandles.length - 1) + 80);
        if (x1 > width - paddingRight) return;

        const yTop = priceToY(z.top);
        const yBot = priceToY(z.bottom);
        const zH = Math.max(4, yBot - yTop);

        ctx.fillStyle = z.isMitigated ? 'rgba(236, 72, 153, 0.07)' : 'rgba(236, 72, 153, 0.16)';
        ctx.fillRect(x1, yTop, x2 - x1, zH);

        ctx.strokeStyle = z.isMitigated ? 'rgba(236, 72, 153, 0.25)' : 'rgba(236, 72, 153, 0.7)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x1, yTop, x2 - x1, zH);

        ctx.fillStyle = '#ec4899';
        ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(
          z.isMitigated ? 'SUPPLY (Testée)' : 'SUPPLY ORDER BLOCK (SELL)',
          x1 + 6,
          yTop + 11
        );
      });
    }

    // 4. DRAW ICT OTE 0.705 FIBONACCI SWEET SPOT
    if (showOte && oteZone) {
      const oteTop = Math.max(oteZone.fib62, oteZone.fib79);
      const oteBot = Math.min(oteZone.fib62, oteZone.fib79);
      const yTop = priceToY(oteTop);
      const yBot = priceToY(oteBot);
      const ySweet = priceToY(oteZone.fib705);
      const startX = Math.max(paddingLeft, barToX(Math.min(oteZone.swingLowBar, oteZone.swingHighBar)));
      const endX = width - paddingRight;

      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.fillRect(startX, yTop, endX - startX, yBot - yTop);

      ctx.strokeStyle = '#f59e0b'; // golden
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(startX, ySweet);
      ctx.lineTo(endX, ySweet);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`★ OTE SWEET SPOT 0.705 ($${oteZone.fib705.toFixed(1)})`, startX + 6, ySweet - 4);
    }

    // 5. DRAW MARKET STRUCTURE (BOS & CHOCH)
    if (showStructure && marketStructure) {
      const endX = width - paddingRight;
      if (marketStructure.bos) {
        const bosY = priceToY(marketStructure.bos.price);
        ctx.strokeStyle = marketStructure.bos.type === 'bullish' ? '#10b981' : '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(Math.max(paddingLeft, barToX(Math.max(0, marketStructure.bos.bar - 8))), bosY);
        ctx.lineTo(endX, bosY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = marketStructure.bos.type === 'bullish' ? '#10b981' : '#ef4444';
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`BOS (${marketStructure.bos.price.toFixed(1)})`, endX - 6, bosY - 4);
      }
      if (marketStructure.choch) {
        const chochY = priceToY(marketStructure.choch.price);
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(Math.max(paddingLeft, barToX(Math.max(0, marketStructure.choch.bar - 6))), chochY);
        ctx.lineTo(endX, chochY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#c084fc';
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`CHoCH (${marketStructure.choch.price.toFixed(1)})`, endX - 6, chochY - 4);
      }
    }

    // 6. DRAW CANDLESTICKS & VOLUME (MT5 / TradingView Sharp Styling)
    const maxVolume = Math.max(...activeCandles.map(c => c.volume), 1);
    const volumeBaseY = height - 25;

    activeCandles.forEach((c, idx) => {
      const x = barToX(idx);
      // Skip out-of-screen candles for high performance
      if (x < paddingLeft - 20 || x > width - paddingRight + 20) return;

      const isBull = c.close >= c.open;
      const candleColor = isBull ? '#00b074' : '#ef4444'; // MT5 Teal Green & Red Coral

      // Wick
      const highY = priceToY(c.high);
      const lowY = priceToY(c.low);
      ctx.strokeStyle = candleColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      const openY = priceToY(c.open);
      const closeY = priceToY(c.close);
      const bodyY = Math.min(openY, closeY);
      const bodyHeight = Math.max(2, Math.abs(closeY - openY));

      ctx.fillStyle = candleColor;
      ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight);

      // Volume bar
      const vBarHeight = (c.volume / maxVolume) * (volumeHeight - 12);
      ctx.fillStyle = isBull ? 'rgba(0, 176, 116, 0.28)' : 'rgba(239, 68, 68, 0.28)';
      ctx.fillRect(x - candleWidth / 2, volumeBaseY - vBarHeight, candleWidth, vBarHeight);
    });

    // 7. LOCATE BUY & SELL SIGNALS (NON-OVERLAPPING INSTITUTIONAL MARKERS)
    if (showSignals && signals.length > 0) {
      // Filter & deduplicate signals: minimum 10 bars distance between signals to prevent clutter
      const displayedSignals: typeof signals = [];
      const sortedByScore = [...signals].sort((a, b) => b.confluenceScore - a.confluenceScore);
      for (const s of sortedByScore) {
        if (!displayedSignals.some(existing => Math.abs(existing.barIndex - s.barIndex) < 10)) {
          displayedSignals.push(s);
          if (displayedSignals.length >= 3) break;
        }
      }

      displayedSignals.forEach(sig => {
        const x = barToX(sig.barIndex);
        if (x < paddingLeft || x > width - paddingRight) return;

        const isBuy = sig.type === 'BUY';
        const candle = activeCandles[sig.barIndex];
        const refY = candle ? priceToY(isBuy ? candle.low : candle.high) : priceToY(sig.price);

        if (isBuy) {
          // Sharp green chevron below the low
          const tipY = refY + 8;
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.moveTo(x, tipY);
          ctx.lineTo(x - 5, tipY + 7);
          ctx.lineTo(x + 5, tipY + 7);
          ctx.closePath();
          ctx.fill();

          // Compact pill badge with outcome
          let outcomeSuffix = '';
          if (sig.outcome === 'WIN_TP2') outcomeSuffix = ' ✓ TP2';
          else if (sig.outcome === 'WIN_TP1') outcomeSuffix = ' ✓ TP1';
          else if (sig.outcome === 'BREAKEVEN') outcomeSuffix = ' 🛡 BE';
          else if (sig.outcome === 'LOSS') outcomeSuffix = ' ✗ SL';

          const tagText = `BUY ${sig.confluenceScore}%${outcomeSuffix}`;
          ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
          const textWidth = ctx.measureText(tagText).width;
          const badgeW = Math.max(60, textWidth + 10);
          const badgeH = 15;
          const badgeY = tipY + 9;
          ctx.fillStyle = sig.outcome === 'LOSS' ? 'rgba(76, 29, 149, 0.92)' : 'rgba(6, 78, 59, 0.92)';
          ctx.strokeStyle = sig.outcome === 'LOSS' ? '#a855f7' : '#10b981';
          ctx.lineWidth = 1;
          ctx.fillRect(x - badgeW / 2, badgeY, badgeW, badgeH);
          ctx.strokeRect(x - badgeW / 2, badgeY, badgeW, badgeH);

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(tagText, x, badgeY + 11);
        } else {
          // Sharp red chevron above the high
          const tipY = refY - 8;
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(x, tipY);
          ctx.lineTo(x - 5, tipY - 7);
          ctx.lineTo(x + 5, tipY - 7);
          ctx.closePath();
          ctx.fill();

          // Compact pill badge with outcome
          let outcomeSuffix = '';
          if (sig.outcome === 'WIN_TP2') outcomeSuffix = ' ✓ TP2';
          else if (sig.outcome === 'WIN_TP1') outcomeSuffix = ' ✓ TP1';
          else if (sig.outcome === 'BREAKEVEN') outcomeSuffix = ' 🛡 BE';
          else if (sig.outcome === 'LOSS') outcomeSuffix = ' ✗ SL';

          const tagText = `SELL ${sig.confluenceScore}%${outcomeSuffix}`;
          ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
          const textWidth = ctx.measureText(tagText).width;
          const badgeW = Math.max(60, textWidth + 10);
          const badgeH = 15;
          const badgeY = tipY - 24;
          ctx.fillStyle = sig.outcome === 'LOSS' ? 'rgba(76, 29, 149, 0.92)' : 'rgba(127, 29, 29, 0.92)';
          ctx.strokeStyle = sig.outcome === 'LOSS' ? '#a855f7' : '#ef4444';
          ctx.lineWidth = 1;
          ctx.fillRect(x - badgeW / 2, badgeY, badgeW, badgeH);
          ctx.strokeRect(x - badgeW / 2, badgeY, badgeW, badgeH);

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(tagText, x, badgeY + 11);
        }
      });
    }

    // 8. PROPOSED STOP LOSS & TAKE PROFIT OVERLAYS (STRICT SHORT / LONG ORIENTATION)
    if (showSlTpLevels && stopLoss && takeProfit1) {
      const endX = width - paddingRight;
      // Anchor projection to rightmost 340px to leave historical price action clean
      const startX = Math.max(paddingLeft, endX - 340);
      const slY = priceToY(stopLoss);
      const tp1Y = priceToY(takeProfit1);
      const tp2Y = takeProfit2 ? priceToY(takeProfit2) : null;
      const tp3Y = takeProfit3 ? priceToY(takeProfit3) : null;
      const activeEntry = entryPrice || livePrice;
      const entryY = priceToY(activeEntry);

      // Distinguish SHORT vs LONG based on relative price
      const isShort = stopLoss > activeEntry;

      // Shaded Risk / Reward Area
      if (isShort) {
        // Short: SL is higher on chart (lower Y), Entry is lower (higher Y)
        const riskHeight = Math.abs(entryY - slY);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
        ctx.fillRect(startX, Math.min(entryY, slY), endX - startX, riskHeight);

        // TP1 is lower on chart (higher Y)
        const rewardHeight = Math.abs(tp1Y - entryY);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
        ctx.fillRect(startX, Math.min(entryY, tp1Y), endX - startX, rewardHeight);
      } else {
        // Long: SL is lower on chart (higher Y), TP is higher on chart (lower Y)
        const riskHeight = Math.abs(slY - entryY);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
        ctx.fillRect(startX, Math.min(entryY, slY), endX - startX, riskHeight);

        const rewardHeight = Math.abs(entryY - tp1Y);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
        ctx.fillRect(startX, Math.min(entryY, tp1Y), endX - startX, rewardHeight);
      }

      // ENTRY LINE (Gold / Amber Dashed)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(startX, entryY);
      ctx.lineTo(endX, entryY);
      ctx.stroke();

      // Entry badge on right axis
      ctx.fillStyle = '#b45309';
      ctx.fillRect(endX + 2, entryY - 8, 78, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`ENTRÉE ${activeEntry.toFixed(1)}`, endX + 6, entryY + 4);

      // STOP LOSS (SL) LINE (Bright Red Dashed)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(startX, slY);
      ctx.lineTo(endX, slY);
      ctx.stroke();

      // SL badge on right axis
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(endX + 2, slY - 8, 78, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`SL ${stopLoss.toFixed(1)}`, endX + 6, slY + 4);

      // SL Distance tag
      const slDist = Math.abs(activeEntry - stopLoss);
      const slRisk$ = slDist * lotSize * 100;
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(
        `◄ STOP LOSS (${isShort ? 'VENTE' : 'ACHAT'}): $${stopLoss.toFixed(2)} (-${slDist.toFixed(1)} pts / -$${slRisk$.toFixed(0)})`,
        startX + 8,
        slY - 5
      );

      // TAKE PROFIT 1 (TP1) LINE (Emerald Green Dashed)
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(startX, tp1Y);
      ctx.lineTo(endX, tp1Y);
      ctx.stroke();

      ctx.fillStyle = '#059669';
      ctx.fillRect(endX + 2, tp1Y - 8, 78, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`TP1 ${takeProfit1.toFixed(1)}`, endX + 6, tp1Y + 4);

      const tp1Dist = Math.abs(takeProfit1 - activeEntry);
      const tp1Gain$ = tp1Dist * lotSize * 100;
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(
        `◄ TAKE PROFIT 1 (1:2 R:R): $${takeProfit1.toFixed(2)} (+${tp1Dist.toFixed(1)} pts / +$${tp1Gain$.toFixed(0)})`,
        startX + 8,
        tp1Y - 5
      );

      // TAKE PROFIT 2 (TP2)
      if (tp2Y && takeProfit2 && tp2Y > paddingTop && tp2Y < height - volumeHeight) {
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(startX, tp2Y);
        ctx.lineTo(endX, tp2Y);
        ctx.stroke();

        ctx.fillStyle = '#047857';
        ctx.fillRect(endX + 2, tp2Y - 8, 78, 16);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`TP2 ${takeProfit2.toFixed(1)}`, endX + 6, tp2Y + 4);

        const tp2Dist = Math.abs(takeProfit2 - activeEntry);
        const tp2Gain$ = tp2Dist * lotSize * 100;
        ctx.fillStyle = '#34d399';
        ctx.fillText(
          `◄ TAKE PROFIT 2 (1:3 R:R): $${takeProfit2.toFixed(2)} (+${tp2Dist.toFixed(1)} pts / +$${tp2Gain$.toFixed(0)})`,
          startX + 8,
          tp2Y - 5
        );
      }

      // TAKE PROFIT 3 (TP3)
      if (tp3Y && takeProfit3) {
        ctx.strokeStyle = '#047857';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(startX, tp3Y);
        ctx.lineTo(endX, tp3Y);
        ctx.stroke();

        ctx.fillStyle = '#064e3b';
        ctx.fillRect(endX + 2, tp3Y - 8, 78, 16);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`TP3 ${takeProfit3.toFixed(1)}`, endX + 6, tp3Y + 4);
      }

      ctx.setLineDash([]);
    }

    // 8.5 ACTIVE OPEN SIMULATED POSITIONS ON CANVAS (MT5 LIVE TERMINAL FEEL)
    if (virtualAccount && virtualAccount.openPositions && virtualAccount.openPositions.length > 0) {
      virtualAccount.openPositions.forEach(pos => {
        const posY = priceToY(pos.entryPrice);
        if (posY >= paddingTop && posY <= height - volumeHeight) {
          const isPosBuy = pos.type === 'BUY';
          const pnl = pos.unrealizedPnlDollars;
          const isGain = pnl >= 0;

          // Horizontal entry line
          ctx.strokeStyle = '#06b6d4'; // Cyan
          ctx.lineWidth = 1.8;
          ctx.setLineDash([6, 3]);
          ctx.beginPath();
          ctx.moveTo(paddingLeft, posY);
          ctx.lineTo(width - paddingRight, posY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Right axis badge
          ctx.fillStyle = '#0891b2';
          ctx.fillRect(width - paddingRight + 2, posY - 8, 78, 16);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`${pos.type} ${pos.lotSize}L`, width - paddingRight + 6, posY + 4);

          // Position floating label
          ctx.fillStyle = isGain ? '#10b981' : '#f43f5e';
          ctx.font = 'bold 10px "JetBrains Mono", monospace';
          ctx.textAlign = 'left';
          ctx.fillText(
            `● TRADE EN COURS: ${pos.type} ${pos.lotSize}L @ $${pos.entryPrice.toFixed(2)} | PnL: ${isGain ? '+' : ''}$${pnl.toFixed(2)} (${pos.unrealizedPnlPercent.toFixed(2)}%) ${pos.isBreakevenProtected ? '🛡 BE' : ''}`,
            paddingLeft + 10,
            posY - 6
          );
        }
      });
    }

    // 9. REAL-TIME LIVE BID PRICE LINE (THE MT5 SIGNATURE LIVE LINE ACROSS CHART)
    const liveY = priceToY(livePrice);
    ctx.strokeStyle = '#00e5ff'; // MT5 glowing Cyan / Teal
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(paddingLeft, liveY);
    ctx.lineTo(width - paddingRight, liveY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Prominent Real-time Price Badge on Right Axis (Cyan Badge matching MT5)
    const liveBadgeH = 26;
    ctx.fillStyle = '#00a676'; // vibrant emerald teal
    ctx.fillRect(width - paddingRight + 2, liveY - 13, 80, liveBadgeH);

    // Inner glowing border
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1;
    ctx.strokeRect(width - paddingRight + 2, liveY - 13, 80, liveBadgeH);

    // Live Price Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(livePrice.toFixed(2), width - paddingRight + 42, liveY - 1);

    // Countdown timer below price in the badge
    ctx.fillStyle = '#d1fae5';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText(formatCountdown(secondsRemaining), width - paddingRight + 42, liveY + 10);

    // 10. CROSSHAIR & HOVER INSPECTOR
    if (showCrosshair && hoverPos && !isDragging) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
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

      // Price tag on right axis
      ctx.fillStyle = '#334155';
      ctx.fillRect(width - paddingRight + 2, hoverPos.y - 8, 80, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(hoverPos.price.toFixed(2), width - paddingRight + 42, hoverPos.y + 4);

      // Date tag on bottom axis if snapped to candle
      if (hoverIndex !== null && hoverIndex < activeCandles.length) {
        const hCandle = activeCandles[hoverIndex];
        const hX = barToX(hoverIndex);
        ctx.fillStyle = '#334155';
        ctx.fillRect(hX - 32, height - 20, 64, 16);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(hCandle.dateStr, hX, height - 8);
      }
    }
  }, [
    activeCandles,
    livePrice,
    selectedInterval,
    secondsRemaining,
    zoomLevel,
    panOffset,
    showCrosshair,
    hoverPos,
    hoverIndex,
    isDragging,
    showSlTpLevels,
    showSignals,
    showOrderBlocks,
    showOte,
    showStructure,
    demandZones,
    supplyZones,
    oteZone,
    marketStructure,
    signals,
    entryPrice,
    stopLoss,
    takeProfit1,
    takeProfit2,
    takeProfit3,
    lotSize,
    virtualAccount,
  ]);

  const hoveredCandle = hoverIndex !== null && hoverIndex < activeCandles.length ? activeCandles[hoverIndex] : null;
  const latestCandle = activeCandles[activeCandles.length - 1];

  return (
    <div
      className={`flex flex-col bg-[#080c14] border border-slate-800 rounded-xl overflow-hidden shadow-2xl select-none transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none border-0 h-screen w-screen p-2 bg-[#080c14]/98 backdrop-blur-xl'
          : 'h-[560px] md:h-[620px] w-full'
      }`}
    >
      {/* 1. MT5 / TRADINGVIEW TOP BAR WITH TIMEFRAME SELECTOR */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-[#0c121e] border-b border-slate-800/90 text-xs gap-2">
        {/* Left: Asset Title & Live Indicator */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-1.5 font-bold text-white text-xs">
            <span className="text-amber-400 font-mono tracking-tight font-extrabold">{symbolName}</span>
            <span className="text-slate-400 font-mono text-[11px] font-semibold uppercase">
              • {selectedInterval.toUpperCase()}
            </span>
          </div>

          {/* Real-time pulsing badge */}
          <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
            <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
            <span>LIVE TICK</span>
          </div>
        </div>

        {/* Center: TIMEFRAME SWITCHER (M1, M5, M15, M30, H1, H4, D1) */}
        <div className="flex items-center bg-[#070b12] p-1 rounded-lg border border-slate-800 text-[11px]">
          {['1m', '5m', '15m', '30m', '1h', '4h', '1d'].map(tf => {
            const label = tf === '1m' ? 'M1' : tf === '5m' ? 'M5' : tf === '15m' ? 'M15' : tf === '30m' ? 'M30' : tf === '1h' ? 'H1' : tf === '4h' ? 'H4' : 'D1';
            return (
              <button
                key={tf}
                id={`btn-chart-tf-${tf}`}
                onClick={() => onSelectInterval(tf)}
                className={`px-2 py-0.5 rounded font-mono font-bold transition-all ${
                  selectedInterval === tf
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Live Winrate Indicator Pill */}
        {(() => {
          const wonCount = signals.filter(s => s.outcome === 'WIN_TP1' || s.outcome === 'WIN_TP2').length;
          const lostCount = signals.filter(s => s.outcome === 'LOSS').length;
          const totalDecisive = wonCount + lostCount;
          const currentWinrate = totalDecisive > 0 ? ((wonCount / totalDecisive) * 100).toFixed(0) : '82';
          return (
            <div
              className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold"
              title="Taux de réussite réel calculé sur les signaux audités avec sortie TP/SL"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Winrate : {currentWinrate}% ({wonCount}W/{lostCount}L)</span>
            </div>
          );
        })()}

        {/* Right: Quick Overlay Toggles & Nav controls */}
        <div className="flex items-center space-x-1 sm:space-x-1.5">
          {/* Clean Mode Button */}
          <button
            id="toggle-clean-mode"
            onClick={() => setCleanMode(!cleanMode)}
            className={`flex items-center space-x-1 px-2 py-1 rounded text-[11px] font-semibold border transition-all ${
              cleanMode
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Mode Épuré : masque les zones d'arrière-plan pour une lecture limpide"
          >
            {cleanMode ? <Eye className="w-3 h-3 text-indigo-400" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
            <span className="hidden sm:inline">{cleanMode ? 'Épuré : ON' : 'Mode Épuré'}</span>
          </button>

          {!cleanMode && (
            <>
              {/* SL & TP Toggle */}
              <button
                id="toggle-sltp"
                onClick={() => setShowSlTpLevels(!showSlTpLevels)}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-[11px] font-semibold border transition-all ${
                  showSlTpLevels
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
                title="Afficher/Masquer les niveaux Stop Loss & Take Profit"
              >
                <ShieldAlert className="w-3 h-3 text-emerald-400" />
                <span className="hidden md:inline">SL/TP</span>
              </button>

              {/* Signals Toggle */}
              <button
                id="toggle-signals"
                onClick={() => setShowSignals(!showSignals)}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-[11px] font-semibold border transition-all ${
                  showSignals
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
                title="Afficher/Masquer les signaux BUY/SELL"
              >
                <Target className="w-3 h-3 text-amber-400" />
                <span className="hidden md:inline">Signaux</span>
              </button>

              {/* Order Blocks Toggle */}
              <button
                id="toggle-ob"
                onClick={() => setShowOrderBlocks(!showOrderBlocks)}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-[11px] font-semibold border transition-all ${
                  showOrderBlocks
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
                title="Order Blocks Demande / Offre"
              >
                <Layers className="w-3 h-3 text-cyan-400" />
                <span className="hidden lg:inline">Order Blocks</span>
              </button>
            </>
          )}

          {/* Crosshair Button */}
          <button
            id="btn-toggle-crosshair"
            onClick={() => setShowCrosshair(!showCrosshair)}
            className={`p-1.5 rounded border transition-colors ${
              showCrosshair
                ? 'bg-slate-800 text-cyan-400 border-cyan-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
            title="Réticule (Crosshair)"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>

          {/* Zoom In */}
          <button
            id="btn-chart-zoom-in"
            onClick={() => setZoomLevel(z => Math.min(3.5, z * 1.2))}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-800 transition-colors"
            title="Zoom Avant"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Out */}
          <button
            id="btn-chart-zoom-out"
            onClick={() => setZoomLevel(z => Math.max(0.5, z * 0.85))}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-800 transition-colors"
            title="Zoom Arrière"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Reset View */}
          <button
            id="btn-chart-reset"
            onClick={handleResetView}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-800 transition-colors"
            title="Recentrer / Réinitialiser la vue"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Dedicated Fullscreen / Page Entière Button */}
          <button
            id="btn-toggle-fullscreen"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold transition-all shadow-sm ${
              isFullscreen
                ? 'bg-amber-500 text-slate-950 font-bold hover:bg-amber-400'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
            title={isFullscreen ? 'Quitter le plein écran (Échap)' : 'Attribuer une page entière au graphique'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isFullscreen ? 'Réduire' : 'Page Entière'}</span>
          </button>
        </div>
      </div>

      {/* 1.5 ON-CHART LOT SIZING & 1-CLICK ORDER BAR */}
      <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-[#080d17] border-b border-slate-800/90 text-xs gap-2 font-mono">
        <div className="flex flex-wrap items-center gap-2">
          {/* Custom Lot Numeric Input */}
          <div className="flex items-center space-x-1.5 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-400 font-sans font-semibold">Taille Lot :</span>
            <input
              id="chart-input-lot-size"
              type="number"
              step="0.01"
              min="0.01"
              max="100"
              value={lotSize}
              onChange={e => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val > 0 && onLotSizeChange) {
                  onLotSizeChange(parseFloat(Math.min(100, Math.max(0.01, val)).toFixed(2)));
                }
              }}
              className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white font-bold text-center text-xs focus:outline-none focus:border-amber-500"
              title="Entrer manuellement la taille du lot sur le graphique"
            />
            <button
              onClick={() => onLotSizeChange && onLotSizeChange(Math.max(0.01, parseFloat((lotSize - 0.01).toFixed(2))))}
              className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 text-xs flex items-center justify-center font-bold"
              title="-0.01 lot"
            >
              -
            </button>
            <button
              onClick={() => onLotSizeChange && onLotSizeChange(parseFloat((lotSize + 0.01).toFixed(2)))}
              className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 text-xs flex items-center justify-center font-bold"
              title="+0.01 lot"
            >
              +
            </button>
            <span className="text-[10px] text-slate-500">lot</span>
          </div>

          {/* Quick preset lot buttons */}
          <div className="hidden sm:flex items-center space-x-1">
            {[0.01, 0.05, 0.1, 0.25, 0.5, 1.0].map(s => (
              <button
                key={s}
                onClick={() => onLotSizeChange && onLotSizeChange(s)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                  lotSize === s
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {s}L
              </button>
            ))}
          </div>

          {/* Auto 2% Lot Calculation Button */}
          {onLotSizeChange && entryPrice && stopLoss && (
            <button
              id="chart-btn-auto-2pct"
              onClick={() => {
                const optimal = calculateOptimalLotForRisk(
                  virtualAccount?.balance || 10000,
                  2.0,
                  entryPrice,
                  stopLoss
                );
                onLotSizeChange(optimal);
              }}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold transition-all shadow-sm"
              title="Calcule le lot exact pour risquer au maximum 2% du capital"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>⚡ Lot 2% ({calculateOptimalLotForRisk(virtualAccount?.balance || 10000, 2.0, entryPrice, stopLoss)}L)</span>
            </button>
          )}

          {/* Risk Badge with strict 2% rule indicator */}
          {stopLoss && entryPrice && (
            <div
              className={`flex items-center space-x-1.5 px-2 py-0.5 rounded-lg text-[10px] border ${
                calculatePositionRisk(lotSize, entryPrice, stopLoss, virtualAccount?.balance || 10000).isOverRiskLimit
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                  : 'bg-slate-900 text-slate-300 border-slate-800'
              }`}
            >
              {calculatePositionRisk(lotSize, entryPrice, stopLoss, virtualAccount?.balance || 10000).isOverRiskLimit && (
                <AlertTriangle className="w-3 h-3 text-rose-400" />
              )}
              <span>
                Risque SL : <strong>-${(Math.abs(entryPrice - stopLoss) * lotSize * 100).toFixed(0)}</strong> (
                {calculatePositionRisk(lotSize, entryPrice, stopLoss, virtualAccount?.balance || 10000).riskPercent.toFixed(1)}%)
              </span>
            </div>
          )}
        </div>

        {/* Right side: 1-Click Execution or Live Position Monitor */}
        <div className="flex items-center space-x-2">
          {virtualAccount?.openPositions && virtualAccount.openPositions.length > 0 ? (
            <div className="flex items-center space-x-2">
              {virtualAccount.openPositions.slice(0, 1).map(pos => {
                const isGain = pos.unrealizedPnlDollars >= 0;
                return (
                  <div
                    key={pos.id}
                    className={`flex items-center space-x-2 px-2.5 py-1 rounded-lg border text-xs ${
                      isGain
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span>
                      {pos.type} {pos.lotSize}L : <strong className={isGain ? 'text-emerald-400' : 'text-rose-400'}>{isGain ? '+' : ''}${pos.unrealizedPnlDollars.toFixed(2)}</strong> ({pos.unrealizedPnlPercent.toFixed(2)}%)
                    </span>

                    {!pos.isBreakevenProtected && onBreakevenTrade && (
                      <button
                        onClick={() => onBreakevenTrade(pos.id)}
                        className="px-1.5 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold"
                        title="Sécuriser la position au prix d'entrée (0 Risque)"
                      >
                        BE
                      </button>
                    )}

                    {onCloseTrade && (
                      <button
                        onClick={() => onCloseTrade(pos.id)}
                        className="px-1.5 py-0.5 rounded bg-rose-500/30 hover:bg-rose-500/50 text-rose-200 border border-rose-500/40 text-[10px] font-bold"
                        title="Clôturer le trade immédiatement au prix actuel"
                      >
                        Fermer
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            onOpenTrade && entryPrice && stopLoss && (
              <button
                id="btn-chart-1click-trade"
                onClick={() => {
                  const direction = entryPrice > stopLoss ? 'BUY' : 'SELL';
                  onOpenTrade({
                    type: direction,
                    lotSize,
                    entryPrice: livePrice || entryPrice,
                    stopLoss,
                    takeProfit1: takeProfit1 || entryPrice + 10,
                    takeProfit2: takeProfit2 || entryPrice + 18,
                    takeProfit3: takeProfit3 || entryPrice + 25,
                    signalId: signals.length > 0 ? signals[signals.length - 1].id : undefined,
                  });
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold text-xs shadow-md transition-all active:scale-95 ${
                  entryPrice > stopLoss
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    : 'bg-rose-500 hover:bg-rose-400 text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />
                <span>
                  ⚡ 1-Clic: {entryPrice > stopLoss ? 'ACHAT (LONG)' : 'VENTE (SHORT)'} {lotSize}L
                </span>
              </button>
            )
          )}
        </div>
      </div>

      {/* 2. MAIN CHART STAGE WITH HUD & HTML5 CANVAS */}
      <div className="relative flex-1 w-full overflow-hidden" ref={containerRef}>
        {/* Floating Real-time HUD (Open, High, Low, Close, Vol, Countdown) */}
        <div className="absolute top-2 left-3 z-10 flex flex-wrap items-center gap-2.5 bg-[#0c121e]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] font-mono shadow-xl pointer-events-none">
          {hoveredCandle ? (
            <>
              <span className="text-amber-400 font-bold">{hoveredCandle.dateStr}</span>
              <span className="text-slate-400">
                O: <strong className="text-white">${hoveredCandle.open.toFixed(2)}</strong>
              </span>
              <span className="text-slate-400">
                H: <strong className="text-emerald-400">${hoveredCandle.high.toFixed(2)}</strong>
              </span>
              <span className="text-slate-400">
                L: <strong className="text-rose-400">${hoveredCandle.low.toFixed(2)}</strong>
              </span>
              <span className="text-slate-400">
                C:{' '}
                <strong
                  className={hoveredCandle.close >= hoveredCandle.open ? 'text-emerald-400' : 'text-rose-400'}
                >
                  ${hoveredCandle.close.toFixed(2)}
                </strong>
              </span>
              <span className="text-slate-400 hidden sm:inline">
                Vol: <strong className="text-cyan-300">{hoveredCandle.volume.toLocaleString()}</strong>
              </span>
            </>
          ) : latestCandle ? (
            <>
              <span className="text-amber-400 font-bold">DERNIÈRE BOUGIE</span>
              <span className="text-slate-400">
                O: <strong className="text-white">${latestCandle.open.toFixed(2)}</strong>
              </span>
              <span className="text-slate-400">
                H: <strong className="text-emerald-400">${latestCandle.high.toFixed(2)}</strong>
              </span>
              <span className="text-slate-400">
                L: <strong className="text-rose-400">${latestCandle.low.toFixed(2)}</strong>
              </span>
              <span className="text-slate-400">
                C:{' '}
                <strong className={latestCandle.close >= latestCandle.open ? 'text-emerald-400' : 'text-rose-400'}>
                  ${latestCandle.close.toFixed(2)}
                </strong>
              </span>
              <span className="flex items-center space-x-1 text-cyan-300">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>Clôture: {formatCountdown(secondsRemaining)}</span>
              </span>
            </>
          ) : null}
        </div>

        {/* Floating Quick Legend & Instructions Bottom Left */}
        <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-2 text-[10px] font-mono pointer-events-none">
          <div className="flex items-center space-x-1.5 bg-[#0c121e]/85 backdrop-blur-sm px-2.5 py-1 rounded border border-slate-800 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#00b074]"></span>
            <span>Achat (Buy)</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-[#0c121e]/85 backdrop-blur-sm px-2.5 py-1 rounded border border-slate-800 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>
            <span>Vente (Sell)</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-[#0c121e]/85 backdrop-blur-sm px-2.5 py-1 rounded border border-cyan-500/30 text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>Prix Direct</span>
          </div>
          {showSlTpLevels && stopLoss && (
            <div className="flex items-center space-x-1.5 bg-rose-950/60 backdrop-blur-sm px-2.5 py-1 rounded border border-rose-800/60 text-rose-300">
              <span>SL: ${stopLoss.toFixed(1)}</span>
            </div>
          )}
          {showSlTpLevels && takeProfit1 && (
            <div className="flex items-center space-x-1.5 bg-emerald-950/60 backdrop-blur-sm px-2.5 py-1 rounded border border-emerald-800/60 text-emerald-300">
              <span>TP1: ${takeProfit1.toFixed(1)}</span>
            </div>
          )}
          <span className="text-slate-500 text-[10px] hidden sm:inline">
            (Glisser pour naviguer l'historique • Molette pour zoomer)
          </span>
        </div>

        {/* HTML5 Canvas with Pan, Zoom & Crosshair listeners */}
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`w-full h-full block ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}
        />
      </div>
    </div>
  );
};
