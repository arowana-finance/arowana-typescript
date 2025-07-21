// Imports
const ethers = await import("npm:ethers@6.15.0");

const VWAP_PRICE_URL = 'https://raw.githubusercontent.com/arowana-finance/arowana-data/main/arw_price/price_vwap.jsonl';
const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';
const CONTRACT_ADDRESS = '0x91374189aC64F294f6bAF26968988fAF541ddeE2';
const ORACLE_DECIMALS = 8;

const abi = [
    {
        "inputs": [],
        "name": "latestAnswer",
        "outputs": [
            {
                "internalType": "int256",
                "name": "",
                "type": "int256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "latestRound",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "latestTimestamp",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

// Chainlink Functions compatible Ethers JSON RPC provider class
// (this is required for making Ethers RPC calls with Chainlink Functions)
class FunctionsJsonRpcProvider extends ethers.JsonRpcProvider {
  constructor(url) {
    super(url);
    this.url = url;
  }

  async _send(payload) {
    let resp = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return resp.json();
  }
}

function parseJSONL(jsonl) {
    // Split string into lines (handles both \n and \r\n)
    const lines = jsonl.split(/\r?\n/);
    // Parse each line and filter out empty ones
    return lines
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line));
}

function chunk(arr, size) {
    return [...Array(Math.ceil(arr.length / size))].map((_, i) => arr.slice(size * i, size + size * i));
}

const provider = new FunctionsJsonRpcProvider(RPC_URL);
const dataFeedContract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
const dataFeedTimestamp = await (async () => {
    try {
        return Number(await dataFeedContract.latestTimestamp());
    } catch {
        return 10000000000000;
    }
})();

const vwapPrices = await (async () => {
    try {
        const resp = await fetch(VWAP_PRICE_URL);

        if (!resp.ok) {
            return [];
        }

        return parseJSONL(await resp.text());
    } catch {
        return [];
    }
})();

const { nums } = vwapPrices
    .filter(p => p.timestamp > dataFeedTimestamp)
    .reduce((acc, curr) => {
        const priceBN = ethers.parseUnits(
            Number(curr.price.toFixed(ORACLE_DECIMALS)).toString(),
            ORACLE_DECIMALS
        );
        const timestampBN = BigInt(curr.timestamp);

        acc.prices.push(priceBN);
        acc.timestamps.push(timestampBN);
        acc.nums.push(...[priceBN, timestampBN]);
        return acc;
    }, {
        prices: [],
        timestamps: [],
        nums: [],
    });

// Nothing to update, just send zero length bytes to emit contract only
if (!nums.length) {
    return ethers.getBytes('0x01');
}

const chunked = chunk(nums, 4)[0];

const encoded = ethers.solidityPacked(chunked.map(() => 'uint64'), chunked);

return ethers.getBytes(encoded);