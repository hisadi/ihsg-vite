// useStream.js — custom hook for SSE real-time data
import { useState, useEffect } from 'react'
import { fetchStocks, fetchIHSG, fetchSectors, fetchNews, connectStream } from '../api'

export function useStream() {
  const [stocks, setStocks] = useState({})
  const [ihsg, setIHSG] = useState({ value: 7300, change: 0, changePct: 0, spark: [] })
  const [sectors, setSectors] = useState([])
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [tick, setTick] = useState(0)
  const [stats, setStats] = useState({ up: 0, down: 0, flat: 0, valueTotal: 0, volumeTotal: 0 })

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        const [stockData, ihsgData, sectorData, newsData] = await Promise.all([
          fetchStocks(),
          fetchIHSG(),
          fetchSectors(),
          fetchNews(),
        ])

        const stocksMap = {}
        stockData.stocks.forEach(s => { stocksMap[s.symbol] = s })

        setStocks(stocksMap)
        setIHSG(stockData.ihsg || ihsgData)
        setSectors(sectorData)
        setNews(newsData.news || [])
        setLoading(false)
      } catch (e) {
        console.error('Failed to load initial data:', e)
        setLoading(false)
      }
    }
    init()
  }, [])

  // SSE stream
  useEffect(() => {
    const unsub = connectStream(
      (data) => {
        setStocks(prev => {
          const next = { ...prev }
          if (data.stocks) {
            data.stocks.forEach(update => {
              if (next[update.symbol]) {
                next[update.symbol] = {
                  ...next[update.symbol],
                  last: update.last,
                  change: update.change,
                  changePct: update.changePct,
                  volume: update.volume,
                  spark: update.spark || next[update.symbol].spark,
                }
              }
            })
          }
          return next
        })

        if (data.ihsg) {
          setIHSG(prev => ({
            ...prev,
            ...data.ihsg,
            spark: data.ihsg.spark || prev.spark,
          }))
        }

        setTick(t => t + 1)
      },
      (data) => {
        const stocksMap = {}
        if (data.stocks) {
          data.stocks.forEach(s => { stocksMap[s.symbol] = s })
          setStocks(stocksMap)
        }
        if (data.ihsg) {
          setIHSG(prev => {
            const spark = data.ihsg.spark && data.ihsg.spark.length > 0
              ? data.ihsg.spark
              : Array.from({ length: 30 }, (_, i) => prev.value + (Math.random() - 0.5) * 20)
            return { ...prev, ...data.ihsg, spark }
          })
        }
        setConnected(true)
        setLoading(false)
      },
      () => setConnected(true)
    )

    return unsub
  }, [])

  // Compute stats on tick
  useEffect(() => {
    const syms = Object.keys(stocks)
    if (syms.length === 0) return
    let up = 0, down = 0, flat = 0, valueTotal = 0, volumeTotal = 0
    syms.forEach(s => {
      const st = stocks[s]
      if (!st) return
      if (st.changePct > 0.05) up++
      else if (st.changePct < -0.05) down++
      else flat++
      valueTotal += (st.value || 0)
      volumeTotal += (st.volume || 0)
    })
    setStats({ up, down, flat, valueTotal, volumeTotal })
  }, [stocks, tick])

  return { stocks, ihsg, sectors, news, loading, connected, tick, stats }
}
