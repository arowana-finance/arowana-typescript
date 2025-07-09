import { fileURLToPath } from 'url';
import path from 'path';
import { Worker } from 'worker_threads';
import type { Plugin } from 'rollup';
import { green, greenBright } from 'yoctocolors';

const ___filename = (() => {
    try {
        return fileURLToPath(import.meta.url);
    } catch {
        return __filename;
    }
})();
const __dirname = path.dirname(___filename);

export function rollupCreateDTS(input: string, output: string): Plugin {
    return {
        name: 'rollupCreateDTS',
        async buildStart() {
            await new Promise<void>((resolve, reject) => {
                const timeNow = Date.now();

                const worker = new Worker(path.resolve(__dirname, './typesWorker.js'), {
                    workerData: {
                        input,
                        output,
                    },
                });

                worker.on('exit', (code) => {
                    if (code === 0) {
                        const spentTime = Date.now() - timeNow;
                        const spentTimeFormat =
                            spentTime > 1000 ? `${(spentTime / 1000).toFixed(1)}s` : `${spentTime}ms`;

                        const msg =
                            green('created ') +
                            greenBright(output) +
                            green(' in ') +
                            greenBright(spentTimeFormat);

                        console.log(msg);
                        resolve();
                    } else {
                        reject(new Error(`Exited while generating ${output} for ${input}`));
                    }
                });

                worker.on('error', reject);
            });
        },
    };
}
