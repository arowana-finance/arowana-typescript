#!/usr/bin/env node
'use strict';

var promises = require('fs/promises');
var ccxt = require('ccxt');
var ethersOpt = require('ethers-opt');
var ethers = require('ethers');

function parseJSONL(jsonl) {
  const lines = jsonl.split(/\r?\n/);
  return lines.map((line) => line.trim()).filter((line) => line.length > 0).map((line) => JSON.parse(line));
}
function toJSONL(array) {
  return array.map((item) => JSON.stringify(item)).join("\n");
}

async function getOHLCV({
  exchange,
  symbol,
  startTime,
  timeframe = "1h",
  timeframeSec = 3600
}) {
  const candles = [];
  while (true) {
    const from = (() => {
      if (candles.length) {
        const _startTime = candles.slice(-1)[0][0] + 1;
        return _startTime > Date.now() ? Date.now() : _startTime;
      }
      return startTime;
    })();
    const _candles = await exchange.fetchOHLCV(symbol, timeframe, from, 1e3);
    if (!_candles.length) {
      break;
    }
    candles.push(..._candles);
  }
  return candles.map(([time, open, high, low, close, volume]) => {
    const timestamp = Math.floor(Math.floor(time / 1e3) / timeframeSec) * timeframeSec;
    return {
      timestamp,
      price: close,
      volume
    };
  }).filter((c) => c.price && c.volume);
}

const LOCAL_GATE = "price_gate.jsonl";
const LOCAL_MEXC = "price_mexc.jsonl";
const LOCAL_VWAP = "price_vwap.jsonl";
async function existsAsync(fileOrDir) {
  try {
    await promises.stat(fileOrDir);
    return true;
  } catch {
    return false;
  }
}
async function getLocalPrice(localFile) {
  try {
    const exists = await existsAsync(localFile);
    if (!exists) {
      return [];
    }
    return parseJSONL(await promises.readFile(localFile, { encoding: "utf8" }));
  } catch {
    return [];
  }
}
async function getPrices(localFile, symbol, exchange) {
  const localPrices = await getLocalPrice(localFile);
  const startTime = localPrices.length ? (localPrices.slice(-1)[0].timestamp + 1) * 1e3 : void 0;
  const latestPrices = (await getOHLCV({ exchange, symbol, startTime })).slice(0, -1);
  return localPrices.concat(latestPrices);
}
async function syncPrice() {
  const symbol = "ARW/USDT";
  const gateEx = new ccxt.gate({ enableRateLimit: true });
  const mexcEx = new ccxt.mexc({ enableRateLimit: true });
  const [gatePrices, mexcPrices] = await Promise.all([
    getPrices(LOCAL_GATE, symbol, gateEx),
    getPrices(LOCAL_MEXC, symbol, mexcEx)
  ]);
  const vwapPrices = Object.values(
    [...gatePrices, ...mexcPrices].sort((a, b) => a.timestamp - b.timestamp).reduce(
      (acc, curr) => {
        if (!acc[curr.timestamp]) {
          acc[curr.timestamp] = {
            timestamp: curr.timestamp,
            accPriceVol: 0,
            accVol: 0,
            price: 0
          };
        }
        acc[curr.timestamp].accPriceVol += curr.price * curr.volume;
        acc[curr.timestamp].accVol += curr.volume;
        acc[curr.timestamp].price = acc[curr.timestamp].accPriceVol / acc[curr.timestamp].accVol;
        return acc;
      },
      {}
    )
  );
  const lastPrice = vwapPrices[vwapPrices.length - 1];
  const lastPriceTimestamp = lastPrice?.timestamp ? lastPrice.timestamp * 1e3 : 0;
  console.log(
    `VWAP Prices Count: ${vwapPrices.length}, Last Price: ${new Date(lastPriceTimestamp).toUTCString()}: ${lastPrice.price || 0}`
  );
  await promises.writeFile(LOCAL_GATE, toJSONL(gatePrices));
  await promises.writeFile(LOCAL_MEXC, toJSONL(mexcPrices));
  await promises.writeFile(LOCAL_VWAP, toJSONL(vwapPrices));
}

