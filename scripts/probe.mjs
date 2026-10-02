// usage: node scripts/probe.mjs 'program' 'query' [more queries...]
import SWIPL from 'swipl-wasm';
import { createRunner } from '../src/prolog/core.js';
const runner = await createRunner(SWIPL);
const [, , program = '', ...queries] = process.argv;
for (const q of queries.length ? queries : [null]) {
  const r = runner.run({ program, query: q, maxSolutions: 8 });
  console.log(
    '?-',
    q,
    '\n  ',
    JSON.stringify(r.answers),
    r.more ? '+more' : '',
    r.error ? 'ERR ' + r.error : '',
    r.output ? 'OUT ' + JSON.stringify(r.output) : '',
    r.warnings.length ? 'WARN ' + JSON.stringify(r.warnings) : '',
    r.ms + 'ms',
  );
}
