import path from 'path';
import esbuild from 'rollup-plugin-esbuild';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import type { Plugin, RollupOptions, OutputOptions } from 'rollup';
import { rollupCreateDTS } from './typesPlugin.js';
import { decapitalize, DecapitalizeOpts } from './utils.js';

export interface GetRollupConfigOptions {
    input?: string;
    outputDir?: string;
    browserName?: string;
    polyfillBrowser?: boolean;
    globals?: Record<string, string>;
    minify?: boolean;
    external?: 'all' | string[] | ((id: string) => boolean);
}

export function getRollupConfig(opts: GetRollupConfigOptions = {}): RollupOptions {
    const input = opts.input || './src/index.ts';
    const outputDir = opts.outputDir || './lib';
    const browserName = opts.browserName;
    // Specify this to false if you have some conflict with process polyfill
    const polyfillBrowser = opts.polyfillBrowser ?? true;
    // Use window objects (like window.$ for jQuery)
    const globals = opts.globals || {};
    const minify = opts.minify ?? false;

    const external: RollupOptions['external'] =
        !opts.external || opts.external === 'all'
            ? // Excludes all dependencies
              // Match foo, my-package_1, foo-bar, _private_pkg, @myscope/pkg
              (id: string) => /^(@[\w-]+\/)?[\w-]+$/.test(id)
            : opts.external || [];

    // Configure file names
    const { outputESM, outputCJS, outputUMD, outputType } = (() => {
        const { dir, name } = path.parse(input);
        const _outputDir = path.join(...[outputDir].concat(path.normalize(dir).split(path.sep).slice(1)));
        return {
            outputESM: path.join(_outputDir, `${name}${minify ? `.min` : ''}.js`),
            outputCJS: path.join(_outputDir, `${name}${minify ? `.min` : ''}.cjs`),
            outputUMD: path.join(
                _outputDir,
                `${decapitalize([...(browserName || name)] as DecapitalizeOpts)}.umd${minify ? `.min` : ''}.js`,
            ),
            outputType: path.join(_outputDir, `${name}${minify ? `.min` : ''}.d.ts`),
        };
    })();

    let output: OutputOptions[];
    if (!browserName) {
        output = [
            {
                file: outputESM,
                format: 'esm',
            },
            {
                file: outputCJS,
                format: 'cjs',
                esModule: false,
            },
        ];
    } else {
        output = [
            {
                file: outputUMD,
                format: 'umd',
                esModule: false,
                name: browserName,
                exports: 'named',
                globals,
            },
        ];
    }

    const plugins: Plugin[] = [
        esbuild({
            include: /\.[jt]sx?$/,
            minify: false,
            sourceMap: true,
            target: 'es2022',
        }),
        // @ts-expect-error wrong-rollup-types
        commonjs(),
        nodeResolve(),
        // @ts-expect-error wrong-rollup-types
        json(),
    ];

    if (!browserName) {
        // Generate .d.ts type files
        if (input.endsWith('.ts')) {
            plugins.push(rollupCreateDTS(input, outputType));
        }
    } else {
        // @ts-expect-error wrong-rollup-types
        plugins.push(nodePolyfills());
        if (polyfillBrowser) {
            plugins.push(
                // @ts-expect-error wrong-rollup-types
                replace({
                    preventAssignment: true,
                    values: { process: JSON.stringify({ browser: true, env: {} }) },
                }) as unknown as Plugin,
            );
        }
    }

    if (minify) {
        // @ts-expect-error wrong-rollup-types
        plugins.push(terser());
    }

    return {
        input,
        output,
        external,
        plugins,
    };
}
