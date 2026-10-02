import SWIPL from 'swipl-wasm/dist/swipl/swipl-web.js';
import wasmUrl from 'swipl-wasm/dist/swipl/swipl-web.wasm?url';
import dataUrl from 'swipl-wasm/dist/swipl/swipl-web.data?url';
import { createRunner } from './prolog/core.js';

const boot = () =>
  createRunner(SWIPL, {
    locateFile: (path) => (path.endsWith('.wasm') ? wasmUrl : dataUrl),
  });

let runnerPromise = boot();
runnerPromise.then(
  () => self.postMessage({ ready: true }),
  (e) => self.postMessage({ fatal: String(e?.message || e) }),
);

self.onmessage = async ({ data: { id, opts } }) => {
  try {
    const runner = await runnerPromise;
    const result = runner.run(opts);
    // `halt/0` (or a crash) leaves the WASM instance unusable: start a new one.
    if (runner.dead) runnerPromise = boot();
    self.postMessage({ id, result });
  } catch (e) {
    self.postMessage({
      id,
      result: {
        output: '',
        answers: [],
        more: false,
        warnings: [],
        ms: 0,
        phase: 'query',
        error: String(e?.message || e),
      },
    });
  }
};
