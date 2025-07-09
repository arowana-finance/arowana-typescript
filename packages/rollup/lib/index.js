import path from 'path';
import esbuild from 'rollup-plugin-esbuild';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import { fileURLToPath } from 'url';
import { Worker } from 'worker_threads';
import { green, greenBright } from 'yoctocolors';

const ___filename = (() => {
  try {
    return fileURLToPath(import.meta.url);
  } catch {
    return __filename;
  }
})();
const __dirname = path.dirname(___filename);
function rollupCreateDTS(input, output) {
  return {
    name: "rollupCreateDTS",
    async buildStart() {
      await new Promise((resolve, reject) => {
        const timeNow = Date.now();
        const worker = new Worker(path.resolve(__dirname, "./typesWorker.js"), {
          workerData: {
            input,
            output
          }
        });
        worker.on("exit", (code) => {
          if (code === 0) {
            const spentTime = Date.now() - timeNow;
            const spentTimeFormat = spentTime > 1e3 ? `${(spentTime / 1e3).toFixed(1)}s` : `${spentTime}ms`;
            const msg = green("created ") + greenBright(output) + green(" in ") + greenBright(spentTimeFormat);
            console.log(msg);
            resolve();
          } else {
            reject(new Error(`Exited while generating ${output} for ${input}`));
          }
        });
        worker.on("error", reject);
      });
    }
  };
}

const decapitalize = ([first, ...rest], upperRest = false) => first.toLowerCase() + (upperRest ? rest.join("").toUpperCase() : rest.join(""));

function getRollupConfig(opts = {}) {
  const input = opts.input || "./src/index.ts";
  const outputDir = opts.outputDir || "./lib";
  const browserName = opts.browserName;
  const polyfillBrowser = opts.polyfillBrowser ?? true;
  const globals = opts.globals || {};
  const minify = opts.minify ?? false;
  const external = !opts.external || opts.external === "all" ? (
    // Excludes all dependencies
    // Match foo, my-package_1, foo-bar, _private_pkg, @myscope/pkg
    (id) => /^(@[\w-]+\/)?[\w-]+$/.test(id)
  ) : opts.external || [];
  const { outputESM, outputCJS, outputUMD, outputType } = (() => {
    const { dir, name } = path.parse(input);
    const _outputDir = path.join(...[outputDir].concat(path.normalize(dir).split(path.sep).slice(1)));
    return {
      outputESM: path.join(_outputDir, `${name}${minify ? `.min` : ""}.js`),
      outputCJS: path.join(_outputDir, `${name}${minify ? `.min` : ""}.cjs`),
      outputUMD: path.join(
        _outputDir,
        `${decapitalize([...browserName || name])}.umd${minify ? `.min` : ""}.js`
      ),
      outputType: path.join(_outputDir, `${name}${minify ? `.min` : ""}.d.ts`)
    };
  })();
  let output;
  if (!browserName) {
    output = [
      {
        file: outputESM,
        format: "esm"
      },
      {
        file: outputCJS,
        format: "cjs",
        esModule: false
      }
    ];
  } else {
    output = [
      {
        file: outputUMD,
        format: "umd",
        esModule: false,
        name: browserName,
        exports: "named",
        globals
      }
    ];
  }
  const plugins = [
    esbuild({
      include: /\.[jt]sx?$/,
      minify: false,
      sourceMap: true,
      target: "es2022"
    }),
    // @ts-expect-error wrong-rollup-types
    commonjs(),
    nodeResolve(),
    // @ts-expect-error wrong-rollup-types
    json()
  ];
  if (!browserName) {
    if (input.endsWith(".ts")) {
      plugins.push(rollupCreateDTS(input, outputType));
    }
  } else {
    plugins.push(nodePolyfills());
    if (polyfillBrowser) {
      plugins.push(
        // @ts-expect-error wrong-rollup-types
        replace({
          preventAssignment: true,
          values: { process: JSON.stringify({ browser: true, env: {} }) }
        })
      );
    }
  }
  if (minify) {
    plugins.push(terser());
  }
  return {
    input,
    output,
    external,
    plugins
  };
}

export { getRollupConfig };
