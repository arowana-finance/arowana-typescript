import path from 'path';
import process from 'process';
import { readFile } from 'fs/promises';
import {
    simulateScript,
    buildRequestCBOR,
    ReturnType,
    decodeResult,
    Location,
    CodeLanguage,
} from '@chainlink/functions-toolkit';
import { getSigners } from 'ethers-opt/hardhat/fixtures';
import { ARWFeed } from '../../typechain-types/index.js';

const CONSUMER_ADDRESS = process.env.CONSUMER_ADDRESS || '';
const SUBSCRIPTION_ID = Number(process.env.SUBSCRIPTION_ID || 0);

const gasLimit = 300000;

interface ChainlinkConfig {
    routerAddress: string;
}

const networkConfigs: Record<number, ChainlinkConfig> = {
    [1]: {
        routerAddress: '',
    },
};

async function updateRequest() {
    const [owner] = await getSigners();

    const { provider } = owner;

    const chainId = Number((await provider.getNetwork()).chainId);

    const { routerAddress } = networkConfigs[chainId];

    const source = await readFile('./deno/source.js', { encoding: 'utf8' });

    ///////// START SIMULATION ////////////

    console.log('Start simulation...');

    const response = await simulateScript({
        source: source,
        args: [],
        bytesArgs: [], // bytesArgs - arguments can be encoded off-chain to bytes.
        //secrets: secrets,
    });

    console.log('Simulation result', response);
}

updateRequest();
