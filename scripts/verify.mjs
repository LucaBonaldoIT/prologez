// Runs every query cell and exercise in every lesson against the real engine.
//   node scripts/verify.mjs            -> check, print problems only
//   node scripts/verify.mjs -v [id]    -> also print every answer (optionally for one lesson)
import SWIPL from 'swipl-wasm';
import { createRunner, checkWith } from '../src/prolog/core.js';
import { lessons } from '../src/lessons/index.js';

const runner = await createRunner(SWIPL);
const run = async (o) => runner.run(o);
const check = (p, t) => checkWith(run, p, t);
const verbose = process.argv.includes('-v');
const only = process.argv.slice(2).find((a) => !a.startsWith('-'));
let problems = 0;
const bad = (msg) => {
  problems++;
  console.log('  ✗ ' + msg);
};

for (const lesson of lessons) {
  if (only && lesson.id !== only) continue;
  console.log(`\n# ${lesson.id}`);
  const progs = [];
  for (let i = 0; i < lesson.blocks.length; i++) {
    const b = lesson.blocks[i];
    if (b.t === 'program') {
      if (b.fresh) progs.length = 0;
      progs.push(b.code);
      const r = await run({ program: progs.join('\n'), query: null });
      if (r.error && !b.error) bad(`program #${i} fails to load: ${r.error}`);
      if (verbose && r.output) console.log(`  [program #${i} output] ${JSON.stringify(r.output)}`);
    } else if (b.t === 'query') {
      const r = await run({ program: progs.join('\n'), query: b.code, maxSolutions: b.max || 10 });
      if (verbose || (r.error && !b.error) || (!r.error && b.error))
        console.log(
          `  ?- ${b.code.replace(/\n/g, ' ')}\n     ${r.error ? 'ERROR: ' + r.error : r.answers.length ? r.answers.join('  ;  ') + (r.more ? '  …more' : '') : 'false'}${r.output ? '\n     OUT ' + JSON.stringify(r.output) : ''}  (${r.ms}ms)`,
        );
      if (r.error && !b.error) bad(`query failed: ${b.code}`);
      if (r.limited && !b.limited) bad(`query hit the step limit: ${b.code}`);
      if (!r.error && b.error) bad(`query was expected to error but did not: ${b.code}`);
      if (b.expect) {
        const got = r.answers.length ? r.answers : ['false'];
        const sq = (a) => JSON.stringify(a.map((x) => x.replace(/\s+/g, '')));
        if (sq(got) !== sq(b.expect))
          bad(
            `query ${b.code}\n      expected ${JSON.stringify(b.expect)}\n      got      ${JSON.stringify(got)}`,
          );
      }
    } else if (b.t === 'exercise') {
      const setup = b.setup ? b.setup + '\n' : '';
      const res = await check(setup + b.solution, b.tests);
      for (const t of res)
        if (!t.pass)
          bad(
            `exercise "${b.title}" solution fails ${t.query}\n      expected ${JSON.stringify(t.expected)}\n      got      ${JSON.stringify(t.got)}`,
          );
      const starter = await check(setup + b.starter, b.tests);
      if (starter.every((t) => t.pass))
        bad(`exercise "${b.title}": starter already passes all tests`);
      if (verbose)
        console.log(
          `  exercise "${b.title}": ${res.filter((t) => t.pass).length}/${res.length} pass with solution`,
        );
    }
  }
}
console.log(problems ? `\n${problems} problem(s)` : '\nall good');
process.exit(problems ? 1 : 0);