const _abi$1 = [
  {
    inputs: [],
    name: "InvalidInitialization",
    type: "error"
  },
  {
    inputs: [],
    name: "NotInitializing",
    type: "error"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address"
      }
    ],
    name: "OwnableInvalidOwner",
    type: "error"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address"
      }
    ],
    name: "OwnableUnauthorizedAccount",
    type: "error"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "excluded",
        type: "address"
      }
    ],
    name: "AddExcludedAddress",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint64",
        name: "version",
        type: "uint64"
      }
    ],
    name: "Initialized",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "arw",
        type: "address"
      }
    ],
    name: "Initialized",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address"
      }
    ],
    name: "OwnershipTransferred",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "excluded",
        type: "address"
      }
    ],
    name: "RemoveExcludedAddress",
    type: "event"
  },
  {
    inputs: [],
    name: "ARW",
    outputs: [
      {
        internalType: "contract IERC20",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_excluded",
        type: "address"
      }
    ],
    name: "addExcludedAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "circulatingSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "excludedAddresses",
    outputs: [
      {
        internalType: "address[]",
        name: "",
        type: "address[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "excludedSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_ARW",
        type: "address"
      }
    ],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_excluded",
        type: "address"
      }
    ],
    name: "removeExcludedaddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address"
      }
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];
const _bytecode = "0x6080604052348015600f57600080fd5b50610e918061001f6000396000f3fe608060405234801561001057600080fd5b506004361061009e5760003560e01c80639358928b116100665780639358928b14610139578063a9b54bcd1461014f578063c4d66de814610162578063f2fde38b14610175578063fbb9ee0d1461018857600080fd5b806352ec6716146100a357806365bd5e63146100c1578063715018a6146100d657806389df8136146100de5780638da5cb5b14610109575b600080fd5b6100ab610190565b6040516100b89190610d65565b60405180910390f35b6100d46100cf366004610db1565b6101a1565b005b6100d461023a565b6000546100f1906001600160a01b031681565b6040516001600160a01b0390911681526020016100b8565b7f9016d09d72d40fdae2fd8ceac6b6234c7706214fd39c1cd1e609a0528c199300546001600160a01b03166100f1565b61014161024e565b6040519081526020016100b8565b6100d461015d366004610db1565b6102d7565b6100d4610170366004610db1565b61036c565b6100d4610183366004610db1565b610904565b610141610942565b606061019c6001610a15565b905090565b6101a9610a29565b6101b4600182610a84565b6101f75760405162461bcd60e51b815260206004820152600f60248201526e496e76616c6964206164647265737360881b60448201526064015b60405180910390fd5b610202600182610aab565b506040516001600160a01b038216907f6ade7fc06752ca3786738ecc30afaa9afa43b95e4908d25f416b252537ff533c90600090a250565b610242610a29565b61024c6000610ac0565b565b6000610258610942565b60008054906101000a90046001600160a01b03166001600160a01b03166318160ddd6040518163ffffffff1660e01b8152600401602060405180830381865afa1580156102a9573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906102cd9190610dda565b61019c9190610e09565b6102df610a29565b6102ea600182610a84565b156103295760405162461bcd60e51b815260206004820152600f60248201526e496e76616c6964206164647265737360881b60448201526064016101ee565b610334600182610b31565b506040516001600160a01b038216907f784d23afa452b9062ecb2423875d1c56e8583688921c7d56f293a0c72645216e90600090a250565b6000610376610b46565b805490915060ff600160401b820416159067ffffffffffffffff1660008115801561039e5750825b905060008267ffffffffffffffff1660011480156103bb5750303b155b9050811580156103c9575080155b156103e75760405163f92ee8a960e01b815260040160405180910390fd5b845467ffffffffffffffff19166001178555831561041157845460ff60401b1916600160401b1785555b61041a33610b6f565b600080546001600160a01b0319166001600160a01b0388169081179091556040519081527f908408e307fc569b417f6cbec5d5a06f44a0a505ac0479b47d421a4b2fd6a1e69060200160405180910390a160408051600d8082526101c08201909252600091602082016101a08036833701905050905073b8c574171ee55be2ddc98e7461f9ebd2de2f00ab816000815181106104b8576104b8610e1c565b60200260200101906001600160a01b031690816001600160a01b031681525050731e54223e49ebb025c3fcaed65ce1da9c039c95658160018151811061050057610500610e1c565b60200260200101906001600160a01b031690816001600160a01b031681525050732b4e8a0e5e52c65c45692fccf77f10c786bc1e0b8160028151811061054857610548610e1c565b60200260200101906001600160a01b031690816001600160a01b03168152505073a0f008b3e3187b247ddc987e52735654048858c98160038151811061059057610590610e1c565b60200260200101906001600160a01b031690816001600160a01b0316815250507385225ddfbcc3cd5d5333d1525cb64e43e4c77e75816004815181106105d8576105d8610e1c565b60200260200101906001600160a01b031690816001600160a01b0316815250507306088f4b78bbc74570124badb3f9475410dc369a8160058151811061062057610620610e1c565b60200260200101906001600160a01b031690816001600160a01b031681525050734af320d6155ac13a962048bc310ed83b1e44e4ae8160068151811061066857610668610e1c565b60200260200101906001600160a01b031690816001600160a01b03168152505073754637675bbf31b07f9a114ef59bc78e65737a80816007815181106106b0576106b0610e1c565b60200260200101906001600160a01b031690816001600160a01b0316815250507314a77f8656b753be4febab0f8891db0205f7d588816008815181106106f8576106f8610e1c565b60200260200101906001600160a01b031690816001600160a01b031681525050732c12b7adab9f02ce1a0aa0e092c2f36487126cce8160098151811061074057610740610e1c565b60200260200101906001600160a01b031690816001600160a01b0316815250507317d30a2d883d40090ac1a19a09c635fc967d7d4681600a8151811061078857610788610e1c565b60200260200101906001600160a01b031690816001600160a01b031681525050732f19e9d3d3f7f7da27b6a0a2005748e295b6949d81600b815181106107d0576107d0610e1c565b60200260200101906001600160a01b031690816001600160a01b031681525050734173f68528dfa76787cc8420c4e8592485456c4381600c8151811061081857610818610e1c565b60200260200101906001600160a01b031690816001600160a01b03168152505060005b81518110156108b457600082828151811061085857610858610e1c565b60200260200101519050610876816001610b3190919063ffffffff16565b506040516001600160a01b038216907f784d23afa452b9062ecb2423875d1c56e8583688921c7d56f293a0c72645216e90600090a25060010161083b565b505083156108fc57845460ff60401b19168555604051600181527fc7f505b2f371ae2175ee4913f4499e1f2633a7b5936321eed1cdaeb6115181d29060200160405180910390a15b505050505050565b61090c610a29565b6001600160a01b03811661093657604051631e4fbdf760e01b8152600060048201526024016101ee565b61093f81610ac0565b50565b6000808061094e610190565b905060005b8151811015610a0d5760005482516001600160a01b03909116906370a082319084908490811061098557610985610e1c565b60200260200101516040518263ffffffff1660e01b81526004016109b891906001600160a01b0391909116815260200190565b602060405180830381865afa1580156109d5573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906109f99190610dda565b610a039084610e32565b9250600101610953565b509092915050565b60606000610a2283610b80565b9392505050565b33610a5b7f9016d09d72d40fdae2fd8ceac6b6234c7706214fd39c1cd1e609a0528c199300546001600160a01b031690565b6001600160a01b03161461024c5760405163118cdaa760e01b81523360048201526024016101ee565b6001600160a01b038116600090815260018301602052604081205415155b90505b92915050565b6000610aa2836001600160a01b038416610bdc565b7f9016d09d72d40fdae2fd8ceac6b6234c7706214fd39c1cd1e609a0528c19930080546001600160a01b031981166001600160a01b03848116918217845560405192169182907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a3505050565b6000610aa2836001600160a01b038416610ccf565b6000807ff0c57e16840df040f15088dc2f81fe391c3923bec73e23a9662efc9c229c6a00610aa5565b610b77610d1e565b61093f81610d43565b606081600001805480602002602001604051908101604052809291908181526020018280548015610bd057602002820191906000526020600020905b815481526020019060010190808311610bbc575b50505050509050919050565b60008181526001830160205260408120548015610cc5576000610c00600183610e09565b8554909150600090610c1490600190610e09565b9050808214610c79576000866000018281548110610c3457610c34610e1c565b9060005260206000200154905080876000018481548110610c5757610c57610e1c565b6000918252602080832090910192909255918252600188019052604090208390555b8554869080610c8a57610c8a610e45565b600190038181906000526020600020016000905590558560010160008681526020019081526020016000206000905560019350505050610aa5565b6000915050610aa5565b6000818152600183016020526040812054610d1657508154600181810184556000848152602080822090930184905584548482528286019093526040902091909155610aa5565b506000610aa5565b610d26610d4b565b61024c57604051631afcd79f60e31b815260040160405180910390fd5b61090c610d1e565b6000610d55610b46565b54600160401b900460ff16919050565b602080825282518282018190526000918401906040840190835b81811015610da65783516001600160a01b0316835260209384019390920191600101610d7f565b509095945050505050565b600060208284031215610dc357600080fd5b81356001600160a01b0381168114610a2257600080fd5b600060208284031215610dec57600080fd5b5051919050565b634e487b7160e01b600052601160045260246000fd5b81810381811115610aa557610aa5610df3565b634e487b7160e01b600052603260045260246000fd5b80820180821115610aa557610aa5610df3565b634e487b7160e01b600052603160045260246000fdfea2646970667358221220d7b96123315387c81dfca7d56e34169cc279f5e45a7b030ae3f32aedeba21f7e64736f6c634300081e0033";
const isSuperArgs = (xs) => xs.length > 1;
class ARWSupply__factory extends ethers.ContractFactory {
  constructor(...args) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi$1, _bytecode, args[0]);
    }
  }
  getDeployTransaction(overrides) {
    return super.getDeployTransaction(overrides || {});
  }
  deploy(overrides) {
    return super.deploy(overrides || {});
  }
  connect(runner) {
    return super.connect(runner);
  }
  static bytecode = _bytecode;
  static abi = _abi$1;
  static createInterface() {
    return new ethers.Interface(_abi$1);
  }
  static connect(address, runner) {
    return new ethers.Contract(address, _abi$1, runner);
  }
}

