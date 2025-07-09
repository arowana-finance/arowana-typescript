import { describe, expect, it } from 'vitest';
import { getRollupConfig } from '../src/index.js';

describe('rollup config', function () {
    it('should return valid config', async function () {
        const config = getRollupConfig();

        expect(config.input).to.be.a('string');
        expect(config.output).to.be.an('array');
        expect(config.external).to.be.a('function');
        expect(config.plugins).to.be.an('array');
    });
});
