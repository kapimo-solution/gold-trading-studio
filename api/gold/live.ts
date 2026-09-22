import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const interval = (req.query.interval as string) || "15m";
    const limit = parseInt((req.query.limit as string) || "90");

    const klinesUrl = `https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=${interval}&limit=${limit}`;
    const tickerUrl = `https://api.binance.com/api/v3/ticker/24hr?symbol=PAXGUSDT`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    try {
      const [klinesRes, tickerRes] = await Promise.all([
        fetch(klinesUrl, { signal: controller.signal }),
        fetch(tickerUrl, { signal: controller.signal }),
      ]);
      clearTimeout(timeout);

      if (klinesRes.ok && tickerRes.ok) {
        const klines = await klinesRes.json();
        const ticker = await tickerRes.json();

        const candles = klines.map((k: any) => {
          const time = k[0];
          const d = new Date(time);
          const dateStr = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
          return {
            time,
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5]),
            dateStr,
          };
        });

        const liveCurrentPrice = parseFloat(ticker.lastPrice);
        if (candles.length > 0 && !isNaN(liveCurrentPrice)) {
          const lastC = candles[candles.length - 1];
          lastC.close = liveCurrentPrice;
          if (liveCurrentPrice > lastC.high) lastC.high = liveCurrentPrice;
          if (liveCurrentPrice < lastC.low) lastC.low = liveCurrentPrice;
        }

        return res.json({
          source: "Binance Live (PAXG/USDT Gold Spot)",
          symbol: "XAU/USD (Gold Spot)",
          currentPrice: liveCurrentPrice,
          change24h: parseFloat(ticker.priceChangePercent),
          high24h: parseFloat(ticker.highPrice),
          low24h: parseFloat(ticker.lowPrice),
          volume24h: parseFloat(ticker.volume),
          timestamp: Date.now(),
          candles,
        });
      }
    } catch (fetchErr) {
      clearTimeout(timeout);
      console.warn("Live Binance fetch error or timeout, generating synthetic live gold feed:", fetchErr);
    }

    // Fallback: synthetic gold feed so the UI never fully breaks if Binance is unreachable
    const now = Date.now();
    const intervalMinutes =
      interval === "1m"
        ? 1
        : interval === "5m"
        ? 5
        : interval === "15m"
        ? 15
        : interval === "30m"
        ? 30
        : interval === "1h"
        ? 60
        : interval === "4h"
        ? 240
        : 1440;

    const basePrice = 2654.5;
    const candles = [];
    let cur = basePrice - intervalMinutes * 0.35;

    for (let i = 0; i < limit; i++) {
      const t = now - (limit - i) * intervalMinutes * 60 * 1000;
      const d = new Date(t);
      const dateStr =
        intervalMinutes >= 1440
          ? `${d.getDate()}/${d.getMonth() + 1}`
          : `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
      const volatility = Math.sqrt(intervalMinutes) * 1.2;
      const delta = (Math.random() - 0.48) * volatility;
      const open = cur;
      const close = open + delta;
      const high = Math.max(open, close) + Math.random() * (volatility * 0.6);
      const low = Math.min(open, close) - Math.random() * (volatility * 0.6);
      const volume = Math.floor(1200 + Math.random() * 900);
      cur = close;

      candles.push({
        time: t,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume,
        dateStr,
      });
    }

    const lastCandle = candles[candles.length - 1];

    res.json({
      source: "Flux Temps Réel Or (XAU/USD) — synthétique (Binance indisponible)",
      symbol: "XAU/USD (Gold)",
      currentPrice: lastCandle.close,
      change24h: 0.85,
      high24h: Math.max(...candles.map((c) => c.high)),
      low24h: Math.min(...candles.map((c) => c.low)),
      volume24h: 38450,
      timestamp: now,
      candles,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erreur récupération données or" });
  }
}
