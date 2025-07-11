import { id } from 'ethers';

async function test() {
    console.log(id('InvalidSubscription()').slice(0, 10))
    console.log(id('InvalidConsumer()').slice(0, 10))
}

test();