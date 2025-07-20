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
export declare function getOHLCV({ exchange, symbol, startTime, timeframe, timeframeSec, }: {
	exchange: Exchange;
	symbol: string;
	startTime?: number;
	timeframe?: string;
	timeframeSec?: number;
}): Promise<Price[]>;
export declare function parseJSONL<T>(jsonl: string): T[];
export declare function toJSONL<T>(array: T[]): string;

export {};
