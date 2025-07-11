import { Provider } from "npm:ethers-opt@^1";

async function test() {
  const provider = new Provider('https://rpc.mevblocker.io');

  console.log(await provider.getBlockNumber());
}

test();