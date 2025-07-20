import { RollupOptions } from 'rollup';

export interface GetRollupConfigOptions {
	input?: string;
	outputDir?: string;
	browserName?: string;
	polyfillBrowser?: boolean;
	globals?: Record<string, string>;
	minify?: boolean;
	external?: "all" | string[] | ((id: string) => boolean);
}
export declare function getRollupConfig(opts?: GetRollupConfigOptions): RollupOptions;

export {};
