#!/usr/bin/env node
import { writeFile } from 'fs/promises';
import { gate, mexc } from 'ccxt';
import { toJSONL } from './utils.js';
import { getOHLCV, PriceVWAP } from './price.js';

async function update() {
    const symbol = 'ARW/USDT';
    const gateEx = new gate({ enableRateLimit: true });
    const mexcEx = new mexc({ enableRateLimit: true });

    const [gatePrices, mexcPrices] = await Promise.all([
        getOHLCV({ exchange: gateEx, symbol }),
        getOHLCV({ exchange: mexcEx, symbol }),
    ]);

    const vwapPrices = Object.values(
        [...gatePrices, ...mexcPrices]
            .sort((a, b) => a.timestamp - b.timestamp)
            .reduce(
                (acc, curr) => {
                    if (!acc[curr.timestamp]) {
                        acc[curr.timestamp] = {
                            timestamp: curr.timestamp,
                            accPriceVol: 0,
                            accVol: 0,
                            price: 0,
                        };
                    }

                    acc[curr.timestamp].accPriceVol += curr.price * curr.volume;
                    acc[curr.timestamp].accVol += curr.volume;
                    acc[curr.timestamp].price = acc[curr.timestamp].accPriceVol / acc[curr.timestamp].accVol;

                    return acc;
                },
                {} as Record<number, PriceVWAP>,
            ),
    );

    const lastPrice = vwapPrices[vwapPrices.length - 1];
    const lastPriceTimestamp = lastPrice?.timestamp ? lastPrice.timestamp * 1000 : 0;

    console.log(
        `VWAP Prices Count: ${vwapPrices.length}, Last Price: ${new Date(lastPriceTimestamp).toUTCString()}: ${lastPrice.price || 0}`,
    );

    await writeFile('price_gate.jsonl', toJSONL(gatePrices));
    await writeFile('price_mexc.jsonl', toJSONL(mexcPrices));
    await writeFile('price_vwap.jsonl', toJSONL(vwapPrices));
}

update();
