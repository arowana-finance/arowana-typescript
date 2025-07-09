/**
 * Unused for solidity projects unless you need to test custom src files
 */
import { getRollupConfig } from '@arowanadao/rollup';

const config = [
    getRollupConfig({ input: './src/index.ts' }),
    getRollupConfig({ input: './src/start.ts' }),
]

export default config;