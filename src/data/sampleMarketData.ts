import { Candle } from '../types';

// Helper to generate a realistic AMD cycle dataset
export function generateAMDCycleDataset(
  symbol: string,
  basePrice: number,
  volatility: number,
  cycleType: 'bullish' | 'bearish' = 'bullish'
): Candle[] {
  const candles: Candle[] = [];
  const now = Date.now();
  const barMinutes = 15;
  const totalBars = 85;

  let currentPrice = basePrice;
  const accStart = 15;
  const accEnd = 45;
  const manipStart = 46;
  const manipEnd = 52;
  const distStart = 53;

  const accMid = basePrice;
  const accRange = basePrice * 0.007; // 0.7% tight range

  for (let i = 0; i < totalBars; i++) {
    const barTime = now - (totalBars - i) * barMinutes * 60 * 1000;
    const date = new Date(barTime);
    const dateStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

    let open = currentPrice;
    let high = open;
    let low = open;
    let close = open;
    let volume = Math.floor(800 + Math.random() * 600);

    if (i < accStart) {
      // Pre-trend
      const delta = (Math.random() - 0.5) * volatility;
      open = currentPrice;
      close = open + delta;
      high = Math.max(open, close) + Math.random() * (volatility * 0.4);
      low = Math.min(open, close) - Math.random() * (volatility * 0.4);
      volume = Math.floor(1000 + Math.random() * 800);
      currentPrice = close;
    } else if (i >= accStart && i <= accEnd) {
      // Phase 1: ACCUMULATION (tight range oscillating around accMid)
      const target = accMid + Math.sin((i - accStart) * 0.5) * (accRange * 0.7);
      open = currentPrice;
      close = target + (Math.random() - 0.5) * (accRange * 0.2);
      high = Math.max(open, close) + Math.random() * (accRange * 0.3);
      low = Math.min(open, close) - Math.random() * (accRange * 0.3);
      // Volume builds up inside accumulation
      volume = Math.floor(1800 + Math.random() * 1200);
      currentPrice = close;
    } else if (i >= manipStart && i <= manipEnd) {
      // Phase 2: MANIPULATION (Judas Swing / fakeout trap)
      if (cycleType === 'bullish') {
        // Sharp drop below accumulation low, sweeping liquidity into demand
        if (i === manipStart) {
          open = currentPrice;
          close = accMid - accRange * 1.3;
          low = close - accRange * 0.4;
          high = open + accRange * 0.2;
          volume = 3800; // Manipulation volume surge
        } else if (i === manipStart + 1) {
          // Bottom wick rejection in demand zone
          open = currentPrice;
          low = accMid - accRange * 1.8; // Extreme sweep low
          close = accMid - accRange * 0.9; // Reclaim
          high = close + accRange * 0.3;
          volume = 5200; // Climax volume at turning point!
        } else {
          // Re-entering accumulation box
          open = currentPrice;
          close = accMid - accRange * 0.2;
          low = open - accRange * 0.2;
          high = close + accRange * 0.3;
          volume = 3200;
        }
      } else {
        // Bearish manipulation (sweep above accHigh)
        if (i === manipStart) {
          open = currentPrice;
          close = accMid + accRange * 1.3;
          high = close + accRange * 0.4;
          low = open - accRange * 0.2;
          volume = 3800;
        } else if (i === manipStart + 1) {
          open = currentPrice;
          high = accMid + accRange * 1.8;
          close = accMid + accRange * 0.9;
          low = close - accRange * 0.3;
          volume = 5200;
        } else {
          open = currentPrice;
          close = accMid + accRange * 0.2;
          high = open + accRange * 0.2;
          low = close - accRange * 0.3;
          volume = 3200;
        }
      }
      currentPrice = close;
    } else {
      // Phase 3: DISTRIBUTION (Strong expansion trend in intended direction)
      const distProgress = i - distStart;
      const step = cycleType === 'bullish' ? accRange * 0.35 : -accRange * 0.35;
      open = currentPrice;
      close = open + step + (Math.random() - 0.2) * (accRange * 0.2);
      if (cycleType === 'bullish') {
        high = Math.max(open, close) + Math.random() * (accRange * 0.3);
        low = Math.min(open, close) - Math.random() * (accRange * 0.15);
      } else {
        high = Math.max(open, close) + Math.random() * (accRange * 0.15);
        low = Math.min(open, close) - Math.random() * (accRange * 0.3);
      }
      volume = Math.floor(2200 + Math.random() * 1800);
      currentPrice = close;
    }

    candles.push({
      time: barTime,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
      dateStr,
    });
  }

  return candles;
}

export const PRESET_DATASETS: Record<string, { label: string; asset: string; timeframe: string; description: string; data: Candle[] }> = {
  'btc-bullish': {
    label: 'BTC/USDT - Rejet Manipulation AMD & Rebond Zone Demande',
    asset: 'BTC/USDT',
    timeframe: '15m',
    description: 'Cas d’école ICT : Accumulation asiatique, Judas Swing baissier piégeant les vendeurs dans la Zone de Demande + Test du POC, suivi de la Distribution haussière.',
    data: generateAMDCycleDataset('BTC/USDT', 64250, 220, 'bullish'),
  },
  'eur-bullish': {
    label: 'EUR/USD - Balayage de Liquidité & POC Reclaim',
    asset: 'EUR/USD',
    timeframe: '5m',
    description: 'Chasse aux stop-loss sous le range de Francfort, mèche de rejet institutionnelle dans l’Order Block de demande avec confluence POC.',
    data: generateAMDCycleDataset('EUR/USD', 1.084, 0.0015, 'bullish'),
  },
  'gold-bearish': {
    label: 'XAU/USD (Gold) - Manipulation Haussière & Distribution Baissière',
    asset: 'XAU/USD',
    timeframe: '15m',
    description: 'Accumulation pré-New York, manipulation haussière au-dessus du range dans une Zone d’Offre majeure, rejet sous le POC et effondrement.',
    data: generateAMDCycleDataset('XAU/USD', 2415, 12, 'bearish'),
  },
};
