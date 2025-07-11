#!/usr/bin/env node
import { writeFile } from 'fs/promises';
import { gate, mexc } from 'ccxt';

function toJSONL(array) {
  return array.map((item) => JSON.stringify(item)).join("\n");
}

async function getOHLCV({
  exchange,
  symbol,
  startTime,
  timeframe = "1h",
  timeframeSec = 3600
}) {
  const candles = [];
  while (true) {
    const from = (() => {
      if (candles.length) {
        const _startTime = candles[candles.length - 1][0] + 1;
        return _startTime > Date.now() ? Date.now() : _startTime;
      }
      return startTime;
    })();
    const _candles = await exchange.fetchOHLCV(symbol, timeframe, from, 1e3);
    if (!_candles.length) {
      break;
    }
    candles.push(..._candles);
  }
  return candles.map(([time, open, high, low, close, volume]) => {
    const timestamp = Math.floor(Math.floor(time / 1e3) / timeframeSec) * timeframeSec;
    return {
      timestamp,
      price: close,
      volume
    };
  }).filter((c) => c.price && c.volume);
}

async function update() {
  const symbol = "ARW/USDT";
  const gateEx = new gate({ enableRateLimit: true });
  const mexcEx = new mexc({ enableRateLimit: true });
  const [gatePrices, mexcPrices] = await Promise.all([
    getOHLCV({ exchange: gateEx, symbol }),
    getOHLCV({ exchange: mexcEx, symbol })
  ]);
  const vwapPrices = Object.values(
    [...gatePrices, ...mexcPrices].sort((a, b) => a.timestamp - b.timestamp).reduce(
      (acc, curr) => {
        if (!acc[curr.timestamp]) {
          acc[curr.timestamp] = {
            timestamp: curr.timestamp,
            accPriceVol: 0,
            accVol: 0,
            price: 0
          };
        }
        acc[curr.timestamp].accPriceVol += curr.price * curr.volume;
        acc[curr.timestamp].accVol += curr.volume;
        acc[curr.timestamp].price = acc[curr.timestamp].accPriceVol / acc[curr.timestamp].accVol;
        return acc;
      },
      {}
    )
  );
  const lastPrice = vwapPrices[vwapPrices.length - 1];
  const lastPriceTimestamp = lastPrice?.timestamp ? lastPrice.timestamp * 1e3 : 0;
  console.log(
    `VWAP Prices Count: ${vwapPrices.length}, Last Price: ${new Date(lastPriceTimestamp).toUTCString()}: ${lastPrice.price || 0}`
  );
  await writeFile("price_gate.jsonl", toJSONL(gatePrices));
  await writeFile("price_mexc.jsonl", toJSONL(mexcPrices));
  await writeFile("price_vwap.jsonl", toJSONL(vwapPrices));
}
update();
