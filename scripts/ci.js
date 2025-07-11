#!/usr/bin/env node
import process from 'process';
import { readdir, writeFile } from 'fs/promises';
import path from 'path';

export const npmrc = `//registry.npmjs.org/:_authToken=\${NODE_AUTH_TOKEN}
registry=https://registry.npmjs.org
@arowanadao:registry=https://registry.npmjs.org
always-auth=true`;

async function existsAsync(fileOrDir) {
    try {
        await stat(fileOrDir);

        return true;
    } catch {
        return false;
    }
}

async function copyRc() {
    const isCI = Object.keys(process.env).some(key => key.includes('CI'));

    const hasRc = await existsAsync('.npmrc');

    if (!isCI) {
        return;
    }

    if (!hasRc) {
        await writeFile('.npmrc', npmrc);

        console.log(`Wrote .npmrc`);
    }

    const pkgs = await readdir('packages');

    for (const pkg of pkgs) {
        const dist = path.join('packages', pkg, '.npmrc');

        await writeFile(dist, npmrc);

        console.log(`Wrote ${dist}`);
    }
}

copyRc();
