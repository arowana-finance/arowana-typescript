import { readFile, stat, writeFile } from 'fs/promises';
import { Exchange, gate, mexc } from 'ccxt';
import { parseJSONL, toJSONL } from './utils.js';
import { getOHLCV, Price, PriceVWAP } from './price.js';

const LOCAL_GATE = 'price_gate.jsonl';
const LOCAL_MEXC = 'price_mexc.jsonl';
const LOCAL_VWAP = 'price_vwap.jsonl';

async function existsAsync(fileOrDir: string): Promise<boolean> {
    try {
        await stat(fileOrDir);

        return true;
    } catch {
        return false;
    }
}

async function getLocalPrice(localFile: string): Promise<Price[]> {
    try {
        const exists = await existsAsync(localFile);

        if (!exists) {
            return [];
        }

        return parseJSONL(await readFile(localFile, { encoding: 'utf8' }));
    } catch {
        return [];
    }
}

async function getPrices(localFile: string, symbol: string, exchange: Exchange): Promise<Price[]> {
    const localPrices = await getLocalPrice(localFile);
    const startTime = localPrices.length ? (localPrices.slice(-1)[0].timestamp + 1) * 1000 : undefined;

    // Remove last element as it is not finalized
    const latestPrices = (await getOHLCV({ exchange, symbol, startTime })).slice(0, -1);

    return localPrices.concat(latestPrices);
}

export async function syncPrice() {
    const symbol = 'ARW/USDT';
    const gateEx = new gate({ enableRateLimit: true });
    const mexcEx = new mexc({ enableRateLimit: true });

    const [gatePrices, mexcPrices] = await Promise.all([
        getPrices(LOCAL_GATE, symbol, gateEx),
        getPrices(LOCAL_MEXC, symbol, mexcEx),
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

    await writeFile(LOCAL_GATE, toJSONL(gatePrices));
    await writeFile(LOCAL_MEXC, toJSONL(mexcPrices));
    await writeFile(LOCAL_VWAP, toJSONL(vwapPrices));
}