const _abi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256"
      }
    ],
    name: "Approval",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256"
      }
    ],
    name: "Transfer",
    type: "event"
  },
  {
    inputs: [],
    name: "DOMAIN_SEPARATOR",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        internalType: "address",
        name: "spender",
        type: "address"
      }
    ],
    name: "allowance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      }
    ],
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address"
      }
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address"
      }
    ],
    name: "nonces",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        internalType: "address",
        name: "spender",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256"
      },
      {
        internalType: "uint8",
        name: "v",
        type: "uint8"
      },
      {
        internalType: "bytes32",
        name: "r",
        type: "bytes32"
      },
      {
        internalType: "bytes32",
        name: "s",
        type: "bytes32"
      }
    ],
    name: "permit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      }
    ],
    name: "transfer",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address"
      },
      {
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      }
    ],
    name: "transferFrom",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  }
];
class IERC20Exp__factory {
  static abi = _abi;
  static createInterface() {
    return new ethers.Interface(_abi);
  }
  static connect(address, runner) {
    return new ethers.Contract(address, _abi, runner);
  }
}

const RPC_URL = process.env.RPC_URL || "https://arb1.arbitrum.io/rpc";
const ARW_ADDRESS = process.env.ARW_ADDRESS || "0x747952A59292a9B3862F3C59664B95e8B461eF45";
const ARW_SUPPLY_ADDRESS = process.env.ARW_SUPPLY_ADDRESS || "0xDA8f5308630D08d1800fc0a029E2c5CaEE55283F";
const LOCAL_TOTAL = process.env.LOCAL_TOTAL || "arw_total.txt";
const LOCAL_CIRCULATING = process.env.LOCAL_CIRCULATING || "arw_circulating.txt";
async function syncSupply() {
  const provider = new ethersOpt.Provider(RPC_URL);
  const ARW = IERC20Exp__factory.connect(ARW_ADDRESS, provider);
  const ARWSupply = ARWSupply__factory.connect(ARW_SUPPLY_ADDRESS, provider);
  const [symbol, decimals, _totalSupply, _circulatingSupply] = await Promise.all([
    ARW.symbol(),
    ARW.decimals(),
    ARW.totalSupply(),
    ARWSupply.circulatingSupply()
  ]);
  const totalSupply = Number(Number(ethers.formatUnits(_totalSupply, Number(decimals))).toFixed(8));
  const circulatingSupply = Number(Number(ethers.formatUnits(_circulatingSupply, Number(decimals))).toFixed(8));
  console.log(`Total: ${totalSupply} ${symbol}, Circulating: ${circulatingSupply} ${symbol}`);
  await promises.writeFile(LOCAL_TOTAL, String(totalSupply));
  await promises.writeFile(LOCAL_CIRCULATING, String(circulatingSupply));
}

syncPrice();
syncSupply();
