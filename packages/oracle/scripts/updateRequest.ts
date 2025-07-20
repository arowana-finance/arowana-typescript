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
import { getBytes } from 'ethers';
import { BaseFunctionsConsumer__factory } from '../typechain-types/index.js';

const CONSUMER_ADDRESS = process.env.CONSUMER_ADDRESS || '0x04A000cE99DF76215646e4Fe8f0780D120790ab5';
const SUBSCRIPTION_ID = Number(process.env.SUBSCRIPTION_ID || 395);

const gasLimit = 300000;

interface ChainlinkConfig {
    routerAddress: string;
    explorerUrl: string;
    donID: string;
}

const networkConfigs: Record<number, ChainlinkConfig> = {
    [421614]: {
        routerAddress: '0x234a5fb5Bd614a7AA2FfAB244D603abFA0Ac5C5C',
        explorerUrl: 'https://sepolia.arbiscan.io',
        donID: '0x66756e2d617262697472756d2d7365706f6c69612d3100000000000000000000',
    },
};

async function updateRequest() {
    const [owner] = await getSigners();

    const { provider } = owner;

    const chainId = Number((await provider.getNetwork()).chainId);

    const { donID } = networkConfigs[chainId];

    const source = await readFile('./deno/source.js', { encoding: 'utf8' });

    ///////// START SIMULATION ////////////

    console.log('Start simulation...');

    const response = await simulateScript({
        source,
        args: [],
        bytesArgs: [], // bytesArgs - arguments can be encoded off-chain to bytes.
        //secrets: secrets,
    });

    console.log('Simulation result', response);
    const { errorString, responseBytesHexstring } = response;
    if (errorString) {
        console.log(`❌ Error during simulation: `, errorString);
    } else {
        const returnType = ReturnType.uint256;
        if (responseBytesHexstring && getBytes(responseBytesHexstring).length) {
            const decodedResponse = decodeResult(responseBytesHexstring, returnType);
            console.log(`✅ Decoded response to ${returnType}: `, decodedResponse);
        }
    }

    //////// MAKE REQUEST ////////
    console.log('\nMake request...');

    const automatedFunctionsConsumer = BaseFunctionsConsumer__factory.connect(CONSUMER_ADDRESS, owner);

    // Encode request

    const functionsRequestBytesHexString = buildRequestCBOR({
        codeLocation: Location.Inline,
        codeLanguage: CodeLanguage.JavaScript,
        source,
        args: [],
        bytesArgs: [],
    });

    const tx = await automatedFunctionsConsumer.updateRequest.populateTransaction(
        functionsRequestBytesHexString,
        SUBSCRIPTION_ID,
        gasLimit,
        donID,
    );

    console.log(tx);

    /**
    const transaction = await automatedFunctionsConsumer.updateRequest(
        functionsRequestBytesHexString,
        SUBSCRIPTION_ID,
        gasLimit,
        encodeBytes32String('0x')
    );

    // Log transaction details
    console.log(
        `\n✅ Automated Functions request settings updated! Transaction hash ${transaction.hash} - Check the explorer ${explorerUrl}/tx/${transaction.hash}`
    );
    **/
}

updateRequest();
