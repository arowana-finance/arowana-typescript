import { getRollupConfig } from './index.js';

async function start() {
    const config = getRollupConfig();

    console.log(JSON.stringify(config, null, 4));
}

start();
