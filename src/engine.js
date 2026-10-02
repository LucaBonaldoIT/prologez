import { checkWith } from './prolog/core.js';

// SWI-Prolog (WASM) runs in a Web Worker so the page never freezes, and so a runaway
// query can simply be terminated.
const RUN_TIMEOUT_MS = 10000;
const BOOT_TIMEOUT_MS = 60000;

let worker = null;
let readyPromise = null;
let seq = 0;
const pending = new Map();
const listeners = new Set();
let state = 'idle'; // idle | loading | ready | error

function setState(s) {
  state = s;
  listeners.forEach((fn) => fn(s));
}

export function onEngineState(fn) {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

function emptyResult(error) {
  return { output: '', answers: [], more: false, warnings: [], phase: 'query', ms: 0, error };
}

function failAll(message) {
  for (const { resolve, timer } of pending.values()) {
    clearTimeout(timer);
    resolve(emptyResult(message));
  }
  pending.clear();
}

function spawn() {
  if (worker) worker.terminate();
  setState('loading');
  worker = new Worker(new URL('./engine.worker.js', import.meta.url), { type: 'module' });
  let resolveReady, rejectReady;
  readyPromise = new Promise((res, rej) => {
    resolveReady = res;
    rejectReady = rej;
  });
  readyPromise.catch(() => {});
  const bootTimer = setTimeout(
    () => rejectReady(new Error('The Prolog engine took too long to load.')),
    BOOT_TIMEOUT_MS,
  );
  worker.onmessage = ({ data }) => {
    if (data.ready) {
      clearTimeout(bootTimer);
      setState('ready');
      resolveReady();
    } else if (data.fatal) {
      clearTimeout(bootTimer);
      setState('error');
      rejectReady(new Error(data.fatal));
    } else {
      const p = pending.get(data.id);
      if (!p) return;
      clearTimeout(p.timer);
      pending.delete(data.id);
      p.resolve(data.result);
    }
  };
  worker.onerror = (e) => {
    clearTimeout(bootTimer);
    setState('error');
    rejectReady(new Error(e.message || 'The Prolog engine crashed.'));
    failAll('The Prolog engine crashed. It will restart on the next run.');
    worker = null;
    readyPromise = null;
  };
}

/** Start loading the engine in the background (call early). */
export function warmUp() {
  if (!worker) spawn();
  return readyPromise;
}

/** Abort whatever is running; the engine restarts on the next run. */
export function stopAll() {
  if (!worker) return;
  failAll('Stopped.');
  worker.terminate();
  worker = null;
  readyPromise = null;
  setState('idle');
}

export async function run(opts) {
  if (!worker) spawn();
  try {
    await readyPromise;
  } catch (e) {
    worker = null;
    readyPromise = null;
    return emptyResult(String(e.message || e));
  }
  return new Promise((resolve) => {
    const id = ++seq;
    const timer = setTimeout(() => {
      pending.delete(id);
      // Restart the engine; the query is probably stuck in an endless loop.
      worker?.terminate();
      worker = null;
      readyPromise = null;
      setState('idle');
      resolve(
        emptyResult(
          `Stopped: no answer after ${RUN_TIMEOUT_MS / 1000} seconds. Probably an infinite loop, the engine was restarted.`,
        ),
      );
    }, RUN_TIMEOUT_MS);
    pending.set(id, { resolve, timer });
    worker.postMessage({ id, opts });
  });
}

export const check = (program, tests) => checkWith(run, program, tests);
