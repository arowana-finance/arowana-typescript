# @arowanadao/rollup

[![NPM Version](https://img.shields.io/npm/v/@arowanadao/rollup)](https://www.npmjs.com/package/@arowanadao/rollup) ![Statements](https://img.shields.io/badge/statements-70.87%25-brightgreen.svg?style=flat)

Rollup plugin & config generator for Arowana TypeScript projects

### How to use it?

From rollup.config.js

```js
import { getRollupConfig } from '@arowanadao/rollup'

const config = [
    // Builds mjs and cjs for node by default
    getRollupConfig({ input: './src/index.ts' }),
    getRollupConfig({ input: './src/typesWorker.ts' }),

    // For browser files
    getConfig({
        input: './src/index.ts',
        // window.TSLibrary
        browserName: 'TSLibrary',
        globals: {
            jQuery: '$',
            ethers: 'ethers'
        },
        // Do not forget to include globals as external otherwise they will be bundled
        external: ['crypto', 'ethers'],
        // Minification is optional and not minified by default
        minify: true,
    }),
]

export default config;
```

And run `tsc -p tsconfig.types.json --noEmit && rollup -c` to test types and generate bundled entry files (including d.ts)
