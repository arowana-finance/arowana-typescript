import process from 'process';
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-ethers';
import 'hardhat-dependency-compiler';
import 'hardhat-preprocessor';
import 'ethers-opt/hardhat/flatten';
import 'ethers-opt/hardhat/typefix';
import { getRemappingsTransformerFunc } from 'ethers-opt/hardhat/remappings';
import 'dotenv/config';

const config = {
    defaultNetwork: 'hardhat',
    solidity: {
        compilers: [
            {
                version: '0.8.30',
                settings: {
                    evmVersion: 'london',
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        ],
    },
    // Add dependency contracts to use that aren't imported (like Safe or AAVE pools for example)
    dependencyCompiler: {
        paths: [],
    },
    // Use develop network to connect any EVM compatible network (for any chainIds)
    networks: {
        develop: {
            url: process.env.RPC_URL || '',
            accounts: {
                mnemonic: process.env.MNEMONIC || 'test test test test test test test test test test test junk',
                initialIndex: Number(process.env.MNEMONIC_INDEX) || 0,
            },
        },
        hardhat: {},
    },
    // Custom typechain dir to include to build contract sdks
    typechain: {
        //outDir: 'src/typechain-hardhat',
        node16Modules: true,
    },
    // Uses remappings.txt to remap import paths (like foundry)
    preprocess: {
        eachLine: async () => {
            const { transform } = await getRemappingsTransformerFunc();

            return {
                transform,
            }
        },
    },
};

export default config;
