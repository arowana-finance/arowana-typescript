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

function parseJSONL(jsonl) {
  const lines = jsonl.split(/\r?\n/);
  return lines.map((line) => line.trim()).filter((line) => line.length > 0).map((line) => JSON.parse(line));
}
function toJSONL(array) {
  return array.map((item) => JSON.stringify(item)).join("\n");
}

export { getOHLCV, parseJSONL, toJSONL };
