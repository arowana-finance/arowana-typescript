'use strict';

var path = require('path');
var esbuild = require('rollup-plugin-esbuild');
var pluginNodeResolve = require('@rollup/plugin-node-resolve');
var commonjs = require('@rollup/plugin-commonjs');
var json = require('@rollup/plugin-json');
var nodePolyfills = require('rollup-plugin-polyfill-node');
var replace = require('@rollup/plugin-replace');
var terser = require('@rollup/plugin-terser');
var url = require('url');
var worker_threads = require('worker_threads');
var yoctocolors = require('yoctocolors');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
const ___filename = (() => {
  try {
    return url.fileURLToPath((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('index.cjs', document.baseURI).href)));
  } catch {
    return __filename;
  }
})();
const __dirname$1 = path.dirname(___filename);
function rollupCreateDTS(input, output) {
  return {
    name: "rollupCreateDTS",
    async buildStart() {
      await new Promise((resolve, reject) => {
        const timeNow = Date.now();
        const worker = new worker_threads.Worker(path.resolve(__dirname$1, "./typesWorker.js"), {
          workerData: {
            input,
            output
          }
        });
        worker.on("exit", (code) => {
          if (code === 0) {
            const spentTime = Date.now() - timeNow;
            const spentTimeFormat = spentTime > 1e3 ? `${(spentTime / 1e3).toFixed(1)}s` : `${spentTime}ms`;
            const msg = yoctocolors.green("created ") + yoctocolors.greenBright(output) + yoctocolors.green(" in ") + yoctocolors.greenBright(spentTimeFormat);
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
    pluginNodeResolve.nodeResolve(),
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

exports.getRollupConfig = getRollupConfig;
