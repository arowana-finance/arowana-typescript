#!/usr/bin/env node
import { writeFile, readFile, stat } from 'fs/promises';
import { gate, mexc } from 'ccxt';

function parseJSONL(jsonl) {
  const lines = jsonl.split(/\r?\n/);
  return lines.map((line) => line.trim()).filter((line) => line.length > 0).map((line) => JSON.parse(line));
}
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
        const _startTime = candles.slice(-1)[0][0] + 1;
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

const LOCAL_GATE = "price_gate.jsonl";
const LOCAL_MEXC = "price_mexc.jsonl";
const LOCAL_VWAP = "price_vwap.jsonl";
async function existsAsync(fileOrDir) {
  try {
    await stat(fileOrDir);
    return true;
  } catch {
    return false;
  }
}
async function getLocalPrice(localFile) {
  try {
    const exists = await existsAsync(localFile);
    if (!exists) {
      return [];
    }
    return parseJSONL(await readFile(localFile, { encoding: "utf8" }));
  } catch {
    return [];
  }
}
async function getPrices(localFile, symbol, exchange) {
  const localPrices = await getLocalPrice(localFile);
  const startTime = localPrices.length ? (localPrices.slice(-1)[0].timestamp + 1) * 1e3 : void 0;
  const latestPrices = (await getOHLCV({ exchange, symbol, startTime })).slice(0, -1);
  return localPrices.concat(latestPrices);
}
async function update() {
  const symbol = "ARW/USDT";
  const gateEx = new gate({ enableRateLimit: true });
  const mexcEx = new mexc({ enableRateLimit: true });
  const [gatePrices, mexcPrices] = await Promise.all([
    getPrices(LOCAL_GATE, symbol, gateEx),
    getPrices(LOCAL_MEXC, symbol, mexcEx)
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
  await writeFile(LOCAL_GATE, toJSONL(gatePrices));
  await writeFile(LOCAL_MEXC, toJSONL(mexcPrices));
  await writeFile(LOCAL_VWAP, toJSONL(vwapPrices));
}
update();
