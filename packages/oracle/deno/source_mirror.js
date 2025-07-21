/**
 * Aims to mirror Chainlink oracle price from remote chain to home chain in regular basis
 * 
 * Because chainlink functions automation is time-based, we only check times not price changes
 */
const ethers = await import("npm:ethers@6.15.0");
const ethersOpt = await import("npm:ethers-opt@1.0.4");

const REMOTE_CHAIN = 42161;
const REMOTE_CHAIN_RPC = 'https://arb1.arbitrum.io/rpc';
const REMOTE_CHAIN_ORACLE = '0x1F954Dc24a49708C26E0C1777f16750B5C6d5a2c';

const HOME_CHAIN = 421614;
const HOME_CHAIN_RPC = 'https://sepolia-rollup.arbitrum.io/rpc';
const HOME_CHAIN_ORACLE = '0xB1Bcf13BAe2b914b4f59e0c835B9Ecf8b606c50c';

const ORACLE_DECIMALS = 8;
const oracleInterval = 3600;

const abi = [
    {
        "inputs":[
            
        ],
        "name":"latestAnswer",
        "outputs":[
            {
                "internalType":"int256",
                "name":"",
                "type":"int256"
            }
        ],
        "stateMutability":"view",
        "type":"function"
    },
    {
        "inputs":[
            
        ],
        "name":"latestRound",
        "outputs":[
            {
                "internalType":"uint256",
                "name":"",
                "type":"uint256"
            }
        ],
        "stateMutability":"view",
        "type":"function"
    },
    {
        "inputs":[
            
        ],
        "name":"latestRoundData",
        "outputs":[
            {
                "internalType":"uint80",
                "name":"",
                "type":"uint80"
            },
            {
                "internalType":"int256",
                "name":"",
                "type":"int256"
            },
            {
                "internalType":"uint256",
                "name":"",
                "type":"uint256"
            },
            {
                "internalType":"uint256",
                "name":"",
                "type":"uint256"
            },
            {
                "internalType":"uint80",
                "name":"",
                "type":"uint80"
            }
        ],
        "stateMutability":"view",
        "type":"function"
    },
    {
        "inputs":[
            
        ],
        "name":"latestTimestamp",
        "outputs":[
            {
                "internalType":"uint256",
                "name":"",
                "type":"uint256"
            }
        ],
        "stateMutability":"view",
        "type":"function"
    },
    {
      "inputs": [],
      "name": "remoteChain",
      "outputs": [
        {
          "internalType": "uint64",
          "name": "",
          "type": "uint64"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "remoteChainOracle",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
]

// Chainlink Functions compatible Ethers JSON RPC provider class
// (this is required for making Ethers RPC calls with Chainlink Functions)
class FunctionsJsonRpcProvider extends ethersOpt.Provider {
  constructor(url) {
    super(url);
    this.url = url;
  }

  async _send(payload) {
    const resp = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await resp.json();

    return !Array.isArray(result) ? [result] : result;
  }
}

function getTimestamp() {
    return Math.floor(Date.now() / 1000);
}

async function fetchRemote() {
    try {
        const provider = new FunctionsJsonRpcProvider(REMOTE_CHAIN_RPC);
        const dataFeed = new ethers.Contract(REMOTE_CHAIN_ORACLE, abi, provider);
        const currentTimestamp = getTimestamp();
        
        const [{ chainId }, [, answer, , updatedAt]] = await Promise.all([
            provider.getNetwork(),
            dataFeed.latestRoundData(),
        ]);

        if (Number(chainId) !== REMOTE_CHAIN) {
            throw new Error('Invalid remote chain');
        }

        if (Number(updatedAt) < (currentTimestamp - 86400)) {
            throw new Error('Data too old');
        }

        return {
            latestAnswer: Number(ethers.formatUnits(answer, ORACLE_DECIMALS)),
            updatedAt: Number(updatedAt),
        }
        
    } catch {
        return {
            latestAnswer: 0,
            updatedAt: 0,
        }
    }
}

async function fetchHome() {
    try {
        const provider = new FunctionsJsonRpcProvider(HOME_CHAIN_RPC);
        const dataFeed = new ethers.Contract(HOME_CHAIN_ORACLE, abi, provider);
        const currentTimestamp = getTimestamp();

        const [{ chainId }, [, answer, , updatedAt], remoteChain, remoteChainOracle] = await Promise.all([
            provider.getNetwork(),
            dataFeed.latestRoundData(),
            dataFeed.remoteChain(),
            dataFeed.remoteChainOracle(),
        ]);

        if (Number(chainId) !== HOME_CHAIN) {
            throw new Error('Invalid home chain');
        }

        if (Number(remoteChain) !== REMOTE_CHAIN || remoteChainOracle !== REMOTE_CHAIN_ORACLE) {
            throw new Error('Invalid remote chain');
        }

        if (Number(updatedAt) >= currentTimestamp) {
            throw new Error('Data too new');
        }

        return {
            latestAnswer: Number(ethers.formatUnits(answer, ORACLE_DECIMALS)),
            updatedAt: !updatedAt ? currentTimestamp : Number(updatedAt),
        }
    } catch {
        return {
            latestAnswer: 0,
            updatedAt: 0,
        }
    }
}

async function processSource() {
    const [remoteData, homeData] = await Promise.all([
        fetchRemote(),
        fetchHome(),
    ]);

    if (!remoteData.updatedAt || !homeData.updatedAt) {
        return ethers.getBytes('0x01');
    }

    const currentTimestamp = Math.floor(getTimestamp() / oracleInterval) * oracleInterval;

    const timestamp = remoteData.updatedAt > currentTimestamp ? remoteData.updatedAt : currentTimestamp;
    const answer = ethers.parseUnits(String(remoteData.latestAnswer), ORACLE_DECIMALS);

    return ethers.getBytes(ethers.solidityPacked(['uint64', 'uint64'], [answer, timestamp]));
}

const encoded = await processSource();

return encoded;