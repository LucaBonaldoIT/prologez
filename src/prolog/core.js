import { HARNESS } from './harness.js';
import { STEPPER } from './stepper.js';

/**
 * Wraps an SWI-Prolog WASM module (from `swipl-wasm`) behind a small run() API.
 * Shared by the browser worker and the Node verification script.
 * @param {(opts:object)=>Promise<any>} SWIPL  the swipl-wasm factory
 * @param {object} [extra] extra Emscripten module options (e.g. locateFile)
 */
export async function createRunner(SWIPL, extra = {}) {
  let stderr = '';
  const swipl = await SWIPL({
    arguments: ['-q'],
    print: () => {},
    printErr: (s) => {
      stderr += s + '\n';
    },
    ...extra,
  });
  const P = swipl.prolog;
  swipl.FS.writeFile('/nb_harness.pl', HARNESS);
  P.query("consult('/nb_harness.pl')").once();
  swipl.FS.writeFile('/nb_stepper.pl', STEPPER);
  P.query("consult('/nb_stepper.pl')").once();
  // Keep runaway recursion from eating the whole tab: fail with a resource error instead.
  P.query('set_prolog_flag(stack_limit, 268435456)').once();
  P.query('set_prolog_flag(verbose, silent)').once();

  let dead = false;
  const cut = (s, n) => (s.length > n ? s.slice(0, n) + `… (${s.length - n} more characters)` : s);
  const cleanMessage = (s) =>
    s
      .replace(/\bnb_\d+:/g, '')
      .replace(/^nb:[a-z_]+\/\d+: /gm, '')
      .replace(
        /^(call_cleanup\/2|findnsols\/4|catch\/3|call_with_inference_limit\/3|'<meta-call>'\/1): /gm,
        '',
      );

  // The stepper: the same query, solved one resolution step at a time.
  function runTrace(program, query, maxSolutions, maxSteps, started) {
    const result = {
      output: '',
      answers: [],
      more: false,
      error: null,
      phase: 'query',
      warnings: [],
      steps: [],
      truncated: false,
      ms: 0,
    };
    if (dead) {
      result.error = 'The Prolog engine stopped. Reload the page to restart it.';
      return result;
    }
    try {
      const r = P.query('nbstep:trace_run(Prog, Query, MaxS, MaxT, Json)', {
        Prog: program,
        Query: query,
        MaxS: maxSolutions,
        MaxT: maxSteps,
      }).once();
      if (!r || r.error) throw new Error(r?.message || 'Prolog engine error');
      const json = JSON.parse(r.Json);
      result.steps = json.steps.map((st) => ({
        ...st,
        title: cleanMessage(st.title)
          .replace(/\b(call_cleanup|findnsols)\/\d+: /g, '')
          .replace(/\bnbs?_\d+:/g, ''),
      }));
      result.truncated = json.truncated;
      if (json.status !== 'ok') {
        result.error =
          json.status === 'syntax' ? 'Syntax error in the query: ' + json.error : json.error;
        if (json.status === 'error') result.phase = 'program';
      }
    } catch (e) {
      result.error = String(e.message || e);
    }
    result.ms = Math.round(performance.now() - started);
    return result;
  }

  return {
    get dead() {
      return dead;
    },
    run({ program = '', query = null, maxSolutions = 10, trace = false, maxSteps = 400 }) {
      const started = performance.now();
      if (trace) return runTrace(program, query || '', maxSolutions, maxSteps, started);
      stderr = '';
      const result = {
        output: '',
        answers: [],
        more: false,
        error: null,
        phase: 'query',
        warnings: [],
        ms: 0,
      };
      if (dead) {
        result.error =
          'The Prolog engine stopped (a halt/0 call, or an internal crash). Reload the page to restart it.';
        return result;
      }
      let json;
      try {
        const r = P.query('nb:run(Prog, Query, Max, Json)', {
          Prog: program,
          Query: query == null ? '' : query,
          Max: maxSolutions,
        }).once();
        if (!r || r.error) throw new Error(r?.message || 'Prolog engine error');
        json = JSON.parse(r.Json);
      } catch (e) {
        result.error = String(e.message || e);
        if (
          /Aborted|terminated with exit|unreachable|memory access out of bounds/i.test(result.error)
        ) {
          dead = true;
          result.error =
            'The Prolog engine was shut down (did the program call halt/0?). It restarts automatically on the next run.';
        }
        result.ms = Math.round(performance.now() - started);
        return result;
      }
      result.output = cut(json.output + stderr, 20000);
      result.answers = json.answers.map((a) => cut(a, 1500));
      result.more = json.more;
      for (const m of json.messages) {
        const text = cleanMessage(m.text);
        if (m.kind === 'error') (result.loadErrors ??= []).push(text);
        else result.warnings.push(text);
      }
      if (result.loadErrors) {
        result.phase = 'program';
        result.error = result.loadErrors.join('\n');
      }
      switch (json.status) {
        case 'syntax':
          result.error =
            'Syntax error in the query: ' +
            cleanMessage(json.error)
              .split('\n')[0]
              .replace(/^Syntax error: /, '');
          break;
        case 'error':
          // A load error (above) takes precedence in the display; keep the query error otherwise.
          if (!result.error) result.error = cut(cleanMessage(json.error), 1500);
          else result.queryError = cleanMessage(json.error);
          break;
        case 'limit':
          if (result.answers.length) {
            result.limited = true;
          } else {
            result.error =
              'Stopped: this query used too many steps. Probably an infinite loop, does every recursive call make progress, and does the base case come first?';
          }
          break;
        default:
      }
      result.ms = Math.round(performance.now() - started);
      return result;
    },
  };
}

const squash = (s) => s.replace(/\s+/g, '');

/** Run exercise tests through any `run` function. */
export async function checkWith(run, program, tests) {
  const results = [];
  for (const t of tests) {
    const r = await run({ program, query: t.q, maxSolutions: 50 });
    if (r.phase === 'program') {
      // The program itself failed to load (e.g. a syntax error): running more tests is pointless.
      for (const u of tests) {
        results.push({ query: u.q, pass: false, got: [], expected: u.expect, hidden: !!u.hidden });
      }
      results.programError = r.error;
      return results;
    }
    let got = r.error ? [`error: ${r.error}`] : r.answers.length ? r.answers : ['false'];
    let exp = t.expect;
    if (t.unordered) {
      got = [...got].sort();
      exp = [...exp].sort();
    }
    const pass =
      !r.error && got.length === exp.length && got.every((g, i) => squash(g) === squash(exp[i]));
    results.push({ query: t.q, pass, got, expected: t.expect, hidden: !!t.hidden });
  }
  return results;
}
