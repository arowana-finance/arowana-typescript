import type { Exchange, OHLCV } from 'ccxt';

export interface Price {
    timestamp: number;
    price: number;
    volume: number;
}

export interface PriceVWAP {
    timestamp: number;
    accPriceVol: number;
    accVol: number;
    price: number;
}

export async function getOHLCV({
    exchange,
    symbol,
    startTime,
    timeframe = '1h',
    timeframeSec = 3600,
}: {
    exchange: Exchange;
    symbol: string;
    startTime?: number;
    timeframe?: string;
    timeframeSec?: number;
}): Promise<Price[]> {
    const candles: OHLCV[] = [];

    while (true) {
        const from = (() => {
            if (candles.length) {
                const _startTime = (candles.slice(-1)[0][0] as number) + 1;

                // Ahead of future
                return _startTime > Date.now() ? Date.now() : _startTime;
            }

            return startTime;
        })();

        const _candles = await exchange.fetchOHLCV(symbol, timeframe, from, 1000);

        if (!_candles.length) {
            break;
        }

        candles.push(..._candles);
    }

    return (
        candles
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            .map(([time, open, high, low, close, volume]) => {
                const timestamp =
                    Math.floor(Math.floor((time as number) / 1000) / timeframeSec) * timeframeSec;

                return {
                    timestamp,
                    price: close as number,
                    volume: volume as number,
                };
            })
            .filter((c) => c.price && c.volume)
    );
}
