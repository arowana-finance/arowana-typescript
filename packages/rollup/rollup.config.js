import { getRollupConfig } from './lib/index.js'

const config = [
    getRollupConfig({ input: './src/index.ts' }),
    getRollupConfig({ input: './src/typesWorker.ts' }),
]

export default config;