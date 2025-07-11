// Imports
const ethers = await import("npm:ethers@6.15.0");

const VWAP_PRICE_URL = '';
const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';
const CONTRACT_ADDRESS = '';

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

const provider = new FunctionsJsonRpcProvider(RPC_URL);
const dataFeedContract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
const dataFeedTimestamp = Number(await dataFeedContract.latestTimestamp());

const vwapRequest = await Functions.makeHttpRequest({ url: VWAP_PRICE_URL });

const vwapPrices = !vwapRequest.error ? parseJSONL(vwapRequest.data) : [];

const { prices, timestamps } = vwapPrices
    .filter(p => p.timestamp > dataFeedTimestamp)
    .reduce((acc, curr) => {
        acc.prices.push(curr.price);
        acc.timestamps.push(curr.timestamp);
        return acc;
    }, {
        prices: [],
        timestamps: [],
    });

// Nothing to update, just send zero length bytes to emit contract only
if (!prices.length) {
    return ethers.getBytes('0x');
}

const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['uint256[]', 'uint256[]'],
    [prices, timestamps]
);

return ethers.getBytes(encoded);