import { writeFile } from 'fs/promises';
import { Provider } from 'ethers-opt';
import { formatUnits } from 'ethers';
import { ARWSupply__factory, IERC20Exp__factory } from '../typechain-types/index.js';

const RPC_URL = process.env.RPC_URL || 'https://arb1.arbitrum.io/rpc';

const ARW_ADDRESS = process.env.ARW_ADDRESS || '0x747952A59292a9B3862F3C59664B95e8B461eF45';

const ARW_SUPPLY_ADDRESS = process.env.ARW_SUPPLY_ADDRESS || '0xDA8f5308630D08d1800fc0a029E2c5CaEE55283F';

const LOCAL_TOTAL = process.env.LOCAL_TOTAL || 'arw_total.txt';

const LOCAL_CIRCULATING = process.env.LOCAL_CIRCULATING || 'arw_circulating.txt';

export async function syncSupply() {
    const provider = new Provider(RPC_URL);

    const ARW = IERC20Exp__factory.connect(ARW_ADDRESS, provider);

    const ARWSupply = ARWSupply__factory.connect(ARW_SUPPLY_ADDRESS, provider);

    const [symbol, decimals, _totalSupply, _circulatingSupply] = await Promise.all([
        ARW.symbol(),
        ARW.decimals(),
        ARW.totalSupply(),
        ARWSupply.circulatingSupply(),
    ]);

    const totalSupply = Number(Number(formatUnits(_totalSupply, Number(decimals))).toFixed(8));

    const circulatingSupply = Number(Number(formatUnits(_circulatingSupply, Number(decimals))).toFixed(8));

    console.log(`Total: ${totalSupply} ${symbol}, Circulating: ${circulatingSupply} ${symbol}`);

    await writeFile(LOCAL_TOTAL, String(totalSupply));
    await writeFile(LOCAL_CIRCULATING, String(circulatingSupply));
}
