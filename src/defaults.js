// defaults.js — seed data for predictions, watchlist, portfolio
export function defaultWatchlist() {
  return ['BBCA', 'BBRI', 'TLKM', 'ASII', 'GOTO', 'ANTM', 'UNTR', 'MDKA', 'BMRI', 'TPIA']
}

export function defaultPortfolio() {
  return [
    { sym: 'BBCA', lots: 5, avgPx: 10200 },
    { sym: 'BBRI', lots: 10, avgPx: 4550 },
    { sym: 'TLKM', lots: 8, avgPx: 3050 },
    { sym: 'ANTM', lots: 15, avgPx: 1580 },
    { sym: 'GOTO', lots: 50, avgPx: 82 },
  ]
}

export function defaultPredictions() {
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  return [
    { id: 'p001', user: 'AnalisJK', ai: false, sym: 'BBRI', side: 'BUY', entry: 4520, target: 4900, stop: 4350, tf: '5D', conf: 75, reason: 'Breakout daily, MA20 turning up', created: now - 7 * day, resolved: true, resolvedAt: now - 2 * day, outcome: 'win', hitPx: 4925 },
    { id: 'p002', user: 'TraderGalau', ai: false, sym: 'GOTO', side: 'BUY', entry: 68, target: 82, stop: 62, tf: '7D', conf: 60, reason: 'Volume spike + sentimen IPO sektor', created: now - 9 * day, resolved: true, resolvedAt: now - 2 * day, outcome: 'loss', hitPx: 61 },
    { id: 'p003', user: 'AI Quant', ai: true, sym: 'BBCA', side: 'SELL', entry: 10800, target: 10300, stop: 11050, tf: '3D', conf: 68, reason: 'RSI overbought + divergence MACD', created: now - 5 * day, resolved: true, resolvedAt: now - 1 * day, outcome: 'win', hitPx: 10280 },
    { id: 'p004', user: 'ScalperID', ai: false, sym: 'ANTM', side: 'BUY', entry: 1620, target: 1750, stop: 1560, tf: '5D', conf: 70, reason: 'Komoditas nikel rebound', created: now - 6 * day, resolved: true, resolvedAt: now - 2 * day, outcome: 'win', hitPx: 1755 },
    { id: 'p005', user: 'AI Quant', ai: true, sym: 'TLKM', side: 'BUY', entry: 2880, target: 3050, stop: 2800, tf: '7D', conf: 64, reason: 'Mean reversion + bullish engulfing', created: now - 8 * day, resolved: true, resolvedAt: now - 3 * day, outcome: 'win', hitPx: 3060 },
    { id: 'p006', user: 'BandarTracker', ai: false, sym: 'MDKA', side: 'BUY', entry: 2010, target: 2200, stop: 1920, tf: '5D', conf: 62, reason: 'Foreign inflow 3 hari beruntun', created: now - 4 * day, resolved: true, resolvedAt: now - 1 * day, outcome: 'loss', hitPx: 1918 },
    // OPEN positions
    { id: 'p011', user: 'AI Quant', ai: true, sym: 'BBRI', side: 'BUY', entry: 4720, target: 4950, stop: 4600, tf: '5D', conf: 71, reason: 'Akumulasi asing + golden cross', created: now - 12 * 60 * 60 * 1000, resolved: false },
    { id: 'p012', user: 'AnalisJK', ai: false, sym: 'ASII', side: 'BUY', entry: 4955, target: 5200, stop: 4820, tf: '7D', conf: 65, reason: 'Penjualan mobil bulan ini rebound', created: now - 6 * 60 * 60 * 1000, resolved: false },
    { id: 'p013', user: 'BandarTracker', ai: false, sym: 'GOTO', side: 'BUY', entry: 75, target: 88, stop: 69, tf: '10D', conf: 58, reason: 'Breakout pattern weekly', created: now - 2 * 60 * 60 * 1000, resolved: false },
  ]
}
